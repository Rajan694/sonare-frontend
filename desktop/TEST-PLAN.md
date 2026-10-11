# Sonare web & desktop test plan

Every test is listed here by ID; `scripts/check-test-plan.mjs` (run before `npm test`) fails if a test and
this plan disagree. `WEB-*` tests run in the `web` vitest project (jsdom, browser build); `DSK-*` tests run
in the `desktop` project (Neutralino window build, with `@neutralinojs/lib` replaced by an in-memory
file system from `test/helpers/fakeNeutralino.ts`).

No test talks to a real server: `VITE_API_BASE` points at `http://api.sonare.test` and msw fails any
request a test did not mock (`test/helpers/server.ts`).

## `test/app/position.test.tsx`

| ID             | Use case                                                            |
| :------------- | :------------------------------------------------------------------ |
| `WEB-PERF-001` | position ticks re-render the progress display but not the song rows |
| `WEB-PERF-002` | a real change (pausing) still reaches the rows                      |

## `test/app/queue.test.tsx`

| ID              | Use case                                                                                           |
| :-------------- | :------------------------------------------------------------------------------------------------- |
| `WEB-QUEUE-001` | playing a song from a list queues the list and starts that song                                    |
| `WEB-QUEUE-002` | playing a single song jumps to it if queued, otherwise puts it first                               |
| `WEB-QUEUE-003` | counts a play from the live playback position                                                      |
| `WEB-QUEUE-004` | the web app always syncs in Online Mode                                                            |
| `WEB-QUEUE-005` | next walks forward and stops at the end when repeat is off                                         |
| `WEB-QUEUE-006` | repeat all wraps from the last song to the first                                                   |
| `WEB-QUEUE-007` | repeat cycles off → all → one → off                                                                |
| `WEB-QUEUE-008` | previous restarts the song after 3 seconds, and goes back before that                              |
| `WEB-QUEUE-009` | skip-to-previous always changes song, however far in                                               |
| `WEB-QUEUE-010` | a finished song advances to the next one                                                           |
| `WEB-QUEUE-011` | with repeat one, a finished song plays again from the start                                        |
| `WEB-QUEUE-012` | seeking by fraction clamps to the track and uses the live duration                                 |
| `WEB-QUEUE-013` | shuffle plays every song exactly once, starting from the current one, without reordering the queue |
| `WEB-QUEUE-014` | turning shuffle off continues in the real queue order from the current song                        |
| `WEB-QUEUE-015` | play next puts a song right after the current one                                                  |
| `WEB-QUEUE-016` | play next moves a song that is already queued instead of duplicating it                            |
| `WEB-QUEUE-017` | add to queue appends new songs and skips ones already there                                        |
| `WEB-QUEUE-018` | removing a song before the current one keeps the same song playing                                 |
| `WEB-QUEUE-019` | removing the playing song hands over to the one after it                                           |
| `WEB-QUEUE-020` | removing the playing last song falls back to the new last song                                     |
| `WEB-QUEUE-021` | reordering keeps the playing song playing and ignores invalid moves                                |
| `WEB-QUEUE-022` | clear upcoming keeps everything up to the current song                                             |
| `WEB-QUEUE-023` | play next on an empty queue makes it the only song                                                 |

## `test/components/layout.test.tsx`

| ID               | Use case                                                                           |
| :--------------- | :--------------------------------------------------------------------------------- |
| `WEB-LAYOUT-001` | takes no space until a song is chosen, then shows it with play/pause               |
| `WEB-LAYOUT-002` | play is disabled while loading and reads "Pause" while playing                     |
| `WEB-LAYOUT-003` | transport buttons drive the queue and show shuffle / repeat state                  |
| `WEB-LAYOUT-004` | shows position and duration, and seeks from the waveform                           |
| `WEB-LAYOUT-005` | a playback error replaces the artist line and offers a retry                       |
| `WEB-LAYOUT-006` | mute, unmute and the volume slider                                                 |
| `WEB-LAYOUT-007` | opens the queue panel and links to lyrics, equalizer and the full-screen player    |
| `WEB-LAYOUT-008` | the mini player opens now-playing from its body, but not from its buttons          |
| `WEB-LAYOUT-009` | the phone tab bar and tablet rail highlight the section you are in                 |
| `WEB-LAYOUT-010` | typing stores the query and jumps to the search page; clearing empties it          |
| `WEB-LAYOUT-011` | spaces alone do not leave the page; Enter does                                     |
| `WEB-LAYOUT-012` | "/" and Ctrl+K focus the search, but not while typing elsewhere                    |
| `WEB-LAYOUT-013` | a guest is invited to sign in, and "New playlist" asks for an account              |
| `WEB-LAYOUT-014` | lists the signed-in user's playlists with kind and size                            |
| `WEB-LAYOUT-015` | with no playlists yet it says so                                                   |
| `WEB-LAYOUT-016` | creating a playlist names it, opens it, and reports a failure                      |
| `WEB-LAYOUT-017` | collapses to an icon rail with tooltips, and counts running downloads              |
| `WEB-LAYOUT-018` | shows how many plays are waiting to sync                                           |
| `WEB-LAYOUT-019` | summarises the queue, shows the current song and only what comes next              |
| `WEB-LAYOUT-020` | clicking an upcoming song plays it; its X removes it without playing               |
| `WEB-LAYOUT-021` | dragging a row onto another moves it                                               |
| `WEB-LAYOUT-022` | Clear drops upcoming songs; with none left it says so                              |
| `WEB-LAYOUT-023` | saves the queue as a playlist and opens it                                         |
| `WEB-LAYOUT-024` | a guest is asked to sign in first; an empty queue cannot be saved                  |
| `WEB-LAYOUT-025` | the phone sheet has its own play button and a close button                         |
| `WEB-LAYOUT-026` | Space plays or pauses from anywhere, but not while typing                          |
| `WEB-LAYOUT-027` | a clicked button does not swallow Space; a Tab-focused one keeps it                |
| `WEB-LAYOUT-028` | arrows seek 5 seconds; a quick double press changes song                           |
| `WEB-LAYOUT-029` | up and down change the volume by 5%; modified keys are left alone                  |
| `WEB-LAYOUT-030` | with nothing playing the arrows do not seek                                        |
| `WEB-LAYOUT-031` | a guest sees Sign in; a signed-in user sees their initial; both reach settings     |
| `WEB-LAYOUT-032` | picks the desktop, tablet or phone shell by width, and drops chrome on now-playing |
| `WEB-LAYOUT-033` | Ctrl+Q toggles the queue, Escape closes it, Ctrl+B collapses the sidebar           |
| `WEB-LAYOUT-034` | Escape leaves a full-screen page, going home when there is no history              |
| `WEB-LAYOUT-035` | shows toasts and lets them be dismissed                                            |
| `WEB-LAYOUT-036` | "Add to playlist" opens the playlist picker for the playing song                   |
| `WEB-LAYOUT-037` | a guest pressing "Add to playlist" is asked to create an account first             |
| `WEB-LAYOUT-038` | no output button where the browser cannot choose the speaker                       |

