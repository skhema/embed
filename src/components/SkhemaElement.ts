import { renderElementCardHtml } from '../render/index.js'
import {
  CARD_SHADOW_LG,
  PRIMARY_HEX,
  PRIMARY_HOVER_HEX,
  PRIMARY_PRESSED_HEX,
} from '../styles/design-tokens.js'
import {
  shouldTrackAnalytics,
  trackClick,
  trackEmbedLoad,
} from '../utils/analytics.js'
import { generateContentHash } from '../utils/hash.js'
import { validateContentSecurity } from '../utils/sanitization.js'
import {
  createAriaAttributes,
  createMetaTags,
  generateRedirectUrl,
  generateStructuredData,
} from '../utils/seo.js'
import { validateAttributes } from '../utils/validation.js'
import type {
  ContentData,
  EmbedAnalytics,
  NestedElementData,
  SkhemaElementAttributes,
  SkhemaElementEventMap,
} from './types.js'

// Browser-only styles. The card STRUCTURE + base colours now come from the
// shared, email-safe `@skhema/embed/render` output (inline hex), so this block
// only carries: (1) the progressive enhancements email/CLI can't have — hover
// + transitions over the rendered `.skhema-card` — and (2) the shadow-DOM-only
// skeleton + error states (which keep the original CSS-var styling verbatim).
const styles = `
:host {
  /* Skhema Brand Colors - matching UI library */
  --skhema-primary: hsl(344 57% 54%);  /* #cd476a */
  --skhema-primary-hover: hsl(344 50% 47%);  /* #b53d5e */
  --skhema-primary-pressed: hsl(343 50% 41%);  /* #9d3552 */
  --skhema-secondary: hsl(345 100% 75%);  /* #ff82a2 */

  /* Light mode colors */
  --skhema-bg: hsl(0 0% 100%);
  --skhema-card: hsl(0 0% 100%);
  --skhema-border: hsl(214.3 31.8% 91.4%);
  --skhema-text: hsl(222.2 84% 4.9%);
  --skhema-text-muted: hsl(215.4 16.3% 46.9%);
  --skhema-accent: hsl(210 40% 96%);

  /* Shadows matching UI library */
  --skhema-shadow: 0 1px 3px 0 hsl(0 0 0 / 0.1), 0 1px 2px -1px hsl(0 0 0 / 0.1);
  --skhema-shadow-md: 0 4px 6px -1px hsl(0 0 0 / 0.1), 0 2px 4px -2px hsl(0 0 0 / 0.1);
  --skhema-shadow-lg: 0 10px 15px -3px hsl(0 0 0 / 0.1), 0 4px 6px -4px hsl(0 0 0 / 0.1);
  --skhema-radius: 0.1rem;

  display: block;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Inter', sans-serif;
  line-height: 1.5;
  color: var(--skhema-text);
}

/* Dark mode styles - applied via data-theme attribute (skeleton/error only) */
.skhema-element-card[data-theme="dark"],
.skhema-skeleton[data-theme="dark"] {
  --skhema-bg: hsl(222.2 84% 4.9%);
  --skhema-card: hsl(222.2 84% 4.9%);
  --skhema-border: hsl(217.2 32.6% 17.5%);
  --skhema-text: hsl(210 40% 98%);
  --skhema-text-muted: hsl(215 20.2% 65.1%);
  --skhema-accent: hsl(217.2 32.6% 17.5%);
}

/* Progressive enhancement over the inline-styled, rendered card. Inline styles
   win on specificity, so the changed properties use !important to layer on. */
.skhema-card {
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.skhema-card:hover {
  box-shadow: ${CARD_SHADOW_LG} !important;
  transform: translateY(-1px);
}

.skhema-card[data-skhema-kind="element"]:hover {
  border-color: ${PRIMARY_HEX} !important;
}

.skhema-save-btn {
  transition: background 0.15s ease;
}

.skhema-save-btn:hover {
  background: ${PRIMARY_HOVER_HEX} !important;
}

.skhema-save-btn:active {
  background: ${PRIMARY_PRESSED_HEX} !important;
}

/* Error card wrapper (browser-only state) */
.skhema-element-card {
  background: var(--skhema-card);
  border: 1px solid var(--skhema-border);
  border-radius: calc(var(--skhema-radius) + 2px);
  box-shadow: var(--skhema-shadow);
  max-width: 600px;
  margin: 8px 0;
  overflow: hidden;
}

/* Error state */
.skhema-error {
  background: hsl(0 93% 94%);
  border: 1px solid hsl(0 84% 60%);
  color: hsl(0 74% 42%);
  padding: 12px;
  border-radius: calc(var(--skhema-radius) + 2px);
  font-size: 13px;
}

.skhema-error-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.skhema-error-list {
  margin: 0;
  padding-left: 16px;
}

/* Skeleton loading state */
.skhema-skeleton {
  background: var(--skhema-card);
  border: 1px solid var(--skhema-border);
  border-radius: calc(var(--skhema-radius) + 2px);
  padding: 16px;
  box-shadow: var(--skhema-shadow);
  max-width: 600px;
  margin: 8px 0;
  animation: skeletonPulse 1.5s ease-in-out infinite;
}

.skhema-skeleton-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.skhema-skeleton-badge {
  width: 32px;
  height: 20px;
  border-radius: 2px;
  background: linear-gradient(90deg,
    var(--skhema-border) 25%,
    var(--skhema-accent) 50%,
    var(--skhema-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skhema-skeleton-text {
  flex: 1;
}

.skhema-skeleton-line {
  height: 12px;
  background: linear-gradient(90deg,
    var(--skhema-border) 25%,
    var(--skhema-accent) 50%,
    var(--skhema-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: calc(var(--skhema-radius) + 2px);
  margin: 6px 0;
}

.skhema-skeleton-line.short {
  width: 40%;
}

.skhema-skeleton-line.medium {
  width: 70%;
}

.skhema-skeleton-content {
  margin: 16px 0;
}

@keyframes skeletonPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .skhema-card,
  .skhema-save-btn {
    transition: none;
  }
}

.skhema-structured-data {
  display: none !important;
}
`

