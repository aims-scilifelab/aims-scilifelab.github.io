import { defineConfig } from 'astro/config';

// `site` is used for the sitemap, canonical links and social previews only.
// Set it to your live URL. For a GitHub "user site" (repo named
// <name>.github.io) the site is served at the ROOT, so leave `base` alone.
// Change this one line to aims-stockholm, a custom domain, etc. as needed.
export default defineConfig({
  site: 'https://aims-scilifelab.github.io',
  // base: '/',   // only set this if you deploy under a subpath (project site)
  build: { format: 'directory' },
  image: { service: { entrypoint: 'astro/assets/services/noop' } }, // no native image processing; we ship optimized files ourselves
});
