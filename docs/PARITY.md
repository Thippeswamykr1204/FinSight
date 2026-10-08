# UI parity

The approved visual contract preserves `apps/web/src/app/globals.css`, local
Geist/Fraunces fonts, category colors, DOM order, component classes, spacing,
animations, hover states and existing navigation interactions. Data adapters and
required additional screens use the existing components/tokens.

Before captures were taken from the production web build on 7 October 2026 for
23 reachable routes, both themes, at 375, 768 and 1280 pixels: 138 screenshots.
A second 138-image set records empty finance screens. Browser captures and their
route manifests are held outside the repository so release source has no large
baseline artifacts. Protected routes without a session are recorded as their
sign-in destination, rather than being treated as authenticated captures.

Compare identical route, viewport, theme, browser, fonts and data state. Required
changes to authentication, data/copy and new screens need explicit review;
unintended styling differences fail parity. Pixel comparison evidence is recorded
when verification is executed; existing README images are not verification evidence.

## 7 October 2026 evidence

- Source relocation: **138/138 unmasked screenshots pixel-identical**.
- Final authenticated/billing capture: **31 reachable routes × 3 widths × 2 themes = 186 screenshots**, including the new billing screen, with an empty real workspace.
- Final patched Tailwind toolchain comparison against the pre-upgrade authenticated/billing capture: **170/186 whole screenshots pixel-identical**. The 16 remaining images are confined to Accounts import copy (4), correction of malformed Insights copy (6), and the required monitoring privacy disclosure (6). Responsive headline line heights, keyboard hints, grid tracks, shadows, radii, colors and disabled controls were restored to their approved rendering. This comparison establishes toolchain parity for unchanged content, not whole-image parity against the original browser-local product.
- Configured-original comparison: whole images differ because identity/status, browser-local copy, marketing preview, onboarding, settings and authenticated access necessarily changed. Whole-image zero drift has **not** been established.
- A diagnostic comparison excluding shared shell identity/status and report attribution found **19/36 finance-content crops pixel-identical**. Remaining differences include required copy and its wrapping; this is partial evidence, not a zero-drift result.
- The new billing screen was inspected at 375 pixels in both themes and marketing screens at 1280 pixels. Existing CSS tokens, fonts and navigation ordering remain the visual contract; compatibility rules preserve v3 behavior under the patched v4 compiler.

Full-size evidence and JSON route/comparison manifests are in the execution's external `omnirush/after-final-approved` artifact directory, alongside `after-billing`, `before-configured` and `after-relocation`. Final launch still requires original-design acceptance of the required authentication/data/copy changes; do not label the current original-product comparison as whole-screen zero drift. Browser storage-state files remain private and outside release source.
