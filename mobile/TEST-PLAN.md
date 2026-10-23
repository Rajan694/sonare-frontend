# Sonare mobile test plan

Every test is listed here by ID; `scripts/check-test-plan.mjs` (run before `npm test`) fails if a test and
this plan disagree. Tests run under Jest with react-native mocked (`jest.setup.js`); shared fixtures and the
navigation mock live in `test-utils/`.

## `__tests__/components-behaviour.test.tsx`

| ID             | Use case                                                                                                        |
| :------------- | :-------------------------------------------------------------------------------------------------------------- |
| `MOB-COMP-002` | BrandMark is decorative and drawn at the requested size                                                         |
| `MOB-COMP-007` | Icon draws the mapped glyph at its size and colour, and nothing for an unknown name                             |
| `MOB-COMP-022` | EqualizerBars draws three bars in the given colour                                                              |
| `MOB-COMP-023` | SourceGlyph shows a gold phone for local files and a green cloud for the server                                 |
| `MOB-COMP-013` | Toast shows its message and detail, and fades out when hidden                                                   |
| `MOB-COMP-017` | shows the image, falls back to the second url, then to a plain tile                                             |
| `MOB-COMP-036` | without an image, a gradient is drawn, with rings when asked                                                    |
| `MOB-COMP-006` | GuestPrompt offers to create an account or sign in                                                              |
| `MOB-COMP-010` | Sheet shows its content, closes from the backdrop or back button, and unmounts when closed                      |
| `MOB-COMP-019` | shows the song, pauses, skips, hearts, and opens Now Playing                                                    |
| `MOB-COMP-037` | is hidden when nothing is loaded, and shows a saved song as on the phone                                        |
| `MOB-COMP-020` | "Play next" and "Add to queue" go to the player and close the menu                                              |
| `MOB-COMP-038` | a guest choosing favourites or playlists is asked to create an account                                          |
| `MOB-COMP-039` | a signed-in user picks a playlist, or names a new one, to add the song to                                       |
| `MOB-COMP-040` | a playlist that cannot be updated shows why and stays open                                                      |
| `MOB-COMP-041` | the download item follows the song's download state, and hides offline                                          |
| `MOB-COMP-042` | a screen can add its own action, e.g. "Remove from playlist"                                                    |
| `MOB-COMP-021` | tapping seeks to that fraction; played bars are coloured by mode                                                |
| `MOB-COMP-043` | without a seek handler the waveform cannot be tapped                                                            |
| `MOB-COMP-044` | "Go to album" and "Go to artist" open those pages, closing Now Playing first                                    |
| `MOB-COMP-045` | a guest hearting from the mini player is asked to sign up; nothing is saved                                     |
| `MOB-COMP-046` | a playback error turns the play button into Retry, which reloads the song                                       |
| `MOB-COMP-025` | one song: download, pause while running, resume, delete once saved; nothing for local files                     |
| `MOB-COMP-024` | a whole album: download the server songs, show progress, offer delete when all are saved                        |
| `MOB-COMP-047` | downloading from the track menu, TrackDownloadButton, or DownloadAllButton does not prompt for music permission |

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

| ID             | Use case                                                                                                |
| :------------- | :------------------------------------------------------------------------------------------------------ |
| `MOB-DATA-001` | formats API_BASE and API_ORIGIN for default dev environment                                             |
| `MOB-DATA-002` | absoluteUrl resolves relative paths and returns full URLs as-is; returns undefined for null             |
| `MOB-DATA-003` | artworkUrl generates formatted artwork URL with size parameter                                          |
| `MOB-DATA-004` | httpRequest performs GET request and parses JSON response                                               |
| `MOB-DATA-005` | httpRequest handles non-JSON response gracefully                                                        |
| `MOB-DATA-006` | httpRequest attaches X-Sonare-Client header for API_ORIGIN requests                                     |
| `MOB-DATA-007` | httpRequest handles network error with NetworkError                                                     |
| `MOB-DATA-008` | httpRequest handles timeout with NetworkError                                                           |
| `MOB-DATA-009` | hydrate restores session from Keychain, or migrates from AsyncStorage                                   |
| `MOB-DATA-010` | hydrate falls back to guest mode on corrupted session                                                   |
| `MOB-DATA-011` | signIn authenticates user and saves session to keychain not AsyncStorage                                |
| `MOB-DATA-012` | signUp registers user and saves session                                                                 |
| `MOB-DATA-013` | signOut calls server logout and clears keychain and session                                             |
| `MOB-DATA-014` | refresh rotates refresh token and updates session                                                       |
| `MOB-DATA-015` | refresh clears session on 401 response                                                                  |
| `MOB-DATA-016` | refresh deduplicates concurrent refresh calls                                                           |
| `MOB-DATA-017` | search queries catalog with query and type                                                              |
| `MOB-DATA-018` | trending fetches trending tracks with limit and region                                                  |
| `MOB-DATA-019` | album and albumTracks fetch album details and tracklist                                                 |
| `MOB-DATA-020` | artist, artistTopTracks, artistAlbums fetch artist metadata                                             |
| `MOB-DATA-021` | playlist and playlistTracks fetch public playlist data                                                  |
| `MOB-DATA-022` | stream fetches stream info with quality and format params                                               |
| `MOB-DATA-023` | peaks and lyrics fetch audio peaks and synced lyrics                                                    |
| `MOB-DATA-024` | me, settings, and saveSettings manage user profile and preferences                                      |
| `MOB-DATA-025` | libraryTracks, favourites, setFavourite, setFollowing manage library entities                           |
| `MOB-DATA-026` | recentlyPlayed and mostPlayed fetch listening history                                                   |
| `MOB-DATA-027` | reportPlays posts batch play events to /me/sync                                                         |
| `MOB-DATA-028` | user playlist methods manage personal playlists                                                         |
| `MOB-DATA-029` | auto-refreshes expired access token on 401 response                                                     |
| `MOB-DATA-030` | handles 204 No Content response                                                                         |
| `MOB-DATA-031` | throws ApiError on non-2xx status with message and code                                                 |
| `MOB-DATA-032` | isOwnPlaylist identifies sonare-prefixed playlist IDs                                                   |
| `MOB-DATA-033` | hydrate loads settings from storage and server                                                          |
| `MOB-DATA-034` | update saves settings locally and debounces server sync                                                 |
| `MOB-DATA-035` | sanitizes invalid settings values with pick helper                                                      |
| `MOB-DATA-036` | queuePlay adds pending play and triggers background upload                                              |
| `MOB-DATA-037` | queuePlay stores a local file by fingerprint and a server song by bare id, for the signed-in user       |
| `MOB-DATA-038` | flush drops confirmed plays after successful reportPlays                                                |
| `MOB-DATA-039` | flush schedules retry on network error and drops invalid 4xx errors                                     |
| `MOB-DATA-040` | startBackgroundSync wires its network and app-state triggers once, even if called twice                 |
| `MOB-DATA-041` | requireAccount executes immediately when signed in                                                      |
| `MOB-DATA-042` | requireAccount stores pending action and navigates to SignIn when guest                                 |
| `MOB-DATA-043` | takePendingAction executes and clears pending action                                                    |
| `MOB-DATA-044` | clearPendingAction clears pending action without executing                                              |
| `MOB-DATA-045` | useAsync executes promise and provides data, loading, error, refetch                                    |
| `MOB-DATA-046` | useAsync respects enabled flag                                                                          |
| `MOB-DATA-047` | useAsync re-runs when dependency changes or refetch is invoked                                          |
| `MOB-DATA-048` | artGradients exports valid 3-color gradient arrays                                                      |
| `MOB-DATA-049` | signIn saves session to keychain and leaves AsyncStorage empty                                          |
| `MOB-DATA-050` | hydrate migrates legacy AsyncStorage session to keychain                                                |
| `MOB-DATA-051` | hydrate with nothing stored defaults to guest status                                                    |
| `MOB-DATA-052` | signOut resets keychain credentials and reverts status to guest                                         |
| `MOB-DATA-053` | requestPasswordReset posts the email without a token; a server error is thrown with its message         |
| `MOB-DATA-054` | resendVerification sends the access token                                                               |
| `MOB-DATA-055` | a hand-made (Custom) EQ stays on the phone; gapless and normalization sync                              |
| `MOB-DATA-056` | signing in keeps the phone's Custom EQ but takes the account's other settings                           |
| `MOB-DATA-057` | favouriteIds asks only for the ids, so the heart state needs no metadata                                |
| `MOB-DATA-058` | updatePlaylist PATCHes the name and description and returns the playlist                                |
| `MOB-DATA-059` | removeFromPlaylist sends the row id when the list knows it, else the position                           |
| `MOB-DATA-060` | reorderPlaylist PATCHes a row to its new position                                                       |
| `MOB-DATA-061` | an expired access token is refreshed before the call, and a 401 after another refresh reuses that token |

