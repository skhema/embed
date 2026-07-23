/**
 * `@skhema/embed/snippets` — the DOM-free, single source of truth for
 * COPY-READY embed snippets across every authoring surface: the contributor
 * app composer/docs, `@skhema/cli` (`skhema generate embed`), and future
 * contributor agent skills.
 *
 * Three destinations off one content model:
 *
 *   - Website: a pinned-CDN `<script>` + `<skhema-element>` /
 *     `<skhema-component>` block ({@link generateWebsiteEmbed},
 *     {@link generateComponentWebsiteEmbed}).
 *   - Email: the canonical email-safe card HTML from `@skhema/embed/render`
 *     with an email-tagged save URL ({@link generateEmailEmbed},
 *     {@link generateComponentEmailEmbed}).
 *   - Link: a bare `/save` handoff URL ({@link buildSaveUrl},
 *     {@link buildComponentSaveUrl}).
 *
 * The CDN pin is the PACKAGE'S OWN VERSION, injected at build time — a
 * generated snippet must render the same way forever, and deriving the pin
 * from the publishing version makes drift structurally impossible (the old
 * hand-maintained pin in `@skhema/cli` lagged releases).
 *
 * Save URLs here mirror `utils/seo.ts` (`generateRedirectUrl`) exactly in
 * shape, but are pure: `sourceUrl` and `timestamp` are parameters instead of
 * `window` reads, so the module is safe in Node, edge, and email runtimes.
 */
import type {
  ComponentValue,
  ElementValue,
} from '@skhema/method/vocabulary'
import {
  COMPONENT_TYPES,
  ELEMENT_TYPES,
  SKHEMA_MAPPING,
} from '@skhema/method/vocabulary'
import {
  renderComponentCardHtml,
  renderElementCardHtml,
  type CardTheme,
} from '../render/index.js'
import { generateComponentHash, generateContentHash } from '../utils/hash.js'

// Re-exported for DOM-free consumers (CLI, edge) that must not import the
// main entry, whose custom-element registration touches the DOM.
export { generateComponentHash, generateContentHash }

declare const __EMBED_VERSION__: string

/**
 * The `@skhema/embed` version generated snippets pin their CDN script to.
 * Injected from `package.json` at build time; every release re-pins
 * automatically.
 */
export const EMBED_CDN_VERSION: string =
  typeof __EMBED_VERSION__ === 'undefined' ? '0.0.0-dev' : __EMBED_VERSION__

/** Pinned CDN URL used by generated website snippets. */
export const EMBED_CDN_URL = `https://unpkg.com/@skhema/embed@${EMBED_CDN_VERSION}/dist/embed.min.js`

const SAVE_BASE_URL = 'https://app.skhema.com/save'
const EMBED_PAGE_BASE_URL = 'https://skhema.com/embed'

/* ------------------------------------------------------------------ *
 * Shared shapes                                                      *
 * ------------------------------------------------------------------ */

/** Destination a snippet is generated for; sets UTM defaults on save URLs. */
export type SnippetChannel = 'web' | 'email' | 'link'

const CHANNEL_UTM: Record<
  SnippetChannel,
  { utmSource: string; utmMedium: string }
> = {
  // Matches the live web component's tagging (utils/seo.ts defaults).
  web: { utmSource: 'web_component', utmMedium: 'embedded' },
  // Matches the CuratedElements email convention.
  email: { utmSource: 'email', utmMedium: 'email' },
  link: { utmSource: 'share_link', utmMedium: 'link' },
}

/** Contributor attribution shared by all generators. */
export interface SnippetAuthor {
  /** Contributor id — attribution and analytics key. Required. */
  contributorId: string
  /** Display name shown on the card. */
  authorName?: string
  /** Public contributor slug — links the name to the contributor page. */
  authorSlug?: string
}

export interface SnippetElementInput {
  elementType: string
  content: string
}

/* ------------------------------------------------------------------ *
 * Validation                                                         *
 * ------------------------------------------------------------------ */

function assertElementType(elementType: string): asserts elementType is ElementValue {
  const valid = Object.values(ELEMENT_TYPES).map((t) => t.value)
  if (!valid.includes(elementType as (typeof valid)[number])) {
    throw new Error(
      `Invalid element type "${elementType}". Valid types: ${valid.join(', ')}`
    )
  }
}

