# Sonare mobile test plan

Every test is listed here by ID; `scripts/check-test-plan.mjs` (run before `npm test`) fails if a test and
this plan disagree. Tests run under Jest with react-native mocked (`jest.setup.js`); shared fixtures and the
navigation mock live in `test-utils/`.

## `__tests__/components-behaviour.test.tsx`

| ID             | Use case                                                                                    |
| :------------- | :------------------------------------------------------------------------------------------ |
| `MOB-COMP-002` | BrandMark is decorative and drawn at the requested size                                     |
| `MOB-COMP-007` | Icon draws the mapped glyph at its size and colour, and nothing for an unknown name         |
| `MOB-COMP-022` | EqualizerBars draws three bars in the given colour                                          |
| `MOB-COMP-023` | SourceGlyph shows a gold phone for local files and a green cloud for the server             |
| `MOB-COMP-013` | Toast shows its message and detail, and fades out when hidden                               |
| `MOB-COMP-017` | shows the image, falls back to the second url, then to a plain tile                         |
| `MOB-COMP-036` | without an image, a gradient is drawn, with rings when asked                                |
| `MOB-COMP-006` | GuestPrompt offers to create an account or sign in                                          |
| `MOB-COMP-010` | Sheet shows its content, closes from the backdrop or back button, and unmounts when closed  |
| `MOB-COMP-019` | shows the song, pauses, skips, hearts, and opens Now Playing                                |
| `MOB-COMP-037` | is hidden when nothing is loaded, and shows a saved song as on the phone                    |
| `MOB-COMP-020` | "Play next" and "Add to queue" go to the player and close the menu                          |
| `MOB-COMP-038` | a guest choosing favourites or playlists is asked to create an account                      |
| `MOB-COMP-039` | a signed-in user picks a playlist, or names a new one, to add the song to                   |
| `MOB-COMP-040` | a playlist that cannot be updated shows why and stays open                                  |
| `MOB-COMP-041` | the download item follows the song's download state, and hides offline                      |
| `MOB-COMP-042` | a screen can add its own action, e.g. "Remove from playlist"                                |
| `MOB-COMP-021` | tapping seeks to that fraction; played bars are coloured by mode                            |
| `MOB-COMP-043` | without a seek handler the waveform cannot be tapped                                        |
| `MOB-COMP-025` | one song: download, pause while running, resume, delete once saved; nothing for local files |
| `MOB-COMP-024` | a whole album: download the server songs, show progress, offer delete when all are saved    |

## `__tests__/components.test.tsx`

| ID             | Use case                                                                      |
| :------------- | :---------------------------------------------------------------------------- |
| `MOB-COMP-001` | Badge renders with different variants                                         |
| `MOB-COMP-003` | Button renders with variants and handles onPress                              |
| `MOB-COMP-004` | Chip renders chip with active/inactive state and handles onPress              |
| `MOB-COMP-005` | Field renders label, TextInput, error message, and right accessory            |
| `MOB-COMP-008` | IconButton renders touchable icon button with accessibility label             |
| `MOB-COMP-009` | Segmented renders segmented tabs and triggers onChange                        |
| `MOB-COMP-011` | StateView renders loading indicator, error with retry, or empty message       |
| `MOB-COMP-012` | Switch renders toggle switch and handles onValueChange                        |
| `MOB-COMP-014` | Header renders navigation header with left, title, and right actions          |
| `MOB-COMP-015` | Screen renders screen layout with safe area insets and optional scrollview    |
| `MOB-COMP-016` | TabBar renders tab bar items with active indicator                            |
| `MOB-COMP-018` | SongRow renders track info, duration, favourite heart, and long-press menu    |
| `MOB-COMP-026` | AudioEngine binds player store to native player and handles stream resolution |

## `__tests__/data.test.tsx`

