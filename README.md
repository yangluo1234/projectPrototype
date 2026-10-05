# Bubble Bloom

An interactive audiovisual playground: choose a shape and colour, tap to place or hold to grow, then tap the outlined shape to bloom. Finished patterns stay on the canvas. No background music.

## Run

Serve this directory with `npm run dev`, then open http://127.0.0.1:8766. No build step or package installation is required. If that port is already in use, run `python3 -m http.server 8767 --bind 127.0.0.1`.

Sour Gummy is loaded from Google Fonts; system fonts provide the fallback. Canvas and Web Audio use native browser APIs.

## Controls

- Shape, colour and background selections remain visible and expose `aria-pressed` and accessible names.
- Start with sound or muted. Mute stops current voices; the master volume is independently adjustable.
- Undo reverses placement, blooming and Clear; the most recent 100 actions are retained.
- Save PNG exports the current composition, including placed shapes, without interface chrome.
- Arrow keys move the canvas cursor, Space places/grows, Enter blooms the shape under the cursor, Escape cancels. Ctrl/Cmd+Z undoes.
- Less motion follows the system preference initially and can be changed in the tools. Mobile tools initially collapse to preserve drawing space.

## Implementation

Positions are normalized for resizing. Completed patterns are cached and appended once; Undo, Clear, tone changes and resizing rebuild the cache when necessary. At most 24 bursts animate together; additional bursts complete the oldest animation immediately. There is no continuous render loop at rest.

Audio uses independent voices with an eight-voice allocation cap, including fading and growth voices. C-major pentatonic pitches stay within one register. Shape size changes pitch, low-pass cutoff and decay while keeping peak level fixed. Triangle uses a short filtered pluck, circle a sine bubble contour, and star slightly inharmonic sine partials with a longer tail. A compressor and bounded wave shaper protect the master bus. Muting, blur and hidden tabs cancel queued sounds and stop growth.

## Verification performed

`npm test` passes 12 tests; `npm run check` checks all application JavaScript syntax.

Automated tests exercise growth limits, size-to-sound mapping, the voice cap and mute teardown using a Web Audio mock, Undo/Clear history, polygon hit detection, pointer cancellation/outside release/blur/resize/keyboard release with a DOM mock, and a 1,000-bloom renderer cache scenario with a canvas mock. These checks are functional checks, not browser frame-rate measurements or listening tests.

The local in-app browser was used to verify the three-shape placement/bloom flow, bloom Undo, Clear Undo, persistent selections, silent entry and sound toggle, reduced-motion controls, white shapes on the light background, tool collapse, a narrow 319px layout, and resizing to 1280 × 800 with artwork retained. No browser errors or warnings were reported during that check. Save PNG reached its successful non-null blob callback; the browser download-event API timed out, so an actual newly downloaded file was not confirmed.

Still requires hands-on verification: real touchscreen and stylus cancellation, physical release outside the browser window, Safari/iOS audio unlocking and file downloads, listening on headphones and speakers (perceived loudness, timbre, dense clicks, limiter coloration), and frame-rate/memory testing on low-end phones. No user research or listening study has been conducted.
