# Nagi Feed submission packet

**Status: Not submitted.** These files prepare an initial listing for version 0.2.8. A ZIP, worksheet, or screenshot does not mean the extension was uploaded, approved, or published.

## Build and package

From the repository root:

```sh
npm ci
npm test
npm run build
python3 scripts/package.py
```

Chrome upload ZIP: `dist/nagi-feed-chrome-0.2.8.zip`. `dist/firefox` and `dist/nagi-feed-firefox-0.2.8.zip` are separate Firefox builds, not Chrome uploads. Build/package outputs are ignored and must be regenerated after any extension change.

The manifest, background/content/settings bundles, styles, and flat `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png` files sit at the ZIP root. Manifest icons and toolbar icons refer to those exact names. The host permissions remain X, twitter.com, and api.typesafe.ai. No update URL, fixed extension key, or remote code is added.

## Listing and assets

- Copy: [LISTING.md](LISTING.md).
- Privacy/review worksheet: [PRIVACY-FIELDS.md](PRIVACY-FIELDS.md).
- Privacy source: [../PRIVACY.md](../PRIVACY.md).
- Store icon: `assets/icons/icon-128.png` (128×128, transparent padding); source `assets/icons/icon.svg`. Other runtime icons are 16×16, 32×32, and 48×48.
- Screenshot: `store/assets/01-feed-1280x800.png` — actual filtering/status controls with fictional demo posts.
- Screenshot: `store/assets/02-reveal-1280x800.png` — the same demo with a matched post revealed.
- Screenshot: `store/assets/03-settings-1280x800.png` — actual settings, top viewport, key panel collapsed.
- Screenshot: `store/assets/04-privacy-1280x800.png` — actual lower settings and privacy disclosure, fake saved key masked and input empty.
- Small promotional tile: `store/assets/promo-440x280.png`; editable source `store/assets/promo.svg`.

All screenshot PNGs are 1280×800. Feed captures are explicitly labeled Demo posts and use mock Jev decisions. No X logo, real profile, account session, or real API key is used. Settings keep the real stylesheet and width; images are viewport captures, not stretched page composites.

## Reproduce the artwork and captures

Icons and tile can be rendered without opening a window, using the existing system `rsvg-convert`:

```sh
for size in 16 32 48 128; do
  rsvg-convert -w "$size" -h "$size" assets/icons/icon.svg -o "assets/icons/icon-$size.png"
done
rsvg-convert store/assets/promo.svg -o store/assets/promo-440x280.png
```

For extension regression tests, use a throwaway isolated desktop after closing your own persistent box with `omabox down`. The throwaway repository overlay permits the test screenshot writes; an existing persistent box mounts the repository read-only:

```sh
omabox run --net isolated --ro-bind /home/komagata/.cache/ms-playwright --env PLAYWRIGHT_BROWSERS_PATH=/home/komagata/.cache/ms-playwright -- npm run test:browser
```

The capture script refuses to run outside omabox, launches headless Chromium with a new temporary profile, loads the real `dist/chrome` extension, uses `store/demo.html` on a routed `https://x.com/home`, and mocks the worker's Jev fetch. It rejects unexpected page requests and unexpected API URLs. It uses only the literal fake key `nagi-store-demo-not-a-real-key`, verifies the saved input is empty, and removes its temporary profile. No live TypeSafe request is needed.

A throwaway `omabox run` discards repository overlay writes. To retain assets, start your own box and write only into its fake HOME, then copy only this task's generated PNGs back:

```sh
omabox up --net isolated --ro-bind /home/komagata/.cache/ms-playwright --env PLAYWRIGHT_BROWSERS_PATH=/home/komagata/.cache/ms-playwright
omabox run -- npm run store:assets -- /home/sbx/nagi-store-assets
omabox path
# If the previous command prints BOX_PATH, copy the generated files as follows:
# cp BOX_PATH/home/nagi-store-assets/*.png store/assets/
omabox down
```

Use the path actually printed by `omabox path`; `/home/sbx` exists only inside the box. The project is mounted read-only and browser binaries are the only extra read-only mount. Do not mount HOME, credentials, or the user's full cache. The box uses an isolated network; captured page requests and Jev results are mocked. The script accepts an explicit output directory; its default is `store/assets` for a writable isolated overlay, whose writes are discarded. The script also renders the promotional SVG with Chromium.

## Dashboard procedure

1. Coordinator/publisher opens [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Registration, any registration fee, publisher identity verification, and 2FA may require the user. Their state is unknown here.
2. Create the new item and upload `dist/nagi-feed-chrome-0.2.8.zip`. Review the uploaded manifest and version.
3. Fill the English listing from LISTING.md; select the available category, publisher-approved territories, and other account-specific choices. Upload the 128×128 icon, the screenshots, and the 440×280 tile using the matching fields.
4. Publish the repository changes before using the public privacy URL. Verify that `https://github.com/komagata/nagi-feed/blob/main/PRIVACY.md` and support/website links are publicly accessible.
5. Review the actual Privacy practices fields using PRIVACY-FIELDS.md, including content, authentication information, local feedback identifiers, and optional interaction processing. Publisher makes the final attestations.
6. Supply a working reviewer Jev key in the **private** dashboard reviewer field and copy testing instructions. Key provisioning is pending; do not publish a key in these files. Confirm any X reviewer-account access requirement privately.
7. Review the final form and assets, then the coordinator handles submission within the user's authorization. Keep this status Not submitted until an actual submission is confirmed. Store review and approval remain pending until confirmed by Google.

No publisher login, registration, live key, live provider test, upload, or submission is performed by this packet.