## `test/components/music.test.tsx`

| ID              | Use case                                                                                     |
| :-------------- | :------------------------------------------------------------------------------------------- |
| `WEB-MUSIC-001` | resolves server artwork on the API origin at a size that fits                                |
| `WEB-MUSIC-002` | shows the image once loaded and falls back to the gradient when it fails                     |
| `WEB-MUSIC-003` | the equalizer bars say whether audio is playing                                              |
| `WEB-MUSIC-004` | a genre card links to its page, or acts as a button, with a cycling colour                   |
| `WEB-MUSIC-005` | shows title, artist, album, duration and where it plays from                                 |
| `WEB-MUSIC-006` | clicking the title or double-clicking the row plays it                                       |
| `WEB-MUSIC-007` | the current song is marked, and its bars follow play/pause                                   |
| `WEB-MUSIC-008` | the heart saves a favourite without playing the song                                         |
| `WEB-MUSIC-009` | shows download progress, then "On device" once saved locally                                 |
| `WEB-MUSIC-010` | remove and add-to-playlist buttons act without playing the song                              |
| `WEB-MUSIC-011` | play next and add to queue go to the player and close the menu                               |
| `WEB-MUSIC-012` | go to album and go to artist open those pages                                                |
| `WEB-MUSIC-013` | a signed-in user adds the song to one of their playlists                                     |
| `WEB-MUSIC-014` | "New playlist…" creates a synced playlist named by the user and adds the song                |
| `WEB-MUSIC-015` | cancelling the new-playlist prompt creates nothing                                           |
| `WEB-MUSIC-016` | a guest choosing "Add to playlist" is asked to create an account                             |
| `WEB-MUSIC-017` | offers Download, Pause or Delete depending on the download state, and hides Download offline |
| `WEB-MUSIC-018` | for several songs, only list actions are offered                                             |
| `WEB-MUSIC-019` | Escape and a click outside close the menu                                                    |
| `WEB-MUSIC-020` | deleting a playlist from its own page asks first, deletes it and leaves the page             |
| `WEB-MUSIC-021` | a song walks Download → progress (click pauses) → resume → downloaded (confirm deletes)      |
| `WEB-MUSIC-022` | explains when a deleted download could only be removed from the list                         |
| `WEB-MUSIC-023` | nothing to download for local files, or offline without a download                           |
| `WEB-MUSIC-024` | downloading an album queues its server songs and says how many                               |
| `WEB-MUSIC-025` | shows the remaining count, the running progress, and "Downloaded" when all are saved         |
| `WEB-MUSIC-026` | hidden offline with nothing downloaded, and for lists of only local files                    |
| `WEB-MUSIC-027` | marks played bars up to the playhead and reports the position                                |
| `WEB-MUSIC-028` | arrow keys jump 5 seconds, within the track                                                  |
| `WEB-MUSIC-029` | scrubbing previews the time and seeks once on release                                        |
| `WEB-MUSIC-030` | without a seek handler it is a picture, not a control                                        |
| `WEB-MUSIC-031` | the table shows your play count, and the artist where a song has no album                    |
| `WEB-MUSIC-032` | a guest who signs in from "Add to playlist" gets the playlist picker for that song           |

## `test/components/ui.test.tsx`

| ID           | Use case                                                                             |
| :----------- | :----------------------------------------------------------------------------------- |
| `WEB-UI-001` | a button runs its handler, and not when disabled                                     |
| `WEB-UI-002` | an icon button is named by its label, with a shorter tooltip and shortcut when given |
| `WEB-UI-003` | exposes its range and value to assistive tech                                        |
| `WEB-UI-004` | arrow, page, home and end keys move by step and commit each change                   |
| `WEB-UI-005` | dragging follows the pointer live and commits once on release                        |
| `WEB-UI-006` | a vertical fader reads bottom as minimum                                             |
| `WEB-UI-007` | double-click resets to the default value                                             |
| `WEB-UI-008` | a disabled or read-only slider ignores input and is not focusable                    |
| `WEB-UI-009` | a switch reports its state and asks for the opposite on click                        |
| `WEB-UI-010` | a segmented control marks the chosen option and reports clicks                       |
| `WEB-UI-011` | menu items run their action; disabled ones do not                                    |
| `WEB-UI-012` | a field is a labelled text input that passes typing through                          |
| `WEB-UI-013` | an empty state shows its title, description and action                               |
| `WEB-UI-014` | a toast shows only while visible and can be dismissed                                |
| `WEB-UI-015` | appears after a short hover delay with its shortcut, and goes on leaving             |
| `WEB-UI-016` | moving straight to the next control shows its tooltip at once                        |
| `WEB-UI-017` | follows a label change live (Play turns into Pause)                                  |
| `WEB-UI-018` | touch never shows it; Escape and pressing the control hide it                        |
| `WEB-UI-019` | changing screen hides it                                                             |

## `test/desktop/local.test.ts`

| ID        | Use case                                                                                     |
| :-------- | :------------------------------------------------------------------------------------------- |
| `DSK-001` | the Linux window has the local library, offline mode and native downloads, but no admin page |
| `DSK-002` | adding a folder indexes its audio files recursively and ignores other files                  |
| `DSK-003` | tags inside the file win over the file name, and site stamps are cleaned                     |
| `DSK-004` | the same folder is not added twice                                                           |
| `DSK-005` | without a path it asks with the folder picker (starting in Music); cancelling adds nothing   |
| `DSK-006` | a rescan reports added and removed songs and does not re-read unchanged files                |
| `DSK-007` | a file that cannot be read is skipped without failing the folder                             |
| `DSK-008` | a folder that disappeared scans as empty                                                     |
| `DSK-009` | excluding a folder hides its songs; including it brings them back                            |
| `DSK-010` | removing a folder forgets its songs and their saved lyrics, but leaves the files             |
| `DSK-011` | the library is kept in Neutralino storage and restored at the next launch                    |
| `DSK-012` | a corrupt stored library starts empty instead of crashing                                    |
| `DSK-013` | "open folder" shows the file's folder in the file manager                                    |
| `DSK-014` | reads a file's bytes with its type; an unknown id is an error                                |
| `DSK-015` | the player's real duration is remembered for files the scan could not measure                |
| `DSK-016` | server lists swap in this device's copy of a local song and drop ones it lacks               |
| `DSK-017` | reads a sidecar .lrc next to the file, synced or plain                                       |
| `DSK-018` | lyrics the user saves replace the sidecar, and their timing offset is kept                   |
| `DSK-019` | a finished download joins the library under "Sonare downloads" and replaces the stream       |
| `DSK-020` | downloading the same song again keeps one copy; forgetting it unlinks the stream             |
| `DSK-021` | rescanning downloads drops files deleted outside Sonare                                      |
| `DSK-022` | downloads indexed by an older version are listed for the download manager to import          |
| `DSK-023` | downloads go to ~/Music/Sonare until the user picks another folder, which is remembered      |
| `DSK-024` | cancelling the folder picker keeps the current folder                                        |
| `DSK-025` | a download is written to a hidden part file, then moved to a free name                       |