function assertComponentType(
  componentType: string
): asserts componentType is ComponentValue {
  const valid = Object.values(COMPONENT_TYPES).map((t) => t.value)
  if (!valid.includes(componentType as (typeof valid)[number])) {
    throw new Error(
      `Invalid component type "${componentType}". Valid types: ${valid.join(', ')}`
    )
  }
}

function assertComponentElements(
  componentType: ComponentValue,
  elements: SnippetElementInput[]
): void {
  if (!elements || elements.length === 0) {
    throw new Error('At least one element is required')
  }
  // Element-flow membership is validated only when the vocabulary maps a
  // flow for the component type (mirrors the original CLI generator).
  const flow =
    SKHEMA_MAPPING.elementFlow[
      componentType as keyof typeof SKHEMA_MAPPING.elementFlow
    ]
  const validValues = flow?.map((t) => t.value)
  for (const element of elements) {
    if (!element.content?.trim()) {
      throw new Error(
        `Element of type "${element.elementType}" has empty content`
      )
    }
    if (
      validValues &&
      !validValues.includes(element.elementType as (typeof validValues)[number])
    ) {
      throw new Error(
        `Invalid element type "${element.elementType}" for component "${componentType}". Valid types: ${validValues.join(', ')}`
      )
    }
  }
}

function assertContributorId(contributorId: string): void {
  if (!contributorId?.trim()) {
    throw new Error('contributorId is required')
  }
}

/* ------------------------------------------------------------------ *
 * HTML escaping (attribute values + element text content)            *
 * ------------------------------------------------------------------ */

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/* ------------------------------------------------------------------ *
 * Save URLs (pure mirror of utils/seo.ts)                            *
 * ------------------------------------------------------------------ */

export interface SaveUrlOptions {
  /** Destination the URL is generated for (UTM defaults). Default `'web'`. */
  channel?: SnippetChannel
  /** Save handoff base. Default `https://app.skhema.com/save`. */
  baseUrl?: string
  /** URL of the page/email the embed lives in. Omitted → empty `source`. */
  sourceUrl?: string
  /** Epoch ms for the `t` param. Default `Date.now()`. */
  timestamp?: number
  /** sysauthElement id; routes contributor-less saves via the repository lane. */
  elementId?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
}

function buildUtmParams(
  campaignFallback: string,
  contributorId: string | undefined,
  options: SaveUrlOptions
): URLSearchParams {
  const channel = CHANNEL_UTM[options.channel ?? 'web']
  return new URLSearchParams({
    // Mirrors utils/seo.ts: `source` is pre-encoded before URLSearchParams
    // encodes it again — the /save handler expects the double encoding.
    source: options.sourceUrl ? encodeURIComponent(options.sourceUrl) : '',
    t: String(options.timestamp ?? Date.now()),
    utm_source: options.utmSource || channel.utmSource,
    utm_medium: options.utmMedium || channel.utmMedium,
    utm_campaign: options.utmCampaign || campaignFallback,
    utm_content: options.utmContent || contributorId || 'skhema',
  })
}

/**
 * Build the `/save` handoff URL for a single element. Identical query shape
 * to the live web component's `generateRedirectUrl`, without `window` reads.
 */
export function buildSaveUrl(
  content: string,
  elementType: string,
  contributorId?: string,
  options: SaveUrlOptions = {}
): string {
  assertElementType(elementType)
  const baseUrl = options.baseUrl || SAVE_BASE_URL
  const contentHash = generateContentHash(content)
  const params = buildUtmParams(elementType, contributorId, options)

  if (contributorId) {
    return `${baseUrl}?type=contributor&contributor_id=${contributorId}&element_type=${elementType}&content_hash=${contentHash}&${params.toString()}`
  }
  if (options.elementId) {
    return `${baseUrl}?type=repository&element_id=${options.elementId}&element_type=${elementType}&content_hash=${contentHash}&${params.toString()}`
  }
  return `${baseUrl}?element_type=${elementType}&content_hash=${contentHash}&${params.toString()}`
}

export interface ComponentSaveUrlOptions extends SaveUrlOptions {
  /** Optional component title carried on the save handoff. */
  title?: string
}