| ID             | Use case                                                                                          |
| :------------- | :------------------------------------------------------------------------------------------------ |
| `MOB-DATA-001` | formats API_BASE and API_ORIGIN for default dev environment                                       |
| `MOB-DATA-002` | absoluteUrl resolves relative paths and returns full URLs as-is; returns undefined for null       |
| `MOB-DATA-003` | artworkUrl generates formatted artwork URL with size parameter                                    |
| `MOB-DATA-004` | httpRequest performs GET request and parses JSON response                                         |
| `MOB-DATA-005` | httpRequest handles non-JSON response gracefully                                                  |
| `MOB-DATA-006` | httpRequest attaches X-Sonare-Client header for API_ORIGIN requests                               |
| `MOB-DATA-007` | httpRequest handles network error with NetworkError                                               |
| `MOB-DATA-008` | httpRequest handles timeout with NetworkError                                                     |
| `MOB-DATA-009` | hydrate restores session from AsyncStorage                                                        |
| `MOB-DATA-010` | hydrate falls back to guest mode on corrupted session                                             |
| `MOB-DATA-011` | signIn authenticates user and saves session                                                       |
| `MOB-DATA-012` | signUp registers user and saves session                                                           |
| `MOB-DATA-013` | signOut calls server logout and clears local session                                              |
| `MOB-DATA-014` | refresh rotates refresh token and updates session                                                 |
| `MOB-DATA-015` | refresh clears session on 401 response                                                            |
| `MOB-DATA-016` | refresh deduplicates concurrent refresh calls                                                     |
| `MOB-DATA-017` | search queries catalog with query and type                                                        |
| `MOB-DATA-018` | trending fetches trending tracks with limit and region                                            |
| `MOB-DATA-019` | album and albumTracks fetch album details and tracklist                                           |
| `MOB-DATA-020` | artist, artistTopTracks, artistAlbums fetch artist metadata                                       |
| `MOB-DATA-021` | playlist and playlistTracks fetch public playlist data                                            |
| `MOB-DATA-022` | stream fetches stream info with quality and format params                                         |
| `MOB-DATA-023` | peaks and lyrics fetch audio peaks and synced lyrics                                              |
| `MOB-DATA-024` | me, settings, and saveSettings manage user profile and preferences                                |
| `MOB-DATA-025` | libraryTracks, favourites, setFavourite, setFollowing manage library entities                     |
| `MOB-DATA-026` | recentlyPlayed and mostPlayed fetch listening history                                             |
| `MOB-DATA-027` | reportPlays posts batch play events to /me/sync                                                   |
| `MOB-DATA-028` | user playlist methods manage personal playlists                                                   |
| `MOB-DATA-029` | auto-refreshes expired access token on 401 response                                               |
| `MOB-DATA-030` | handles 204 No Content response                                                                   |
| `MOB-DATA-031` | throws ApiError on non-2xx status with message and code                                           |
| `MOB-DATA-032` | isOwnPlaylist identifies sonare-prefixed playlist IDs                                             |
| `MOB-DATA-033` | hydrate loads settings from storage and server                                                    |
| `MOB-DATA-034` | update saves settings locally and debounces server sync                                           |
| `MOB-DATA-035` | sanitizes invalid settings values with pick helper                                                |
| `MOB-DATA-036` | queuePlay adds pending play and triggers background upload                                        |
| `MOB-DATA-037` | queuePlay stores a local file by fingerprint and a server song by bare id, for the signed-in user |
| `MOB-DATA-038` | flush drops confirmed plays after successful reportPlays                                          |
| `MOB-DATA-039` | flush schedules retry on network error and drops invalid 4xx errors                               |
| `MOB-DATA-040` | startBackgroundSync wires its network and app-state triggers once, even if called twice           |
| `MOB-DATA-041` | requireAccount executes immediately when signed in                                                |
| `MOB-DATA-042` | requireAccount stores pending action and navigates to SignIn when guest                           |
| `MOB-DATA-043` | takePendingAction executes and clears pending action                                              |
| `MOB-DATA-044` | clearPendingAction clears pending action without executing                                        |
| `MOB-DATA-045` | useAsync executes promise and provides data, loading, error, refetch                              |
| `MOB-DATA-046` | useAsync respects enabled flag                                                                    |
| `MOB-DATA-047` | useAsync re-runs when dependency changes or refetch is invoked                                    |
| `MOB-DATA-048` | artGradients exports valid 3-color gradient arrays                                                |
| `MOB-DATA-049` | signIn saves session to keychain and leaves AsyncStorage empty                                    |
| `MOB-DATA-050` | hydrate migrates legacy AsyncStorage session to keychain                                          |
| `MOB-DATA-051` | hydrate with nothing stored defaults to guest status                                              |
| `MOB-DATA-052` | signOut resets keychain credentials and reverts status to guest                                   |
| `MOB-DATA-053` | requestPasswordReset posts the email without a token; a server error is thrown with its message   |
| `MOB-DATA-054` | resendVerification sends the access token                                                         |
| `MOB-DATA-055` | a hand-made (Custom) EQ stays on the phone; gapless and normalization sync                        |
| `MOB-DATA-056` | signing in keeps the phone's Custom EQ but takes the account's other settings                     |

