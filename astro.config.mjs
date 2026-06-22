// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://www.nitishsingh.com',
  integrations: [
    mdx(),
    sitemap(),
    react({ include: ['**/demos/**'] }),
  ],
  build: {
    format: 'directory',
  },
});
