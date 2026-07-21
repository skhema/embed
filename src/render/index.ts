/**
 * `@skhema/embed/render` — the canonical, DOM-free source of truth for the
 * official Skhema element / component card HTML.
 *
 * `renderElementCardHtml(data)` / `renderComponentCardHtml(data)` return
 * EMAIL-SAFE HTML: a `role="presentation"` table layout with every style
 * inlined as flat hex (no shadow DOM, no `<style>`, no `oklch()`, no CSS vars).
 * The same output is used three ways:
 *
 *   1. the live browser embed (`SkhemaElement` / `SkhemaComponent` inject it
 *      into shadow DOM and layer hover/transition CSS on top);
 *   2. the `CuratedElements` email template (injected verbatim); and
 *   3. any third-party / contributor email generator.
 *
 * The module is pure — importing it never touches the DOM, so it is safe in
 * Node, edge, and email build runtimes. It builds NO URLs: callers pass the
 * fully-formed `saveUrl` (e.g. the `/save` handoff) so each surface controls
 * its own UTM tagging.
 */
import type { ElementValue } from '@skhema/method/vocabulary'
import {
  CARD_PALETTE,
  CARD_RADIUS,
  CARD_SHADOW,
  COMPONENT_COLORS,
  FONT_STACK,
  MONO_STACK,
  PRIMARY_HEX,
  USER_ICON_SVG,
  type CardTheme,
} from '../styles/design-tokens.js'
import { oklchToHex } from '../utils/color.js'
import {
  getComponentTypeAcronym,
  getComponentTypeLabel,
  resolveComponentType,
} from '../utils/component-validation.js'
import { sanitizeContent } from '../utils/sanitization.js'
import { getElementTypeLabel } from '../utils/validation.js'

/* ------------------------------------------------------------------ *
 * Public data shapes (documented contract — see README "render")     *
 * ------------------------------------------------------------------ */

/** Card theme. Email is always `'light'`; the browser embed passes the
 * detected page theme. Defaults to `'light'` when omitted. */
export type { CardTheme }

/** Author attribution shared by both card kinds. */
interface AuthorFields {
  /** Display name. When omitted, falls back to a humanised `contributorId`. */
  authorName?: string | null
  /** Public contributor slug — when present, the name links to the profile. */
  authorSlug?: string | null
  /** Contributor id, used only for the name fallback when `authorName` is unset. */
  contributorId?: string | null
}

/** Input for {@link renderElementCardHtml}. */
export interface ElementCardData extends AuthorFields {
  /** Skhema element type value, e.g. `"key_challenge"`. */
  elementType: string
  /** The element content / premise (plain text; sanitised + escaped here). */
  content: string
  /** Pre-built handoff URL for the "Save to Skhema" button. */
  saveUrl: string
  /** Card theme (default `'light'`). */
  theme?: CardTheme
}

/** A single element row inside a component card. */
export interface ComponentCardElement {
  elementType: string
  content: string
}

/** Input for {@link renderComponentCardHtml}. */
export interface ComponentCardData extends AuthorFields {
  /** Skhema component type value, e.g. `"diagnosis"`. */
  componentType: string
  /** Optional component title shown after a "—" separator in the header. */
  title?: string | null
  /** The component's elements, in display order. */
  elements: ComponentCardElement[]
  /** Pre-built handoff URL for the "Save to Skhema" button. */
  saveUrl: string
  /** Card theme (default `'light'`). */
  theme?: CardTheme
}

/* ------------------------------------------------------------------ *
 * Internal helpers                                                   *
 * ------------------------------------------------------------------ */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, '&#39;')
}