## `__tests__/installId.test — see data.test.tsx`

| ID             | Use case                                                                                |
| :------------- | :-------------------------------------------------------------------------------------- |
| `MOB-DATA-062` | with nothing stored, temporary id from early request is saved once read resolves        |
| `MOB-DATA-063` | stored id is kept across simulated restart even if request happens before read resolves |
| `MOB-DATA-064` | X-Sonare-Install is sent on backend requests and absent on external ones                |
| `MOB-DATA-065` | nothing is written to storage before the read finishes                                  |

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
| `MOB-LIB-045` | names a saved queue one past the highest "Queue N"; other names are ignored                      |
| `MOB-LIB-046` | playShuffled turns shuffle on, keeps every song and starts from one of them                      |
| `MOB-LIB-047` | matches title, artist and album ignoring case and accents, and needs every word                  |
| `MOB-LIB-049` | groups the matches by artist and by album, keeping the order they came in                        |
| `MOB-LIB-048` | keeps the newest first, trims, dedupes case-insensitively and caps the list                      |
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
| `MOB-NAV-007` | the active tab is green in both modes (M01 / M02: navigation is not a source)    |

## `__tests__/screens-browse.test.tsx`

| ID               | Use case                                                                               |
| :--------------- | :------------------------------------------------------------------------------------- |
| `MOB-HOME-001`   | a signed-in user is welcomed by first name and can pick up their last song             |
| `MOB-HOME-002`   | with a song loaded, the continue card pauses and resumes it                            |
| `MOB-HOME-003`   | a guest is invited to sign in and no account data is requested                         |
| `MOB-HOME-004`   | trending plays within the chart; when the music service is down it says so and retries |
| `MOB-HOME-005`   | choosing Offline asks first; the header opens search, and the profile opens settings   |
| `MOB-HOME-006`   | offline, it lists the downloaded songs and asks the server for nothing                 |
| `MOB-HOME-007`   | shows "Haven't played in a while" shelf and plays with the shelf queued                |
| `MOB-HOME-008`   | "Haven't played in a while" shelf is hidden when empty, guest, offline, or on error    |
| `MOB-SEARCH-001` | typing searches once the user pauses, and shows a top result and songs                 |
| `MOB-SEARCH-002` | tapping a song plays it with the other results queued                                  |
| `MOB-SEARCH-003` | album and artist results open their pages; filters change the search type              |
| `MOB-SEARCH-004` | no results says so; a failed search can be retried                                     |
| `MOB-SEARCH-005` | offline, the phone's songs are searched and the server is never asked                  |
| `MOB-SEARCH-006` | the Genres chip shows the categories, and a category searches for its query            |
| `MOB-SEARCH-007` | a genre opened from the Library arrives as the search                                  |
| `MOB-SEARCH-008` | suggestions show once typing pauses; picking one searches for it                       |
| `MOB-SEARCH-009` | the Albums and Playlists chips draw a list that opens its page                         |
| `MOB-SEARCH-010` | the All tab shows a section per kind, each hidden when empty                           |
| `MOB-SEARCH-011` | offline, the Albums and Artists chips group the matches                                |
| `MOB-SEARCH-012` | online with no network, the phone is searched and the server is not                    |
| `MOB-SEARCH-013` | recent searches fill and search, × removes one, Clear empties the list                 |
| `MOB-SEARCH-014` | pasting a YouTube song link shows one song row, plays on tap, and skips normal search  |
| `MOB-SEARCH-015` | pasting a YouTube playlist link shows owner and song count and navigates to Playlist   |
| `MOB-SEARCH-016` | pasting an invalid YouTube link shows error; plain text still searches                 |
| `MOB-LIB-S-001`  | a guest is invited to create an account instead of seeing a library                    |
| `MOB-LIB-S-002`  | lists the saved server songs; Play all plays them in order                             |
| `MOB-LIB-S-003`  | the sort chip opens a sheet of orders; picking one refetches                           |
| `MOB-LIB-S-004`  | "only on this phone" keeps just the downloaded songs                                   |
| `MOB-LIB-S-005`  | there is no Folders tab (Settings has music folders); Downloads opens downloads        |
| `MOB-PLS-001`    | a guest is asked to sign up before creating a playlist                                 |
| `MOB-PLS-002`    | lists the user's playlists with their kind; tapping one opens it                       |
| `MOB-PLS-003`    | creating a playlist names it and opens it                                              |
| `MOB-PLS-004`    | deleting from a playlist's options asks first                                          |
| `MOB-PLS-005`    | offline, a playlist this phone never saved is not listed                               |
| `MOB-PLS-006`    | renders "Saved from YouTube" section and navigates to playlist on press                |
| `MOB-PL-001`     | the user's own playlist shows its length and plays from the start                      |
| `MOB-PL-002`     | a public playlist has no owner options                                                 |
| `MOB-PL-003`     | deleting the playlist from its options leaves the page once it is gone                 |
| `MOB-PL-004`     | the favourite button on a playlist saves it using saved-playlists state                |
| `MOB-PL-005`     | your own playlist has no favourite button                                              |
| `MOB-PL-006`     | renaming your own playlist saves it, refreshes the screen and the library              |
| `MOB-PL-007`     | a refused rename shows the error and leaves the sheet open                             |
| `MOB-PL-008`     | Unsave on a saved playlist uses savedPlaylists and removes it                          |
| `MOB-ALB-001`    | an album shows its artist link and year, and shuffle plays it all                      |
| `MOB-ALB-002`    | "Add to queue" appends the whole album                                                 |
| `MOB-ALB-003`    | the favourite button on an album saves it                                              |
| `MOB-ART-001`    | an artist shows their name and albums; album tiles open the album                      |
| `MOB-ART-002`    | following saves to the account; a failure turns it back                                |
| `MOB-ART-003`    | an artist with no songs says so                                                        |

