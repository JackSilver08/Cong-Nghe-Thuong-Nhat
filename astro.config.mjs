// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// Update `site` to your real production domain before deploying.
// It is used for canonical URLs, sitemap, RSS and Open Graph tags.
export default defineConfig({
  site: 'https://congnghethuongnhat.netlify.app',
  output: 'server',
  adapter: netlify(),
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
