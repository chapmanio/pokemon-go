# Device compatibility

## Galaxy S8 baseline

The Galaxy S8 family generally tops out at Android 9 Pie. The exact model and
carrier matter, so verify the phone under Settings → About phone before testing.
Samsung's [official update history](https://doc.samsungmobile.com/SM-G950F/000229180305/eng.html)
shows Android 9 for the SM-G950F family.

Current Chrome for Android requires Android 10 or newer, so the S8 may be
limited to an older Chrome release. Do not make the app depend on installing an
unsupported Chrome APK.

Firefox for Android supports Android 8 and newer according to
[Mozilla's requirements](https://support.mozilla.org/en-US/kb/will-firefox-work-my-mobile-device).
For this project, current Firefox for Android on the S8 is the supported
browser baseline. Samsung Internet and the installed Chrome version are useful
secondary compatibility checks, but are not release blockers.

## Stack decision

Keep the existing React, TypeScript, Vite, TanStack, Tailwind, and PWA stack.
The Vite 6 baseline used by the existing project targets Chrome 87 and newer,
which is below the browser versions expected to be available on the device.
React and the app's ordinary DOM usage are not the main compatibility risk.

Set an explicit production target when the new app is created so a dependency
upgrade does not silently move the browser baseline. Do not add a legacy bundle
unless testing demonstrates a real need; it increases download size and
complexity.

## Implementation constraints

- Design from a 360px-wide portrait viewport with large touch targets.
- Keep the initial JavaScript and image payload small; lazy-load detailed charts
  and deep pages.
- Prefer ordinary links, buttons, forms, CSS, and feature detection.
- Treat service workers, IndexedDB, offline mode, and installation as
  progressive enhancements. The core app must still load if storage or the
  service worker is unavailable.
- Cache the app shell and normalized app responses. Do not make the phone call
  community APIs directly.
- Avoid making push notifications, background sync, Web Bluetooth, geolocation,
  or exact offline refresh prerequisites for the first release.
- Use HTTPS for the deployed PWA; service workers require HTTPS or localhost.

## Required device test

Test the deployed app on the actual S8 using:

1. Current Firefox for Android — release baseline.
2. The installed Chrome version, if present.
3. Current Samsung Internet, if available.
4. A 360px-wide portrait viewport and normal text-size settings.
5. Cold load, repeat load, slow network, airplane mode, stale data, and an app
   update with an existing service-worker cache.

USB remote debugging from desktop Chrome is useful for inspecting the S8's
console, network requests, storage, and service worker.