## `__tests__/screens-player.test.tsx`

| ID               | Use case                                                                                          |
| :--------------- | :------------------------------------------------------------------------------------------------ |
| `MOB-NP-001`     | shows the song, where it plays from, its quality and the time left                                |
| `MOB-NP-002`     | a downloaded song is shown as on this device                                                      |
| `MOB-NP-003`     | transport buttons drive the player                                                                |
| `MOB-NP-004`     | tapping the waveform seeks to that point                                                          |
| `MOB-NP-005`     | a guest hearting the song is asked to sign up; a signed-in user saves it                          |
| `MOB-NP-006`     | playback errors are shown with Retry; lyrics, queue, equalizer and the song menu are one tap away |
| `MOB-NP-007`     | with nothing playing it says so and can be closed                                                 |
| `MOB-NP-008`     | Up next lists the queue after this song, a tap jumps to it, and it hides at the end               |
| `MOB-NP-009`     | nothing comes after the last song, so Up next is hidden                                           |
| `MOB-NP-010`     | the Up next "Open queue" link opens the Queue screen                                              |
| `MOB-NP-011`     | a song whose lyrics cannot be found shows a disabled Lyrics button; while unknown it is enabled   |
| `MOB-Q-001`      | shows what is next, counts server songs, and plays a tapped song                                  |
| `MOB-Q-002`      | "Clear queue" keeps only the current song; then it says the queue has ended                       |
| `MOB-Q-003`      | a song's × removes it from the queue                                                              |
| `MOB-Q-004`      | saving the queue creates a playlist with every queued song, named "Queue 1"                       |
| `MOB-Q-005`      | a failed save says why; shuffle and repeat work from here                                         |
| `MOB-Q-006`      | an empty queue says so                                                                            |
| `MOB-Q-007`      | a queued song moves with its handle (screen readers: increment / decrement)                       |
| `MOB-Q-008`      | saving the queue names it one past the highest "Queue N" already used                             |
| `MOB-Q-009`      | 10 or more upcoming songs all render in the queue list                                            |
| `MOB-LYR-001`    | highlights the line being sung and taps jump to a line                                            |
| `MOB-LYR-002`    | the offset shifts which line is current and where taps land                                       |
| `MOB-LYR-003`    | plain text view shows the words without timing                                                    |
| `MOB-LYR-004`    | no lyrics, or a local file, says none were found without asking the server for local files        |
| `MOB-LYR-005`    | LRCLIB down shows the reason and a retry, not "No lyrics found"                                   |
| `MOB-LYR-006`    | "Earlier" and "Later" move the timing at once and save once after the taps stop                   |
| `MOB-LYR-007`    | lyrics are read-only: there is no Edit control and no way to replace the words                    |
| `MOB-LYR-008`    | synced lyrics have an Auto-scroll switch, on by default, remembered on the phone                  |
| `MOB-LYR-009`    | a timing change still waiting when the screen closes is saved                                     |
| `MOB-EQ-001`     | presets and switches respond to taps                                                              |
| `MOB-EQ-002`     | a chosen preset is still selected when the screen is opened again                                 |
| `MOB-EQ-003`     | moving a band starts a Custom curve from the preset and shows its level                           |
| `MOB-EQ-004`     | bands stop at ±12 dB                                                                              |
| `MOB-EQ-005`     | bass boost and virtualizer adjust and show their amount                                           |
| `MOB-EQ-006`     | speed, crossfade and normalization change what the player gets                                    |
| `MOB-EQ-007`     | switching the equalizer off freezes the effects but not speed or transitions                      |
| `MOB-DL-S-001`   | with nothing downloaded it says so                                                                |
| `MOB-DL-S-002`   | shows progress for running downloads and lets them be paused, resumed or retried                  |
| `MOB-DL-S-003`   | finished songs play as a queue of downloads; a moved file is marked                               |
| `MOB-DL-S-004`   | deleting asks first and deletes the file; a moved file is only taken off the list                 |
| `MOB-DL-S-005`   | "Delete all" removes every finished download after asking                                         |
| `MOB-SET-S-001`  | a guest is offered sign-in and sign-up                                                            |
| `MOB-SET-S-002`  | signing out asks first                                                                            |
| `MOB-SET-S-003`  | the download format changes the quality description and is saved                                  |
| `MOB-SET-S-004`  | the download location can be changed or reset                                                     |
| `MOB-SET-S-005`  | a folder that cannot be used is reported                                                          |
| `MOB-SET-S-006`  | an unverified account enters the emailed code or sends a new one; verified accounts see no prompt |
| `MOB-SET-S-007`  | streaming quality is picked in Playback and saved                                                 |
| `MOB-SIGNIN-001` | checks the form before sending anything                                                           |
| `MOB-SIGNIN-002` | signs in with a normalised email and goes back                                                    |
| `MOB-SIGNIN-003` | a gate visit opens on sign-up, needs a name and 8+ character password                             |
| `MOB-SIGNIN-004` | server and network failures are shown plainly                                                     |
| `MOB-SIGNIN-005` | "keep listening" leaves without an account                                                        |
| `MOB-SIGNIN-006` | "Forgot password?" emails a code, checks it, sets the new password and fills in sign-in           |
| `MOB-SIGNIN-007` | a wrong code or a failed request shows why, and "Back to sign in" returns to the form             |
| `MOB-SIGNIN-008` | after signing up, the emailed code can be entered before going back, or skipped                   |
| `MOB-MODE-001`   | confirming switches to Offline Mode and goes back                                                 |
| `MOB-MODE-002`   | cancelling keeps the current mode                                                                 |
| `MOB-MODE-003`   | "stay offline automatically" starts off, and turning it on is remembered                          |
| `MOB-FOLD-001`   | a phone with no scanned folders shows no made-up folders                                          |

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
| `MOB-STORE-020` | load fetches favourite ids and user playlists from server                                        |
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
| `MOB-STORE-031` | recent searches are trimmed, deduped and kept on the phone across a restart                      |
| `MOB-STORE-032` | asks for a song once and remembers whether its lyrics were found; no network is no answer        |

