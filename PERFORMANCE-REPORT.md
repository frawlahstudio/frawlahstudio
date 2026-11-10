# Performance Refactor Report

Date: 2026-11-01
Scope: the static Frawala Studio site (`index.html`, `script.js`, CSS, `assets/`) and the Next.js Masaq app (`src/`, `next.config.js`).

---

## 1. Changes applied

### 1.1 Gallery images

- `script.js` renders every homepage, category and "about" gallery image with:
  - `loading="lazy"`
  - `decoding="async"`
- The team section was later redesigned as text-only cards. No team photos are rendered anymore, so `assets/team/ali.jpeg`, `khalid.jpeg`, and `saif.jpeg` (≈4.7 MB) joined the unused set.
- Header/footer logos use `decoding="async"`; the footer logo is also `loading="lazy"` (the header logo is above the fold, so it is intentionally not lazy).
- Lightbox images use `decoding="async"`.

Verified in the browser: **12/12** rendered homepage gallery images and **43/43** category images had `loading="lazy"` + `decoding="async"`.

### 1.2 Hero and gallery videos

- The hero video no longer downloads on page load. Its source is held in `data-src`, with `preload="none"`.
- Gallery videos now use `data-src` + `preload="none"` as well.
- `IntersectionObserver` (root margin `300px`, threshold `0.01`) attaches the source and starts playback only when a video approaches the viewport.
- Videos are paused when they leave the viewport or the tab is hidden, and resumed when visible again.
- When JavaScript or `IntersectionObserver` is unavailable, all videos fall back to being loaded immediately.
- The lightbox reads the deferred source correctly (`data-src` / `<source data-src>`).

Verified in the browser: the hero had no `src` before observation, then loaded and played; the gallery video similarly reported `data-loaded="true"` only after it was requested.

### 1.3 Silent background videos: 50% volume

- Every background/gallery video is muted and assigned `volume = 0.5` when its source is attached.
- A capture-phase `play` listener re-applies `volume = 0.5` whenever any `.hero-video-bg` or `.portfolio-item` video starts playing.
- The sound toggle unmutes at `0.5` and re-mutes cleanly.
- Lightbox videos start muted at `0.5` volume with native controls.

Verified in the browser: hero and gallery videos reported `volume: 0.5`, `muted: true`; unmuting kept `volume: 0.5`.

### 1.4 Third-party dependencies

The static site had two render-blocking third-party stylesheets:

- Font Awesome 6.4.0 (99.6 KB CSS + ~281 KB of WOFF2 fonts)
- Google Fonts (Cairo + Outfit)

Both are now:

- preconnected via `preconnect`
- preloaded with `rel="preload" as="style"`
- loaded with the non-blocking `media="print"` → `onload="this.media='all'"` pattern
- backed by `<noscript>` fallbacks

This removes them from the critical render path without changing the icon set.

For the Next.js app:

- `next.config.js` now separates dynamically imported third-party code into its own long-cacheable `third-party-async` chunk using `splitChunks.cacheGroups`.
- `optimizePackageImports` was expanded to cover `lucide-react`, `date-fns` and the installed Radix packages.
- Wizard steps 2–7 are now loaded with `next/dynamic`, so only the current step (plus step 1) is in the initial wizard bundle.
- `Step7Report` is also dynamically imported on the sample-report page.

### 1.5 Other performance fixes

- Removed `will-change: transform` from every gallery image/video. It was creating compositor layers for all gallery media even though those elements are never transformed; the hover transform is on the card.
- Scroll listeners are now `{ passive: true }`; the header scroll handler is throttled with `requestAnimationFrame`; the stats handler exits immediately after the numbers have counted once.
- Removed unused imports from Next.js files (including `wizard/layout.tsx`, which was importing every wizard step even though it only renders `Toaster`).

---

## 2. Unused code and heavy files found

### 2.1 Static site media

| Metric | Value |
|---|---:|
| `assets/` total | **1,800.5 MB** (169 files) |
| Referenced by the live HTML/JS | **760.7 MB** (103 files) |
| Unreferenced inside `assets/` | **1,039.8 MB** (66 files) |
| `my protoflio/` (legacy, not used by live site) | **1,173.2 MB** (103 files) |
| `meet the team/` (legacy) | 4.5 MB |
| `logo of websit/` (legacy) | 0.1 MB |
| `backup/` (old HTML/CSS/JS copies) | 0.1 MB |

The live page therefore ships/serves roughly **760.7 MB** of media, and the folder contains roughly **3.0 GB** once the legacy folders are counted.

Largest unused files (safe candidates for archiving, not deletion without review):

| Size | File |
|---:|---|
| 188.1 MB | `assets/omanis/IMG_1302.TIF` |
| 188.1 MB | `assets/omanis/IMG_1302 (1).TIF` |
| 49.5 MB | `assets/omanis/4.PNG` |
| 34.1 MB | `assets/floward/IMG_2874.CR3` |
| 26.8 MB | `assets/cafes/<Arabic folder>/reel 1.mp4` (duplicate of `assets/reels/reel 1.mp4`) |
| 21.7 MB | `assets/cafes/<Arabic folder>/IMG_9989.JPG` (duplicate) |
| 19.7 MB | `assets/abayas/IMG_7396.JPG.jpeg` |

