// Adds new publications by the AiMS group leaders to
// src/content/publications/all.yaml, using OpenAlex (https://openalex.org).
// Google Scholar has no API and blocks automated requests, so OpenAlex is used
// instead; it finds most papers but can lag behind Scholar by a few weeks.
//
// Run by .github/workflows/update-publications.yml once a month, or by hand:
//   node scripts/update-publications.mjs
//
// - Only papers published on or after SINCE are considered.
// - A paper is skipped if its title or DOI is already in all.yaml.
// - Every paper the script has handled is remembered in publications-seen.json,
//   so an entry you delete from all.yaml is not added back next month.
// - New entries are inserted at the top of `items:`; the rest of the file
//   (comments, manual entries) is left exactly as it is.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const YAML = path.join(ROOT, 'src/content/publications/all.yaml');
const SEEN = path.join(ROOT, 'scripts/publications-seen.json');
const SINCE = '2026-01-01';

// OpenAlex author IDs (matched by ORCID + KTH/SciLifeLab affiliation).
// To add someone: find them at https://api.openalex.org/authors?search=<name>
const AUTHORS = {
  A5069299612: 'Kevin Smith',    // ORCID 0000-0002-6163-191X
  A5036801761: 'Gisele Miranda', // ORCID 0000-0001-6079-0452
  A5064553103: 'Jens Lagergren', // ORCID 0000-0002-4552-0240
  A5028094685: 'Golnaz Taheri',  // ORCID 0000-0002-2741-0355
};

// Keep papers, reviews, chapters and preprints; skip everything else.
const KEEP_TYPES = new Set(['article', 'conference-paper', 'preprint', 'review', 'book-chapter', 'book']);
// Conference abstracts numbered like "83P Title…", "1234MO …", "LBA12 …"
// (but not titles such as "3D segmentation…").
const ABSTRACT_TITLE = /^\s*(LBA\d+|\d+(P|PD|MO|O|TiP|YO|eP))\b/;

const norm = (s) => String(s ?? '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]/g, '');
const shortId = (url) => String(url ?? '').split('/').pop();
const cleanDoi = (d) => String(d ?? '').toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');

async function fetchWorks() {
  const filter = `author.id:${Object.keys(AUTHORS).join('|')},from_publication_date:${SINCE}`;
  const select = 'id,title,publication_year,publication_date,type,doi,is_paratext,is_retracted,primary_location,authorships';
  const works = [];
  let cursor = '*';
  while (cursor) {
    const url = `https://api.openalex.org/works?filter=${encodeURIComponent(filter)}&select=${select}&per-page=200&cursor=${encodeURIComponent(cursor)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'aims-scilifelab-site (publications updater)' } });
    if (!res.ok) throw new Error(`OpenAlex ${res.status}: ${await res.text()}`);
    const page = await res.json();
    works.push(...page.results);
    cursor = page.results.length ? page.meta.next_cursor : null;
  }
  return works;
}

// "Jens Lagergren" -> "J. Lagergren", "Jen-Hung Wang" -> "J.-H. Wang".
function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts.pop();
  const given = parts.map((p) => p.split('-').map((h) => (h ? h[0].toUpperCase() + '.' : '')).join('-'));
  return `${given.join(' ')} ${last}`;
}

// Same style as the hand-written entries: first author, the AiMS leads, and the
// last author, with "…" wherever authors are left out.
function authorLine(authorships) {
  const list = authorships.map((a) => ({ name: a.author?.display_name ?? a.raw_author_name ?? '', aims: shortId(a.author?.id) in AUTHORS }))
    .filter((a) => a.name);
  if (list.length <= 5) return list.map((a) => initials(a.name)).join(', ');
  const keep = new Set([0, list.length - 1]);
  list.forEach((a, i) => { if (a.aims) keep.add(i); });
  const out = [];
  let prev = -1;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (i - prev > 1) out.push('…');
    out.push(initials(list[i].name));
    prev = i;
  }
  return out.join(', ');
}

function venueOf(w) {
  const src = w.primary_location?.source;
  let v = src?.display_name ?? '';
  // "bioRxiv (Cold Spring Harbor Laboratory)" -> "bioRxiv"
  if (src?.type === 'repository') v = v.replace(/\s*\([^)]*\)\s*$/, '');
  return v;
}

function urlOf(w) {
  if (w.doi) return `https://doi.org/${cleanDoi(w.doi)}`;
  const landing = w.primary_location?.landing_page_url;
  return landing && /^https?:\/\//.test(landing) ? landing : w.id;
}

const q = (s) => JSON.stringify(String(s)); // JSON strings are valid YAML double-quoted scalars

async function main() {
  const yaml = fs.readFileSync(YAML, 'utf8');
  const seen = new Set(fs.existsSync(SEEN) ? JSON.parse(fs.readFileSync(SEEN, 'utf8')) : []);
  const onPageTitles = new Set([...yaml.matchAll(/^\s*title:\s*(.+)$/gm)].map((m) => norm(m[1])));
  const onPageDois = new Set([...yaml.matchAll(/doi\.org\/([^\s"']+)/gi)].map((m) => m[1].toLowerCase()));

  const works = await fetchWorks();
  const added = [];
  for (const w of works.sort((a, b) => String(b.publication_date).localeCompare(String(a.publication_date)))) {
    const id = shortId(w.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const title = String(w.title ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!title || w.is_paratext || w.is_retracted || !KEEP_TYPES.has(w.type) || ABSTRACT_TITLE.test(title)) continue;
    if (onPageTitles.has(norm(title)) || (w.doi && onPageDois.has(cleanDoi(w.doi)))) continue;
    onPageTitles.add(norm(title));
    added.push({ year: w.publication_year, title, authors: authorLine(w.authorships ?? []), venue: venueOf(w), url: urlOf(w) });
  }

  if (added.length) {
    const block = added.map((p) =>
      `- year: ${p.year}\n  title: ${q(p.title)}\n  authors: ${q(p.authors)}\n  venue: ${q(p.venue)}\n  url: ${q(p.url)}\n`).join('');
    if (!/^items:\s*$/m.test(yaml)) throw new Error('Could not find the `items:` line in all.yaml');
    fs.writeFileSync(YAML, yaml.replace(/^items:\s*\n/m, (m) => m + block));
  }
  fs.writeFileSync(SEEN, JSON.stringify([...seen].sort(), null, 1) + '\n');

  console.log(`OpenAlex returned ${works.length} works since ${SINCE}; added ${added.length}.`);
  for (const p of added) console.log(`  + ${p.year}  ${p.title}  (${p.venue})`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `added=${added.length}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