/** Component variant of {@link buildSaveUrl}. */
export function buildComponentSaveUrl(
  elements: SnippetElementInput[],
  componentType: string,
  contributorId?: string,
  options: ComponentSaveUrlOptions = {}
): string {
  assertComponentType(componentType)
  const baseUrl = options.baseUrl || SAVE_BASE_URL
  const componentHash = generateComponentHash(elements)
  const params = buildUtmParams(componentType, contributorId, options)
  const contributorParam = contributorId
    ? `&contributor_id=${contributorId}`
    : ''
  const titleParam = options.title
    ? `&title=${encodeURIComponent(options.title)}`
    : ''
  return `${baseUrl}?type=component&component_type=${componentType}&component_hash=${componentHash}${contributorParam}${titleParam}&${params.toString()}`
}

/** Public share-page URL for a PUBLISHED element/component id
 * (`embed-manage` publish-for-share). Unfurls via OG/oEmbed. */
export function buildEmbedPageUrl(
  kind: 'element' | 'component',
  publishedId: string
): string {
  return `${EMBED_PAGE_BASE_URL}/${kind === 'element' ? 'e' : 'c'}/${encodeURIComponent(publishedId)}`
}

/* ------------------------------------------------------------------ *
 * Website snippets                                                   *
 * ------------------------------------------------------------------ */

export interface WebsiteEmbedOptions extends SnippetAuthor {
  elementType: string
  content: string
  theme?: 'light' | 'dark' | 'auto'
  trackAnalytics?: boolean
  sourceUrl?: string
  /** Include the pinned CDN `<script>` line. Default `true`. */
  includeScriptTag?: boolean
}

export interface WebsiteEmbedResult {
  snippet: string
  cdnUrl: string
  attributes: Record<string, string>
}

function authorAttributes(author: SnippetAuthor): Record<string, string> {
  const attributes: Record<string, string> = {
    'contributor-id': author.contributorId,
  }
  if (author.authorName) attributes['author-name'] = author.authorName
  if (author.authorSlug) attributes['author-slug'] = author.authorSlug
  return attributes
}