## `test/desktop/offline.test.tsx`

| ID        | Use case                                                                                      |
| :-------- | :-------------------------------------------------------------------------------------------- |
| `DSK-026` | with no internet the app starts in Offline Mode and says why                                  |
| `DSK-027` | with internet it stays online and syncs                                                       |
| `DSK-028` | "stay offline" survives a restart; going online clears it                                     |
| `DSK-029` | offline, the queue skips songs that are not on this device                                    |
| `DSK-030` | the confirmation shows what stays available and remembers "stay offline"                      |
| `DSK-031` | settings on the desktop include the connection mode and the library sections                  |
| `DSK-053` | About in the desktop app shows the version but no downloads (those are on the web only)       |
| `DSK-054` | the server address can point the desktop app at another backend, which restarts it signed out |
| `DSK-032` | with no folders it invites the user to add one, using the folder picker                       |
| `DSK-033` | lists folders; scanning reports what changed; open, exclude and remove work                   |
| `DSK-034` | a failed scan is reported instead of breaking the page                                        |
| `DSK-035` | the downloads folder cannot be removed from the list                                          |

## `test/desktop/player.test.ts`

| ID        | Use case                                                                        |
| :-------- | :------------------------------------------------------------------------------ |
| `DSK-036` | a short file is decoded and played through Web Audio, leaving the element empty |
| `DSK-037` | pause, play, seek and volume act on the decoded track                           |
| `DSK-038` | the end of a decoded track tells the queue to move on                           |
| `DSK-039` | a file too long to decode whole is streamed; a stream failure is reported       |
| `DSK-040` | a format neither path can read plays through the audio element from a blob url  |
| `DSK-041` | choosing another song stops and releases the previous decoded one               |
| `DSK-042` | a downloaded song plays from disk, never from the server                        |
| `DSK-043` | a blocked start asks the user to press play                                     |

## `test/screens/home-search.test.tsx`

| ID               | Use case                                                                               |
| :--------------- | :------------------------------------------------------------------------------------- |
| `WEB-HOME-001`   | a guest is welcomed, invited to create an account, and sees trending music             |
| `WEB-HOME-002`   | a signed-in user is greeted by name and sees their recently played, without duplicates |
| `WEB-HOME-003`   | when the music service is down it explains why and can retry                           |
| `WEB-HOME-004`   | with a song loaded the header button pauses or resumes it                              |
| `WEB-HOME-005`   | playing a table row plays it within the trending list                                  |
| `WEB-HOME-006`   | "See all" shows the full trending shelf                                                |
| `WEB-HOME-007`   | a signed-in user whose recently played fails to load is told so and can retry          |
| `WEB-SEARCH-001` | without a query it offers genres from the server, and a genre searches for its query   |
| `WEB-SEARCH-002` | shows a top result, songs and artists, with a result count                             |
| `WEB-SEARCH-003` | the top result plays within the results                                                |
| `WEB-SEARCH-004` | the chips search albums, artists and playlists and link to them                        |
| `WEB-SEARCH-005` | says when nothing matches                                                              |
| `WEB-SEARCH-006` | a failed search shows the error and can be retried                                     |
| `WEB-SEARCH-007` | a shared ?q= link fills the search box and is removed from the address                 |
| `WEB-SEARCH-008` | add-songs mode adds a result to the playlist and counts it                             |
| `WEB-SEARCH-009` | a song that could not be added is un-ticked with a message                             |
| `WEB-SEARCH-010` | a category without a query searches for its name                                       |
| `WEB-SEARCH-011` | the Artists row shows each song's artist once, with their picture and page             |

## `test/screens/library-catalog.test.tsx`

| ID                | Use case                                                                              |
| :---------------- | :------------------------------------------------------------------------------------ |
| `WEB-LIBRARY-001` | lists the saved songs with a count; Play all plays them in order                      |
| `WEB-LIBRARY-002` | shuffle plays every saved song in some order                                          |
| `WEB-LIBRARY-003` | sorts by title (case-insensitive), then reverses on a second click; sorts by duration |
| `WEB-LIBRARY-004` | filtering to "On device" on the web leaves nothing, and says so                       |
| `WEB-LIBRARY-005` | grid view shows the songs as cards that play in the list                              |
| `WEB-LIBRARY-006` | tabs are reflected in the address, and the address opens a tab                        |
| `WEB-LIBRARY-007` | followed artists link to their pages; empty albums and artists say so                 |
| `WEB-LIBRARY-008` | un-hearting a favourite removes it from the list at once                              |
| `WEB-LIBRARY-009` | a guest's account-only tabs invite them to sign up; Songs still works                 |
| `WEB-LIBRARY-010` | genres link to a search for that genre                                                |
| `WEB-ALBUM-001`   | shows the album, its artist link, year, size and total length                         |
| `WEB-ALBUM-002`   | play and shuffle play the whole album                                                 |
| `WEB-ALBUM-003`   | an unknown album shows "Album not found" with the reason                              |
| `WEB-ALBUM-004`   | hearting an album saves it, and a failed un-heart puts the heart back                 |
| `WEB-ALBUM-007`   | an album already saved in the library starts hearted                                  |
| `WEB-ALBUM-005`   | a guest hearting an album is asked to sign up                                         |
| `WEB-ALBUM-006`   | "More options" opens the menu for all the album's songs                               |
| `WEB-ARTIST-001`  | shows listeners and albums, the top five songs and the discography                    |
| `WEB-ARTIST-002`  | playing a popular song queues all of the artist's top songs                           |
| `WEB-ARTIST-003`  | follow and unfollow, with the button following the saved state                        |
| `WEB-ARTIST-004`  | a failed follow is undone                                                             |
| `WEB-ARTIST-005`  | an artist with no songs says so and disables play; an unknown artist is "not found"   |
| `WEB-LIBRARY-011` | artists from liked and playlisted songs show their song count; followed ones say so   |
| `WEB-LIBRARY-012` | genres show the browse categories and search for their query                          |

