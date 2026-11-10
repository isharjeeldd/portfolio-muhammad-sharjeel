---
title: Unslopping AI output with nothing but a skill
description: You do not need a better model to get rid of the purple gradients. You need your taste written down as a skill the agent loads before it touches the screen.
date: 2026-11-10
tags: [ai, skills, design]
---

You can spot a vibecoded screen from across the room. Purple gradient, glowing cards, an emoji on every label, a headline that shouts. The model is not broken. Nobody told it what you consider good, so it gave you the average of everything it has seen.

The usual fixes are a longer prompt, a bigger model or a plugin. I think the cheapest one is a skill.

## What a skill is

A skill is a folder with a `SKILL.md` inside. The agent sees a one-line description up front and loads the full instructions only when the task calls for them. There is no fine-tune, no server and no API. It is taste and procedure written in plain text, sitting in your repo.

## What unslop gets right

[unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky is the best example I have read. Three things make it work.

**It audits before it edits.** The skill ships a list of signs, each paired with its fix. Gradient text becomes a solid colour. An arbitrary `mt-[13px]` moves onto a 4px scale. The agent has to name what is wrong, and where, before it changes a line.

**It fixes in a fixed order.** Spacing, colour, icons, copy, type, layout, details, visuals, motion. One layer across the whole screen, then the next, the way a designer does a redline review. Order matters because type choices mean little while the spacing is still random.

**It knows when to stop.** If a screen is already good, the skill says so and suggests two or three refinements. Most prompts cannot do that. Ask a model to improve something and it will always find something to change.

## Writing your own

The same shape works well outside UI. I use it for specs, commit messages and code review.

1. **Name the signs.** Write the tells you actually reject, with the fix beside each. "Be concise" does nothing. "A summary that repeats the title, delete it" does.
2. **Order the passes.** Decide what gets fixed first and say why.
3. **Define done.** Give the skill permission to change nothing.
4. **Keep the references next to it.** Examples of good output teach more than adjectives.

Then put it in version control. A skill is reviewed, diffed and improved like any other code, and every agent on the team picks up the same standard from the next run onward.

Slop was never a model problem. It is what you get when the standard lives only in your head.
