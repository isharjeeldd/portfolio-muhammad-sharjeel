import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sharjeelafzaal.com',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  markdown: { syntaxHighlight: false },
  integrations: [sitemap({ filter: (page) => !page.includes('/og') })],
});