export class SkhemaElement extends HTMLElement {
  private shadow: ShadowRoot
  private contentData: ContentData | null = null
  private componentConnected = false
  private hasTrackedLoad = false
  private nestedMode = false
  private themeObserver: MutationObserver | null = null
  private mediaQueryListener: MediaQueryList | null = null

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'closed' })
    // Show skeleton immediately while component initializes
    this.renderSkeleton()
  }

  static get observedAttributes(): (keyof SkhemaElementAttributes)[] {
    return [
      'element-type',
      'contributor-id',
      'element-id',
      'author-name',
      'author-slug',
      'contributor-name',
      'content',
      'source-url',
      'theme',
      'track-analytics',
    ]
  }

  connectedCallback() {
    if (this.componentConnected) return
    this.componentConnected = true

    // Check if nested inside a <skhema-component>
    if (this.closest('skhema-component')) {
      this.nestedMode = true

      // Validate and parse content
      const validation = validateAttributes(this as HTMLElement)
      if (!validation.isValid) {
        console.warn(
          'skhema-element: invalid attributes in nested mode',
          validation.errors
        )
        return
      }

      const content = this.getContent()
      if (!content.trim()) {
        console.warn('skhema-element: empty content in nested mode')
        return
      }

      this.contentData = {
        contributor_id: validation.contributorId,
        element_id: this.getAttribute('element-id') || undefined,
        element_type: validation.elementType!,
        content: content,
        content_hash: generateContentHash(content),
        source_url: this.getAttribute('source-url') || window.location.href,
        timestamp: new Date().toISOString(),
        page_title: document.title,
      }

      // Clear shadow DOM — parent component handles rendering
      this.shadow.innerHTML = ''

      // Dispatch ready event so parent component can discover us
      this.dispatchEvent(
        new CustomEvent('skhema:element-ready', {
          bubbles: true,
          composed: true,
          detail: this.getElementData(),
        })
      )
      return
    }

    try {
      // Add preconnect hints for faster analytics loading
      this.addPreconnectHints()

      // Use requestAnimationFrame for smoother render
      requestAnimationFrame(() => {
        this.render()
        this.trackLoad()
        this.setupThemeListeners()
      })
    } catch (error) {
      this.renderError('Failed to initialize component', error)
    }
  }

  disconnectedCallback() {
    this.cleanupThemeListeners()
  }

  attributeChangedCallback(
    _name: keyof SkhemaElementAttributes,
    oldValue: string | null,
    newValue: string | null
  ) {
    if (oldValue !== newValue && this.componentConnected && !this.nestedMode) {
      this.render()
    }
  }

  /**
   * Returns element data for parent <skhema-component> consumption.
   */
  public getElementData(): NestedElementData | null {
    if (!this.contentData) return null
    return {
      elementType: this.contentData.element_type,
      content: this.contentData.content,
      contentHash: this.contentData.content_hash,
    }
  }

  private render() {
    const validation = validateAttributes(this as HTMLElement)

    if (!validation.isValid) {
      this.renderError('Invalid component attributes', validation.errors)
      return
    }

    const content = this.getContent()
    if (!content.trim()) {
      this.renderError('Component requires content', [
        'Add content between the opening and closing tags, or use the content attribute',
      ])
      return
    }

    // Validate content security
    const securityValidation = validateContentSecurity(content)
    if (!securityValidation.isSecure) {
      this.renderError(
        'Content security validation failed',
        securityValidation.issues
      )
      return
    }

    this.contentData = {
      contributor_id: validation.contributorId,
      element_id: this.getAttribute('element-id') || undefined,
      element_type: validation.elementType!,
      content: content,
      content_hash: generateContentHash(content),
      source_url: this.getAttribute('source-url') || window.location.href,
      timestamp: new Date().toISOString(),
      page_title: document.title,
    }

    this.renderContent()
    this.addStructuredData()
  }

  private getContent(): string {
    return this.getAttribute('content') || this.textContent || ''
  }

  private renderContent() {
    if (!this.contentData) return

    const { element_type, contributor_id, element_id, content } =
      this.contentData
    const redirectUrl = generateRedirectUrl(
      content,
      element_type,
      contributor_id,
      {
        elementId: element_id,
      }
    )

    // Determine the actual theme to use
    const themeAttribute = this.getAttribute('theme') || 'auto'
    const actualTheme = this.getActualTheme(themeAttribute)

    // Set ARIA attributes on host element
    const ariaAttrs = createAriaAttributes(element_type)
    Object.entries(ariaAttrs).forEach(([key, value]) => {
      this.setAttribute(key, value)
    })

    // Card structure + base styling come from the shared, email-safe renderer
    // (single source of truth). The browser-only `<style>` layers hover /
    // transitions on top.
    const cardHtml = renderElementCardHtml({
      elementType: element_type,
      content,
      saveUrl: redirectUrl,
      authorName:
        this.getAttribute('author-name') ||
        this.getAttribute('contributor-name'),
      authorSlug: this.getAttribute('author-slug'),
      contributorId: contributor_id,
      theme: actualTheme,
    })

    this.shadow.innerHTML = `<style>${styles}</style>${cardHtml}`

    // Add click event listener
    const saveBtn = this.shadow.querySelector(
      '.skhema-save-btn'
    ) as HTMLAnchorElement
    if (saveBtn) {
      saveBtn.addEventListener('click', (event) => {
        this.handleSaveClick(event)
      })
    }
  }

  private getActualTheme(themeAttribute: string): 'light' | 'dark' {
    if (themeAttribute === 'light' || themeAttribute === 'dark') {
      return themeAttribute
    }

    // Auto mode - detect from system/page
    // First check if the page has set a data-theme or theme attribute
    const htmlElement = document.documentElement
    const bodyElement = document.body

    // Check common theme attributes on html or body
    const htmlTheme =
      htmlElement.getAttribute('data-theme') ||
      htmlElement.getAttribute('theme') ||
      htmlElement.className.match(/theme-(\w+)/)?.[1]

    const bodyTheme =
      bodyElement.getAttribute('data-theme') ||
      bodyElement.getAttribute('theme') ||
      bodyElement.className.match(/theme-(\w+)/)?.[1]

    // Check for dark mode classes
    const hasDarkClass =
      htmlElement.classList.contains('dark') ||
      bodyElement.classList.contains('dark') ||
      htmlElement.classList.contains('dark-mode') ||
      bodyElement.classList.contains('dark-mode')

    if (hasDarkClass || htmlTheme === 'dark' || bodyTheme === 'dark') {
      return 'dark'
    }

    // Check CSS custom properties that might indicate theme
    const computedStyles = window.getComputedStyle(htmlElement)
    const colorScheme = computedStyles.getPropertyValue('color-scheme')
    if (colorScheme && colorScheme.includes('dark')) {
      return 'dark'
    }

    // Check system preference
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark'
    }

    // Default to light
    return 'light'
  }

  private addPreconnectHints() {
    // Only add preconnect hints once per page
    if (
      document.querySelector(
        'link[rel="preconnect"][href*="analytics.skhema.com"]'
      )
    ) {
      return
    }

    try {
      // Preconnect to analytics API
      const preconnectApi = document.createElement('link')
      preconnectApi.rel = 'preconnect'
      preconnectApi.href = 'https://analytics.skhema.com'
      document.head.appendChild(preconnectApi)

      // DNS prefetch for main domain
      const dnsPrefetch = document.createElement('link')
      dnsPrefetch.rel = 'dns-prefetch'
      dnsPrefetch.href = 'https://skhema.com'
      document.head.appendChild(dnsPrefetch)
    } catch (error) {
      console.debug('Failed to add preconnect hints:', error)
    }
  }

  private renderSkeleton() {
    // Determine theme for skeleton
    const themeAttribute = this.getAttribute('theme') || 'auto'
    const actualTheme = this.getActualTheme(themeAttribute)

    this.shadow.innerHTML = `
      <style>${styles}</style>

      <div class="skhema-skeleton" data-theme="${actualTheme}">
        <div class="skhema-skeleton-header">
          <div class="skhema-skeleton-badge"></div>
          <div class="skhema-skeleton-text">
            <div class="skhema-skeleton-line medium"></div>
          </div>
        </div>
        <div class="skhema-skeleton-content">
          <div class="skhema-skeleton-line"></div>
          <div class="skhema-skeleton-line"></div>
          <div class="skhema-skeleton-line medium"></div>
        </div>
      </div>
    `
  }

  private renderError(title: string, errors: string | string[] | unknown) {
    const errorList = Array.isArray(errors) ? errors : [String(errors)]

    this.shadow.innerHTML = `
      <style>${styles}</style>

      <div class="skhema-element-card">
        <div class="skhema-error">
          <div class="skhema-error-title">Skhema Component Error: ${title}</div>
          <ul class="skhema-error-list">
            ${errorList.map((error) => `<li>${error}</li>`).join('')}
          </ul>
        </div>
      </div>
    `

    // Dispatch error event
    this.dispatchEvent(
      new CustomEvent('skhema:error', {
        detail: { error: title, details: errors },
        bubbles: true,
      })
    )
  }

  private addStructuredData() {
    if (!this.contentData) return

    const { content, element_type, contributor_id, element_id, source_url } =
      this.contentData

    // Add structured data to the document head
    const structuredData = generateStructuredData(
      content,
      element_type,
      contributor_id,
      source_url,
      element_id
    )
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    script.className = 'skhema-structured-data'
    document.head.appendChild(script)

    // Add meta tags for SEO
    const metaDiv = document.createElement('div')
    metaDiv.innerHTML = createMetaTags(content, element_type, contributor_id)
    metaDiv.className = 'skhema-structured-data'
    document.body.appendChild(metaDiv)
  }

  private async trackLoad() {
    // Contributor-less (Skhema-authored) embeds skip the analytics pipeline:
    // it exists for contributor attribution and requires a contributor id.
    if (
      !shouldTrackAnalytics(this as HTMLElement) ||
      !this.contentData ||
      !this.contentData.contributor_id ||
      this.hasTrackedLoad
    ) {
      return
    }

    this.hasTrackedLoad = true

    const analytics: EmbedAnalytics = {
      contributorId: this.contentData.contributor_id,
      elementType: this.contentData.element_type,
      contentHash: this.contentData.content_hash,
      content: this.contentData.content,
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    }

    await trackEmbedLoad(analytics)

    // Dispatch load event
    this.dispatchEvent(
      new CustomEvent('skhema:load', {
        detail: analytics,
        bubbles: true,
      })
    )
  }

  private async handleSaveClick(_event: Event) {
    if (!this.contentData) return

    // Track click analytics (contributor embeds only — see trackLoad)
    if (
      shouldTrackAnalytics(this as HTMLElement) &&
      this.contentData.contributor_id
    ) {
      await trackClick(this.contentData)
    }

    // Dispatch click event
    this.dispatchEvent(
      new CustomEvent('skhema:click', {
        detail: this.contentData,
        bubbles: true,
      })
    )
  }

  // Public API methods
  public getContentData(): ContentData | null {
    return this.contentData
  }

  public refresh(): void {
    if (!this.nestedMode) {
      this.render()
    }
  }

  private setupThemeListeners(): void {
    // Only set up listeners if theme is 'auto' or not specified
    const themeAttribute = this.getAttribute('theme')
    if (themeAttribute === 'auto' || !themeAttribute) {
      // Listen for system theme changes
      if (window.matchMedia) {
        this.mediaQueryListener = window.matchMedia(
          '(prefers-color-scheme: dark)'
        )
        const handleThemeChange = () => this.updateTheme()
        this.mediaQueryListener.addEventListener('change', handleThemeChange)
      }

      // Listen for theme changes on html/body elements
      this.themeObserver = new MutationObserver(() => this.updateTheme())

      // Observe both html and body for attribute changes
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'theme'],
      })

      this.themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'theme'],
      })
    }
  }

  private cleanupThemeListeners(): void {
    if (this.themeObserver) {
      this.themeObserver.disconnect()
      this.themeObserver = null
    }

    if (this.mediaQueryListener) {
      // Note: We can't remove the specific listener without storing the reference
      // but setting to null will allow garbage collection
      this.mediaQueryListener = null
    }
  }

  private updateTheme(): void {
    // Only update if component is using auto theme. Theme is now baked into the
    // rendered card's inline hex, so re-render rather than flip an attribute.
    const themeAttribute = this.getAttribute('theme') || 'auto'
    if (themeAttribute === 'auto' && this.contentData && !this.nestedMode) {
      this.renderContent()
    }
  }
}

// Type augmentation for custom events and JSX elements
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLElementEventMap extends SkhemaElementEventMap {}

  interface SkhemaElementJSX extends Partial<SkhemaElementAttributes> {
    [key: string]: unknown
  }

  // Module augmentation for JSX without using namespace
  interface JSXIntrinsicElements {
    'skhema-element': SkhemaElementJSX
  }
}