There is also a **438.9 MB duplicate café folder** plus a **45.9 MB subfolder** under `assets/cafes/`; nearly all of it is unreferenced and duplicates the files already in `assets/cafes/`.

In the live set, **98 referenced JPEGs total 667.8 MB** — an average of **6.81 MB per image**. The largest referenced single image is **21.7 MB** (`assets/cafes/IMG_9989.JPG`). These are full-resolution files (many around 4640 px wide) served directly to gallery cards that render at roughly 360–500 px.

The five reels total **92.9 MB**, including a **26.8 MB hero video** (`assets/reels/reel 1.mp4`). Lazy loading prevents off-screen downloads, but the hero still downloads 26.8 MB on first view.

### 2.2 Duplicated gallery records

Four sources are registered more than once in `mediaDatabase`:

- `assets/perfumes/q7.jpeg` ×2
- `assets/cafes/IMG_5438.JPG.jpeg` ×2
- `assets/cafes/IMG_5397.JPG.jpeg` ×2
- `assets/cafes/IMG_5493.JPG.jpeg` ×2

This can show the same work twice in a category and wastes a little render/markup work.

### 2.3 Next.js unused code and dependencies

**Dead source files (not imported anywhere):**

- `src/lib/export-pdf.ts` (19.5 KB) — pulls in `jspdf` + `jspdf-autotable`
- `src/lib/export-excel.ts` (13.0 KB) — pulls in `xlsx`
- `src/app/api/ai-analysis/route.ts` — mock response only; not called by the frontend
- `src/app/api/rent-estimate/route.ts` — not called by the frontend
- `src/lib/oman-rent-data.ts` — only used by the unused rent-estimate route
- `prisma/` schema/client — no `PrismaClient` usage in `src/`

**Heavy dependencies with no runtime usage in `src/`:**

| Package | Declared | Unpacked size | Notes |
|---|---:|---:|---|
| `maplibre-gl` | ^4.7.1 | 39.0 MB | Map is a placeholder in `Step2Location`; no import |
| `date-fns` | ^3.6.0 | 21.1 MB | No import |
| `date-fns-tz` | ^3.0.0 | 0.2 MB | No import |
| `jspdf` | ^2.5.1 | 14.0 MB | Only in unused `export-pdf.ts` |
| `jspdf-autotable` | ^3.8.2 | 0.2 MB | Only in unused `export-pdf.ts` |
| `xlsx` | ^0.18.5 | 7.2 MB | Only in unused `export-excel.ts` |
| `openai` | ^4.52.7 | 2.4 MB | AI route is mocked |
| `@google/generative-ai` | ^0.15.0 | 1.5 MB | No import |
| `zustand` | ^4.5.4 | 0.3 MB | No import |
| `@prisma/client` | ^5.17.0 | 8.0 MB | No `PrismaClient` usage |
| `prisma` (dev) | ^5.17.0 | 10.2 MB | No DB usage in app code |
| All 10 `@radix-ui/*` packages | — | < 0.5 MB each | No imports |

These packages do not all reach the browser bundle — unused imports are tree-shaken — but they inflate install size, audit surface and CI time. They are safe candidates to remove after confirming there is no near-term plan to wire the corresponding features.

**Existing functional risk found while tracing bundles:**

- `src/app/wizard/page.tsx` pushes to `/wizard/2-location` … `/wizard/7-report`, but only `src/app/wizard/page.tsx` exists. There is no `[step]` route or nested route folder, so those `router.push` targets are likely 404s in the App Router. This is not a performance issue, but it means the newly split step chunks may never be reached in a production build.

### 2.4 Third-party weight in the static site

| Asset | Size |
|---|---:|
| Font Awesome `all.min.css` | 99.6 KB |
| Font Awesome WOFF2 files | 280.9 KB |
| Google Fonts CSS | 2.4 KB |
| Google Fonts font binaries | loaded per selected family/weight; multiple files |

These are now off the critical path. If further savings are needed, replace Font Awesome with an inline SVG sprite containing only the ~25 icons used, which removes the CSS and webfont downloads entirely.

---

## 3. Recommended next steps, by impact

1. **Compress and resize the 98 referenced images** to responsive WebP/AVIF variants (e.g. 480/960/1440 px) and add `srcset` + `sizes`. This is the single largest remaining win: the current average is 6.81 MB per image.
2. **Compress the five reels** with H.264/WebM at a lower bitrate, add poster frames, and keep the hero poster under ~150 KB.
3. **Archive/remove the 1,039.8 MB of unused files** inside `assets/`, the duplicate café folder, and the legacy `my protoflio/`, `meet the team/`, `logo of websit/` and `backup/` folders.
4. **Deduplicate the four repeated `mediaDatabase` entries.**
5. **Remove unused Next.js packages/files** listed in section 2.3, or add the missing step routes so the code is actually reachable.
6. **Add server compression and long-lived caching** for `assets/` (gzip/brotli for text, immutable cache for images/video). This is a hosting/config step, not a code change.
7. **Replace Font Awesome with an SVG sprite** if you want to remove the last third-party blocking risk and ~380 KB of font/CSS payload.

