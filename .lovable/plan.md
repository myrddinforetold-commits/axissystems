
# Landing Page Redesign — Axis Systems

## Overview

A complete rewrite of all landing page sections to match the new messaging: calm, technical, enterprise SaaS tone. The redesign introduces a new category framing ("Autonomous Company Operating System") and removes all AI hype, buzzwords, and chatbot associations. The visual direction shifts toward Notion + Stripe + Linear — large type, lots of whitespace, precise copywriting, no illustrations or decorative noise.

The `AccessRequestModal` and `LandingHeader` stay functionally the same (modal form already fits the tone; header structure is correct). Everything else gets rebuilt.

---

## Files Changed

### Modified
- `src/pages/LandingPage.tsx` — remove `ProductDemo`, `LogoMarquee`, update section IDs and ordering
- `src/components/landing/HeroSection.tsx` — new headline, subheadline, supporting line, minimal layout
- `src/components/landing/BentoFeatures.tsx` — replaced with "What It Actually Does" capabilities section
- `src/components/landing/InteractiveTimeline.tsx` — updated copy + new "work continues between sessions" callout
- `src/components/landing/CTASection.tsx` — new headline, clean form inline (no modal dependency), remove social proof filler text
- `src/components/landing/LogoMarquee.tsx` — remove stats counters and marquee; replaced with a single trust bar with 3-4 enterprise trust signals

### New Files
- `src/components/landing/ProblemSection.tsx` — "Companies Don't Run on Software" section
- `src/components/landing/CategorySection.tsx` — "A New Kind of System" category explanation
- `src/components/landing/BeyondAssistantsSection.tsx` — "Beyond Assistants" differentiator block
- `src/components/landing/ControlSection.tsx` — "Control Without Micromanagement" enterprise trust section
- `src/components/landing/UseCasesSection.tsx` — operational use cases with short descriptions

### Deleted (logically removed from page, files kept but no longer imported)
- `src/components/landing/ProductDemo.tsx` — product UI demo tabs removed from public landing

---

## Section Order (Top to Bottom)

```text
1. Header (unchanged)
2. Hero
3. Trust bar (minimal — replaces LogoMarquee)
4. Problem Section
5. Category Section ("A New Kind of System")
6. Capabilities ("What It Actually Does")
7. How It Works (updated timeline)
8. Beyond Assistants
9. Control Section
10. Use Cases
11. Final CTA
12. Footer (unchanged)
```

---

## Design Principles Applied

- **Typography**: Large, light-weight headings in JetBrains Mono. Body copy in system sans-serif. No gradient text on section headings (reserved for hero only).
- **Whitespace**: Generous vertical padding between sections (py-24 md:py-32 minimum). Content max-width of 4xl–5xl for readability.
- **Color**: Near-black backgrounds for hero and alternating sections. No neon/glow effects outside of hero. Subtle borders and muted backgrounds for content cards.
- **Animations**: Fade-in-up on scroll entry only. No 3D mouse-tracking or parallax below the hero.
- **No stock imagery, no icons as decoration** — icons used only functionally (small, within text context).
- **NeuralMeshBackground** stays in hero only; removed from all other sections.

---

## Section-by-Section Detail