## `test/screens/player-screens.test.tsx`

| ID               | Use case                                                                            |
| :--------------- | :---------------------------------------------------------------------------------- |
| `WEB-NP-001`     | with nothing playing it points back to Home                                         |
| `WEB-NP-002`     | shows the song, its album, artist link, stream quality and time left                |
| `WEB-NP-003`     | lists the next four songs, and clicking one plays it                                |
| `WEB-NP-004`     | transport, shuffle, repeat and seek go to the player                                |
| `WEB-NP-005`     | a playback error is shown with a retry                                              |
| `WEB-NP-006`     | leaving goes home on a direct visit                                                 |
| `WEB-LYRICS-001` | highlights the line at the current position, with its source                        |
| `WEB-LYRICS-002` | clicking a line seeks there                                                         |
| `WEB-LYRICS-003` | a signed-in user nudges the timing and it is saved                                  |
| `WEB-LYRICS-004` | a guest fixing timing or text is asked to create an account                         |
| `WEB-LYRICS-005` | editing opens the lyrics as LRC; saving LRC sends it as synced lyrics               |
| `WEB-LYRICS-006` | with no lyrics, typed plain text is saved as plain; a failed save keeps the editor  |
| `WEB-LYRICS-007` | an imported .lrc file opens in the editor to check before saving                    |
| `WEB-LYRICS-008` | plain-text view drops timestamps; auto-scroll can be switched off and is remembered |
| `WEB-LYRICS-009` | unsynced lyrics show as plain text with no timing controls                          |
| `WEB-LYRICS-010` | with nothing playing it says so                                                     |
| `WEB-QROUTE-001` | /queue opens the queue panel and returns to Home                                    |
| `WEB-EQ-001`     | picking a preset moves the faders to its curve                                      |
| `WEB-EQ-002`     | moving a fader makes a custom curve, and double-click resets it to 0 dB             |
| `WEB-EQ-003`     | turning the equalizer off disables presets and faders                               |
| `WEB-EQ-004`     | bass boost, virtualizer and speed apply and show their values                       |
| `WEB-EQ-005`     | gapless and normalization switches update the account settings                      |
| `WEB-NP-007`     | "Add to playlist" opens the playlist picker for the song                            |
| `WEB-NP-008`     | a guest is asked to sign up first, and gets the picker once signed in               |
| `WEB-NP-009`     | there is no output picker where the browser cannot switch outputs                   |
| `WEB-LYRICS-011` | asks for lyrics in the preferred script, and asks again when it changes             |
| `WEB-LYRICS-012` | a guest who signs in to edit lyrics lands back in the editor                        |
| `WEB-LYRICS-013` | a guest who signs in to fix the timing gets that change saved                       |
| `WEB-LYRICS-014` | LRCLIB down says so and retries, instead of "No lyrics"                             |

## `test/screens/playlists.test.tsx`

| ID                  | Use case                                                                       |
| :------------------ | :----------------------------------------------------------------------------- |
| `WEB-PLAYLISTS-001` | a guest sees Liked Songs, an invitation, and is asked to sign up to create one |
| `WEB-PLAYLISTS-002` | lists the user's playlists with size and where they live                       |
| `WEB-PLAYLISTS-003` | creating a playlist opens it; a failure is reported                            |
| `WEB-PLAYLISTS-004` | in Offline Mode only playlists available on the device are shown               |
| `WEB-PLAYLIST-001`  | the user's own playlist shows "Made by you", its length, and an Add songs link |
| `WEB-PLAYLIST-002`  | a public playlist cannot be edited                                             |
| `WEB-PLAYLIST-003`  | play and shuffle play the playlist                                             |
| `WEB-PLAYLIST-004`  | removing a song takes it out at once and tells the server its position         |
| `WEB-PLAYLIST-005`  | a failed removal puts the song back and says so                                |
| `WEB-PLAYLIST-006`  | dragging reorders at once and saves the move; a failed save restores the order |
| `WEB-PLAYLIST-007`  | an empty playlist says so, cannot play, but can still be deleted from its menu |
| `WEB-PLAYLIST-008`  | someone else's own-playlist link shows "Playlist not found" to a guest         |

## `test/screens/settings-downloads.test.tsx`

| ID                 | Use case                                                                               |
| :----------------- | :------------------------------------------------------------------------------------- |
| `WEB-SETTINGS-001` | a guest is offered to create an account or sign in                                     |
| `WEB-SETTINGS-002` | a signed-in user sees their profile and can sign out                                   |
| `WEB-SETTINGS-003` | the web build shows no desktop-only sections, on either layout                         |
| `WEB-SETTINGS-004` | playback: streaming quality and the two switches change the settings                   |
| `WEB-SETTINGS-005` | choosing a section updates the address and shows it                                    |
| `WEB-SETTINGS-006` | download quality choices follow the file format                                        |
| `WEB-SETTINGS-007` | shows download progress counts and links to the Downloads page                         |
| `WEB-SETTINGS-008` | choosing a download folder confirms it; cancelling says nothing; a failure is reported |
| `WEB-SETTINGS-009` | a picked folder shows its name and can be reset to the default                         |
| `WEB-SETTINGS-010` | an unverified user can resend the verification link; verified users see no prompt      |
| `WEB-DLPAGE-001`   | with nothing downloaded it says so and where files go                                  |
| `WEB-DLPAGE-002`   | in-progress rows show their state, size and progress, with the right control           |
| `WEB-DLPAGE-003`   | finished downloads are counted, and play as a queue of downloads                       |
| `WEB-DLPAGE-004`   | "Save again" re-saves the kept copy, and explains when there is none                   |
| `WEB-DLPAGE-005`   | deleting asks first, warns that the browser keeps its file, and reports the result     |
| `WEB-DLPAGE-006`   | cancelling an unfinished download needs no file warning                                |
| `WEB-DLPAGE-007`   | "Delete all" removes every finished download                                           |
| `WEB-SETTINGS-011` | audio: the lyrics language is chosen per device; no output row where it can't switch   |
| `WEB-SETTINGS-012` | about: lists the uploaded builds, this device first, as download links                 |
| `WEB-SETTINGS-013` | about: says when nothing is uploaded, and offers a retry when the list fails           |
| `WEB-SETTINGS-014` | about: only a higher version than this app is called newer; a -dev build of it is not  |

## `test/screens/signin.test.tsx`

