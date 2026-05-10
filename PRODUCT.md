# Product

## Register

product

## Users

Network/infrastructure sysadmins with strong technical expertise. They manage ISC DHCP servers in production environments — monitoring lease activity, diagnosing pool exhaustion, editing configs, watching live logs. Likely on a large monitor in a NOC or server room. Fast-moving, high-stakes context: something is either fine or on fire.

## Product Purpose

Glass is an operational control plane for ISC DHCP servers. It surfaces realtime lease data, subnet utilization, server health, and live log streams through a web interface backed by a REST/WebSocket API. Success means an admin can diagnose a DHCP issue or change a config in under a minute without touching the server CLI.

## Brand Personality

Precise, powerful, modern. Expert-grade tool that respects the user's intelligence. No hand-holding, no decorative noise. Every element earns its place by reducing cognitive load or surfacing actionable information.

## Anti-references

- Not Grafana dark (overloaded panels, neon-on-black, too much chrome)
- Not Bootstrap admin panels (gray gradients, heavy borders, legacy feel)
- Not SaaS-cream dashboards (airy white with pastel cards, feels too consumer)
- Not Datadog (overwhelming density without visual hierarchy)

## Design Principles

1. **Signal over noise** — only show what the admin needs to act. Suppress the rest.
2. **Status at a glance** — health, utilization, and alert state must be readable in under 2 seconds without reading text.
3. **Respect expertise** — no confirmation modals for non-destructive reads, no inline tutorials, no empty-state mascots.
4. **Controlled density** — pack information tightly but use whitespace to separate concerns, not to fill space.
5. **Live-first** — realtime data is the core value; design should make live updates feel natural, not jarring.

## Accessibility & Inclusion

WCAG AA. Keyboard navigable. No color-only status indicators — always pair color with icon or label.
