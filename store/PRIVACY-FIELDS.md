# Chrome Web Store privacy and review worksheet

Prepared from version 0.2.8 source. These are suggested answers for the publisher to verify against the current dashboard. They do not constitute acceptance of terms or completed attestations.

## Single purpose

Nagi Feed helps users control which X posts they see by applying their own text exclusion rules and recognizing official X ad labels, with whole-post collapse/reveal, checking status, and optional X “Not interested” feedback for confirmed non-ad matches.

## Permission justifications

| Permission or host | Ready-to-copy justification |
| --- | --- |
| `storage` | Store filtering settings, user-written exclusion rules, and per-account/post feedback claims locally; use session storage only to migrate legacy keys. The current Jev key is stored in extension-origin IndexedDB, not sync storage. |
| `https://x.com/*` | Run the packaged content script on X pages to read post/quoted text and official ad labels, show filtering/status/reveal controls, open settings, and optionally select Not interested on Home for confirmed non-ad matches. |
| `https://twitter.com/*` | Support the same packaged filtering interface on X's twitter.com host. |
| `https://api.typesafe.ai/*` | Send post/quote text and enabled free-text rules directly to TypeSafe AI / Jev for analysis, authenticated with the user's Jev API key. The implementation uses HTTPS POST to `/v1/systemone`. |

No broader hosts are requested. No media host, translation provider, OpenAI API, `tabs`, or `scripting` permission is requested. The extension can open its own settings page using `chrome.tabs.create` without requesting the `tabs` permission.

## Remote code

Suggested answer: **No**. All executable JavaScript is bundled in the extension. No remote script, module, WASM, or executable code is downloaded. Jev responses are JSON decision data parsed as numeric answers; they are not evaluated as code. No remote code is needed for the stated single purpose.

## Data type declarations

Do not select “collects no user data”: content and rules are transmitted to a third-party provider even though there is no developer backend. Use the dashboard's current definitions and declare third-party processing as required.

| Dashboard data type | Suggested declaration and evidence |
| --- | --- |
| Website content | **Declare.** Post and quoted text read from visited X pages are sent to TypeSafe together with enabled user-written rules. Text may itself contain personal or sensitive information. Media is not analyzed. |
| Authentication information | **Declare.** The user's Jev API key is stored in extension IndexedDB and sent as a Bearer credential only to TypeSafe. It may identify the provider account. Nagi Feed does not collect X passwords or export X session cookies. |
| User activity / user interaction | **Declare if included by the dashboard definition.** Optional automatic Not interested clicks happen on X Home; local deduplication stores account handle, post ID, and timestamp. Claims record attempts, not guaranteed success. No general click, mouse, or browsing-history telemetry is implemented. |
| Personally identifiable information | **Conservative suggestion: declare.** The signed-in X account handle is processed locally for feedback deduplication; post/quote text may contain names or handles, and the provider key can identify a TypeSafe account. Publisher must confirm the dashboard's treatment of local-only identifiers and provider authentication. |
| Other sensitive categories | There are no dedicated health, financial/payment, personal-communications, or location collection features. Text and user-written rules can incidentally contain such information. Do not silently mark these as absent without checking the dashboard definitions and the intended content flow. TypeSafe also receives ordinary connection information; no extension geolocation feature exists. |

The extension does not create a general browsing-history log. X URLs are read locally to identify posts and the current account; extracted media URLs and browsing-history records are not sent to Jev. TypeSafe receives the text, rules, credential, and ordinary connection information described in the privacy policy. Do not make provider retention/training promises.

## Use and transfer attestations

The source supports the stated limited use: data is used only for filtering, necessary settings/Jev authentication, and optional X feedback; there is no developer analytics, advertising, sale, unrelated transfer, or creditworthiness/lending feature. The publisher must personally review and make any required dashboard certifications, privacy/disclosure acknowledgements, and developer-program declarations. This worksheet does not impersonate that acceptance. Publisher account information, registration/payment status, identity verification, and 2FA state are unknown.

## Reviewer testing instructions — copy to the private review field

1. Install the uploaded extension. Open its settings through the toolbar popup or extension options. Confirm English rules and the optional Not interested setting. The key panel starts collapsed; saved keys are not shown in its input.
2. Keyless path: with the default official-ad rule enabled, visit X and locate a post that X explicitly labels Ad, Promoted, or Sponsored. It collapses locally and can be revealed with Show. An ordinary post merely mentioning advertising should not collapse as an official ad. Ad inventory and X access/login requirements vary; use a reviewer-controlled account if X requires login.
3. Text-filter path: use the separately supplied reviewer Jev account/key below. Expand Jev API key, paste the key, and Save API key. Add a narrow rule matching text in a reviewer-controlled test post, save settings, and visit that post on X. A confirmed match collapses; Show reveals it and Collapse again restores collapse. Nonmatching text remains visible. The 凪 mark near Grok gives status details and opens settings.
4. Text analysis sends post/quoted text and enabled free-text rules to TypeSafe, incurs provider usage, and requires an active key with balance/usage capacity. Media-only posts remain visible; images/video are not analyzed; no translation is supplied.
5. Automatic Not interested is enabled by default. Disable it before testing on a feed whose recommendations must remain unaffected. When enabled, it only attempts the available action for confirmed non-ad matches on Home, once per account/post claim; success is not guaranteed.
6. Delete the reviewer key in settings after testing. Do not paste it into a public issue, listing, screenshot, repository, or this worksheet.

**PRIVATE reviewer credential: PENDING.** The publisher must supply a usable, scoped/test Jev key through the dashboard's private reviewer field or arrange an approved review method. Never invent a credential. X reviewer login and any publisher login/verification requirements are also pending/unknown; no account session or key is included in this repository.

For visual inspection without an X account or provider calls, the repository's `store:assets` script runs real built extension UI against labeled fictional posts and mocked responses in an ephemeral isolated Chromium profile. These captures illustrate the interface, but do not replace live store-review credentials or prove live provider behavior.