| ID               | Use case                                                                              |
| :--------------- | :------------------------------------------------------------------------------------ |
| `WEB-SIGNIN-001` | signs in with trimmed email, welcomes the user and goes home                          |
| `WEB-SIGNIN-002` | shows the server error and stays on the form                                          |
| `WEB-SIGNIN-003` | cannot submit until both email and password are filled                                |
| `WEB-SIGNIN-004` | shows "Please wait…" while the request is out                                         |
| `WEB-SIGNIN-005` | switching modes adds the display name field and clears the error                      |
| `WEB-SIGNIN-006` | registers with the given name, or the email name when left blank                      |
| `WEB-SIGNIN-007` | shows why the account is needed and finishes the guest's action after signing up      |
| `WEB-SIGNIN-008` | leaving without signing in forgets the guest's action                                 |
| `WEB-SIGNIN-009` | "Forgot password?" sends a reset link for the trimmed email and says it is on its way |
| `WEB-SIGNIN-010` | a forgot-password error shows, and switching back to sign in clears it                |

## `test/screens/email-links.test.tsx`

| ID              | Use case                                                                              |
| :-------------- | :------------------------------------------------------------------------------------ |
| `WEB-EMAIL-001` | the reset link sets the new password with its token and signs this device out         |
| `WEB-EMAIL-002` | mismatched new passwords are refused without calling the server                       |
| `WEB-EMAIL-003` | an expired reset link shows the server error                                          |
| `WEB-EMAIL-004` | a reset link without a token says so and shows no form                                |
| `WEB-EMAIL-005` | the verify link is sent once (even under StrictMode) and refreshes the signed-in user |
| `WEB-EMAIL-006` | a used or expired verify link shows the server error                                  |
| `WEB-EMAIL-007` | a verify link without a token fails without calling the server                        |

## `test/unit/api.test.ts`

| ID            | Use case                                                                         |
| :------------ | :------------------------------------------------------------------------------- |
| `WEB-API-001` | tags every request with X-Sonare-Client and sends no token as a guest            |
| `WEB-API-002` | sends the access token as a Bearer header once signed in                         |
| `WEB-API-003` | drops empty, null and undefined params but keeps 0 and false                     |
| `WEB-API-004` | URL-encodes ids that contain reserved characters                                 |
| `WEB-API-005` | sends JSON bodies with a JSON content type                                       |
| `WEB-API-006` | uses PUT to save and DELETE to remove favourites and follows                     |
| `WEB-API-007` | removes and reorders playlist tracks with the documented verbs and bodies        |
| `WEB-API-008` | passes stream quality and format through to /tracks/:id/stream                   |
| `WEB-API-009` | builds artwork URLs on the API origin, with an optional size                     |
| `WEB-API-010` | turns an error body into an ApiError with status, code and message               |
| `WEB-API-011` | falls back to a status message when the error body has no message                |
| `WEB-API-012` | reports "HTTP error <status>" when an error response is not JSON                 |
| `WEB-API-013` | resolves to an empty object for 204 and for a successful non-JSON body           |
| `WEB-API-014` | rejects with a TypeError when the server cannot be reached                       |
| `WEB-API-015` | refreshes on 401 and retries the request once with the new token                 |
| `WEB-API-016` | signs the user out and surfaces the 401 when the refresh is refused              |
| `WEB-API-017` | shares one refresh between requests that fail at the same time                   |
| `WEB-API-018` | does not try to refresh a guest request that gets 401                            |
| `WEB-API-019` | explains upstream outages, unreachable servers and other failures in plain words |

## `test/unit/audioDemux.test.ts`

| ID              | Use case                                                                                  |
| :-------------- | :---------------------------------------------------------------------------------------- |
| `WEB-DEMUX-001` | splits frames after the ID3 tag, with exact start times and duration                      |
| `WEB-DEMUX-002` | skips junk before the first frame, including a false sync word, and stops at an ID3v1 tag |
| `WEB-DEMUX-003` | recognises mono files                                                                     |
| `WEB-DEMUX-004` | a file with no MP3 frames is left to the audio element                                    |
| `WEB-DEMUX-005` | reads the OpusHead and times each packet from its TOC byte                                |
| `WEB-DEMUX-006` | joins a packet that continues onto the next page                                          |
| `WEB-DEMUX-007` | ignores pages from another logical stream                                                 |
| `WEB-DEMUX-008` | Ogg Vorbis and broken pages are not demuxed                                               |
| `WEB-DEMUX-009` | finds the Opus track and its blocks, even inside an unknown-size segment                  |
| `WEB-DEMUX-010` | laced blocks and non-Opus tracks are left to the audio element                            |
| `WEB-DEMUX-011` | packetAt finds the packet playing at a time                                               |
| `WEB-DEMUX-012` | formats it does not handle return null                                                    |

## `test/unit/auth.test.ts`

| ID             | Use case                                                                      |
| :------------- | :---------------------------------------------------------------------------- |
| `WEB-AUTH-001` | signing in stores the session, tells listeners and clears the signed-out flag |
| `WEB-AUTH-002` | a rejected sign-in throws the server message and leaves the user signed out   |
| `WEB-AUTH-003` | a sign-in failure without a message reports the status                        |
| `WEB-AUTH-004` | signing up sends the display name and starts a session                        |
| `WEB-AUTH-005` | signing up with a taken email throws the conflict message                     |
| `WEB-AUTH-006` | signing out revokes the refresh token on the server and forgets the session   |
| `WEB-AUTH-007` | signing out still clears the session when the server is unreachable           |
| `WEB-AUTH-008` | a guest signing out makes no request                                          |
| `WEB-AUTH-009` | an unsubscribed listener is not told about later changes                      |
| `WEB-AUTH-010` | restores a saved session on start-up                                          |
| `WEB-AUTH-011` | ignores a corrupt saved user instead of crashing                              |
| `WEB-AUTH-012` | refreshing without a refresh token signs out and returns null                 |
| `WEB-AUTH-013` | a refresh that cannot reach the server signs out                              |
| `WEB-AUTH-014` | without dev credentials, auth is ready immediately                            |
| `WEB-AUTH-015` | holds auth-ready until the dev account has signed in                          |
| `WEB-AUTH-016` | registers the dev account when it does not exist yet                          |
| `WEB-AUTH-017` | retries sign-in once when registration races an existing account              |
| `WEB-AUTH-018` | settles as a guest when every dev login attempt fails                         |
| `WEB-AUTH-019` | does not sign straight back in after the user signed out                      |
| `WEB-AUTH-020` | sends a guest to sign-up with the reason and holds the action until then      |
| `WEB-AUTH-021` | runs the action straight away for a signed-in user                            |
| `WEB-AUTH-022` | keeps only the latest pending action, and cancelling drops it                 |

## `test/unit/downloadTargets.test.ts`

