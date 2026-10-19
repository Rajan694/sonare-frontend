"""Sonare's MPRIS player: what the desktop sends media keys, headset buttons and its player
controls to. Owns org.mpris.MediaPlayer2.sonare on the session bus and relays to the app.

The app writes one JSON object per line on stdin:
  {"type": "state", "status": "Playing" | "Paused" | "Stopped",
   "track": {"id", "title", "artist", "album", "artUrl", "lengthMs"} | null}
  {"type": "position", "positionMs": n, "durationMs": n}
  {"type": "ping"}
and reads one per line on stdout:
  {"cmd": "play" | "pause" | "next" | "previous"}  or  {"cmd": "seek", "positionMs": n}
Exits when stdin closes, so it goes with the app, or when the app has been silent for
SILENCE_S: a page reload leaves the process running, and its new page starts another.
"""

import json
import os
import re
import sys
import time

from gi.repository import Gio, GLib

NAME = "org.mpris.MediaPlayer2.sonare"
PATH = "/org/mpris/MediaPlayer2"
ROOT = "org.mpris.MediaPlayer2"
PLAYER = "org.mpris.MediaPlayer2.Player"
NO_TRACK = "/org/mpris/MediaPlayer2/TrackList/NoTrack"
# The app pings every 10 s.
SILENCE_S = 30

XML = """<node>
  <interface name="org.mpris.MediaPlayer2">
    <method name="Raise"/>
    <method name="Quit"/>
    <property name="CanQuit" type="b" access="read"/>
    <property name="CanRaise" type="b" access="read"/>
    <property name="HasTrackList" type="b" access="read"/>
    <property name="Identity" type="s" access="read"/>
    <property name="DesktopEntry" type="s" access="read"/>
    <property name="SupportedUriSchemes" type="as" access="read"/>
    <property name="SupportedMimeTypes" type="as" access="read"/>
  </interface>
  <interface name="org.mpris.MediaPlayer2.Player">
    <method name="Next"/>
    <method name="Previous"/>
    <method name="Pause"/>
    <method name="PlayPause"/>
    <method name="Stop"/>
    <method name="Play"/>
    <method name="Seek"><arg direction="in" type="x" name="Offset"/></method>
    <method name="SetPosition">
      <arg direction="in" type="o" name="TrackId"/>
      <arg direction="in" type="x" name="Position"/>
    </method>
    <method name="OpenUri"><arg direction="in" type="s" name="Uri"/></method>
    <signal name="Seeked"><arg name="Position" type="x"/></signal>
    <property name="PlaybackStatus" type="s" access="read"/>
    <property name="Rate" type="d" access="readwrite"/>
    <property name="Metadata" type="a{sv}" access="read"/>
    <property name="Volume" type="d" access="readwrite"/>
    <property name="Position" type="x" access="read"/>
    <property name="MinimumRate" type="d" access="read"/>
    <property name="MaximumRate" type="d" access="read"/>
    <property name="CanGoNext" type="b" access="read"/>
    <property name="CanGoPrevious" type="b" access="read"/>
    <property name="CanPlay" type="b" access="read"/>
    <property name="CanPause" type="b" access="read"/>
    <property name="CanSeek" type="b" access="read"/>
    <property name="CanControl" type="b" access="read"/>
  </interface>
</node>"""

status = "Stopped"
track = None
length_us = 0
# The position at pos_at (monotonic seconds); it runs on from there while playing.
pos_us = 0
pos_at = time.monotonic()
conn = None
loop = GLib.MainLoop()
heard_at = time.monotonic()


def send(cmd, **extra):
    try:
        sys.stdout.write(json.dumps(dict(cmd=cmd, **extra)) + "\n")
        sys.stdout.flush()
    except (BrokenPipeError, OSError):
        loop.quit()


def position():
    if status != "Playing":
        return pos_us
    now = pos_us + int((time.monotonic() - pos_at) * 1e6)
    return min(now, length_us) if length_us else now


def anchor(us):
    global pos_us, pos_at
    pos_us = max(0, us)
    pos_at = time.monotonic()


def track_path():
    # Object path elements take [A-Za-z0-9_] only.
    return "/app/sonare/track/t" + re.sub(r"[^A-Za-z0-9_]", "_", str(track["id"]))


def metadata():
    if not track:
        return GLib.Variant("a{sv}", {"mpris:trackid": GLib.Variant("o", NO_TRACK)})
    md = {
        "mpris:trackid": GLib.Variant("o", track_path()),
        "xesam:title": GLib.Variant("s", track.get("title") or ""),
        "xesam:artist": GLib.Variant("as", [track["artist"]] if track.get("artist") else []),
    }
    if track.get("album"):
        md["xesam:album"] = GLib.Variant("s", track["album"])
    if track.get("artUrl"):
        md["mpris:artUrl"] = GLib.Variant("s", track["artUrl"])
    if length_us:
        md["mpris:length"] = GLib.Variant("x", length_us)
    return GLib.Variant("a{sv}", md)


def root_property(name):
    return {
        "CanQuit": GLib.Variant("b", False),
        "CanRaise": GLib.Variant("b", False),
        "HasTrackList": GLib.Variant("b", False),
        "Identity": GLib.Variant("s", "Sonare"),
        "DesktopEntry": GLib.Variant("s", "sonare"),
        "SupportedUriSchemes": GLib.Variant("as", []),
        "SupportedMimeTypes": GLib.Variant("as", []),
    }.get(name)