## `__tests__/audio.test.tsx`

| ID                     | Use case                                                                                                 |
| :--------------------- | :------------------------------------------------------------------------------------------------------- |
| `MOB-AUD-001`          | sends the Audio screen settings to the native player whenever they change                                |
| `MOB-AUD-002`          | with gapless on, the next track is handed to the player in the last 15 s of this one                     |
| `MOB-AUD-003`          | when the player moves on by itself, the queue follows without loading the track again                    |
| `MOB-AUD-004`          | with gapless and crossfade off, no next track is handed over                                             |
| `MOB-AUD-005`          | at the end of the queue the player is told there is nothing next                                         |
| `MOB-AUD-006`          | a move to a track the queue no longer has reloads the current one                                        |
| `MOB-AUD-008`          | a stream url the player gave up on is reloaded fresh where it stopped, twice at most                     |
| `MOB-AUD-009`          | each progress level covers the stretch since the last event; a seek is skipped                           |
| `MOB-AUD-010`          | the next song's stream is looked up in this one's last 15 s, so moving on starts it without asking again |
| `MOB-AUD-011`          | a url refused mid-song is swapped for a fresh one of the same file, without reloading the song           |
| `MOB-AUD-012`          | a streamed song is cached under its id and format, since its url changes every time                      |
| `MOB-AUDIO-RESUME-001` | a restored queue loads paused, at the saved position; the next load starts at 0                          |

## `__tests__/playback-extras.test.ts`

| ID                | Use case                                                                                |
| ----------------- | --------------------------------------------------------------------------------------- |
| `MOB-RESTORE-001` | the queue, track, position, modes and source are saved as they change                   |
| `MOB-RESTORE-002` | on the next start it comes back paused where it was, and the player resumes there       |
| `MOB-RESTORE-003` | a damaged save, or one whose track is missing, is ignored                               |
| `MOB-RESTORE-004` | a fresh install signed in gets the queue the account remembers                          |
| `MOB-RESTORE-005` | signed in, the queue is also saved to the account                                       |
| `MOB-RESTORE-006` | signed in, a newer queue from another device replaces the phone's; an older one doesn't |
| `MOB-SERVER-001`  | debug builds talk to localhost (adb reverse); there is no other address                 |
| `MOB-SERVER-002`  | an address saved by an older build is ignored                                           |
| `MOB-PREFS-001`   | the lyrics language is kept on the phone and restored                                   |
| `MOB-PREFS-002`   | an unknown saved script is ignored                                                      |
| `MOB-PREFS-003`   | lyrics are asked for in the chosen script; "original" sends none                        |
| `MOB-PREFS-004`   | the auto-scroll choice is kept on the phone and restored                                |
| `MOB-FROM-001`    | playTrack remembers where the queue came from; moving along keeps it                    |

## `__tests__/screens-extras.test.tsx`