| ID            | Use case                                                                        |
| :------------ | :------------------------------------------------------------------------------ |
| `WEB-TGT-001` | on the web, downloads go to the browser's Downloads by default                  |
| `WEB-TGT-002` | browsers without a folder picker are never asked                                |
| `WEB-TGT-003` | Chromium asks once for a folder and uses the one picked                         |
| `WEB-TGT-004` | cancelling the picker settles on browser downloads and does not ask again       |
| `WEB-TGT-005` | resetting goes back to browser downloads                                        |
| `WEB-TGT-006` | keeps partial data across reopening, so a download can resume                   |
| `WEB-TGT-007` | finishing hands the file to the browser under its name and keeps a copy         |
| `WEB-TGT-008` | deleting explains that the browser owns the saved file, and drops the kept copy |
| `WEB-TGT-009` | discarding a part empties it                                                    |
| `WEB-TGT-010` | writes a hidden part file in the folder and resumes from its size               |
| `WEB-TGT-011` | finishing never overwrites: it picks "Name (2)" when the name is taken          |
| `WEB-TGT-012` | on browsers without move(), finishing copies the part and removes it            |
| `WEB-TGT-013` | after a reload the folder needs permission again; a click can re-grant it       |
| `WEB-TGT-014` | deleting a file that was already removed reports it as missing                  |
| `WEB-TGT-015` | concat joins chunks in order                                                    |

## `test/unit/downloads.test.ts`

| ID           | Use case                                                                           |
| :----------- | :--------------------------------------------------------------------------------- |
| `WEB-DL-001` | queues server songs once, skips local files, and remembers the list                |
| `WEB-DL-002` | uses the quality and format from settings                                          |
| `WEB-DL-003` | fetches the file in 2 MB ranges and saves the exact bytes as "Artist - Title.webm" |
| `WEB-DL-004` | names AAC downloads .m4a and strips characters file systems reject                 |
| `WEB-DL-005` | with no size from the server, a short final range ends the download                |
| `WEB-DL-006` | runs at most two downloads at a time and starts the next when one finishes         |
| `WEB-DL-007` | tells the user once the whole batch is saved                                       |
| `WEB-DL-008` | refuses a video-only stream with a clear reason                                    |
| `WEB-DL-009` | fails with a permission message when the folder cannot be written                  |
| `WEB-DL-010` | an expired stream url (403) is re-resolved and the same file continues             |
| `WEB-DL-011` | gives up after the server keeps refusing fresh urls                                |
| `WEB-DL-012` | pausing keeps the bytes so far, and resuming asks only for the rest                |
| `WEB-DL-013` | starts over when the server now serves a different file than the part holds        |
| `WEB-DL-014` | a server that ignores Range on resume does not duplicate bytes                     |
| `WEB-DL-015` | a part that already holds the whole file (416) is finished without re-downloading  |
| `WEB-DL-016` | a dropped connection is retried after a pause and the download completes           |
| `WEB-DL-017` | downloads interrupted by closing the app carry on at the next start                |
| `WEB-DL-018` | asking again for a failed download retries it instead of adding a duplicate        |
| `WEB-DL-019` | deleting a finished download removes its file and the list entry                   |
| `WEB-DL-020` | a file that has moved is only removed from the list, with the reason               |
| `WEB-DL-021` | removing an unfinished download throws away its partial data                       |
| `WEB-DL-022` | removeMany counts files that could not be deleted                                  |
| `WEB-DL-023` | "save again" hands the kept copy to the browser, and reports when there is none    |
| `WEB-DL-024` | pause all and resume all act on every unfinished download                          |
| `WEB-DL-025` | a download becomes a playable track with its metadata                              |

## `test/unit/dsp.test.ts`

| ID            | Use case                                                                        |
| :------------ | :------------------------------------------------------------------------------ |
| `WEB-DSP-001` | starts flat, and restores a saved curve                                         |
| `WEB-DSP-002` | a saved curve with the wrong number of bands, or unreadable, falls back to flat |
| `WEB-DSP-003` | moving a band clamps it to ±12 dB, switches to Custom and is remembered         |
| `WEB-DSP-004` | choosing a preset loads its curve and saves the preset to the account           |
| `WEB-DSP-005` | an unknown preset name changes nothing                                          |
| `WEB-DSP-006` | releasing a fader commits the current preset name                               |
| `WEB-DSP-007` | adopts the account's preset after sign-in, unless the user has a custom curve   |
| `WEB-DSP-008` | useDsp re-renders on changes                                                    |
| `WEB-DSP-009` | playback speed reaches the element and keeps the pitch                          |
| `WEB-DSP-010` | builds 8 EQ bands (low shelf, peaks, high shelf) and applies the curve          |
| `WEB-DSP-011` | turning the EQ off flattens every stage without tearing the graph down          |
| `WEB-DSP-012` | the virtualizer widens stereo: full width is 2.5x, zero is untouched            |
| `WEB-DSP-013` | loudness normalization is a gentle compressor; off is a pass-through            |
| `WEB-DSP-014` | without Web Audio, playback carries on unprocessed                              |
| `WEB-DSP-015` | a suspended context is resumed on the next play                                 |

## `test/unit/favourites.test.tsx`

| ID            | Use case                                                                           |
| :------------ | :--------------------------------------------------------------------------------- |
| `WEB-FAV-001` | the heart flips before the server answers                                          |
| `WEB-FAV-002` | a failed save rolls the heart back to the server value and rethrows                |
| `WEB-FAV-003` | a failed un-heart returns to the previous local choice, not the stale server value |
| `WEB-FAV-004` | tells saved-listeners only after the server accepted the change                    |
| `WEB-FAV-005` | without a local change, the server value is used as is                             |
| `WEB-FAV-006` | every heart for the same song updates together                                     |
| `WEB-FAV-007` | a guest is sent to sign up, and the heart is saved after signing in                |
| `WEB-FAV-008` | a toggle that fails on the server shows the old state again                        |
| `WEB-FAV-009` | no track id means not favourite and a no-op toggle                                 |
| `WEB-FAV-010` | useFavouriteLookup re-renders lists when any heart changes                         |

## `test/unit/hooks.test.tsx`

