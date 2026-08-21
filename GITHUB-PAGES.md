# Publishing the AIMS site on GitHub Pages (free)

This site is an Astro project. A GitHub Action (`.github/workflows/deploy.yml`)
is already set up: **every time you push a change, GitHub rebuilds the site and
republishes it automatically.** You never build or upload by hand.

You do the one-time setup below once; after that, publishing an update = commit + push.

---

## One-time setup

### 1. Create the account
Go to https://github.com and sign up. Use the lab name as the username, e.g.
**`aims-scilifelab`** (or `aims-stockholm`). This becomes part of your web address.
(You can also make it a GitHub *Organization* if you want several people to manage it.)

### 2. Set the site URL (one line)
Open `astro.config.mjs` and make sure `site` matches your username:

    site: 'https://aims-scilifelab.github.io',

If you chose a different username, change it here. (This only affects the sitemap
and link previews — it won't break anything if you forget, but it's nice to get right.)

### 3. Create the repository — the name matters
Create a **new repository** named exactly:

    <your-username>.github.io

e.g. `aims-scilifelab.github.io`. Naming it this way makes the site live at the clean
root address `https://aims-scilifelab.github.io/` (no `/repo/` on the end).
Make it **Public**. Don't add a README/.gitignore in the GitHub form (this folder already has them).

### 4. Push this folder to that repository
Easiest, no terminal — **GitHub Desktop** (https://desktop.github.com):
  1. Install and sign in.
  2. File → Add local repository → choose this `aims-site` folder.
     (If it says it's not a git repo, click "create a repository here".)
  3. It will respect `.gitignore`, so `node_modules/` and `dist/` are skipped — good.
  4. Commit everything, then **Publish repository** → pick the `<username>.github.io` repo,
     keep it Public.

Prefer the terminal? From inside this folder:

    git init
    git add .
    git commit -m "Initial AIMS site"
    git branch -M main
    git remote add origin https://github.com/<your-username>/<your-username>.github.io.git
    git push -u origin main

### 5. Turn on Pages (via Actions)
In the repository on github.com: **Settings → Pages → Build and deployment →
Source: "GitHub Actions".** That's it — the included workflow does the rest.

Within a minute or two the **Actions** tab will show a green build, and your site
is live at **`https://<your-username>.github.io/`**.

---

## Updating the site later
1. Edit the content/pages in this `aims-site` folder (Markdown/YAML under `src/content/`,
   or the `.astro` pages).
2. In GitHub Desktop: Commit → Push  (or `git add . && git commit -m "update" && git push`).
3. The Action rebuilds and republishes automatically in ~1–2 minutes.

You do **not** need the `aims-demo` folder for hosting — that's only for viewing
locally. The live site is always built fresh from this `aims-site` source.

---

## A custom domain later (optional)
If you get a domain (e.g. `aims-lab.se`):
1. Repo **Settings → Pages → Custom domain** → enter it → Save.
2. At your domain registrar, add the DNS records GitHub shows you.
3. Change `site:` in `astro.config.mjs` to `https://your-domain`, commit, push.

## Notes
- The embedded Google map on the homepage needs the visitor to be online (normal for a live site).
- Repo stays well under GitHub's limits (~25 MB total, largest file a few MB).