## `__tests__/lib.test.tsx`

| ID            | Use case                                                                                         |
| :------------ | :----------------------------------------------------------------------------------------------- |
| `MOB-LIB-001` | joins truthy class names and ignores falsy values                                                |
| `MOB-LIB-002` | formatDuration formats ms to mm:ss correctly                                                     |
| `MOB-LIB-003` | generatePeaks returns deterministic pseudo-random peak heights                                   |
| `MOB-LIB-004` | songCount handles singular, plural, and zero/null counts                                         |
| `MOB-LIB-005` | hasInternet resolves true when endpoint responds                                                 |
| `MOB-LIB-006` | hasInternet resolves false when all endpoints fail or abort                                      |
| `MOB-LIB-007` | displays Alert and resolves true when user confirms deletion                                     |
| `MOB-LIB-008` | resolves false when user cancels deletion                                                        |
| `MOB-LIB-009` | shows error alert and resolves false when delete fails                                           |
| `MOB-LIB-010` | displays Alert and deletes files from downloads store                                            |
| `MOB-LIB-011` | alerts user if finished files could not be deleted from storage                                  |
| `MOB-LIB-012` | reportError posts the error with its kind, fatality and platform                                 |
| `MOB-LIB-013` | offline failures are not reported, repeats wait a minute, and a session sends at most 20         |
| `MOB-LIB-014` | installErrorReporting reports uncaught errors and unhandled rejections, then hands them on       |
| `MOB-LIB-044` | without Hermes promise tracking, uncaught errors are still reported                              |
| `MOB-LIB-015` | durations, easings and the springs exported; springs settle without overshoot                    |
| `MOB-LIB-016` | AnimatedView rises in after its delay; FadeView fades with visibility; reduced motion skips both |

## `__tests__/native.test.ts`

| ID            | Use case                                                                   |
| :------------ | :------------------------------------------------------------------------- |
| `MOB-NAT-001` | load invokes NativeModules.SonarePlayer.load                               |
| `MOB-NAT-002` | play, pause, seekTo, stop invoke native player methods                     |
| `MOB-NAT-003` | player events reach their own handlers until unsubscribed                  |
| `MOB-NAT-004` | setActive, start, pause, discard, partSize invoke native methods           |
| `MOB-NAT-005` | deleteFile, exists, pickFolder, defaultLocation invoke file system methods |
| `MOB-NAT-006` | download events reach their own handlers until unsubscribed                |

## `__tests__/navigation.test.tsx`

| ID            | Use case                                                                         |
| :------------ | :------------------------------------------------------------------------------- |
| `MOB-NAV-001` | navigates to target screen within active tab                                     |
| `MOB-NAV-002` | defaults to Home tab if root state has no active tab                             |
| `MOB-NAV-003` | shows only a spinner while the saved session is being read                       |
| `MOB-NAV-004` | signing in loads the library, then finishes what the guest was doing             |
| `MOB-NAV-005` | a mode change shows a toast that goes away after a few seconds                   |
| `MOB-NAV-006` | shows Home, Library, Playlists and Search, starts on Home, and switches on press |
| `MOB-NAV-007` | the active tab is green online and gold offline                                  |

## `__tests__/screens-browse.test.tsx`