### Hero
- Headline: `Your company now has software that works.`
- Subheadline: `Axis Systems introduces persistent AI roles that plan, coordinate, and execute operational work — under your approval.`
- Supporting line (smaller, spaced below): `Not assistants. Not automations. Operators.`
- Two CTAs: `Request Access` (solid) + `See How It Works` (ghost, scrolls to #how-it-works)
- Remove the trust indicator row (SOC2 / Enterprise Ready / Private by Default) — moved to trust bar section below
- Keep NeuralMeshBackground + gradient overlays + floating orbs

### Trust Bar (replaces LogoMarquee)
- Remove animated counters and marquee entirely
- 4 horizontal items, centered, separated by thin vertical dividers:
  `Enterprise Ready` · `Human Approval Required` · `Audit Trail Included` · `Private by Default`
- Thin border top/bottom, muted background, small uppercase text

### Problem Section (new)
- Title: `Companies Don't Run on Software — They Run on Coordination`
- 3-paragraph explanation rendered as clean left-aligned prose in a narrow column (max-w-2xl centered):
  1. "Most work inside a company is not creation. It is deciding, routing, checking, updating, and following up."
  2. "Software stores information. People operate the company."
  3. "Axis Systems changes that relationship."
- No cards, no icons — typographic only. Large leading, generous margins.

### Category Section (new)
- Title: `A New Kind of System`
- Intro paragraph: "Axis Systems assigns responsibilities to persistent AI roles inside your company structure."
- Role row: `CEO · Operations · Product · Finance · Support` — displayed as a horizontal pill list
- 2 short statements below, each on its own line with a thin left border accent:
  - "They do not reset every conversation."
  - "They accumulate knowledge and act on it."

### Capabilities Section (replaces BentoFeatures)
- Title: `What It Actually Does`
- 5 items in a clean vertical list (not bento grid):
  Each item: bold capability name + one-sentence outcome description
  1. Persistent organizational memory — "Every role retains context from prior sessions. Decisions reference what came before."
  2. Continuous task execution — "Work continues between sessions without waiting for a human to restart it."
  3. Cross-role coordination — "Roles share relevant context and hand off work to each other within defined boundaries."
  4. Human approval governance — "All consequential actions require explicit approval before execution."
  5. Operational decision support — "Roles surface options, flag blockers, and prepare briefs for human review."
- Layout: 2-column on desktop (left: number + name, right: description), single column on mobile

### How It Works (update InteractiveTimeline)
- Keep scroll-activated timeline mechanic
- Update steps:
  1. `Define your company structure` — "Set the context, responsibilities, and operating boundaries for your organization."
  2. `Assign responsibilities to roles` — "CEO, Operations, Product — each role carries a mandate and memory, not just a prompt."
  3. `Approve actions when required` — "The system proposes. You decide. Nothing executes without sign-off."
  4. `The system continues operating` — "Work does not pause between sessions. Roles track open tasks and continue across time."
- Add a callout below the steps: italic note — "Unlike session-based tools, Axis Systems maintains operational state continuously. Roles know what they were doing before you returned."

### Beyond Assistants (new)
- Title: `Beyond Assistants`
- 3-column comparison layout (clean, no cards):
  | Assistants respond. | Automation triggers. | Axis Systems operates. |
  Each column: label in muted small caps, then a 2-sentence description of the distinction
- Full-width bottom statement: "It manages ongoing operational state rather than isolated requests."

### Control Section (new)
- Title: `Control Without Micromanagement`
- 2 short statements in a left-aligned serif-like layout with large numbers or thin dividers:
  - "Humans remain decision authorities. The system prepares, proposes, and executes within boundaries."
  - "Every action is reviewable and reversible."
- Optional: a minimal 2-column layout with a short list of what owners control (approve/reject actions, set boundaries, review full audit trail, revoke role permissions)

### Use Cases (new)
- Title: `Operational Use Cases`
- 5 items in a simple 2-column grid, each as a short phrase + 1-sentence description:
  - Operational coordination
  - Internal reporting
  - Customer follow-ups
  - Task routing
  - Company knowledge continuity

### Final CTA (update CTASection)
- Title: `Build a Company That Runs With You`
- Remove "Join 50+ companies" badge
- Remove "No credit card required • Cancel anytime" footnote
- Keep the `Request Access` button → opens existing `AccessRequestModal`
- Add a note below the button: "Access is invitation-based. We review every request."

---

## Technical Notes

- All new section components follow the existing pattern: named export, `onRequestAccess` prop only where CTAs appear
- `LandingPage.tsx` updated to import new sections and remove `ProductDemo` and old `LogoMarquee` usage
- No new dependencies required
- No database changes
- No edge function changes
- `NeuralMeshBackground` stays in `HeroSection` only — not used elsewhere
- Animation classes (`animate-fade-in-up`, `animate-fade-in`) are already defined in `tailwind.config.ts` and `index.css` — reused as-is