| ID             | Use case                                                            |
| :------------- | :------------------------------------------------------------------ |
| `WEB-HOOK-001` | starts loading, then exposes the data                               |
| `WEB-HOOK-002` | exposes a failure as error and stops loading                        |
| `WEB-HOOK-003` | refetch runs the request again and clears the previous error        |
| `WEB-HOOK-004` | when disabled it does not call and shows the initial data           |
| `WEB-HOOK-005` | drops a slow response that arrives after the inputs changed         |
| `WEB-HOOK-006` | useDebounce only passes on the last value after the delay           |
| `WEB-HOOK-007` | useSearch sends one trimmed request for the final query             |
| `WEB-HOOK-008` | useSearch sends nothing for a blank query                           |
| `WEB-HOOK-009` | useAuth follows sign-in and sign-out                                |
| `WEB-HOOK-010` | account-only lists are not requested for a guest                    |
| `WEB-HOOK-011` | account data loads after sign-in and is cleared on sign-out         |
| `WEB-HOOK-012` | a user's own playlist comes from /me, a public one from the catalog |
| `WEB-HOOK-013` | a guest opening someone's own-playlist link makes no /me request    |
| `WEB-HOOK-014` | useMyPlaylists refetches when playlists change anywhere in the app  |
| `WEB-HOOK-015` | the favourites list refetches after a heart is saved elsewhere      |
| `WEB-HOOK-016` | lyrics for a local file are never requested from the server         |
| `WEB-HOOK-017` | lyrics errors surface as the hook error                             |

## `test/unit/lib.test.ts`

| ID            | Use case                                                                                          |
| :------------ | :------------------------------------------------------------------------------------------------ |
| `WEB-LIB-001` | the web build has no local library, offline mode, native EQ or server address, and includes admin |
| `WEB-LIB-002` | cn merges Tailwind classes and knows the custom type scale is a size, not a colour                |
| `WEB-LIB-003` | formatDuration shows m:ss and treats bad input as 0:00                                            |
| `WEB-LIB-004` | formatBytes picks KB, MB or GB                                                                    |
| `WEB-LIB-005` | placeholder waveforms are bounded and repeatable per seed                                         |
| `WEB-LIB-006` | reports offline immediately when the browser says so, without probing                             |
| `WEB-LIB-007` | is online when either probe answers                                                               |
| `WEB-LIB-008` | is offline when both probes fail or time out                                                      |
| `WEB-LIB-009` | sends an error with its type, stack and page                                                      |
| `WEB-LIB-010` | turns strings and objects into readable messages                                                  |
| `WEB-LIB-011` | ignores aborts, ResizeObserver noise and network failures                                         |
| `WEB-LIB-012` | sends nothing while offline                                                                       |
| `WEB-LIB-013` | the same message is sent at most once a minute, and at most 20 per page                           |
| `WEB-LIB-014` | catches uncaught errors and unhandled rejections, but not failed image loads                      |
| `WEB-LIB-015` | picks web, tablet or phone by width and follows resizes                                           |

## `test/unit/player.test.ts`

| ID               | Use case                                                                         |
| :--------------- | :------------------------------------------------------------------------------- |
| `WEB-PLAYER-001` | resolves a stream at the chosen quality, points the element at it and plays      |
| `WEB-PLAYER-002` | keeps an absolute stream url as it is                                            |
| `WEB-PLAYER-003` | reuses a fresh url for the same track, and re-resolves one about to expire       |
| `WEB-PLAYER-004` | a slow answer for a track the user already skipped does not replace the new one  |
| `WEB-PLAYER-005` | a stream that cannot be resolved surfaces the server message                     |
| `WEB-PLAYER-006` | reports buffering between waiting and playing                                    |
| `WEB-PLAYER-007` | flags a muxed (video) fallback stream                                            |
| `WEB-PLAYER-008` | a media error re-resolves the url once without showing an error                  |
| `WEB-PLAYER-009` | a second media error on the same track shows "Playback failed"                   |
| `WEB-PLAYER-010` | retry fetches a fresh url and plays again, even after giving up                  |
| `WEB-PLAYER-011` | a blocked autoplay asks the user to press play instead of reporting a failure    |
| `WEB-PLAYER-012` | toggle plays when paused and pauses when playing; does nothing with no track     |
| `WEB-PLAYER-013` | seek clamps to the track and waits for a known duration                          |
| `WEB-PLAYER-014` | notifies ended-listeners when a track finishes                                   |
| `WEB-PLAYER-015` | a playback listener gets the current state at once and stops after unsubscribing |
| `WEB-PLAYER-016` | clamps, applies and remembers the volume                                         |
| `WEB-PLAYER-017` | mute goes to 0 and unmute restores the previous level                            |
| `WEB-PLAYER-018` | unmuting after muting by dragging to 0 goes back to full volume                  |
| `WEB-PLAYER-019` | starts at the remembered volume; bad or out-of-range values fall back safely     |

## `test/unit/plays-sync.test.ts`

| ID             | Use case                                                                           |
| :------------- | :--------------------------------------------------------------------------------- |
| `WEB-PLAY-001` | a guest listening records nothing                                                  |
| `WEB-PLAY-002` | a long song counts after 30 seconds, not before                                    |
| `WEB-PLAY-003` | a short song counts at half its length; an unknown length waits 30 seconds         |
| `WEB-PLAY-004` | one listen counts once; a replay counts again                                      |
| `WEB-PLAY-005` | local files are sent by fingerprint and server tracks by bare id                   |
| `WEB-PLAY-006` | each account only uploads its own plays (plus untagged older ones)                 |
| `WEB-PLAY-007` | removing uploaded plays keeps ones recorded meanwhile                              |
| `WEB-PLAY-008` | unreadable stored plays are treated as none                                        |
| `WEB-SYNC-001` | a counted play uploads straight away in Online Mode and leaves the queue           |
| `WEB-SYNC-002` | Offline Mode holds plays, and switching to Online uploads them and refreshes lists |
| `WEB-SYNC-003` | with the network down nothing is sent; the online event sends it                   |
| `WEB-SYNC-004` | a server error keeps the plays and retries with backoff                            |
| `WEB-SYNC-005` | plays the server rejects outright (4xx) are dropped instead of retried forever     |
| `WEB-SYNC-006` | an auth failure (401) keeps the plays for later                                    |
| `WEB-SYNC-007` | plays counted during an upload go up in one follow-up request                      |
| `WEB-SYNC-008` | useSyncStatus reports waiting plays for the signed-in account                      |
| `WEB-SYNC-009` | signing in uploads what that account has waiting                                   |

## `test/unit/settings.test.ts`

| ID            | Use case                                                                      |
| :------------ | :---------------------------------------------------------------------------- |
| `WEB-SET-001` | starts from the documented defaults                                           |
| `WEB-SET-002` | a guest change applies locally and is never sent                              |
| `WEB-SET-003` | quick successive changes are sent once, with only the changed fields          |
| `WEB-SET-004` | a failed save keeps the local value                                           |
| `WEB-SET-005` | loading merges the account settings and drops values this build does not know |
| `WEB-SET-006` | a guest does not ask for account settings, but signing in loads them          |
| `WEB-SET-007` | a failed load is tried again on the next sign-in                              |
| `WEB-SET-008` | useSettings re-renders with every change                                      |

