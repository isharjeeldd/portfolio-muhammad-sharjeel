---
title: A portfolio that builds itself while you scroll
description: This site starts as a blank canvas and a swarm of cursors draws it in front of you. Here is why I wanted that, what it is made of, and everything that went wrong on the way.
date: 2026-11-10
updated: 2026-11-10
tags: [build log, ai, design]
---

When you opened this page it was empty. Then a dozen cursors flew in, dragged out the boxes, typed the headline, drew the rules with a pen tool and left. That is the whole idea of the site, and this post is the full account of how it was made.

I built it in one sitting with Claude Code running Claude Fable 5.2, Anthropic's newest flagship model. I gave direction and made the calls. The model wrote the code. I am not going to pretend otherwise, because how that collaboration went is the interesting part.

## Why a swarm

At work we follow a delivery workflow where most of the typing is done by agents. People act as architects and decide what gets built. Agents implement a change, review it and verify it, and a person approves the result. A portfolio that is visibly assembled by a team of cursors says that more clearly than a paragraph could. Three of the cursors carry name tags: implement, review, verify.

The idea is not mine. [Swarm](https://califa.github.io/swarm-site/) by Joel Califa is a website that builds itself as you scroll, and [Swarm Rebuild](https://github.com/DhvanilPatel/swarm-cursors) by Dhvanil Patel turns that into a browser extension that rebuilds any page. I pointed Claude at the second one and said: make my portfolio do this.

## The brief

The whole brief fit in one message:

- Use the swarm cursor effect.
- Minimal, monochrome, no gradients at all.
- Five reference sites for the feel, and [impeccable.style](https://impeccable.style) for design vocabulary.
- A blog with at least one post, and complete SEO.
- Pick the stack yourself.

For content, Claude read my CV and then asked the other Claude sessions I had open, one per product, for a short public-safe summary of what I had shipped. Five sessions answered in parallel. Nothing confidential crossed over, because each session wrote its own summary and left out client names and hostnames on its own.

## Version one was wrong

The first version missed, and it is worth saying how.

**The cursors only followed the mouse.** They flocked around the pointer and lined up around whatever I hovered. It was smooth and it was not what I asked for. The point of Swarm is that the cursors draw the interface.

**It was too plain.** A headline, a list of expandable rows, a footer. Minimal had turned into empty.

**The references were never looked at.** They had been fetched as text. A page read as text tells you the words and nothing about the type scale, the grid or the spacing, which is everything that makes a reference useful.

My reply was two sentences. Version two started by taking real screenshots of all five references and of the original Swarm, and only then touching the code. That one change fixed most of the design. I have since written it into the project's rulebook: references get looked at as pictures.

## What it is made of

- **Astro**, building plain static HTML. No framework runs in the browser.
- **Geist and Geist Mono**, self-hosted.
- **One canvas** fixed over the page, for the cursors and their tools.
- **A build engine** in about 900 lines of TypeScript with no dependencies.
- **GSAP** for the small animations that run after the build.
- Markdown files for the posts, a sitemap, an RSS feed and structured data for search engines.

## How the build works

Every element the swarm should build carries one attribute that says how:

```text
data-b="t"   text    typed with an I-beam and a caret
data-b="r"   box     dragged out with a crosshair, with a size badge
data-b="l"   line    drawn with the pen tool between two anchor points
data-b="g"   guide   pulled out of the left ruler
data-b="d"   copy    duplicated from the first sibling and dragged into place
```

A small script in the page head adds a class that hides all of them before the first paint. They are hidden with `visibility`, so the layout is already complete and nothing shifts when things appear.

**The scheduler.** On every frame the engine checks which elements have scrolled into view and are not built yet. A child waits for its parent, so a card is drawn before the text inside it. Each free cursor takes the nearest waiting job. Each job is a generator function: move here, switch tool, drag, reveal, done. The engine advances every running job by one step per frame.

**Typing without touching the text.** This was the part I expected to be ugly. Splitting every paragraph into one element per letter would have wrecked the markup. Instead the engine measures where each line of text sits, then reveals the element with a `clip-path` polygon that grows one character width at a time, line by line. The text in the page never changes. Only the window you see it through does.

**It never makes you wait.** A page that refuses to show you its content is a bad page. So the build speeds up as the backlog grows, up to five times. Anything that has been waiting more than four and a half seconds simply appears. Anything you scrolled past before it was ever on screen is finished instantly. There is a Skip button in the corner the whole time.

**When the building is done** the cursors stop working and circle your pointer in one exact ring. Hover a link and they line up around it. Click and they scatter.

## What happens when it fails

A site that hides its own content has to be careful about every way that can go wrong.

- **No JavaScript:** nothing is hidden. The hiding class is only ever added by a script.
- **The engine fails to load:** a timer in the page head removes the class after three and a half seconds.
- **Reduced motion is on:** no build, no cursors, the page is simply there.
- **Search engines:** the content is in the HTML from the start. It is hidden with CSS, not injected later.

## Motion after the build

Once the swarm finishes a section it sends an event, and a second layer takes over. On the home page a request travels down the system map every couple of seconds, from a product through the SDK into the platform. Hover a product and you send one yourself.

Each project also has a glimpse of its real interface. They are redrawn by hand in the site's own style, from the actual layouts in the product code, with invented data. No screenshots. Then each one does the single thing that product is for: a card crosses the board, an agent adds a line to a wiki page, a document waits for approval.

## Things that went wrong

A few of these cost real time.

- **The reference repo has no licence.** Its readme asks people not to reuse the code without checking with the original author. So the engine here is written from scratch, and both projects are credited in the footer. Being inspired by something is not the same as copying it.
- **Tall letters leaked.** With tight line spacing, the reveal for line one showed the tops of the letters on line two. The fix was to stop each line's window slightly short.
- **The clock showed dashes.** A script had been wrapped in a way that turned it into a string that never ran. No error anywhere. It only showed up in a screenshot.
- **A gradient snuck in.** An animated underline was built with a one-colour gradient. It looked flat, but the rule is no gradients, so it came out.
- **The first cursor physics were too clever.** Flocking with separation and alignment looked organic and read as noise. An exact circle is calmer.

## The skills and rules behind it

No design tool was used. The taste came from written rules, which is the argument of [my other post on skills](/blog/unslop-ai-with-skills).

- **impeccable.style** supplied the vocabulary and, more usefully, its list of things to avoid. That list is why there are no pulsing dots, no gradient text and no glass panels here.
- **unslop** supplied the habit of auditing before editing.
- **A rulebook** now lives in the repository. It fixes the palette, the type, the spacing, how pictures may be used and how new content gets build attributes, so the next change follows the same conventions whether I write it or an agent does.

One honest note. Impeccable's list also warns against small numbered section labels, and this site uses them, because two of my references do and I like them. A rule you break on purpose is still a rule.

## What I would tell you to steal

- Look at your references as images before writing anything.
- Hide content with CSS only, and make every failure path end with the content visible.
- Reveal text with a clip, not by rewriting it.
- Put a Skip button on anything that takes the reader's time.
- Write the rules down. The model follows what is written far better than what you meant.

The source of every idea here is credited above. Go and look at the original Swarm. It is still better than this.
