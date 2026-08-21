# AIMS Laboratory — website

The public website for **AIMS — AI × Medicine × Life Sciences**.

It is built with [Astro](https://astro.build). You edit **content** (text, people,
reading sessions, …) in Markdown / YAML files under `src/content/`. You almost never
need to touch the templates or components to update the site.

---

## 1. Running & building

You need [Node.js](https://nodejs.org) 18+ installed. Then, in this folder:

```bash
npm install       # once, to install dependencies
npm run dev       # local preview at http://localhost:4321 (auto-reloads as you edit)
npm run build     # produce the deployable site in dist/
npm run preview   # serve the built dist/ locally to double-check
```

`npm run dev` is what you'll use day to day: start it, open the URL, and every time you
save a content file the browser updates.

## 2. Deployment

`npm run build` writes a plain static site to `dist/` — just HTML, CSS, a little JS,
and your media. Host it anywhere that serves static files (GitHub Pages, Netlify,
Cloudflare Pages, KTH web hosting, an S3 bucket, …). There is **no server, database or
build service required at runtime**.

- The site is configured for a **root** domain. When you point a real domain at it,
  set `site:` in **`astro.config.mjs`** to that URL (used for the sitemap, canonical
  links and social previews).
- If you ever deploy under a sub-path (e.g. `username.github.io/aims-site/`), also
  uncomment and set `base: '/aims-site/'` in `astro.config.mjs`.

## 3. Where everything lives

```
src/
  content/
    site/settings.yaml            ← lab name, descriptor, institution, NAV & FOOTER
    home/home.yaml                ← homepage copy
    methods/*.md                  ← Research → Methods (one file per theme)
    domains/*.md                  ← Research → Domains (one file per theme)
    collaborations/*.yaml         ← Research → Collaborations
    people/*.md                   ← one file per person
    selectedPublications/*.yaml   ← curated "Selected work"
    readingSessions/*.yaml        ← What We Read sessions (one file per week)
    gallery/*.yaml                ← Life at AIMS photo entries
    openScience/*.yaml            ← Open Science resources
    openings/*.md                 ← Join → job openings
    config.ts                     ← the SHAPE of all the above (rarely edited)
  pages/*.astro                   ← one file per page (layout/template — rarely edited)
  components/*.astro              ← Nav, Footer, Hero, PageHeader (shared UI)
  layouts/Base.astro              ← <head>, nav, footer wrapper (SEO lives here)
  styles/global.css               ← colours, type scale, buttons (design tokens)
public/
  library-public.json            ← the paper library the "What We Read" archive reads
  hero/                          ← homepage background clips + poster.jpg
  people/                        ← put people's photos here
  gallery/                       ← put Life-at-AIMS photos here
  favicon.svg, og-default.png
```

Every file that contains editable **prose** starts with a comment telling you what it
is. Files whose name starts with `_` are ignored by the build. Any content file with
`draft: true` is validated but **not shown** on the public site — use it to stage
something you're not ready to publish.

> Tip: most collections contain an `example.*` file. It's a `draft`/`closed` template —
> copy it, rename it, fill it in, and set `draft: false` (or `status: open`) to publish.

---

## 4. How to edit common things

### Change the lab name / descriptor / institution / contact
`src/content/site/settings.yaml`. This also holds the **navigation** (`nav:`) and
**footer** links — add/remove/reorder items there and the menu updates everywhere.

### Change homepage text
`src/content/home/home.yaml` (hero statement, CTAs, section intros). The giant "AIMS"
wordmark and the "AI × Medicine × Life Sciences" line come from `settings.yaml`.

### Add / edit a research theme (Method or Domain)
Add a Markdown file to `src/content/methods/` or `src/content/domains/`:

```markdown
---
title: "Causal & Mechanistic Learning"
order: 50                 # controls position (low = first)
summary: "One sentence shown in previews."
keywords: ["causal inference", "mechanism"]
draft: false
---

A paragraph or two describing the theme. This body is plain Markdown.
```

### Add a person
Add a Markdown file to `src/content/people/` (copy an existing one). Minimum:

```markdown
---
name: "Jane Doe"
role: "PhD Student"
category: "phd"           # lead | researcher | postdoc | phd | engineer | staff | affiliate
status: "current"         # current | alumnus
affiliation: "KTH · SciLifeLab"
photo: "/people/jane-doe.jpg"   # optional; blank shows initials
research_interests: ["Spatial biology", "Representation learning"]
google_scholar: "https://scholar.google.com/citations?user=…"
draft: false
---

Optional longer bio (Markdown).
```

- **Add a group leader:** same, with `category: "lead"`. They appear under *Group
  Leaders* — the page is built for several equal leaders, so nothing else changes.
- **Add an affiliated researcher:** `category: "affiliate"`, and set `home_group`,
  `primary_affiliation` and `aims_role` (e.g. `"AIMS Affiliate"`). Affiliates are shown
  with their real home group so they're not implied to be AIMS employees.
- **Change someone's role/status:** edit `role:` / `status:` / `category:`.
- **Someone who is both current staff and a past PhD:** keep `status: current` and add
  `alumnus_of: "PhD"` (and optionally `alumni_year:`) — they'll appear in their current
  section *and* in Alumni.

### Add an alumnus
A person file with `status: "alumnus"`:

```markdown
---
name: "Alex Alum"
role: "PhD"
category: "phd"
status: "alumnus"
alumni_year: 2024
alumni_destination: "Postdoc, MIT"   # leave blank if unknown — don't guess
draft: false
---
```

### Add a "Selected work" publication
Copy `src/content/selectedPublications/example.yaml`, fill it in, set `draft: false`.
Use `area: methods | medicine | biology` and try to keep a spread across all three.

### Add a "What We Read" session
Add a YAML file to `src/content/readingSessions/` named by date, e.g. `2026-08-19.yaml`:

```yaml
date: 2026-08-19
presenters: ["Gisele Miranda"]
tags: ["Spatial Biology", "Foundation Models"]
papers:
  - title: "Paper title"
    authors: "A. Author et al."
    venue: "Nature Methods"
    year: 2026
    url: "https://…"
    why: "One human sentence: why we picked it."
```

The most recent session is featured on the homepage and at the top of *What We Read*.
The big searchable archive below it comes from `public/library-public.json` (see §5).

### Add Life at AIMS photos
1. Put the images in `public/gallery/`.
2. Copy `src/content/gallery/example.yaml`, point `src:` at your images, write `alt`
   text (required for accessibility) and optional captions, set `draft: false`.

### Add a collaboration
Copy `src/content/collaborations/example.yaml`, set `draft: false`. Only real
collaborations should be published.

### Add an Open Science resource
Copy `src/content/openScience/example.yaml`, choose a `category`, set `draft: false`.

### Add / close a job opening
Add a Markdown file to `src/content/openings/` with `status: "open"`. To take it down,
set `status: "closed"` (it stays as a record but disappears from the Join page). If
there are no open positions, the Join page shows an evergreen "get in touch" message.

### Change navigation or contact/institution info
`src/content/site/settings.yaml` (`nav`, `footerLinks`, `institution`, `location`,
`contactEmail`, `institutionLinks`).

---

## 5. The "What We Read" paper library

The searchable archive on *What We Read* reads `public/library-public.json` at load
time. That file is the **sanitised public export** produced by your existing library
tooling (`rebuild_index.py`), and it contains only public fields — no presenter names,
ratings or summaries. To refresh the archive after a reading session:

1. Re-run your rebuild (`process_inbox.py` → `rebuild_index.py`).
2. Copy the new `Papers/public/library-public.json` over `public/library-public.json`.
3. `npm run build` (or just redeploy).

Never place any other export (the ones with private fields) in `public/`.

---

## 6. Images & video

- **People photos:** square, ~400×400 px, `.jpg` or `.webp`, in `public/people/`.
- **Gallery photos:** landscape ~1600 px wide, `.jpg`/`.webp`, in `public/gallery/`.
- **Homepage hero clips:** short muted `.mp4`, 720p, in `public/hero/`; list the
  filenames in `src/components/Hero.astro` (the `clips` array). Keep them small — the
  hero only plays them on desktop, one at a time. `public/hero/poster.jpg` is the still
  used on phones and when reduced motion is on.
- **Social preview:** `public/og-default.png` (1200×630).

---

## 7. Design & accessibility notes

- Colours, the type scale and buttons are defined once in `src/styles/global.css`
  (the `:root` variables). Change a value there and it updates site-wide.
- The blue→wine gradient is used **only** on the `×` mark (`.x`), never on prose.
- The site targets WCAG AA: one `<h1>` per page, semantic landmarks, a skip link,
  keyboard-accessible menu (Escape closes it), visible focus rings, and it honours
  `prefers-reduced-motion` (the hero falls back to a still image).