| ID               | Use case                                                                               |
| :--------------- | :------------------------------------------------------------------------------------- |
| `MOB-HOME-001`   | a signed-in user is welcomed by first name and can pick up their last song             |
| `MOB-HOME-002`   | with a song loaded, the continue card pauses and resumes it                            |
| `MOB-HOME-003`   | a guest is invited to sign in and no account data is requested                         |
| `MOB-HOME-004`   | trending plays within the chart; when the music service is down it says so and retries |
| `MOB-HOME-005`   | choosing Offline asks first; the header opens search and settings                      |
| `MOB-HOME-006`   | offline, it lists the downloaded songs and asks the server for nothing                 |
| `MOB-SEARCH-001` | typing searches once the user pauses, and shows a top result and songs                 |
| `MOB-SEARCH-002` | tapping a song plays it with the other results queued                                  |
| `MOB-SEARCH-003` | album and artist results open their pages; filters change the search type              |
| `MOB-SEARCH-004` | no results says so; a failed search can be retried                                     |
| `MOB-SEARCH-005` | offline, the server is never searched and it offers to go online                       |
| `MOB-SEARCH-006` | the Genres chip shows the categories, and a category searches for its query            |
| `MOB-SEARCH-007` | a genre opened from the Library arrives as the search                                  |
| `MOB-LIB-S-001`  | a guest is invited to create an account instead of seeing a library                    |
| `MOB-LIB-S-002`  | lists the saved server songs; Play all plays them in order                             |
| `MOB-LIB-S-003`  | the sort chip opens a sheet of orders; picking one refetches                           |
| `MOB-LIB-S-004`  | "only on this phone" keeps just the downloaded songs                                   |
| `MOB-LIB-S-005`  | there is no Folders tab (Settings has music folders); Downloads opens downloads        |
| `MOB-PLS-001`    | a guest is asked to sign up before creating a playlist                                 |
| `MOB-PLS-002`    | lists the user's playlists with their kind; tapping one opens it                       |
| `MOB-PLS-003`    | creating a playlist names it and opens it                                              |
| `MOB-PLS-004`    | deleting from a playlist's options asks first                                          |
| `MOB-PLS-005`    | offline, playlists wait for Online Mode                                                |
| `MOB-PL-001`     | the user's own playlist shows its length and plays from the start                      |
| `MOB-PL-002`     | a public playlist has no owner options                                                 |
| `MOB-PL-003`     | deleting the playlist from its options leaves the page once it is gone                 |
| `MOB-PL-004`     | the favourite button on a playlist saves it                                            |
| `MOB-PL-005`     | your own playlist has no favourite button                                              |
| `MOB-ALB-001`    | an album shows its artist link and year, and shuffle plays it all                      |
| `MOB-ALB-002`    | "Add to queue" appends the whole album                                                 |
| `MOB-ALB-003`    | the favourite button on an album saves it                                              |
| `MOB-ART-001`    | an artist shows listeners and albums; album tiles open the album                       |
| `MOB-ART-002`    | following saves to the account; a failure turns it back                                |
| `MOB-ART-003`    | an artist with no songs says so                                                        |

## `__tests__/screens-player.test.tsx`

| ID               | Use case                                                                                   |
| :--------------- | :----------------------------------------------------------------------------------------- |
| `MOB-NP-001`     | shows the song, where it plays from, its quality and the time left                         |
| `MOB-NP-002`     | a downloaded song is shown as on this device                                               |
| `MOB-NP-003`     | transport buttons drive the player                                                         |
| `MOB-NP-004`     | tapping the waveform seeks to that point                                                   |
| `MOB-NP-005`     | a guest hearting the song is asked to sign up; a signed-in user saves it                   |
| `MOB-NP-006`     | playback errors are shown; lyrics, queue, equalizer and the song menu are one tap away     |
| `MOB-NP-007`     | with nothing playing it says so and can be closed                                          |
| `MOB-Q-001`      | shows what is next, counts server songs, and plays a tapped song                           |
| `MOB-Q-002`      | "Clear queue" keeps only the current song; then it says the queue has ended                |
| `MOB-Q-003`      | a song's menu can remove it from the queue                                                 |
| `MOB-Q-004`      | saving the queue creates a playlist with every queued song                                 |
| `MOB-Q-005`      | a failed save says why; shuffle and repeat work from here                                  |
| `MOB-Q-006`      | an empty queue says so                                                                     |
| `MOB-LYR-001`    | highlights the line being sung and taps jump to a line                                     |
| `MOB-LYR-002`    | the offset shifts which line is current and where taps land                                |
| `MOB-LYR-003`    | plain text view shows the words without timing                                             |
| `MOB-LYR-004`    | no lyrics, or a local file, says none were found without asking the server for local files |
| `MOB-LYR-005`    | LRCLIB down shows the reason and a retry, not "No lyrics found"                            |
| `MOB-EQ-001`     | presets and switches respond to taps                                                       |
| `MOB-EQ-002`     | a chosen preset is still selected when the screen is opened again                          |
| `MOB-EQ-003`     | moving a band starts a Custom curve from the preset and shows its level                    |
| `MOB-EQ-004`     | bands stop at ±12 dB                                                                       |
| `MOB-EQ-005`     | bass boost and virtualizer adjust and show their amount                                    |
| `MOB-EQ-006`     | speed, crossfade and normalization change what the player gets                             |
| `MOB-EQ-007`     | switching the equalizer off freezes the effects but not speed or transitions               |
| `MOB-EQ-008`     | the output card shows the device in use and follows changes                                |
| `MOB-DL-S-001`   | with nothing downloaded it says so                                                         |
| `MOB-DL-S-002`   | shows progress for running downloads and lets them be paused, resumed or retried           |
| `MOB-DL-S-003`   | finished songs play as a queue of downloads; a moved file is marked                        |
| `MOB-DL-S-004`   | deleting asks first and deletes the file; a moved file is only taken off the list          |
| `MOB-DL-S-005`   | "Delete all" removes every finished download after asking                                  |
| `MOB-SET-S-001`  | a guest is offered sign-in and sign-up                                                     |
| `MOB-SET-S-002`  | signing out asks first                                                                     |
| `MOB-SET-S-003`  | the download format changes the quality description and is saved                           |
| `MOB-SET-S-004`  | the download location can be changed or reset                                              |
| `MOB-SET-S-005`  | a folder that cannot be used is reported                                                   |
| `MOB-SET-S-006`  | an unverified account can resend the verification link; verified accounts see no prompt    |
| `MOB-SIGNIN-001` | checks the form before sending anything                                                    |
| `MOB-SIGNIN-002` | signs in with a normalised email and goes back                                             |
| `MOB-SIGNIN-003` | a gate visit opens on sign-up, needs a name and 8+ character password                      |
| `MOB-SIGNIN-004` | server and network failures are shown plainly                                              |
| `MOB-SIGNIN-005` | "keep listening" leaves without an account                                                 |
| `MOB-SIGNIN-006` | "Forgot password?" emails a reset link for the normalised email and says so                |
| `MOB-SIGNIN-007` | a reset request error shows, and "Sign in" goes back to the form                           |
| `MOB-MODE-001`   | confirming switches to Offline Mode and goes back                                          |
| `MOB-MODE-002`   | cancelling keeps the current mode                                                          |
| `MOB-MODE-003`   | turning off "stay offline automatically" is remembered                                     |
| `MOB-FOLD-001`   | a phone with no scanned folders shows no made-up folders                                   |

