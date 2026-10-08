# Install QR (TallyOne 4.14 / ConeOne 2.66, 2026-10-09)

- Old QR codes pointed straight to /tally.apk and /cone.apk. Some Galaxy and iPhone phones never finished the download (iPhone cannot install an APK at all).
- New QR codes open install.html#tally and install.html#cone: a device-aware guide that puts the full-screen web app install first and the APK second.
- Each app shows its own QR: inspection app, Aux screen, Install QR card (src/data/installQr.js); cone app, usage guide area (public/cone.html).
- To change the QR address, regenerate both SVG strings (they encode https://greenmarine26.github.io/greenmarinetally/install.html#tally and #cone) and decode them back before shipping.
