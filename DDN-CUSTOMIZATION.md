# Double D Nursery customization

Upstream baseline: e58f32f2fa7bfdbc5d1bb069e0ee8d6a3a4d92a7 (7.1.6).

The nursery fork retains upstream branding/credits and license, adding a small
Double D heading, nursery forecast coordinates, US units, local forecast defaults,
and muted startup. Shared location permalinks remain usable.

Coordinates 35.080243,-101.866682 matched 12460 S Georgia St, Amarillo, TX 79118
with ArcGIS PointAddress score 100 on October 8, 2026. NWS maps this point to
AMA grid 46,20. Nearby station observations are not measurements at the nursery.

The data loader uses paths relative to the document so the static build can run
under a WordPress plugin directory and the /8081/ test-site prefix.

Build using Node 24: npm ci --legacy-peer-deps; npm run build.
The built dist folder is packaged by the integration project; do not commit
generated distributions or node_modules. No extra runtime service is required
for static mode. The full display contacts weather providers directly; the
small WordPress badge uses a separate server-cached NWS observation endpoint.

Integration and deployment records: https://github.com/doublednurseryama/weather.

The on-screen corner logo reuses the transparent nursery logo already hosted
on the 8081 website. A small white backing keeps its green/red lettering legible
against the simulator's dark gradient. NOAA source logos remain intact.
When moving to production, update that nursery-hosted image URL in the header,
radar partial, and nursery-defaults.js. No image export was needed.

Music is sourced from the nursery's ws4kp-music fork, pinned by commit in
src/nursery-playlist.json. All 33 tracks are included, preserving their album
paths and duplicate track names. Audio streams from raw.githubusercontent.com
when a visitor enables music; those files are not copied into WordPress storage.
A later dedicated media host can replace those URLs without changing the player.
The original local-music behavior is retained when no nursery manifest exists.
