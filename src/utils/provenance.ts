/**
 * Element source provenance — the "who originated this content" line that sits
 * beneath the contributor byline on a card.
 *
 * `@skhema/embed` is zero-dependency by constraint, so this is a CONFORMING
 * COPY of the shared `formatProvenance` in `@skhema/ui`, not an import. Both
 * implement the two canonical display formats locked in the PRD:
 *
 *   Compact: `Source: {organization}` (or `Derived from: {organization}`)
 *   Full:    `Source: {organization}[ — {documentName}][, {date}]`
 *
 * Missing optional fields collapse their separator with them — a card must
 * never render `Source: ASC — ,`. The formatter returns plain-text parts; the
 * caller escapes them into HTML (see `render/index.ts`).
 */

/**
 * Provenance carried on a card, flat to mirror the locked `<skhema-element>`
 * attribute contract (`provenance-org`, `provenance-document`,
 * `provenance-url`, `provenance-date`) so each attribute degrades on its own.
 */
export interface ProvenanceFields {
  /** Originating organization. Nothing renders without it. */
  provenanceOrg?: string | null
  /** Title of the document the content was mapped from. */
  provenanceDocument?: string | null
  /** Absolute http(s) URL of the source document. */
  provenanceUrl?: string | null
  /** PRE-COLLAPSED display string, e.g. `2024–2027` (en dash) or `2024-03`. */
  provenanceDate?: string | null
  /**
   * Content has diverged from the source since it was carried (fork lineage).
   * Never an attribute: public embedded elements are the source-of-record side,
   * so this is only set by in-process callers rendering forked workspace rows.
   */
  provenanceDerived?: boolean
}

/** The four locked `<skhema-element>` / `<skhema-component>` attribute names. */
export const PROVENANCE_ATTRIBUTES = [
  'provenance-org',
  'provenance-document',
  'provenance-url',
  'provenance-date',
] as const

/** Read the flat provenance attributes off a custom element host. */
export function provenanceFromAttributes(host: {
  getAttribute(name: string): string | null
}): ProvenanceFields {
  return {
    provenanceOrg: host.getAttribute('provenance-org'),
    provenanceDocument: host.getAttribute('provenance-document'),
    provenanceUrl: host.getAttribute('provenance-url'),
    provenanceDate: host.getAttribute('provenance-date'),
  }
}

/** En dash (U+2013) — the range separator, e.g. `2024–2027`. Never a hyphen. */
const RANGE_SEPARATOR = '–'

/** The structured date fields as stored, before display collapse. */
export interface ProvenanceDateInput {
  /** `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. Mutually exclusive with `dateRange`. */
  documentDate?: string | null
  dateRange?: { from?: string | null; to?: string | null } | null
}

/**
 * Collapse the stored date fields to the single display string that the
 * `provenance-date` attribute carries: the range joined with an en dash, else
 * `documentDate`. A range whose ends are equal, or which has only one end,
 * renders as one date.
 *
 * The two fields are mutually exclusive by contract, so a stored row never
 * holds both — but an unsaved producer draft can, and the server validator
 * keeps the range as the richer claim. Preferring the range here means a draft
 * preview shows what will actually be persisted.
 *
 * This lives in the zero-dependency package on purpose. Every producer of the
 * attribute — the CLI snippet builders, the contributor composer, the public
 * website — needs the rule, and a hand-rolled second copy would drift to a
 * hyphen. It conforms to `formatProvenanceDate` in `@skhema/ui`, which serves
 * the React surfaces that cannot depend on this package.
 */
export function collapseProvenanceDate(dates: ProvenanceDateInput): string {
  const from = dates.dateRange?.from?.trim()
  const to = dates.dateRange?.to?.trim()
  if (from && to) return from === to ? from : `${from}${RANGE_SEPARATOR}${to}`

  return from || to || dates.documentDate?.trim() || ''
}

/** Plain-text parts of a formatted provenance line, ready to be escaped. */
export interface FormattedProvenance {
  /** `Source` or `Derived from`. */
  label: string
  organization: string
  /** Full format only, and only when supplied. */
  documentName?: string
  /** Full format only, and only when supplied. */
  date?: string
  /** Present only when the URL passed absolute-http(s) validation. */
  url?: string
}

/**
 * Absolute `http(s)` URLs only.
 *
 * Provenance is contributor-supplied free text that reaches this renderer as a
 * DOM attribute on a third-party page — treat it as hostile at RENDER time,
 * not just at write time. Anything else (`javascript:`, `data:`, relative,
 * malformed) yields no anchor at all rather than a downgraded one.
 */
export function safeProvenanceUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.href
  } catch {
    return null
  }
}

/**
 * Resolve the display parts for a provenance line, or `null` when there is
 * nothing to render (no organization ⇒ no line, no separators, no empty label).
 */
export function formatProvenance(
  fields: ProvenanceFields,
  variant: 'compact' | 'full' = 'compact'
): FormattedProvenance | null {
  const organization = fields.provenanceOrg?.trim()
  if (!organization) return null

  const formatted: FormattedProvenance = {
    label: fields.provenanceDerived ? 'Derived from' : 'Source',
    organization,
  }

  const url = safeProvenanceUrl(fields.provenanceUrl)
  if (url) formatted.url = url

  if (variant === 'full') {
    const documentName = fields.provenanceDocument?.trim()
    if (documentName) formatted.documentName = documentName
    const date = fields.provenanceDate?.trim()
    if (date) formatted.date = date
  }

  return formatted
}
