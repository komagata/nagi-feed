# Nagi Feed Privacy Policy

Last updated: October 19, 2026

Nagi Feed is a browser extension with a single purpose: help you control which X posts you see by applying your own text exclusion rules and recognizing official X ad labels. This policy describes the extension's data handling. TypeSafe AI / Jev and X operate their own services under their own policies.

## What the extension reads and sends

On X and twitter.com pages you visit, Nagi Feed reads post text and quoted text to apply enabled rules. For text analysis, it sends that text and your enabled free-text exclusion rules directly from your browser over HTTPS to `https://api.typesafe.ai/v1/systemone`. Your Jev API key is sent in the Authorization header as a Bearer credential. TypeSafe can associate these requests with the account behind your key. Do not put private information into a rule unless you intend to send it to TypeSafe.

Text analysis requires your own TypeSafe AI / Jev account and API key. Provider charges apply according to your account's terms and usage. Official X ad labels are detected locally and require no key. Nagi Feed does not fetch, sample, describe, or analyze images or videos. Media-only posts remain visible. A confirmed text match collapses the whole post, including attached media. The extension does not translate posts.

## Data kept in your browser

- Your Jev API key is stored in extension-origin IndexedDB. It is not stored using browser sync storage or returned to X content scripts. The saved key is not populated into the settings input.
- Your settings and free-text rules are stored in extension local storage, rather than browser sync storage.
- To avoid repeating optional X feedback, local storage records a claim for the signed-in X account handle and post ID, with a timestamp. A claim is not proof that X accepted the action.
- The extension service worker temporarily keeps analysis decisions in memory, with a cache of up to 200 results and in-flight requests. This memory cache ends when the service worker terminates. Changes to settings or the key clear the cached results.

These browser records are used to provide filtering, settings, authentication to Jev, and feedback deduplication. The extension does not send them to a developer-operated backend.

## Optional “Not interested” action on X

The “Mark filtered posts as ‘Not interested’ on X” setting is optional and **enabled by default**. You can turn it off in settings. On Home, for a confirmed non-ad rule match, Nagi Feed may open that post's menu and select X's “Not interested” action when available. This affects your X recommendations. It uses your existing X session; it does not request your X password or copy your X login cookies to TypeSafe. The local claim is made once per account/post pair to avoid repeating the attempt. The action may fail or be unavailable; success is not guaranteed.

## Developer use and third-party services

Nagi Feed has no developer-operated collection server or analytics. The developer does not sell extension user data, use it for advertising, or transfer it for purposes unrelated to this single purpose. The extension's access, use, and transfer of user data are limited to the stated filtering purpose and its necessary settings, Jev authentication, and optional X feedback features. The developer does not use extension user data to determine creditworthiness or for lending purposes.

TypeSafe receives the analysis text, enabled free-text rules, and authentication credential described above, and may receive ordinary connection information such as your IP address. Its retention, training, and deletion practices are controlled by TypeSafe, not by this extension. Consult [TypeSafe](https://typesafe.ai) for its current policies and account terms. X handles any optional feedback action under its own policies. This policy makes no promise about either provider's server-side retention or training practices.

## Deleting data and disabling access

To delete your locally saved key, expand **Jev API key** in settings and choose **Delete Jev key**. Deleting the key prevents new text-analysis requests until you save another key. It does not revoke the credential at TypeSafe; use your TypeSafe account to revoke it if needed.

You can edit or delete individual rules, disable filtering, or turn off automatic “Not interested” in settings. Removing the extension removes its browser-local extension data, including settings, rules, saved key, and feedback claims. Removing the extension or deleting the key does not delete data already received by TypeSafe or X. Contact the relevant provider about its server-side data or your account.

## Contact and changes

Questions and privacy reports can be filed at [Nagi Feed GitHub Issues](https://github.com/komagata/nagi-feed/issues). GitHub issues are public: do not include API keys, private posts, or other sensitive data. Changes to this policy will be published here with an updated date.
