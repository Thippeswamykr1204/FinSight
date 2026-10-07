# Approved UI parity contract

Baseline reviewed 7 October 2026. Checked inventory items mean **identified in source**, not migrated/visually verified. Release boxes remain unchecked until evidence exists. Preserve DOM structure/classes, copy, fonts, colors, order, sizes, spacing, hover/motion and interactions. Only data-boundary edits and measured responsive corrections are permitted.

## Route inventory

- [x] `/`: hero/illustrative preview, three principle cards, weekly check-in, CTA, header/footer.
- [x] `/features`: six feature cards/links; `/pricing`: Free/Pro/Business planned plans/GST/demo links.
- [x] `/faq`: eight native details/chevrons; `/privacy`: six notice sections/operator contact; `/terms`: five terms sections.
- [x] `/login`: redirect to `/sign-in`.
- [x] `/dashboard`: month heading/actions, onboarding banner, cash-flow/3M/6M/1Y/chart table, score, net worth/goal savings/budget room, budgets/recent moves/signal, print.
- [x] `/transactions`: month totals, All/Income/Expenses, search/category filters, 12-row pagination, add/edit/delete dialogs, CSV/OFX preview/destination/deduplication/sample CSV, filtered CSV export; `?action=add`, `?action=import`, `?category=…`.
- [x] `/budgets`: month picker, totals, category progress/over-budget, links, create/edit/remove dialog.
- [x] `/goals`: totals/progress, cards, create/seasonal suggestions, contributions/reached state.
- [x] `/accounts`: tracked worth, manual cards/types/balances/counts, credit reminder/edit/clear, import link, manual account dialog.
- [x] `/insights`: FY totals/share, score/explanation, next step, 3/6/12-month scenario/assumptions, category bars, deterministic explanation.
- [x] `/calculators`: EMI/SIP/Goal, validated inputs, assumptions, results, schedule details/CSV.
- [x] `/settings`: profile/locale/notifications, legacy/full JSON export, sample reset/clear confirmation, membership/security copy.
- [x] `/onboarding`: name, sample/empty selection, final checklist, back/continue/open.
- [x] `/sign-in`: password/magic link/passkey/configured Google/Apple, reset/signup links, errors; `/sign-up`: name/email/password/notice consent/verification status.
- [x] `/auth/reset`, `/auth/new-password?token=…`, `/auth/mfa`: reset request/replacement/TOTP or backup challenge.
- [x] `/app`: workspace cards/empty/create modal.
- [x] `/app/workspaces/[id]`: Overview/Transactions/Accounts/Budgets/Goals/Members tabs, roles/read-only legacy, balances/FY/reminders, CRUD/import/page CSV/export/invites/role change/workspace deletion dialogs.
- [x] `/app/calculators`, `/app/security`, `/app/invitations?token=…`: calculators; TOTP/QR/manual key/recovery download/passkeys/devices/revocation/personal export/delete; invitation acceptance.
- [x] Global and hosted not-found/error boundaries, dashboard loading skeleton, hosted retry/loading states.
- [x] `/manifest.webmanifest`, `/sw.js`, `/offline.html`, `/app-icons/192`, `/app-icons/512`, `/icon.svg`, `/opengraph-image`, `/robots.txt`, `/sitemap.xml`: assets/SEO/PWA recovery remain.

## Every component

- [x] Layout: `BrandMark`, `AppShell`, `ProductProvider`, `PwaRegistration`, `HostedShell`.
- [x] Marketing: `SiteHeader`, `SiteFooter`, `SitePage`, `SiteTitle`.
- [x] Finance: `FinanceProvider`/toast, `FinanceDialog`, `Field`, `Empty`, `PageHeading`, `FormError`, `CashFlowChart`, `PlanningCalculators`, `ReportShare`.
- [x] Hosted: `AuthForm`, `WorkspaceList`, `WorkspaceBoard`, `SecuritySettings`, `DataRights`, `Invitation`.
- [x] UI: `Button`/variants/loading; `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`; `AnimatedNumber`.

