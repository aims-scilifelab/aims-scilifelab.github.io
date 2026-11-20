#!/usr/bin/env node
/**
 * Regenerate "Recent sessions" (src/content/reading/all.yaml) from the
 * reading-group Google Form responses, published as CSV.
 *
 * Privacy: only public paper info (title, venue, year, link) is written out.
 * Presenter names, their summaries, emails, and the private Google-Drive PDF
 * uploads from the sheet are intentionally excluded.
 *
 * Usage:  node scripts/update-reading.mjs
 *   env READING_CSV_URL  overrides the default published-CSV URL.
 */
import { writeFileSync, readFileSync } from 'node:fs';

const CSV_URL = process.env.READING_CSV_URL ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRchI2lp5FA5Akl5zMw0hjroLaCaKTe1-fhe2gRxUuE27hLU1BmED3VANdg7CF92uSyDvZsEUVfVpe1/pub?gid=453537759&single=true&output=csv';
const OUT = new URL('../src/content/reading/all.yaml', import.meta.url);
const SESSIONS = 8; // how many of the most-recent presentation dates to publish

// --- minimal RFC-4180 CSV parser (handles quotes, escaped quotes, newlines) --
function parseCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
function colIndex(headers, ...needles) {
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i]);
    if (needles.some((n) => h.includes(n))) return i;
  }
  return -1;
}
// US-style M/D/YYYY (Google Forms) -> {iso:'YYYY-MM-DD', year:'YYYY'}
function parseDate(s) {
  s = (s || '').trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return { iso: `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`, year: m[3] };
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return { iso: `${m[1]}-${m[2]}-${m[3]}`, year: m[1] };
  m = /(\d{4})/.exec(s);
  return { iso: '', year: m ? m[1] : '' };
}
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

// ── Semantic Scholar: paper authors + AI-generated one-sentence TLDR ──────────
// No API key needed (shared, rate-limited pool), so we go slowly and fail soft:
// a paper we can't match, or a hiccup, just yields empty fields.
const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtAuthors = (arr) => {
  const names = (arr || []).map((a) => a && a.name).filter(Boolean);
  if (!names.length) return '';
  return names.length <= 3 ? names.join(', ') : names.slice(0, 3).join(', ') + ' et al.';
};
const S2_UA = { 'User-Agent': 'AiMS-reading-list/1.0' };
function paperId(url) {
  const doi = (url.match(/10\.\d{4,9}\/[^\s"'<>]+/) || [])[0];
  if (doi) return 'DOI:' + doi.replace(/[.,);]+$/, '');
  const ax = (url.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i) || [])[1];
  if (ax) return 'arXiv:' + ax;
  return null;
}
async function s2(pathAndQuery) {
  const base = 'https://api.semanticscholar.org/graph/v1/';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(base + pathAndQuery, { headers: S2_UA });
      if (res.status === 429) { await SLEEP(3000 * (attempt + 1)); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch { await SLEEP(1500); }
  }
  return null;
}
async function fetchMeta(p) {
  const fields = 'tldr,authors';
  const id = paperId(p.url || '');
  let hit = id ? await s2(`paper/${id}?fields=${fields}`) : null;
  if (!hit || (!hit.tldr && !(hit.authors && hit.authors.length))) {   // fall back to title search
    const s = await s2(`paper/search?query=${encodeURIComponent(p.title)}&fields=${fields}&limit=1`);
    hit = (s && s.data && s.data[0]) || hit;
  }
  return {
    authors: hit ? fmtAuthors(hit.authors) : '',
    tldr: hit && hit.tldr && hit.tldr.text ? clean(hit.tldr.text) : '',
  };
}
async function enrichPapers(sessions) {
  for (const s of sessions) for (const p of s.papers) {
    const m = await fetchMeta(p);
    p.authors = m.authors;
    p.tldr = m.tldr;
    await SLEEP(1200);                                       // be polite to the shared API
  }
}

async function getCSV() {
  if (process.env.READING_CSV_FILE) return readFileSync(process.env.READING_CSV_FILE, 'utf8');
  const res = await fetch(CSV_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

function build(rows) {
  const headers = rows[0];
  const ix = {
    presented: colIndex(headers, 'date you presented', 'date presented'),
    name: colIndex(headers, 'your name'),
    title: colIndex(headers, 'title of the article', 'title'),
    venue: colIndex(headers, 'where was the article published', 'published'),
    pubdate: colIndex(headers, "article's publication date", 'publication date'),
    url: colIndex(headers, 'hyperlink to the article', 'hyperlink'),
    summary: colIndex(headers, 'summary of the paper', 'summary'),
  };
  if (ix.title < 0) throw new Error('Could not find the "Title" column in the CSV');

  const papers = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = clean(row[ix.title]);
    if (!title) continue;
    const pres = parseDate(row[ix.presented]);
    const pub = parseDate(row[ix.pubdate]);
    let url = clean(row[ix.url]);
    if (url && !/^https?:\/\//i.test(url)) url = '';            // only real links
    if (/drive\.google\.com/i.test(url)) url = '';             // never expose Drive
    papers.push({
      presentedISO: pres.iso || `${pub.year || '0000'}-00-00`,
      presenter: clean(row[ix.name]),
      title,
      venue: clean(row[ix.venue]),
      year: pub.year || pres.year || '',
      url,
      why: clean(row[ix.summary]),
    });
  }
  // newest first, then group by presentation date
  papers.sort((a, b) => (a.presentedISO < b.presentedISO ? 1 : a.presentedISO > b.presentedISO ? -1 : 0));
  const byDate = new Map();
  for (const p of papers) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.presentedISO)) continue;
    if (!byDate.has(p.presentedISO)) byDate.set(p.presentedISO, []);
    byDate.get(p.presentedISO).push(p);
  }
  const dates = [...byDate.keys()].sort().reverse().slice(0, SESSIONS);
  return dates.map((d) => ({ date: d, papers: byDate.get(d) }));
}

function toYAML(sessions) {
  const S = (v) => JSON.stringify(v == null ? '' : String(v)); // valid YAML double-quoted scalar
  let out = `# =========================================================================
# WHAT WE READ  —  Recent sessions.
#
# AUTO-GENERATED from the reading-group response sheet by
# scripts/update-reading.mjs (GitHub Action "update-reading").
# Do NOT edit by hand — changes will be overwritten on the next run.
# Emails and private Drive PDF links from the sheet are intentionally excluded.
# =========================================================================

sessions:
`;
  for (const s of sessions) {
    out += `- date: ${s.date}\n  tags: []\n  papers:\n`;
    for (const p of s.papers) {
      out += `  - title: ${S(p.title)}\n`;
      if (p.authors) out += `    authors: ${S(p.authors)}\n`;
      out += `    venue: ${S(p.venue)}\n`;
      if (p.year) out += `    year: ${p.year}\n`;
      out += `    url: ${S(p.url)}\n`;
      if (p.tldr) out += `    tldr: ${S(p.tldr)}\n`;
    }
  }
  return out;
}

const rows = parseCSV(await getCSV());
const sessions = build(rows);
if (!sessions.length) { console.error('No sessions parsed — leaving file unchanged.'); process.exit(1); }
await enrichPapers(sessions);   // add Semantic Scholar authors + TLDRs (best-effort)
writeFileSync(OUT, toYAML(sessions));
console.log(`Wrote ${sessions.length} sessions (${sessions.reduce((n, s) => n + s.papers.length, 0)} papers) to all.yaml`);
