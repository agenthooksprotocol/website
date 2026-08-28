// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { SITE_ORIGIN } from './src/config/site.ts';

// https://astro.build/config
export default defineConfig({
  site: SITE_ORIGIN,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
