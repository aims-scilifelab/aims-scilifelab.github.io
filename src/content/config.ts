import { defineCollection, z } from 'astro:content';

/* ------------------------------------------------------------------ *
 * CONTENT MODEL — this file is the single source of truth for the
 * shape of every editable piece of content on the site.
 *
 * Editors normally never touch THIS file. They edit the Markdown /
 * YAML files under src/content/<collection>/. The schemas below just
 * describe (and validate) what those files may contain, so a typo or
 * missing field is caught at build time instead of shipping broken.
 * ------------------------------------------------------------------ */

const link = z.string().url().or(z.literal('')).optional();

/* Global site identity, navigation and footer -------------------- */
const site = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),                 // "AIMS"
    descriptor: z.string(),           // "AI × Medicine × Life Sciences"
    tagline: z.string(),              // one-line core statement
    institution: z.array(z.string()), // ["KTH Royal Institute of Technology", ...]
    location: z.string(),             // "Stockholm, Sweden"
    visitingAddress: z.array(z.string()).default([]), // street lines, e.g. ["Tomtebodavägen 23A", "171 65 Solna"]
    postalAddress: z.array(z.string()).default([]),   // mailing lines, e.g. ["Box 1031", "171 21 Solna, Sweden"]
    domain: z.string().optional(),    // canonical site URL (for meta)
    contactEmail: z.string().optional(),
    nav: z.array(z.object({ label: z.string(), href: z.string(), cta: z.boolean().optional() })),
    footerLinks: z.array(z.object({ label: z.string(), href: z.string() })),
    institutionLinks: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    social: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  }),
});

/* Homepage copy -------------------------------------------------- */
const home = defineCollection({
  type: 'data',
  schema: z.object({
    coreStatement: z.string(),
    supporting: z.string(),
    ctaPrimary: z.object({ label: z.string(), href: z.string() }),
    ctaSecondary: z.object({ label: z.string(), href: z.string() }),
    researchIntro: z.string(),        // Methods × Domains paragraph
    selectedWorkIntro: z.string().optional(),
    readingIntro: z.string().optional(),
    cultureIntro: z.string().optional(),
    joinIntro: z.string().optional(),
  }),
});

/* Research — Methods & Domains (Markdown body = description) ------ */
const themeSchema = z.object({
  title: z.string(),
  order: z.number().default(100),
  summary: z.string(),               // 1–2 sentence teaser
  keywords: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});
const methods = defineCollection({ type: 'content', schema: themeSchema });
const domains = defineCollection({ type: 'content', schema: themeSchema });

/* Collaborations ------------------------------------------------- */
const collaborations = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    kind: z.enum(['university', 'institute', 'hospital', 'clinical', 'company', 'life-science', 'international', 'other']).default('other'),
    url: link,
    note: z.string().optional(),
    order: z.number().default(100),
    draft: z.boolean().default(false),
  }),
});

/* People — one file per person (Markdown body = optional long bio) */
const people = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),                                   // free text title, e.g. "PhD Student"
    category: z.enum(['lead', 'researcher', 'postdoc', 'phd', 'masters', 'engineer', 'staff', 'affiliate']),
    status: z.enum(['current', 'alumnus']).default('current'),
    affiliation: z.string().default(''),               // e.g. "KTH · SciLifeLab"
    home_group: z.string().default(''),                // for affiliates: their real group
    primary_affiliation: z.string().default(''),       // their real institution, if not AIMS
    aims_role: z.string().default(''),                 // e.g. "AIMS Affiliate"
    group_leader: z.string().default(''),              // which AIMS lead they work with, if relevant
    photo: z.string().default(''),                     // /people/<file>.jpg in public/, blank -> initials
    research_interests: z.array(z.string()).default([]),
    email: z.string().optional(),
    website: link,
    google_scholar: link,
    github: link,
    linkedin: link,
    orcid: link,
    // A person can ALSO be an alumnus (e.g. current staff + past PhD):
    alumnus_of: z.string().default(''),                // e.g. "PhD, 2023" — shows in Alumni too
    alumni_year: z.number().optional(),
    alumni_destination: z.string().default(''),
    order: z.number().default(100),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),                 // true = not shown on the public site
  }),
});

/* Research groups — the labs under the AIMS umbrella -------------- *
 * One file per group under src/content/groups/. The Markdown body is
 * an optional longer description shown on the group's page. Members
 * are people whose `group_leader` matches this group's `lead` name.  */
const groups = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),                   // "Smith Group"
    lead: z.string(),                   // must match a person's `name`, e.g. "Kevin Smith"
    tagline: z.string().default(''),    // one line shown under the name
    focus: z.array(z.string()).default([]), // a few research-focus tags
    order: z.number().default(100),
    draft: z.boolean().default(false),
  }),
});

/* Selected / curated publications -------------------------------- */
const selectedPublications = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    authors: z.string(),
    venue: z.string().default(''),
    year: z.number(),
    url: link,
    area: z.enum(['methods', 'medicine', 'biology']),  // used to demonstrate breadth
    note: z.string().default(''),                      // short human annotation
    order: z.number().default(100),
    draft: z.boolean().default(false),
  }),
});

/* Reading-group sessions ("What We Read") ------------------------ */
const readingSessions = defineCollection({
  type: 'data',
  schema: z.object({
    date: z.date(),
    presenters: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    papers: z.array(z.object({
      title: z.string(),
      authors: z.string().default(''),
      venue: z.string().default(''),
      year: z.number().optional(),
      url: link,
      why: z.string().default(''),                     // "Why we picked it" — written by the group
    })).default([]),
    draft: z.boolean().default(false),
  }),
});

/* Life at AIMS gallery ------------------------------------------- */
const gallery = defineCollection({
  type: 'data',
  schema: z.object({
    date: z.date(),
    title: z.string(),
    type: z.enum(['defense', 'graduation', 'conference', 'visit', 'retreat', 'social', 'talk', 'milestone', 'other']).default('other'),
    photos: z.array(z.object({ src: z.string(), alt: z.string(), caption: z.string().default('') })).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

/* Open Science resources ----------------------------------------- */
const openScience = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    category: z.enum(['code', 'models', 'data', 'tools', 'benchmarks', 'protocols', 'other']),
    url: link,
    description: z.string().default(''),
    order: z.number().default(100),
    draft: z.boolean().default(false),
  }),
});

/* Job openings --------------------------------------------------- */
const openings = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.enum(['phd', 'postdoc', 'thesis', 'engineer', 'other']).default('other'),
    deadline: z.date().optional(),
    status: z.enum(['open', 'closed']).default('open'),
    url: link,
    order: z.number().default(100),
  }),
});

export const collections = {
  site, home, methods, domains, collaborations, groups, people,
  selectedPublications, readingSessions, gallery, openScience, openings,
};