| ID              | Use case                                                                                |
| --------------- | --------------------------------------------------------------------------------------- |
| `MOB-NPX-001`   | the header says where the queue is playing from, else the song’s album                  |
| `MOB-NPX-002`   | + opens the playlist picker; a guest is asked to sign up first                          |
| `MOB-NPX-004`   | there is no audio output card or button: music plays on the phone's output              |
| `MOB-NPX-005`   | a song whose artist id the Artist screen can open shows a link; otherwise plain text    |
| `MOB-NPX-006`   | the repeat button names its mode and shows repeat-one for a single song                 |
| `MOB-SHEET-003` | the lyrics sheet sets the language                                                      |
| `MOB-SETX-001`  | lyrics language shows its state and opens its sheet; no audio output or sleep timer row |
| `MOB-SETX-002`  | there is no server address setting                                                      |
| `MOB-LIBX-001`  | Albums shows the saved albums and opens one                                             |
| `MOB-LIBX-002`  | Artists shows followed artists and the artists of your songs, with counts               |
| `MOB-LIBX-003`  | there is no Genres tab in the Library (Genres are in Search → Browse)                   |
| `MOB-LIBX-004`  | empty online tabs say how things get there; offline Albums/Artists group phone songs    |
| `MOB-LIBX-005`  | Favourites and Most played show those songs from the account and play them in order     |
| `MOB-LIBX-006`  | offline, Favourites shows the liked songs downloaded to this phone, fetching nothing    |
| `MOB-LIBX-007`  | Shuffle turns shuffle mode on and starts the whole list shuffled                        |

## `__tests__/youtube.test.ts`

| ID           | Use case                                                                                 |
| :----------- | :--------------------------------------------------------------------------------------- |
| `MOB-YT-001` | in-app YouTube follows the admin switch                                                  |
| `MOB-YT-002` | the last app config is loaded from the phone; unreadable data keeps the defaults         |
| `MOB-YT-003` | app config is fetched from /api/v1/app-config; an older backend (404) keeps what we have |
| `MOB-YT-004` | config changes reach subscribers; polling starts and stops                               |
| `MOB-YT-005` | search asks the in-app catalog first and falls back to the backend on an error           |
| `MOB-YT-006` | an `L.` cursor pages in-app; any other cursor pages on the backend                       |
| `MOB-YT-007` | trending comes from the in-app catalog, else the backend                                 |
| `MOB-YT-008` | artist top tracks and albums come from the in-app catalog, else the backend              |
| `MOB-YT-009` | album and album tracks come from the in-app catalog; `L.` cursors stay in-app            |
| `MOB-YT-010` | an in-app artist page says whether you follow the artist, without asking the backend     |
| `MOB-YT-011` | YouTube playlists and their tracks come from the in-app catalog                          |
| `MOB-YT-012` | stream urls come from the in-app catalog (googlevideo), else the backend's relay         |
| `MOB-YT-013` | a fallback warns at most once a minute per call                                          |
| `MOB-YT-014` | artwork: YouTube image urls are sized directly, backend artwork gets `size=`             |
| `MOB-YT-015` | a new client order from the admin rebuilds the catalog on the same session               |
| `MOB-YT-016` | a session that fails to start is tried again on the next call                            |
| `MOB-YT-017` | refreshing starts a new YouTube session for the next stream lookup                       |
| `MOB-YT-018` | lyrics requests name the song (title, artist, length)                                    |
| `MOB-YT-019` | only artists you follow count as followed, with or without the `yt:` prefix              |
| `MOB-YT-020` | a refused download url gets a fresh session before the download starts again             |
| `MOB-YT-021` | xhrFetch answers like fetch (status, headers, url, body) without waiting on timers       |
| `MOB-YT-022` | saving a song, adding it to a playlist or following its artist sends what the app knows  |

## `__tests__/waveforms.test.tsx`

| ID             | Use case                                                                            |
| :------------- | :---------------------------------------------------------------------------------- |
| `MOB-WAVE-001` | only songs whose backend waveform is a placeholder are filled in                    |
| `MOB-WAVE-002` | the screen shows the placeholder dimmed, with heard bars real, at its own bar count |
| `MOB-WAVE-003` | a whole song heard is uploaded once, signed in, and drawn without dimming           |
| `MOB-WAVE-004` | a guest keeps the waveform on the phone; it is uploaded on a later play, signed in  |

## `__tests__/appUpdate.test.tsx`

| ID            | Use case                                                                                  |
| :------------ | :---------------------------------------------------------------------------------------- |
| `MOB-UPD-001` | only a newer APK is an update; other platforms and older builds are not                   |
| `MOB-UPD-002` | the download is followed to the end, checked against the upload, then installed           |
| `MOB-UPD-003` | a download that does not match the uploaded file is removed                               |
| `MOB-UPD-004` | a finished download from before a restart is offered for install straight away            |
| `MOB-UPD-005` | Settings → About shows the version, the update, what's new and, once allowed, installs it |
| `MOB-UPD-006` | Offline mode does not check                                                               |
| `MOB-UPD-007` | on the latest release About says so and shows its notes, with no download                 |

## `__tests__/sync-batches.test.ts`

| ID             | Use case                                                                            |
| :------------- | :---------------------------------------------------------------------------------- |
| `MOB-SYNC-001` | a long offline stretch uploads in batches of at most 100 plays                      |
| `MOB-SYNC-002` | a refused batch is split: too large goes up in halves, only the bad play is dropped |
| `MOB-SYNC-003` | a server error keeps only the plays not yet confirmed                               |
| `MOB-SYNC-004` | each uploaded play carries the song details the app had                             |

## `__tests__/queue-positions.test.ts`

| ID              | Use case                                                                 |
| :-------------- | :----------------------------------------------------------------------- |
| `MOB-QUEUE-001` | a list with the same song twice plays through to its end                 |
| `MOB-QUEUE-002` | tapping the second copy of a song starts from that copy                  |
| `MOB-QUEUE-003` | adding the playing song to the queue leaves the queue as it is           |
| `MOB-QUEUE-004` | shuffle keeps every entry, duplicates too, with the playing one first    |
| `MOB-QUEUE-005` | reordering keeps the playing entry current without reloading it          |
| `MOB-QUEUE-006` | moving to the same song again still counts as a new entry for the player |
| `MOB-QUEUE-007` | shuffleTracks returns every item, each order about equally often         |

## `__tests__/settings-sync.test.ts`

