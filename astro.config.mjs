import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.sharjeelafzaal.com',
  // Addresses from the previous site, kept alive so old links and search results still land.
  redirects: {
    '/projects': '/work',
    '/contact': '/#contact',
    '/blogs': '/blog',
    '/blogs/launching-my-new-portfolio-website': '/blog/how-this-site-builds-itself',
    '/blogs/[slug]': '/blog/[slug]',
  },
  trailingSlash: 'never',
  build: { format: 'file' },
  devToolbar: { enabled: false },
  markdown: { syntaxHighlight: false },
  integrations: [sitemap({ filter: (page) => !page.includes('/og') && !page.includes('/blogs') && !/\/(projects|contact)\/?$/.test(page) })],
});