## Theme / effects / shortcuts

- [x] Preserve all root/dark tokens in `globals.css`, Geist/Fraunces local fonts, category colors, 22px surfaces/12px controls, tracking/shadows.
- [x] Light/dark demo persisted in `finsight-demo-v3`; public marketing forces light; hosted currently forces light. Do not claim an existing hosted dark toggle/palette.
- [x] `pageEnter`, reveal delays 60–300ms, fade-in/slide-in/shimmer, pulseLine, skeleton pulse/spinner, surface hover lift/shadow, button hover/active scale, progress transition, FAQ chevron rotation, chart hover glow, 650ms cubic animated numbers.
- [x] Reduced-motion CSS/animated-number bypass, print stylesheet, focus-visible outlines, skip links.
- [x] Ctrl/⌘ K palette toggle; filtering, ↑/↓ selection, Enter navigation; Radix Escape/focus restoration/close.
- [x] Desktop sidebar/nav active dot, sticky header/search/notifications/theme; mobile menu dialog and first-five bottom navigation/safe-area.
- [x] Notifications: demo signal, over-budget/card-due signals, mark-read persistence, preference switch.
- [x] Native details/table/chart data, form keyboard submission, Web Share/clipboard/cancellation fallback.

## Behavior invariants

- [x] Integer paise, signed debt opening balance, exact parsing/bounds, INR/en-IN/IST/DD-MM date presentation/April–March FY; no FX reinterpretation.
- [x] All 26 categories and 15 account types retain exact names/order/colors; seasonal goal choices unchanged.
- [x] Imports: 2 MB/1,000 rows, explicit INR, ISO/DD/MM dates, Indian commas, merchant suggestions/UPI reference, preview before saving, existing/same-file duplicate rules, formula-safe export.
- [x] Goal earmarking does not change account worth; calculators do not store or move money.
- [x] Demo v3 key, retained v2 export, empty/reset behavior, reload persistence, no hosted fallback.
- [x] Hosted verified sessions, four roles, optimistic versions, idempotency actor/payload, audit/invite expiry/single use, owner export, exact deletion confirmation/recent sign-in.
- [x] Email verification/reset, magic links, TOTP confirmation/recovery replay, user-verified passkeys, provider capability gating, devices/revocation, consent version/time and secret-free export.
- [x] No sensitive PWA caching; errors, empty states, loading states, copy and URLs retained.

## Required responsive / visual evidence

For all routes, tabs, modal states, empty/error/loading states: deterministic fictional fixtures, frozen clock, fonts ready, reduced-motion captures; normal-motion interaction checks separately. Same viewport/browser/data before/after. Public/auth/hosted light-only baseline captured as light; both theme requests documented rather than fabricated. Test supported dark demo and explicit dark-hosted responsive rendering separately.

| Width | Before light/dark | After light/dark | No overflow/touch/dialog/table/chart checks |
| --- | --- | --- | --- |
| 320 | [ ] | [ ] | [ ] |
| 375 | [ ] | [ ] | [ ] |
| 414 | [ ] | [ ] | [ ] |
| 768 | [ ] | [ ] | [ ] |
| 1024 | [ ] | [ ] | [ ] |
| 1280 | [ ] | [ ] | [ ] |
| 1440 | [ ] | [ ] | [ ] |
| 1920 | [ ] | [ ] | [ ] |

- [ ] iOS WebKit/Android touch, landscape/short height/foldable sizes, safe-area and 44px targets verified.
- [ ] Every route/component/interaction verified after migration; screenshots reviewed and unintended diffs fixed.
- [ ] No DB/server-business imports in web; hosted E2E passes without sample fallback.
- [ ] Unit/API/E2E/a11y/visual/build/container gates pass. Only then is this contract fully satisfied.
