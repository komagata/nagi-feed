# Nagi Feed

A Chrome and Firefox extension that filters X posts using your own rules. Checks only post text and quoted text with TypeSafe AI / Jev. Images and videos are not fetched, sampled, described, or checked. Media-only posts stay visible. A text match collapses the entire post, including any media. Confirmed matches collapse into a single line with the reason. Official X ads are identified by their platform labels.

A compact 凪 mark immediately left of Grok shows queued, rotating while checking, checked, incomplete text, uncertain, or failed status. Details stay in its tooltip; click the mark to open settings. Unconfirmed matches stay visible. Nagi Feed does not translate posts and can run alongside X Force Translator.

## Install in Chrome

1. Run `npm ci` and `npm run build`.
2. Open Chrome's extension management page and enable Developer mode.
3. Choose **Load unpacked** and select this project's `dist/chrome` directory.
4. Disable any previous Nagi Feed or Calm Feed installation, then reload X.
5. Open Nagi Feed settings to configure your rules and Jev API key.

Moving an unpacked extension to a new path changes its extension ID. Keys and settings are not automatically transferred. Keep the old installation until you have copied any custom rules you need.

## Jev API key and privacy

- **TypeSafe AI / Jev:** checks post text and quoted text against your rules.
- **Official X ads:** no API key required.

Keys are stored in the extension's local IndexedDB, never synced to the cloud, and not shown in saved input fields. The API key panel is collapsed by default. A missing Jev key is explained in the 凪 mark tooltip; clicking it opens settings. Media-only posts do not need a key.

Only post text, quoted text, and enabled text rules are sent to TypeSafe AI / Jev. No media data or URLs are sent for analysis. Rules can be written in any language, but apply only to text. Official X ad labels are checked locally, without API calls. The optional “Not interested” action for filtered non-ad posts on Home is unchanged.

## Development

- `npm test`: unit tests
- `omabox run -- npm run test:browser`: isolated Chrome extension tests with fictional posts and mocked APIs
- `npm run build`: Chrome and Firefox builds in `dist/chrome` and `dist/firefox`
- `python3 scripts/package.py`: distribution ZIP files

The interface, default rules, and system messages are in English. User-written rules keep their original language. Unedited defaults from older Japanese versions are migrated to English. Internal recognition of Japanese X labels remains supported.

## Chrome Web Store preparation

The [submission packet](store/SUBMISSION.md) contains the English listing, permission/data disclosures, private reviewer-key checklist, ZIP path, and isolated screenshot-generation instructions. It is prepared for an initial store listing; submission and approval are pending. The public source repository is [komagata/nagi-feed](https://github.com/komagata/nagi-feed).

Read the [privacy policy](PRIVACY.md) for local storage, direct TypeSafe transmission, deletion, and optional X feedback details. Text analysis requires your Jev account/API key and provider usage charges; official X ad-label filtering works without a key. Automatic “Not interested” for confirmed non-ad Home matches is enabled by default and can be disabled in settings.

Generate store images only inside omabox with `npm run store:assets -- /home/sbx/nagi-store-assets`; see the packet for the fake-HOME output/copy-back procedure. Source SVGs and reviewable PNGs live in `assets/icons` and `store/assets`.