def player_property(name):
    has = track is not None
    if name == "Position":
        return GLib.Variant("x", position())
    if name == "Metadata":
        return metadata()
    return {
        "PlaybackStatus": GLib.Variant("s", status),
        "Rate": GLib.Variant("d", 1.0),
        "Volume": GLib.Variant("d", 1.0),
        "MinimumRate": GLib.Variant("d", 1.0),
        "MaximumRate": GLib.Variant("d", 1.0),
        "CanGoNext": GLib.Variant("b", has),
        "CanGoPrevious": GLib.Variant("b", has),
        "CanPlay": GLib.Variant("b", has),
        "CanPause": GLib.Variant("b", has),
        "CanSeek": GLib.Variant("b", has and length_us > 0),
        "CanControl": GLib.Variant("b", True),
    }.get(name)


def changed(*names):
    if conn is None:
        return
    props = {n: player_property(n) for n in names}
    conn.emit_signal(
        None, PATH, "org.freedesktop.DBus.Properties", "PropertiesChanged",
        GLib.Variant("(sa{sv}as)", (PLAYER, props, [])),
    )


def seeked(us):
    if conn is not None:
        conn.emit_signal(None, PATH, PLAYER, "Seeked", GLib.Variant("(x)", (us,)))


def seek_to(us):
    if length_us and us > length_us:
        send("next")
    else:
        send("seek", positionMs=max(0, us) // 1000)


def on_call(_conn, _sender, _path, iface, method, params, invocation):
    if iface == PLAYER:
        if method == "PlayPause":
            send("pause" if status == "Playing" else "play")
        elif method == "Play":
            send("play")
        elif method in ("Pause", "Stop"):
            send("pause")
        elif method == "Next":
            send("next")
        elif method == "Previous":
            send("previous")
        elif method == "Seek" and track:
            seek_to(position() + params.unpack()[0])
        elif method == "SetPosition" and track:
            trackid, us = params.unpack()
            if trackid == track_path() and us >= 0:
                seek_to(us)
        elif method == "OpenUri":
            invocation.return_dbus_error("org.freedesktop.DBus.Error.NotSupported", "Sonare opens no URIs")
            return
    invocation.return_value(None)


def on_get(_conn, _sender, _path, iface, name):
    return root_property(name) if iface == ROOT else player_property(name)


def on_set(_conn, _sender, _path, _iface, _name, _value):
    # Rate and Volume stay at 1: the app has its own controls for them.
    return True


def on_message(msg):
    global status, track, length_us
    if msg.get("type") == "state":
        new_track = msg.get("track")
        new_status = msg.get("status") or "Stopped"
        props = []
        if (new_track or {}).get("id") != (track or {}).get("id"):
            anchor(0)
            length_us = int((new_track or {}).get("lengthMs") or 0) * 1000
            props += ["Metadata", "CanGoNext", "CanGoPrevious", "CanPlay", "CanPause", "CanSeek"]
        elif new_track != track:
            props.append("Metadata")
        track = new_track
        if new_status != status:
            anchor(position())
            status = new_status
            props.append("PlaybackStatus")
        if props:
            changed(*props)
    elif msg.get("type") == "position":
        us = int(msg.get("positionMs") or 0) * 1000
        jumped = abs(us - position()) > 1500000
        anchor(us)
        if jumped:
            seeked(us)
        duration = int(msg.get("durationMs") or 0) * 1000
        if duration and abs(duration - length_us) > 1000000:
            length_us = duration
            changed("Metadata", "CanSeek")


buffered = b""


def on_stdin(fd, condition):
    global buffered, heard_at
    data = os.read(fd, 65536) if condition & GLib.IO_IN else b""
    if not data:
        loop.quit()
        return False
    heard_at = time.monotonic()
    buffered += data
    while b"\n" in buffered:
        line, buffered = buffered.split(b"\n", 1)
        try:
            on_message(json.loads(line))
        except (ValueError, TypeError, AttributeError):
            pass
    return True


def main():
    global conn
    conn = Gio.bus_get_sync(Gio.BusType.SESSION, None)
    node = Gio.DBusNodeInfo.new_for_xml(XML)
    for iface in node.interfaces:
        conn.register_object(PATH, iface, on_call, on_get, on_set)

    def lost(_conn, name):
        # Another Sonare has the name: take an instance name, as MPRIS asks.
        if name == NAME:
            own(NAME + ".instance%d" % os.getpid())
        else:
            loop.quit()

    def own(name):
        Gio.bus_own_name_on_connection(conn, name, Gio.BusNameOwnerFlags.DO_NOT_QUEUE, None, lost)

    own(NAME)
    GLib.io_add_watch(sys.stdin.fileno(), GLib.PRIORITY_DEFAULT, GLib.IO_IN | GLib.IO_HUP | GLib.IO_ERR, on_stdin)

    def watchdog():
        if time.monotonic() - heard_at > SILENCE_S:
            loop.quit()
        return True

    GLib.timeout_add_seconds(5, watchdog)
    loop.run()


main()