function humaniseContributorId(contributorId: string): string {
  return contributorId
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

interface BadgePalette {
  badgeBg: string
  badgeText: string
  badgeBorder: string
  topBorder: string
}

/** Resolve the email-safe badge / top-border hex for a component type + theme. */
function resolveBadgePalette(
  componentType: string,
  theme: CardTheme
): BadgePalette {
  const surface = CARD_PALETTE[theme].cardBg
  const colors =
    COMPONENT_COLORS[componentType as keyof typeof COMPONENT_COLORS]
  if (!colors) {
    return {
      badgeBg: surface,
      badgeText: PRIMARY_HEX,
      badgeBorder: PRIMARY_HEX,
      topBorder: PRIMARY_HEX,
    }
  }
  const text = oklchToHex(colors.text)
  return {
    badgeBg: oklchToHex(colors.bg, surface),
    badgeText: text,
    badgeBorder: oklchToHex(colors.border, surface),
    topBorder: text,
  }
}

/** Contributor line inner HTML: person icon + "By {author}" (linked if slug). */
function renderAuthorHtml(author: AuthorFields, mutedColor: string): string {
  let label = ''
  if (author.authorName && author.authorName.trim()) {
    const name = escapeHtml(author.authorName.trim())
    label = author.authorSlug
      ? `By <a href="https://skhema.com/contributors/${encodeURIComponent(
          author.authorSlug
        )}" style="color:${mutedColor};text-decoration:none;" target="_blank" rel="noopener noreferrer">${name}</a>`
      : `By ${name}`
  } else if (author.contributorId && author.contributorId.trim()) {
    label = `By ${escapeHtml(humaniseContributorId(author.contributorId.trim()))}`
  }

  if (!label) return '&nbsp;'

  return (
    `<span style="display:inline-block;width:14px;height:14px;vertical-align:middle;color:${mutedColor};">${USER_ICON_SVG}</span>` +
    `<span style="vertical-align:middle;padding-left:6px;">${label}</span>`
  )
}

/** The shared footer (contributor line + save button + attribution). */
function renderFooter(
  saveUrl: string,
  author: AuthorFields,
  theme: CardTheme
): string {
  const p = CARD_PALETTE[theme]
  return (
    `<tr><td style="padding:12px 16px;border-top:1px solid ${p.border};">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr>` +
    `<td style="vertical-align:middle;"><span style="font-size:12px;color:${p.textMuted};">${renderAuthorHtml(
      author,
      p.textMuted
    )}</span></td>` +
    `<td style="text-align:right;vertical-align:middle;white-space:nowrap;">` +
    `<a href="${escapeAttr(saveUrl)}" class="skhema-save-btn" target="_blank" rel="noopener noreferrer" title="Save this to Skhema" style="display:inline-block;background:${PRIMARY_HEX};color:#ffffff;font-size:12px;font-weight:500;text-decoration:none;padding:6px 14px;border-radius:${CARD_RADIUS};white-space:nowrap;">Save to Skhema &rarr;</a>` +
    `</td></tr></table>` +
    `<div style="font-size:11px;line-height:1.4;color:${p.textMuted};margin-top:8px;">Strategy powered by <a href="https://skhema.com" style="color:${p.textMuted};text-decoration:underline;" target="_blank" rel="noopener noreferrer">Skhema</a></div>` +
    `</td></tr>`
  )
}

/** Header row: acronym badge + type label (+ optional "— title" for components). */
function renderHeader(
  badge: BadgePalette,
  acronym: string,
  typeLabel: string,
  labelColor: string,
  theme: CardTheme,
  title?: string | null
): string {
  const p = CARD_PALETTE[theme]
  const titleHtml = title
    ? `<span style="color:${p.textMuted};"> &mdash; </span><span style="font-weight:600;color:${p.text};">${escapeHtml(
        title
      )}</span>`
    : ''
  return (
    `<tr><td style="padding:12px 16px;border-bottom:1px solid ${p.border};">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr>` +
    `<td style="width:1%;white-space:nowrap;padding-right:8px;vertical-align:middle;">` +
    `<span class="skhema-acronym-badge" title="${escapeAttr(typeLabel)}" style="display:inline-block;font-family:${MONO_STACK};font-size:10px;font-weight:600;letter-spacing:0.02em;padding:2px 6px;border-radius:2px;background:${badge.badgeBg};color:${badge.badgeText};border:1px solid ${badge.badgeBorder};">${escapeHtml(
      acronym
    )}</span></td>` +
    `<td style="vertical-align:middle;"><span style="font-size:13px;font-weight:500;color:${labelColor};">${escapeHtml(
      typeLabel
    )}${titleHtml}</span></td>` +
    `</tr></table></td></tr>`
  )
}

/** Open the outer card table with inline card styling for the theme. */
function cardOpen(theme: CardTheme, kind: 'element' | 'component'): string {
  const p = CARD_PALETTE[theme]
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="skhema-card" data-skhema-kind="${kind}" data-theme="${theme}" ` +
    `style="width:100%;max-width:600px;border-collapse:separate;background:${p.cardBg};border:1px solid ${p.border};border-radius:${CARD_RADIUS};box-shadow:${CARD_SHADOW};overflow:hidden;margin:8px 0;font-family:${FONT_STACK};line-height:1.5;color:${p.text};">`
  )
}

/* ------------------------------------------------------------------ *
 * Public renderers                                                   *
 * ------------------------------------------------------------------ */

/**
 * Render the official Skhema **element** card as email-safe HTML.
 * The badge acronym + palette resolve from the element's owning component type,
 * exactly like the live `<skhema-element>` embed.
 */
export function renderElementCardHtml(data: ElementCardData): string {
  const theme = data.theme ?? 'light'
  const p = CARD_PALETTE[theme]
  const label = getElementTypeLabel(data.elementType as ElementValue)
  const componentType = resolveComponentType(data.elementType)
  const acronym = getComponentTypeAcronym(componentType)
  const badge = resolveBadgePalette(componentType, theme)

  return (
    cardOpen(theme, 'element') +
    renderHeader(badge, acronym, label, p.text, theme) +
    `<tr><td style="padding:16px;">` +
    `<div style="font-size:15px;line-height:1.6;color:${p.text};word-wrap:break-word;overflow-wrap:break-word;">${sanitizeContent(
      data.content
    )}</div>` +
    `</td></tr>` +
    renderFooter(data.saveUrl, data, theme) +
    `</table>`
  )
}

/**
 * Render the official Skhema **component** card as email-safe HTML — a coloured
 * top bar, header (badge + type label + optional title), per-element-type
 * groups, and the shared footer.
 */
export function renderComponentCardHtml(data: ComponentCardData): string {
  const theme = data.theme ?? 'light'
  const p = CARD_PALETTE[theme]
  const label = getComponentTypeLabel(data.componentType)
  const acronym = getComponentTypeAcronym(data.componentType)
  const badge = resolveBadgePalette(data.componentType, theme)

  // Group elements by type (preserving first-occurrence order), mirroring the
  // live `<skhema-component>` body: one small-caps label per type, with each
  // element's content as a left-ruled block beneath it.
  const groups = new Map<string, string[]>()
  for (const el of data.elements) {
    const existing = groups.get(el.elementType)
    if (existing) existing.push(el.content)
    else groups.set(el.elementType, [el.content])
  }

  const groupsHtml = Array.from(groups.entries())
    .map(
      ([elementType, contents]) =>
        `<div style="margin-bottom:16px;">` +
        `<div style="text-transform:uppercase;letter-spacing:0.05em;font-family:${MONO_STACK};font-size:10px;font-weight:600;color:${p.textMuted};margin:0 0 4px;">${escapeHtml(
          getElementTypeLabel(elementType as ElementValue)
        )}</div>` +
        contents
          .map(
            (content) =>
              `<div style="font-size:14px;line-height:1.6;color:${p.text};padding-left:8px;border-left:2px solid ${p.border};word-wrap:break-word;overflow-wrap:break-word;">${sanitizeContent(
                content
              )}</div>`
          )
          .join('') +
        `</div>`
    )
    .join('')

  return (
    cardOpen(theme, 'component') +
    `<tr><td style="height:2px;line-height:2px;font-size:0;background:${badge.topBorder};">&nbsp;</td></tr>` +
    renderHeader(badge, acronym, label, p.textMuted, theme, data.title) +
    `<tr><td style="padding:16px;">${groupsHtml}</td></tr>` +
    renderFooter(data.saveUrl, data, theme) +
    `</table>`
  )
}