---

## 4. Verification and limitations

- The static site was served locally and tested in the in-app browser:
  - no console errors
  - language toggle still works
  - category view and lightbox still work
  - lazy image attributes present on every rendered gallery image
  - hero/gallery videos load on demand, are muted, play at 0.5 volume, and unmute at 0.5
- `npm`/Node.js is not installed in this environment, so the Next.js production build could not be executed. The Next changes are limited to:
  - `next.config.js` (`splitChunks`, `optimizePackageImports`)
  - `next/dynamic` imports for wizard steps and the sample report
  - removal of unused imports
- IntersectionObserver callbacks did not fire in the headless in-app browser because the desktop window was not visible; the observer logic was verified by calling the same loader directly and by inspecting the deferred `data-src` state. It will fire normally in a visible browser.

---

## 5. Cleanup executed — 2026-11-09

### 5.1 Deleted files (2,222.08 MB total)

| Item | Files | Size |
|---|---:|---:|
| Unreferenced files inside `assets/` | 69 | 1,044.27 MB |
| `my protoflio/` (legacy portfolio copies) | 103 | 1,173.19 MB |
| `meet the team/` (legacy team photos) | 3 | 4.47 MB |
| `logo of websit/` (legacy logo variants) | 2 | 0.08 MB |
| `backup/` (old HTML/CSS/JS copies) | 4 | 0.07 MB |

The deletion manifest is at `C:\Users\nickw\AppData\Local\Temp\opencode\frawala-removed-files-2026-11-09.csv`.

### 5.2 Image compression

- Scope: the 94 referenced JPEGs larger than 1600 px (the 1080×1080 logo was left untouched).
- Settings: max long edge **1600 px**, JPEG quality **85**, EXIF orientation applied (35 files carried orientation tag 8).
- Result: **663.24 MB → 22.40 MB** (saved **640.89 MB**, ~96.6%).
- Per-file log: `C:\Users\nickw\AppData\Local\Temp\opencode\frawala-image-compression-2026-11-09.csv`.

### 5.3 Final asset footprint

| Metric | Before cleanup | After deletion | After compression |
|---|---:|---:|---:|
| `assets/` total | 1,800.5 MB | 756.22 MB | **113.20 MB** |
| Files in `assets/` | 169 | 100 | **89** |
| Images | 663.31 MB | 663.31 MB | **20.28 MB** |
| Videos (5 reels) | 92.93 MB | 92.93 MB | 92.93 MB (unchanged) |

Free disk space went from ~217 MB to ~3,069 MB.

> **Update:** the owner removed 11 café images (`IMG_0284`, `IMG_0291`, `IMG_5539`, `IMG_0241`, `IMG_5504`, `IMG_5559`, `IMG_5567`, `IMG_5579`, `IMG_9956`, `IMG_9959`, `IMG_9989`). Their entries were deleted from `mediaDatabase` in `script.js`, leaving **89 referenced assets** (84 images + 5 videos) with no broken references.

### 5.4 Verification after compression

- All **89 live asset references resolve**; 0 missing, 0 unreadable, 0 images above 1600 px on the long edge.
- All six category galleries render every image (87 placements) with 0 broken images; lightbox opens and closes correctly.
- Hero video loads and plays (`readyState 4`, duration 23 s, no media error).
- Consultation form still has exactly `user_name`, `user_phone`, `message`, and its submit handler is attached.
- No console errors and no failed network requests during the test.

### 5.5 Unused Next.js app removed — 2026-11-10

The project root now contains only the live static site. The unused Next.js application and its configuration were archived and deleted:

| Deleted item | Type |
|---|---|
| `src/` | Next.js app (pages, API routes, components) |
| `prisma/` | Database schema |
| `package.json` | npm manifest |
| `next.config.js` | Next.js config |
| `tsconfig.json` | TypeScript config |
| `tailwind.config.ts` | Tailwind config |
| `postcss.config.js` | PostCSS config |
| `next-env.d.ts` | Next.js types |
| `.env.example` | Environment template |
| `README.md` | Project readme |

- Backup: `C:\Users\nickw\Documents\frawala-nextjs-backup-2026-11-10.zip` (93.9 KB, 33 entries).
- Remaining root files: `index.html`, `script.js`, `style.css`, `category-views.css`, `sound-button.css`, `assets/`, `PERFORMANCE-REPORT.md`, `.gitignore`.
- Post-removal smoke test: page loads, café gallery renders 32/32 images, consultation form intact, hero video present, no console errors or failed requests.
