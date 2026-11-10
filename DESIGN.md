# Portfolio rulebook

Rules for anyone, person or agent, who changes this site. If a change needs to break one, change the rule here first and say why.

## 1. Identity

- Name: **Muhammad Sharjeel**. Never "Sharjeel Afzaal". The domain and email keep their spelling.
- Title: **Senior Software Engineer**.
- Never write "Azure Kubernetes Service" or "AKS". Say "Kubernetes".
- No client names, hostnames, internal ids or colleague names anywhere.

## 2. Colour

- Monochrome only. Every colour comes from five tokens in `src/styles/global.css`: `--bg`, `--panel`, `--fg`, `--muted`, `--line`.
- No gradients of any kind, including one-colour gradients used as a trick. No glows, no coloured shadows, no blur panels.
- Emphasis is made with weight, size, the muted tone, or inversion (`--fg` background, `--bg` text). Never with a new colour.
- Light and dark themes must both work. Do not hard-code a hex value outside the token block.

## 3. Type

- Geist for text, Geist Mono for labels, meta lines and code. No other families.
- Display type is weight 500 with tight tracking. Body is 400.
- Mono labels are 11 to 13px, uppercase, slightly open tracking.
- Two-tone headings: the key phrase in `--fg`, the rest inside `<em>` (muted, not italic).

## 4. Layout

- Spacing sits on a 4px scale.
- Corner radius: 10px for panels, 6px for controls, 999px for pills. Nothing else.
- Borders are 1px. `--fg` for things that matter, `--line` for dividers.
- Sections open with a number, a title and a note (`SecHead.astro`), then a rule.
- Values that sit under labels share one left edge.

## 5. Pictures

Photographs, AI-generated images, stock art, emoji and coloured logos are not used.

What is allowed:

- **Redrawn interface glimpses** (`Mock.astro`): built from HTML and CSS, in the site's tokens, with invented data. Never a screenshot.
- **Diagrams** drawn the same way: boxes, 1px lines, mono labels.
- **Inline SVG line art**: one stroke width (1 to 1.5px), `currentColor`, no fills other than `currentColor`, no more than two tones.

Every figure gets a mono caption that starts `Fig. NN ·` and says what it shows.

If a real image is ever unavoidable (a talk photo, a press logo): greyscale, on a `--panel` background, 10px radius, fixed aspect ratio of 16:9, 4:3 or 1:1, with alt text and a caption.

Blog posts carry no cover images.

## 6. The swarm build

- Anything that should be drawn by the cursors gets `data-b`:
  `t` text · `r` box · `l` line · `g` guide · `d` duplicate of its first built sibling.
- A child with `data-b` waits for its nearest `data-b` ancestor.
- Do not put `data-b="t"` on an element that contains other `data-b` elements.
- Content is hidden with CSS only. It must always be in the HTML.
- Every failure path ends with the content visible: no JavaScript, engine not loaded, reduced motion, swarm switched off.
- Nothing may stay blank for more than a few seconds. Do not raise the 4.5s limit in `swarm.ts`.

## 7. Motion

- GSAP only, in `src/scripts/motion.ts`. No CSS keyframe loops, no pulsing, no bounce for decoration.
- An animation starts only after the swarm has built its element (`whenBuilt`) and runs only while on screen (`live`).
- Each product glimpse animates the one action that product exists for. One idea per figure.
- Respect `prefers-reduced-motion`: no loops, no build.

## 8. Copy

- Plain words, short sentences, British spelling.
- No em dashes. No "supercharge", "seamless", "world-class". No slogans built on a fake contrast.
- Numbers must be true and sourced. If a number cannot be confirmed, leave it out.
- Link text says where it goes. External links open in a new tab (handled in `Base.astro`).

## 9. Before finishing a change

1. `npx astro build` passes.
2. Check the page at 1440px and 390px, light and dark.
3. Let the build run once and watch for anything that never appears.
4. No horizontal scroll on mobile.