## `__tests__/store.test.ts`

| ID              | Use case                                                                                         |
| :-------------- | :----------------------------------------------------------------------------------------------- |
| `MOB-STORE-001` | playTrack sets current track, queue, playing state, and seek request                             |
| `MOB-STORE-002` | setCurrentTrack, setQueue, setIsPlaying, setPositionMs, setDurationMs, setBuffering update state |
| `MOB-STORE-003` | setError sets error message and pauses playback                                                  |
| `MOB-STORE-004` | seekTo updates positionMs and seekRequest nonce                                                  |
| `MOB-STORE-005` | playNextInQueue inserts track immediately after current track                                    |
| `MOB-STORE-006` | addToQueue appends track to end of queue                                                         |
| `MOB-STORE-007` | toggleShuffle shuffles remaining queue keeping current track first                               |
| `MOB-STORE-008` | cycleRepeat cycles between off, all, one                                                         |
| `MOB-STORE-009` | playNext advances to next track in queue or loops if repeat all                                  |
| `MOB-STORE-010` | playPrevious moves to previous track or seeks to start if position > 3s                          |
| `MOB-STORE-011` | onTrackEnded handles repeat one, repeat all, and end of queue                                    |
| `MOB-STORE-012` | hydrate loads saved downloads list and location from AsyncStorage                                |
| `MOB-STORE-013` | enqueue adds new server tracks and skips existing ones                                           |
| `MOB-STORE-014` | pause and resume toggle download states                                                          |
| `MOB-STORE-015` | pauseAll and resumeAll batch update active downloads                                             |
| `MOB-STORE-016` | remove discards active download and deletes finished file                                        |
| `MOB-STORE-017` | chooseLocation and resetLocation update download directory                                       |
| `MOB-STORE-018` | checkFiles checks existence of downloaded files on disk                                          |
| `MOB-STORE-019` | localUriFor, downloadProgress, downloadTrack, downloadedTracks helper functions                  |
| `MOB-STORE-020` | load fetches favourites and user playlists from server                                           |
| `MOB-STORE-021` | reset clears favourites and playlists                                                            |
| `MOB-STORE-022` | isFavourite checks presence in favouriteIds                                                      |
| `MOB-STORE-023` | toggleFavourite optimistically toggles and calls api.setFavourite                                |
| `MOB-STORE-024` | reloadPlaylists, createPlaylist, deletePlaylist, addToPlaylist manage playlist state             |
| `MOB-STORE-025` | setMode updates mode, userChangedMode flag, and triggers toast                                   |
| `MOB-STORE-026` | toggleMode toggles between online and offline                                                    |
| `MOB-STORE-027` | hideToast dismisses mode toast                                                                   |
| `MOB-STORE-028` | open, setView, close manage track action sheet state                                             |
| `MOB-STORE-029` | the next track is the following one; repeat all wraps; repeat one and the end have none          |
| `MOB-STORE-030` | saved audio settings come back on launch; broken values are ignored                              |

