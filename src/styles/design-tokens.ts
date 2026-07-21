/**
 * Hardcoded color tokens for component-type badge colors.
 * Embeds can't rely on host page CSS vars, so we use inline values.
 * Source: the Skhema web design tokens (oklch), converted to HSL-ish for browser compat.
 */

export const COMPONENT_COLORS = {
  diagnosis: {
    bg: 'oklch(0.65 0.06 25 / 0.15)',
    text: 'oklch(0.65 0.06 25)',
    border: 'oklch(0.65 0.06 25 / 0.3)',
  },
  method: {
    bg: 'oklch(0.6 0.06 250 / 0.15)',
    text: 'oklch(0.6 0.06 250)',
    border: 'oklch(0.6 0.06 250 / 0.3)',
  },
  initiatives: {
    bg: 'oklch(0.6 0.06 155 / 0.15)',
    text: 'oklch(0.6 0.06 155)',
    border: 'oklch(0.6 0.06 155 / 0.3)',
  },
  measures: {
    bg: 'oklch(0.6 0.06 300 / 0.15)',
    text: 'oklch(0.6 0.06 300)',
    border: 'oklch(0.6 0.06 300 / 0.3)',
  },
  support: {
    bg: 'oklch(0.65 0.06 65 / 0.15)',
    text: 'oklch(0.65 0.06 65)',
    border: 'oklch(0.65 0.06 65 / 0.3)',
  },
} as const

export type ComponentColorKey = keyof typeof COMPONENT_COLORS

/**
 * Email-safe flat hex palette for the card surface, per theme. These mirror the
 * Tailwind slate values behind the `CARD_VARS` HSL tokens, pre-resolved to hex
 * because email clients ignore `<style>` / CSS vars. The card renderer
 * (`@skhema/embed/render`) inlines these so the live browser embed and email
 * share one colour system (see the "converge on hex" decision).
 */
export const CARD_PALETTE = {
  light: {
    cardBg: '#ffffff', // hsl(0 0% 100%)
    border: '#e2e8f0', // hsl(214.3 31.8% 91.4%) — slate-200
    text: '#020817', // hsl(222.2 84% 4.9%)  — slate-950
    textMuted: '#64748b', // hsl(215.4 16.3% 46.9%) — slate-500
  },
  dark: {
    cardBg: '#020817', // hsl(222.2 84% 4.9%)  — slate-950
    border: '#1e293b', // hsl(217.2 32.6% 17.5%) — slate-800
    text: '#f8fafc', // hsl(210 40% 98%)     — slate-50
    textMuted: '#94a3b8', // hsl(215 20.2% 65.1%)  — slate-400
  },
} as const

export type CardTheme = keyof typeof CARD_PALETTE

/** Save-button brand colours (hex) — match the `--skhema-primary*` HSL tokens. */
export const PRIMARY_HEX = '#cd476a' // hsl(344 57% 54%)
export const PRIMARY_HOVER_HEX = '#b53d5e' // hsl(344 50% 47%)
export const PRIMARY_PRESSED_HEX = '#9d3552' // hsl(343 50% 41%)

/** Card geometry / typography shared by the renderer and the browser embed. */
export const CARD_RADIUS = '4px' // calc(0.1rem + 2px) ≈ 3.6px
export const CARD_SHADOW =
  '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)'
export const CARD_SHADOW_LG =
  '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)'
export const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Inter', sans-serif"
export const MONO_STACK =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace"

/**
 * Shared base card CSS variables for light and dark modes.
 */
export const CARD_VARS = {
  light: {
    '--skhema-bg': 'hsl(0 0% 100%)',
    '--skhema-card': 'hsl(0 0% 100%)',
    '--skhema-border': 'hsl(214.3 31.8% 91.4%)',
    '--skhema-text': 'hsl(222.2 84% 4.9%)',
    '--skhema-text-muted': 'hsl(215.4 16.3% 46.9%)',
    '--skhema-accent': 'hsl(210 40% 96%)',
    '--skhema-surface-subtle': 'hsl(210 40% 97%)',
  },
  dark: {
    '--skhema-bg': 'hsl(222.2 84% 4.9%)',
    '--skhema-card': 'hsl(222.2 84% 4.9%)',
    '--skhema-border': 'hsl(217.2 32.6% 17.5%)',
    '--skhema-text': 'hsl(210 40% 98%)',
    '--skhema-text-muted': 'hsl(215 20.2% 65.1%)',
    '--skhema-accent': 'hsl(217.2 32.6% 17.5%)',
    '--skhema-surface-subtle': 'hsl(217.2 32.6% 12%)',
  },
} as const

/**
 * User SVG icon (inline, no external deps).
 */
export const USER_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