function formatAttributes(
  attributes: Record<string, string>,
  indent: string
): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${indent}${key}="${escapeAttr(value)}"`)
    .join('\n')
}

const SCRIPT_TAG = `<script src="${EMBED_CDN_URL}"></script>`

/** Generate a copy-ready website `<skhema-element>` snippet. */
export function generateWebsiteEmbed(
  options: WebsiteEmbedOptions
): WebsiteEmbedResult {
  const { elementType, content, theme, trackAnalytics, sourceUrl } = options
  assertContributorId(options.contributorId)
  if (!content?.trim()) {
    throw new Error('content is required')
  }
  assertElementType(elementType)

  const attributes: Record<string, string> = {
    'element-type': elementType,
    ...authorAttributes(options),
  }
  if (theme && theme !== 'auto') attributes['theme'] = theme
  if (trackAnalytics === false) attributes['track-analytics'] = 'false'
  if (sourceUrl) attributes['source-url'] = sourceUrl

  const element = `<skhema-element\n${formatAttributes(attributes, '  ')}>\n  ${escapeText(content.trim())}\n</skhema-element>`
  const snippet =
    options.includeScriptTag === false ? element : `${SCRIPT_TAG}\n${element}`

  return { snippet, cdnUrl: EMBED_CDN_URL, attributes }
}

export interface ComponentWebsiteEmbedOptions extends SnippetAuthor {
  componentType: string
  elements: SnippetElementInput[]
  title?: string
  theme?: 'light' | 'dark' | 'auto'
  trackAnalytics?: boolean
  sourceUrl?: string
  /** Include the pinned CDN `<script>` line. Default `true`. */
  includeScriptTag?: boolean
}

export interface ComponentWebsiteEmbedResult extends WebsiteEmbedResult {
  elementCount: number
}

/** Generate a copy-ready website `<skhema-component>` snippet. */
export function generateComponentWebsiteEmbed(
  options: ComponentWebsiteEmbedOptions
): ComponentWebsiteEmbedResult {
  const { componentType, elements, title, theme, trackAnalytics, sourceUrl } =
    options
  assertContributorId(options.contributorId)
  assertComponentType(componentType)
  assertComponentElements(componentType, elements)

  const attributes: Record<string, string> = {
    'component-type': componentType,
    ...authorAttributes(options),
  }
  if (title) attributes['title'] = title
  if (theme && theme !== 'auto') attributes['theme'] = theme
  if (trackAnalytics === false) attributes['track-analytics'] = 'false'
  if (sourceUrl) attributes['source-url'] = sourceUrl

  const elementSnippets = elements
    .map((element) => {
      const elementAttributes = {
        'element-type': element.elementType,
        'contributor-id': options.contributorId,
      }
      return `  <skhema-element\n${formatAttributes(elementAttributes, '    ')}>\n    ${escapeText(element.content.trim())}\n  </skhema-element>`
    })
    .join('\n')

  const component = `<skhema-component\n${formatAttributes(attributes, '  ')}>\n${elementSnippets}\n</skhema-component>`
  const snippet =
    options.includeScriptTag === false
      ? component
      : `${SCRIPT_TAG}\n${component}`

  return {
    snippet,
    cdnUrl: EMBED_CDN_URL,
    attributes,
    elementCount: elements.length,
  }
}

/* ------------------------------------------------------------------ *
 * Email snippets                                                     *
 * ------------------------------------------------------------------ */

export interface EmailEmbedOptions extends SnippetAuthor {
  elementType: string
  content: string
  /** Fully-formed save URL override; omitted → built with `channel: 'email'`. */
  saveUrl?: string
  /** URL of the page/newsletter issue the card points back to. */
  sourceUrl?: string
  /** UTM campaign for the built save URL (default: the element type). */
  utmCampaign?: string
  /** Card theme. Email clients get `'light'` by default. */
  theme?: CardTheme
  /** Epoch ms for the save URL `t` param. Default `Date.now()`. */
  timestamp?: number
}

export interface EmailEmbedResult {
  /** Email-safe card HTML (inline styles, table layout) — paste into any
   * HTML-capable email/newsletter editor. */
  html: string
  /** The save URL baked into the card's CTA. */
  saveUrl: string
}

/** Generate the canonical email-safe card for a single element. */
export function generateEmailEmbed(options: EmailEmbedOptions): EmailEmbedResult {
  assertContributorId(options.contributorId)
  if (!options.content?.trim()) {
    throw new Error('content is required')
  }
  assertElementType(options.elementType)

  const saveUrl =
    options.saveUrl ??
    buildSaveUrl(options.content, options.elementType, options.contributorId, {
      channel: 'email',
      sourceUrl: options.sourceUrl,
      utmCampaign: options.utmCampaign,
      timestamp: options.timestamp,
    })

  const html = renderElementCardHtml({
    elementType: options.elementType,
    content: options.content,
    saveUrl,
    authorName: options.authorName,
    authorSlug: options.authorSlug,
    contributorId: options.contributorId,
    theme: options.theme ?? 'light',
  })

  return { html, saveUrl }
}

export interface ComponentEmailEmbedOptions extends SnippetAuthor {
  componentType: string
  elements: SnippetElementInput[]
  title?: string
  /** Fully-formed save URL override; omitted → built with `channel: 'email'`. */
  saveUrl?: string
  sourceUrl?: string
  /** UTM campaign for the built save URL (default: the component type). */
  utmCampaign?: string
  theme?: CardTheme
  timestamp?: number
}

/** Generate the canonical email-safe card for a component. */
export function generateComponentEmailEmbed(
  options: ComponentEmailEmbedOptions
): EmailEmbedResult {
  assertContributorId(options.contributorId)
  assertComponentType(options.componentType)
  assertComponentElements(options.componentType, options.elements)

  const saveUrl =
    options.saveUrl ??
    buildComponentSaveUrl(
      options.elements,
      options.componentType,
      options.contributorId,
      {
        channel: 'email',
        sourceUrl: options.sourceUrl,
        utmCampaign: options.utmCampaign,
        timestamp: options.timestamp,
      }
    )

  const html = renderComponentCardHtml({
    componentType: options.componentType,
    title: options.title,
    elements: options.elements,
    saveUrl,
    authorName: options.authorName,
    authorSlug: options.authorSlug,
    contributorId: options.contributorId,
    theme: options.theme ?? 'light',
  })

  return { html, saveUrl }
}
