// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nitishsingh.com',
  integrations: [
    sitemap(),
  ],
  build: {
    format: 'directory',
  },
});
