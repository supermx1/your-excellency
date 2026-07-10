# Rulebook Disclaimer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the rulebook disclaimer noticeable, on-brand, and comfortable for motion-sensitive users.

**Architecture:** Keep the change local to `src/routes/+page.svelte`. Use semantic markup, existing Tailwind color and spacing utilities, and a component-scoped CSS entrance animation with a reduced-motion override.

**Tech Stack:** Svelte 5, Tailwind CSS 4, scoped CSS

## Global Constraints

- Preserve the existing neo-brutalist card vocabulary.
- Run the animation only once on page load.
- Keep the disclaimer visible before, during, and after the animation.
- Disable the animation when `prefers-reduced-motion: reduce` is active.
- Add no dependencies.

---

### Task 1: Refine and verify the disclaimer

**Files:**

- Modify: `src/routes/+page.svelte`

**Interfaces:**

- Consumes: the existing `card` class string and Tailwind theme.
- Produces: a labelled `aside.rulebook-notice` with a scoped entrance animation.

- [ ] **Step 1: Replace the bouncing card**

Use a yellow card, a boxed decorative exclamation mark, `role="note"`, and `aria-labelledby` tied to the heading.

- [ ] **Step 2: Add the one-time entrance animation**

Animate only transform and the card's bounded hard shadow for 600 ms with an ease-out curve. Do not hide the content.

- [ ] **Step 3: Add reduced-motion behavior**

Inside `@media (prefers-reduced-motion: reduce)`, set `animation: none` on the disclaimer.

- [ ] **Step 4: Verify**

Run the Svelte autofixer until it reports no issues, then run `pnpm exec prettier --check src/routes/+page.svelte`, `pnpm check`, and `pnpm build`. All commands must exit successfully.