| ID             | Use case                                                                       |
| :------------- | :----------------------------------------------------------------------------- |
| `MOB-SETS-001` | starts from the shared defaults                                                |
| `MOB-SETS-002` | a change made offline reaches the account when the network is back             |
| `MOB-SETS-003` | a guest's changes go to the account on sign-in and win over the account's copy |
| `MOB-SETS-004` | changes waiting for one account are not sent to another                        |

## `__tests__/stream-cache.test.tsx`

| ID              | Use case                                                            |
| :-------------- | :------------------------------------------------------------------ |
| `MOB-CACHE-001` | Settings shows how much the stream cache holds and Clear empties it |

## `__tests__/local-music.test.ts`

| ID              | Use case                                                                                                    |
| :-------------- | :---------------------------------------------------------------------------------------------------------- |
| `MOB-LOCAL-001` | without the music permission nothing is read; allowing it scans                                             |
| `MOB-LOCAL-002` | songs are grouped by folder, and a hidden folder leaves the list and stays hidden                           |
| `MOB-LOCAL-003` | a download names its file with the song id, so it can be found again                                        |
| `MOB-LOCAL-004` | downloads the list lost (a reinstall) come back from Music/Sonare, shown once                               |
| `MOB-LOCAL-005` | a song on the phone plays from its content uri                                                              |
| `MOB-LOCAL-006` | an untagged download found again takes its artist and title from its file name                              |
| `MOB-LOCAL-007` | a title-only download in Music/Sonare matching a done download is not a phone song, but an unmatched one is |
| `MOB-LOCAL-008` | an old [id] file is still adopted on scan, while title-only files without an id are not                     |
| `MOB-LOCAL-009` | a file with the same name as a default download in another folder stays a phone song                        |

## `__tests__/music-folders.test.tsx`

| ID             | Use case                                                                                  |
| :------------- | :---------------------------------------------------------------------------------------- |
| `MOB-FOLD-002` | without the permission it explains and asks; allowed, it lists the folders and hides one  |
| `MOB-FOLD-003` | when Android will not ask again, the button opens the app settings                        |
| `MOB-FOLD-004` | Offline Mode lists the downloads, then the songs of shown folders                         |
| `MOB-FOLD-005` | the offline player and downloading offer the permission once each; blocked opens settings |

## Own playlists

| ID            | Use case                                                                        |
| :------------ | :------------------------------------------------------------------------------ |
| `MOB-OPL-001` | removing a song sends its row id and hides it at once                           |
| `MOB-OPL-002` | a failed remove puts the song back and says why                                 |
| `MOB-OPL-003` | moving a row with the increment action sends its new position                   |
| `MOB-OPL-004` | a failed move restores the order and says why                                   |
| `MOB-OPL-005` | a YouTube playlist has no drag handles and no Add songs button                  |
| `MOB-OPL-006` | Add songs opens Search in add mode for this playlist                            |
| `MOB-OPL-007` | Search in add mode adds a song and counts it                                    |
| `MOB-OPL-008` | a failed add turns the button back and says why                                 |
| `MOB-OPL-009` | Done leaves add mode, clearing the params and the count, and opens the playlist |

## `__tests__/server-wake.test.tsx`

| ID             | Use case                                                                                             |
| :------------- | :--------------------------------------------------------------------------------------------------- |
| `MOB-WAKE-001` | backend requests give up after the wake-up time; other requests and explicit timeouts are left alone |
| `MOB-WAKE-002` | a slow first backend request shows "waking up" until the server answers                              |

## `__tests__/account.test.tsx`

| ID             | Use case                                                                                             |
| :------------- | :--------------------------------------------------------------------------------------------------- |
| `MOB-ACCT-001` | the reset code is swapped for a token, and the token sets the new password; an expired token says so |
| `MOB-ACCT-002` | changing the password keeps this phone signed in with the new session; name and delete go to /me     |
| `MOB-ACCT-003` | the Account screen saves a new name, and changes the password after checking the fields              |
| `MOB-ACCT-004` | deleting asks for the password and a confirmation, then leaves; a refusal is shown                   |
| `MOB-ACCT-005` | canceling clear play history does nothing                                                            |
| `MOB-ACCT-006` | confirming clear play history calls endpoint, drops pending plays, clears AI picks, and alerts       |
| `MOB-ACCT-007` | clear play history failure shows error and keeps pending plays                                       |

## `__tests__/autoplay.test.ts`

| ID             | Use case                                                                                        |
| :------------- | :---------------------------------------------------------------------------------------------- |
| `MOB-AUTO-001` | fewer than 10 upcoming songs asks once for similar songs and adds the new ones, which play next |
| `MOB-AUTO-002` | nothing is asked for with Autoplay off, in Offline Mode, or on repeat all                       |
| `MOB-AUTO-003` | 10 or more upcoming songs does not ask for similar songs until queue drops below 10             |

## `__tests__/library.test.tsx`