## `test/unit/store.test.ts`

| ID              | Use case                                                                     |
| :-------------- | :--------------------------------------------------------------------------- |
| `WEB-STORE-001` | keeps the typed query and chosen type                                        |
| `WEB-STORE-002` | a search goes loading → done and remembers what the results are for          |
| `WEB-STORE-003` | a slow answer to an older search does not overwrite the newer one            |
| `WEB-STORE-004` | coming back to the same search does not refetch, but a failed one is retried |
| `WEB-STORE-005` | starts empty                                                                 |
| `WEB-STORE-006` | opens, closes and toggles the queue panel and the sidebar                    |
| `WEB-STORE-007` | the search survives a reload for this tab only                               |
| `WEB-STORE-008` | an unknown saved search type is ignored                                      |
| `WEB-STORE-009` | the collapsed sidebar is remembered across restarts                          |
| `WEB-STORE-010` | a toast shows, then dismisses itself after its duration                      |
| `WEB-STORE-011` | keeps only the three newest toasts and can dismiss one early                 |

## `test/unit/tags.test.ts`

| ID            | Use case                                                                           |
| :------------ | :--------------------------------------------------------------------------------- |
| `WEB-TAG-001` | reads "Artist - Title" and uses the parent folder as the album                     |
| `WEB-TAG-002` | removes download-site stamps, NULs and extra spaces                                |
| `WEB-TAG-015` | strips ".info" download-site stamps completely                                     |
| `WEB-TAG-003` | reads title, artist, album, year and genre from ID3v2.3 frames                     |
| `WEB-TAG-004` | uses TLEN for the duration when present                                            |
| `WEB-TAG-005` | works out a CBR duration from the bitrate and file size                            |
| `WEB-TAG-006` | prefers the Xing frame count for VBR files                                         |
| `WEB-TAG-007` | reads only the tag and the first frame, not the whole file                         |
| `WEB-TAG-016` | ID3v2.4: synchsafe frame sizes, UTF-16BE text and TDRC dates                       |
| `WEB-TAG-017` | ID3v2.2: three-letter frames with 3-byte sizes                                     |
| `WEB-TAG-018` | an extended ID3 header is skipped before the frames                                |
| `WEB-TAG-019` | MPEG-2 (22.05 kHz) files get a duration from their bitrate                         |
| `WEB-TAG-020` | Ogg Vorbis: tags from the comment header, duration at the stream's own sample rate |
| `WEB-TAG-021` | MP4 with a 64-bit atom size and a version-1 mvhd                                   |
| `WEB-TAG-008` | FLAC: duration from STREAMINFO and tags from Vorbis comments                       |
| `WEB-TAG-009` | Ogg Opus: tags from OpusTags and duration from the last granule at 48 kHz          |
| `WEB-TAG-010` | MP4/M4A: finds moov after mdat, reads mvhd duration and ilst tags                  |
| `WEB-TAG-011` | recognises the container by its bytes, not the extension                           |
| `WEB-TAG-012` | WAV and WebM get a codec only; unknown files get nothing                           |
| `WEB-TAG-013` | a reader that fails mid-way falls back to no tags instead of throwing              |
| `WEB-TAG-014` | a truncated ID3 tag keeps whatever frames were complete                            |

## `test/components/dialogs-select.test.tsx`

| ID               | Use case                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `WEB-DIALOG-001` | a prompt suggests a name, submits the trimmed text with Enter, and closes                     |
| `WEB-DIALOG-002` | a blank name cannot be submitted; Cancel, Escape and the backdrop all cancel                  |
| `WEB-DIALOG-003` | Escape on a dialog does not reach the shortcuts underneath                                    |
| `WEB-DIALOG-004` | a confirm shows its text, focuses the action, and answers true or false                       |
| `WEB-DIALOG-005` | opening a dialog cancels the one already open; cancelOpenDialog closes it                     |
| `WEB-DIALOG-006` | the playlist picker adds the songs to a playlist and says so                                  |
| `WEB-DIALOG-007` | the picker creates a playlist by name and adds to it; failures keep it open                   |
| `WEB-SELECT-001` | shows the chosen option; the list marks it and picking another changes it                     |
| `WEB-SELECT-002` | picking the current option changes nothing                                                    |
| `WEB-SELECT-003` | works from the keyboard: arrows open and move, Enter picks, Escape closes back to the trigger |
| `WEB-SELECT-004` | Space in the list picks instead of reaching the player shortcuts; a click outside closes it   |
| `WEB-SELECT-005` | a custom trigger and options with details and icons                                           |

## `test/desktop/library.test.tsx`

| ID        | Use case                                                      |
| --------- | ------------------------------------------------------------- |
| `DSK-051` | folders open from the Songs tab only; there is no Folders tab |
| `DSK-052` | an old ?view=folders link opens the Songs tab                 |

## `test/desktop/output.test.tsx`

| ID        | Use case                                                                         |
| --------- | -------------------------------------------------------------------------------- |
| `DSK-044` | lists the PulseAudio / PipeWire outputs with their kind                          |
| `DSK-045` | choosing one moves only Sonare's own stream, and is remembered                   |
| `DSK-046` | back to the system default sends the stream to the default sink                  |
| `DSK-047` | the chosen output is applied again on start-up and whenever another track starts |
| `DSK-048` | with the default output nothing is moved when tracks change                      |
| `DSK-049` | without pactl only the system default is offered                                 |
| `DSK-050` | the output button switches the speaker from the list                             |

## `test/unit/devicePrefs.test.ts`

| ID              | Use case                                                                       |
| --------------- | ------------------------------------------------------------------------------ |
| `WEB-PREFS-001` | start at the original lyrics and the system output, and restore what was saved |
| `WEB-PREFS-002` | an unknown script or unreadable storage falls back to the defaults             |
| `WEB-PREFS-003` | every script offered is one the server accepts                                 |

## `test/unit/output.test.tsx`

| ID               | Use case                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `WEB-OUTPUT-001` | without setSinkId there is nothing to choose, and no button                                |
| `WEB-OUTPUT-002` | lists the output devices after the system default, with their kind                         |
| `WEB-OUTPUT-003` | choosing a device routes the element, then the graph once it exists, and is remembered     |
| `WEB-OUTPUT-004` | the output button lists the devices, marks the current one, and switches                   |
| `WEB-OUTPUT-005` | a remembered device that is gone reads as the system default                               |
| `WEB-OUTPUT-006` | the Now Playing card opens the same list and switches the device                           |
| `WEB-OUTPUT-007` | before a media permission the blank placeholder output is the default, not a second device |
