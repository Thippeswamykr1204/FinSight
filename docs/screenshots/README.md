# Screenshot provenance

Captured and visually inspected on **5 October 2026** from this branch's production Next.js build, served locally with `npm run start`. These are screenshots of the actual browser demo, not design mockups or hosted customer records.

| File                   | Route           | Theme | Capture                                          |
| ---------------------- | --------------- | ----- | ------------------------------------------------ |
| `dashboard.png`        | `/dashboard`    | Light | Full page, 1440 × 1000 viewport                  |
| `transactions.png`     | `/transactions` | Light | Full page, 1440 × 1000 viewport                  |
| `budgets.png`          | `/budgets`      | Light | Full page, 1440 × 1000 viewport                  |
| `goals.png`            | `/goals`        | Light | Full page, 1440 × 1000 viewport                  |
| `dashboard-dark.png`   | `/dashboard`    | Dark  | Full page, 1440 × 1000 viewport                  |
| `dashboard-mobile.png` | `/dashboard`    | Light | 390 × 844 viewport capture, touch/mobile context |

Playwright 1.63 / headless Chromium, device scale factor 1, `en-IN`, `Asia/Kolkata`, reduced motion. Fresh browser contexts loaded the application's unmodified fictional Ananya/Bengaluru seed. The desktop dark screenshot used the real theme button; a separate fresh mobile context kept light mode. Dates and the sample month come from the running app, not altered screenshot content.

Capture waited for route headings, network idle, loaded fonts and the cash-flow chart, and checked visible rupee values, no horizontal document overflow and no page errors. Desktop console errors were also checked. All six images were inspected for completed rendering, readable INR/date labels and responsive layouts.

To refresh, build and start the application using the [README production preview](../../README.md#production-preview), open the listed routes in fresh contexts with these settings, wait for completed rendering, and take PNG captures. Keep sample-only records and update this capture date when replacing the images. These screenshots do not demonstrate public deployment, hosted dark mode or field Android performance.
