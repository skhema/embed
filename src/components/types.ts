import type { ComponentValue, ElementValue } from '@skhema/method/vocabulary'

export interface SkhemaElementAttributes {
  'element-type': ElementValue
  /** Optional: absent for Skhema-authored (authorType='skhema') elements */
  'contributor-id'?: string
  /** sysauthElement id — enables the repository save lane when there is no contributor */
  'element-id'?: string
  'author-name'?: string
  /** @deprecated Use author-name */
  'contributor-name'?: string
  'author-slug'?: string
  content?: string
  'source-url'?: string
  theme?: 'light' | 'dark' | 'auto'
  'track-analytics'?: 'true' | 'false'
}

export interface EmbedAnalytics {
  contributorId: string
  elementType: ElementValue
  contentHash: string
  content: string
  pageUrl: string
  pageTitle?: string
  timestamp: number
  userAgent?: string
}

export interface ContentData {
  contributor_id?: string
  element_id?: string
  element_type: ElementValue
  content: string
  content_hash: string
  source_url: string
  timestamp: string
  page_title?: string
}

export interface RedirectUrlOptions {
  baseUrl?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}

export interface SkhemaElementEventMap {
  'skhema:load': CustomEvent<EmbedAnalytics>
  'skhema:click': CustomEvent<ContentData>
  'skhema:error': CustomEvent<{ error: string; details?: unknown }>
}

// ── Component-specific types ──

export interface SkhemaComponentAttributes {
  'component-type': ComponentValue
  /** Optional: absent for Skhema-authored components */
  'contributor-id'?: string
  'author-name'?: string
  /** @deprecated Use author-name */
  'contributor-name'?: string
  'author-slug'?: string
  title?: string
  theme?: 'light' | 'dark' | 'auto'
  'track-analytics'?: 'true' | 'false'
  'source-url'?: string
}

export interface ComponentContentData {
  contributor_id?: string
  component_type: ComponentValue
  component_hash: string
  title: string
  elements: Array<{
    element_type: ElementValue
    content: string
    content_hash: string
  }>
  source_url: string
  timestamp: string
  page_title?: string
}

export interface ComponentEmbedAnalytics {
  contributorId: string
  componentType: ComponentValue
  componentHash: string
  title: string
  elements: Array<{
    elementType: ElementValue
    content: string
    contentHash: string
  }>
  pageUrl: string
  pageTitle?: string
  timestamp: number
  userAgent?: string
}

export interface SkhemaComponentEventMap {
  'skhema:component-load': CustomEvent<ComponentEmbedAnalytics>
  'skhema:component-click': CustomEvent<ComponentContentData>
  'skhema:error': CustomEvent<{ error: string; details?: unknown }>
}

/**
 * Data exposed by a nested <skhema-element> to its parent <skhema-component>.
 */
export interface NestedElementData {
  elementType: ElementValue
  content: string
  contentHash: string
}
