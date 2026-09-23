# Desktop header fix — September 23, 2026

The native settings `details` container was flattened with `display: contents`. Its contents did not participate in the header's flex layout as expected: dropdowns and buttons occupied multiple rows inside a fixed-height bar, clipping some controls.

The fix gives settings an explicit flex container with spacing and centered alignment. On desktop, the bar adjusts its height and allows wrapping when needed. Mobile settings retain their grid and expand on demand.

## Checks performed

- Reproduced the defect across all 30 combinations of six languages and five desktop widths (1025, 1100, 1280, 1440, 1920 px).
- After the fix: no control outside the header or overlapping another control in those 30 combinations.
- Mobile settings at 360, 390, 768 and 1024 px: visible controls, touch targets of at least 44 px, no horizontal overflow; return to desktop mode verified.
- `npm run validate`: 425 application tests and 6 tooling tests passed, 100% lines and branches per file across all 46 executable sources; build passed.
- Repeated the acceptance check on https://initsysrev.net:8003/ after deployment, without injecting CSS. No game data was modified.

Evidence, screenshots and the acceptance script are retained in `release/header-fix/`. Visual verification uses Chromium on Linux. The fix is limited to the stylesheet.