## `__tests__/audio.test.tsx`

| ID                     | Use case                                                                              |
| :--------------------- | :------------------------------------------------------------------------------------ |
| `MOB-AUD-001`          | sends the Audio screen settings to the native player whenever they change             |
| `MOB-AUD-002`          | with gapless on, the next track is handed to the player once the current one loads    |
| `MOB-AUD-003`          | when the player moves on by itself, the queue follows without loading the track again |
| `MOB-AUD-004`          | with gapless and crossfade off, no next track is handed over                          |
| `MOB-AUD-005`          | at the end of the queue the player is told there is nothing next                      |
| `MOB-AUD-006`          | a move to a track the queue no longer has reloads the current one                     |
| `MOB-AUDIO-RESUME-001` | a restored queue loads paused, at the saved position; the next load starts at 0       |

## `__tests__/playback-extras.test.ts`

| ID                | Use case                                                                          |
| ----------------- | --------------------------------------------------------------------------------- |
| `MOB-SLEEP-001`   | minutes are counted by the native player; the label counts down                   |
| `MOB-SLEEP-002`   | "End of track" asks the player to stop at the end; switching away undoes it       |
| `MOB-SLEEP-003`   | when the native timer fires, playback shows paused and the timer is off           |
| `MOB-SLEEP-004`   | "End of track" turns itself off once the track stops at its end, not on a pause   |
| `MOB-OUT-001`     | refresh lists the connected outputs and the one in use                            |
| `MOB-OUT-002`     | picking an output tells the player and is saved on the phone                      |
| `MOB-OUT-003`     | on start the saved pick is applied again, and device changes are followed         |
| `MOB-OUT-004`     | nothing saved leaves the choice to Android                                        |
| `MOB-RESTORE-001` | the queue, track, position, modes and source are saved as they change             |
| `MOB-RESTORE-002` | on the next start it comes back paused where it was, and the player resumes there |
| `MOB-RESTORE-003` | a damaged save, or one whose track is missing, is ignored                         |
| `MOB-RESTORE-004` | a fresh install signed in gets the queue the account remembers                    |
| `MOB-RESTORE-005` | signed in, the queue is also saved to the account                                 |
| `MOB-SERVER-001`  | debug builds use localhost (adb reverse); addresses are tidied up or rejected     |
| `MOB-SERVER-002`  | a saved address is used for every request and survives a restart; reset goes back |
| `MOB-SERVER-003`  | the API client sends requests to the chosen server                                |
| `MOB-PREFS-001`   | the lyrics language is kept on the phone and restored                             |
| `MOB-PREFS-002`   | an unknown saved script is ignored                                                |
| `MOB-PREFS-003`   | lyrics are asked for in the chosen script; "original" sends none                  |
| `MOB-FROM-001`    | playTrack remembers where the queue came from; moving along keeps it              |

## `__tests__/screens-extras.test.tsx`

| ID              | Use case                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `MOB-NPX-001`   | the header says where the queue is playing from, else the song’s album                               |
| `MOB-NPX-002`   | + opens the playlist picker; a guest is asked to sign up first                                       |
| `MOB-NPX-003`   | the output and sleep-timer buttons open their sheets; the timer button shows when it is on           |
| `MOB-NPX-004`   | the output card names the device, and whether a song plays without the network                       |
| `MOB-SHEET-001` | the output sheet lists Automatic and every device; picking one keeps music there                     |
| `MOB-SHEET-002` | the sleep sheet starts, switches and stops the timer                                                 |
| `MOB-SHEET-003` | the lyrics sheet sets the language                                                                   |
| `MOB-SHEET-004` | the server sheet saves a LAN address, rejects nonsense, and can go back to the default               |
| `MOB-SETX-001`  | audio output, sleep timer, lyrics language and server address show their state and open their sheets |
| `MOB-SETX-002`  | a custom server address is shown on its row                                                          |
| `MOB-LIBX-001`  | Albums shows the saved albums and opens one                                                          |
| `MOB-LIBX-002`  | Artists shows followed artists and the artists of your songs, with counts                            |
| `MOB-LIBX-003`  | Genres opens a search for the category in the Search tab                                             |
| `MOB-LIBX-004`  | empty tabs say how things get there; offline they say to go online                                   |
