#!/usr/bin/env node
/**
 * Regenerate "Recent sessions" (src/content/reading/all.yaml) from the
 * reading-group Google Form responses, published as CSV.
 *
 * Privacy: emails (col "Email Address") and the private Google-Drive PDF
 * uploads are never read into the output — only public paper info + the
 * presenter's name + their own-words summary.
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
      const author = p.presenter ? `Presented by ${p.presenter}` : '';
      out += `  - title: ${S(p.title)}\n`;
      out += `    authors: ${S(author)}\n`;
      out += `    venue: ${S(p.venue)}\n`;
      if (p.year) out += `    year: ${p.year}\n`;
      out += `    url: ${S(p.url)}\n`;
      out += `    why: ${S(p.why)}\n`;
    }
  }
  return out;
}

const rows = parseCSV(await getCSV());
const sessions = build(rows);
if (!sessions.length) { console.error('No sessions parsed — leaving file unchanged.'); process.exit(1); }
writeFileSync(OUT, toYAML(sessions));
console.log(`Wrote ${sessions.length} sessions (${sessions.reduce((n, s) => n + s.papers.length, 0)} papers) to all.yaml`);
