# Portfolio

Personal site of Muhammad Sharjeel, Senior Software Engineer. The page starts blank and a swarm of cursors draws it as you scroll.

- Stack: Astro (static), Geist, GSAP. No client framework.
- Build engine: `src/scripts/swarm.ts`. Motion: `src/scripts/motion.ts`.
- Rules for any change: `DESIGN.md`.

```sh
npm install
npx astro dev --port 4331
npx astro build
```

Inspired by [Swarm](https://califa.github.io/swarm-site/) by Joel Califa and [Swarm Rebuild](https://github.com/DhvanilPatel/swarm-cursors) by Dhvanil Patel. The engine here is written from scratch.

## Licence

The code is MIT licensed. The writing in `src/content/blog` and the personal details in `src/data/site.ts` are mine: please replace them with your own rather than republishing them.
