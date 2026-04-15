// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';
import react from '@astrojs/react';

export default defineConfig({
  site: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://c4studio-bas-template.vercel.app/',
  output: 'server',
  adapter: vercel({
    webAnalytics: {
      enabled: true, // set to false when using @vercel/analytics@1.4.0
    },
  }),
  security: {
    checkOrigin: false,
  },
  integrations: [
    sitemap(),
    clerk(),
    react(),
  ],
  vite: {
    // @ts-ignore — @tailwindcss/vite ships its own vite peer; type mismatch is benign at runtime
    plugins: [tailwindcss()]
  }
});