| ID             | Use case                                                                          |
| :------------- | :-------------------------------------------------------------------------------- |
| `MOB-LIBR-001` | first page is requested with filter and sort; meta.total is exposed               |
| `MOB-LIBR-002` | onEndReached loads the cursor page and appends it                                 |
| `MOB-LIBR-003` | Favourites tab sends filter=liked                                                 |
| `MOB-LIBR-004` | each sort option sends its sort key when the Songs tab is sorted                  |
| `MOB-LIBR-005` | loadAll fetches every remaining page and returns the full list                    |
| `MOB-LIBR-006` | Songs tab sends filter=all to libraryTracks and shows the tracks                  |
| `MOB-LIBR-007` | Play all loads all pages before starting playback                                 |
| `MOB-LIBR-008` | there is no Genres tab in the Library                                             |
| `MOB-LIBR-009` | sort chip on Songs tab shows six options                                          |
| `MOB-LIBR-010` | sort chip appears on Favourites tab too                                           |
| `MOB-LIBR-011` | offline Albums groups phone songs by album tag, sorted by name, with song count   |
| `MOB-LIBR-012` | offline Artists groups phone songs by artist tag, sorted by name, with song count |
| `MOB-LIBR-013` | offline Albums empty phone shows the existing empty text                          |
| `MOB-LIBR-014` | offline Artists empty phone shows the existing empty text                         |
| `MOB-LIBR-015` | tapping an offline album plays its songs                                          |
| `MOB-LIBR-016` | tapping an offline artist plays their songs                                       |
| `MOB-LIBR-017` | liking or unliking does not refetch the paged list                                |
| `MOB-LIBR-018` | an unliked row disappears from Favourites at once                                 |
| `MOB-LIBR-019` | focus refetch keeps old rows until the new page lands                             |
| `MOB-LIBR-020` | loadAll after a sort change does not overwrite the list                           |
| `MOB-LIBR-021` | when enabled turns false, items, total, and cursor are cleared                    |
| `MOB-LIBR-022` | Select button enters selection mode with count and checkboxes                     |
| `MOB-LIBR-023` | tapping and long-pressing rows toggles selection in selection mode                |
| `MOB-LIBR-024` | Select all toggles selecting and deselecting all loaded rows                      |
| `MOB-LIBR-025` | Cancel button and Android hardware back button exit selection mode                |
| `MOB-LIBR-026` | Add to queue adds selected tracks to the player queue                             |
| `MOB-LIBR-027` | Add to playlist opens the playlist picker with selected tracks                    |
| `MOB-LIBR-028` | Download enqueues without confirm, alerts with location, and stays on screen      |
| `MOB-LIBR-029` | Unlike unlikes single track directly or multiple with confirmation and rollback   |

## `__tests__/paging.test.tsx`

| ID             | Use case                                                                     |
| :------------- | :--------------------------------------------------------------------------- |
| `MOB-PAGE-001` | the first page loads, loadMore appends the next and drops ids already listed |
| `MOB-PAGE-002` | a reply for older deps is dropped                                            |
| `MOB-PAGE-003` | a failed loadMore is reported, keeps the songs loaded, and can be retried    |
| `MOB-PAGE-004` | a chip list shows Load more and appends the next page                        |
| `MOB-PAGE-005` | the All view keeps five songs and no Load more                               |
| `MOB-PAGE-006` | a new query starts again from page 1                                         |
| `MOB-PAGE-007` | a failed Load more says so, and Try again loads the page                     |
| `MOB-PAGE-008` | the album list loads the next page, and Play uses every loaded song          |
| `MOB-PAGE-009` | a YouTube playlist loads the next page under the songs                       |
| `MOB-PAGE-010` | offline search has no Load more and never asks the server                    |
| `MOB-PAGE-011` | a YouTube playlist that fails to load says why, and Try again loads it       |
| `MOB-PAGE-012` | a YouTube playlist shows a spinner while its first page is on the way        |

## `__tests__/offline-playlists.test.tsx`

| ID             | Use case                                                                                       |
| :------------- | :--------------------------------------------------------------------------------------------- |
| `MOB-OFPL-001` | keeps the playlist list and its songs on the phone, keyed to this user, and reads them back    |
| `MOB-OFPL-002` | signed out, or another user, sees nothing                                                      |
| `MOB-OFPL-003` | reads a playlist again when its updatedAt moved, one at a time, and unchanged ones never again |
| `MOB-OFPL-004` | a playlist that left the list takes its saved songs with it                                    |
| `MOB-OFPL-005` | keeps the songs an own playlist screen just loaded                                             |
| `MOB-OFPL-006` | the playlists screen lists the saved playlists with what plays on the phone, empty ones dimmed |
| `MOB-OFPL-007` | an own playlist offline shows only what plays, and says how many need the internet             |
| `MOB-OFPL-008` | offline an own playlist has no drag handles, no remove and no Add songs                        |
| `MOB-OFPL-009` | playing offline uses the downloaded copy, and the queue skips the rest                         |
| `MOB-OFPL-010` | a song in a music folder counts and plays too                                                  |
| `MOB-OFPL-011` | an own playlist with nothing on the phone says so, without the need-the-internet line          |
| `MOB-OFPL-012` | one missing song reads "1 song needs the internet"                                             |

## `__tests__/queue-virtual.test.tsx`

| ID              | Use case                                                 |
| :-------------- | :------------------------------------------------------- |
| `MOB-QVIRT-001` | a 2,000-song queue mounts a screenful of rows, not 2,000 |

## `__tests__/ai-features.test.tsx`

| ID           | Use case                                                                                                                        |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------ |
| `MOB-AI-001` | with AI off, signed out, or offline there is no AI on Home or Playlists, and nothing asks the AI                                |
| `MOB-AI-002` | the store follows app-config, and an AI_UNAVAILABLE answer turns AI off                                                         |
| `MOB-AI-003` | shows the songs found for the picks, with their reasons, once per session                                                       |
| `MOB-AI-004` | shows nothing for no picks, an error, or fewer than 3 songs found                                                               |
| `MOB-AI-005` | asks only when tapped, runs the plan’s searches and lists their songs once each                                                 |
| `MOB-AI-006` | a failed AI search says so in one line                                                                                          |
| `MOB-AI-007` | makes the playlist from the songs found and opens it                                                                            |
| `MOB-AI-008` | too few songs found: says so and makes nothing                                                                                  |
| `MOB-AI-009` | Cancel while the AI is thinking makes nothing                                                                                   |
| `MOB-AI-010` | enqueue adds items immediately with original titles and holds start until AI titles resolve, then downloadName uses short title |
| `MOB-AI-011` | with AI off or offline, enqueue does not hold download start and uses original title in downloadName                            |
| `MOB-AI-012` | download start proceeds with original title if AI titles fail or time out, and running downloads are untouched                  |

## `__tests__/spatial.test.tsx`

