---
name: RepoPilot
description: A compact, high-clarity visual system for a GitHub workflow assistant.
colors:
  primary: "#171A17"
  secondary: "#596157"
  tertiary: "#C6F36A"
  neutral: "#F7F8F5"
  surface: "#FFFFFF"
  outline: "#E1E6DD"
  surface-soft: "#EDF2E8"
  dark-background: "#11140F"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 4.55rem
    fontWeight: 790
    lineHeight: 0.99
    letterSpacing: -0.075em
  heading:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 2.55rem
    fontWeight: 770
    lineHeight: 1.1
    letterSpacing: -0.065em
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 0.7rem
    fontWeight: 820
    letterSpacing: 0.11em
rounded:
  sm: 8px
  md: 12px
  lg: 18px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    height: 46px
    padding: 16px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    height: 46px
    padding: 16px
  preview-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 16px
---

## Overview

RepoPilot should feel like a capable developer tool: calm, focused, direct and trustworthy. The page should quickly explain what it does, show a simple example, and move visitors to the primary action. Use an editorial layout and restrained, high-contrast accents rather than decorative dashboard chrome.

## Colors

Use warm near-white as the light canvas, deep green-black for primary text, and lime as the single action accent. Neutral green-grey is for secondary copy and fine separators. In dark mode, keep the same identity but raise text contrast and use a deep forest-black canvas. Lime is reserved for the primary action, key emphasis and step markers.

## Typography

Use the system sans-serif stack so the page loads quickly and has no font-network dependency. Headlines are compact, bold and tightly tracked; body copy stays comfortably readable. Uppercase labels are small but high contrast and used sparingly.

## Layout

Prioritize the main promise and one clear action in the first viewport. A single example panel explains the workflow without pretending to be a live product session. Follow with one compact process row and copyable real-world prompts. Keep section spacing purposeful and minimize repeated claims.

## Elevation & Depth

Prefer borders over shadows. Use only a very soft shadow on the example panel to distinguish it from the canvas. Avoid floating cards, gradients, glass effects and decorative glow.

## Shapes

Use consistent, moderate corner radii for buttons and panels. Avoid excessive pill shapes or random variation. Touch targets must be at least 44px high, and focus indicators must remain visible in both color schemes.

## Components

The primary action uses lime with dark text and remains visually dominant. The secondary action is neutral and outlined. The example panel uses clear labels, short rows and numbered steps. Copy buttons should remain obvious, work with keyboard input and announce their result to assistive technology.

## Do's and Don'ts

- Do use short labels, concise copy, visible focus, semantic structure and reduced-motion support.
- Do disclose that RepoPilot is in private beta and works within the tools and permissions available to a session.
- Do label examples as illustrative; never imply a preview is a live run.
- Don't add external fonts, trackers, runtime libraries or paid services to the static landing page.
- Don't inflate capabilities or report unverified tasks as successful.
- Don't add extra navigation, repetitive capability cards or decoration that competes with the main action.