| ID                | Use case                                                                                                      |
| :---------------- | :------------------------------------------------------------------------------------------------------------ |
| `MOB-SPATIAL-001` | spatial store initializes with default disabled state and concert preset                                      |
| `MOB-SPATIAL-002` | hydrate loads saved spatial settings from AsyncStorage and sanitizes invalid values                           |
| `MOB-SPATIAL-003` | setEnabled updates state and persists to AsyncStorage                                                         |
| `MOB-SPATIAL-004` | setMode switches between presets and custom stage and persists                                                |
| `MOB-SPATIAL-005` | setPreset updates active preset and persists                                                                  |
| `MOB-SPATIAL-006` | setCustom updates custom stage coordinates and sliders with bounds clamping and resetCustom restores defaults |
| `MOB-SPATIAL-007` | setBypass toggles temporary bypass in memory without persisting to AsyncStorage                               |
| `MOB-SPATIAL-008` | AudioEngine pushes initial spatial settings on mount                                                          |
| `MOB-SPATIAL-009` | AudioEngine forwards updated spatial store changes to SonarePlayer using headModel renderer                   |
| `MOB-SPATIAL-010` | SonarePlayer.setSpatialAudio delegates to NativeModules.SonarePlayer.setSpatialAudio                          |
| `MOB-SPATIAL-011` | SpatialAudioSection renders title, badges, enabled switch, and dimmed content when disabled                   |
| `MOB-SPATIAL-012` | SpatialPresetCard renders preset metadata and handles selection                                               |
| `MOB-SPATIAL-013` | SpatialAudioSection compare button toggles bypass and displays bypass indicator banner                        |
| `MOB-SPATIAL-014` | Soundstage renders 2D disc with polar readout and handles touch or accessibility adjustment                   |
| `MOB-SPATIAL-015` | SpatialControls renders quick placement buttons and sliders for distance, width, intensity, ambience          |
| `MOB-SPATIAL-016` | leaving the Audio screen ends Compare                                                                         |

## `__tests__/collection-menu.test.tsx`

| ID            | Use case                                                                                                                                |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `MOB-COL-001` | album and playlist results in Search show more button that opens collection menu sheet                                                  |
| `MOB-COL-002` | top result card when album or playlist shows more button                                                                                |
| `MOB-COL-003` | pasted playlist link shows more button opening collection menu                                                                          |
| `MOB-COL-004` | Add to queue fetches all pages of a two-page playlist, queues all songs, and shows snackbar                                             |
| `MOB-COL-005` | Add to playlist in collection sheet fetches tracks and opens PlaylistPicker                                                             |
| `MOB-COL-006` | Save / Remove album toggles saved status                                                                                                |
| `MOB-COL-007` | fetch error shows Retry button and retrying re-fetches                                                                                  |
| `MOB-COL-008` | AlbumScreen action row has "Add to playlist" button; with remaining pages, menu loads all and opens picker                              |
| `MOB-COL-009` | PlaylistDetail action row has "Add to playlist" button disabled when no tracks, and with remaining pages loads all and opens picker     |
| `MOB-COL-010` | guest tapping Add to playlist closes sheet, and after sign-in reopens menu in playlists view                                            |
| `MOB-COL-011` | AlbumScreen action row "Add to queue" with remaining pages fetches all tracks first, queues them, and shows snackbar with full count    |
| `MOB-COL-012` | PlaylistDetail action row "Add to queue" with remaining pages fetches all tracks first, queues them, and shows snackbar with full count |
| `MOB-COL-013` | when the remaining pages fail to load, nothing is queued and the snackbar says so                                                       |

## `__tests__/settings-chips.test.tsx`

| ID                 | Use case                                                                                  |
| :----------------- | :---------------------------------------------------------------------------------------- |
| `MOB-SET-CHIP-001` | guest sees Connection mode, Playback, Library, and About chips (no Account)               |
| `MOB-SET-CHIP-002` | signed-in user sees Account chip in the expected order                                    |
| `MOB-SET-CHIP-003` | a chip scrolls the list to its measured section and keeps that chip in view               |
| `MOB-SET-CHIP-004` | scrolling main ScrollView updates the active highlighted chip                             |
| `MOB-SET-CHIP-005` | at the end of the list the last section is highlighted even if its top never got up there |
| `MOB-SET-CHIP-006` | after a jump the chosen chip stays until the user drags the list                          |

## `__tests__/snackbar.test.tsx`

| ID              | Use case                                                                             |
| :-------------- | :----------------------------------------------------------------------------------- |
| `MOB-SNACK-001` | store sets visible and auto-hides after ~2.5s                                        |
| `MOB-SNACK-002` | new snackbar replaces current one and resets hide timer                              |
| `MOB-SNACK-003` | hideSnackbar dismisses immediately                                                   |
| `MOB-SNACK-004` | SnackbarHost renders visible snackbar content with polite accessibility              |
| `MOB-SNACK-005` | TrackMenu Play next and Add to queue trigger snackbar                                |
| `MOB-SNACK-006` | PlaylistPicker shows "Added to <name>" on success for single song and multiple songs |
| `MOB-SNACK-007` | PlaylistDetail "Add to queue" button queues all tracks at once and triggers snackbar |
| `MOB-SNACK-008` | Album "Add to queue" button queues all tracks at once and triggers snackbar          |
| `MOB-SNACK-009` | Library selection bar "Add to queue" queues array and triggers snackbar              |

## `__tests__/track-list.test.tsx`

| ID             | Use case                                                                  |
| :------------- | :------------------------------------------------------------------------ |
| `MOB-TRKL-001` | renders exactly 4 tabs: Songs, Albums, Artists, Downloads                 |
| `MOB-TRKL-002` | Downloads tab renders DownloadsView inline without header download button |
| `MOB-TRKL-003` | shows pinned Liked Songs and Most played rows at top in online mode       |
| `MOB-TRKL-004` | hides Most played pinned row when offline but keeps Liked Songs           |
| `MOB-TRKL-005` | renders Liked Songs screen with back button and fetches liked tracks      |
| `MOB-TRKL-006` | renders Most played screen with "N plays" counter on rows                 |
| `MOB-TRKL-007` | does not display "N plays" in Liked Songs screen                          |
| `MOB-TRKL-008` | prompts guest users to sign in                                            |
| `MOB-TRKL-009` | favourites shelf "See all" navigates to TrackList with kind: liked        |
