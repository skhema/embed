import type { ComponentValue, ElementValue } from '@skhema/method/vocabulary'
import { renderComponentCardHtml } from '../render/index.js'
import {
  CARD_SHADOW_LG,
  PRIMARY_HOVER_HEX,
  PRIMARY_PRESSED_HEX,
} from '../styles/design-tokens.js'
import {
  shouldTrackAnalytics,
  trackComponentClick,
  trackComponentEmbedLoad,
} from '../utils/analytics.js'
import {
  getComponentTypeLabel,
  getElementTypesForComponent,
  isValidComponentType,
  validateElementBelongsToComponent,
} from '../utils/component-validation.js'
import { generateComponentHash } from '../utils/hash.js'
import {
  generateComponentRedirectUrl,
  generateComponentStructuredData,
} from '../utils/seo.js'
import type { SkhemaElement } from './SkhemaElement.js'
import type {
  ComponentContentData,
  ComponentEmbedAnalytics,
  NestedElementData,
  SkhemaComponentAttributes,
  SkhemaComponentEventMap,
} from './types.js'

// Browser-only styles. The card STRUCTURE + base colours come from the shared,
// email-safe `@skhema/embed/render` output (inline hex). This block carries the
// progressive enhancements (hover/transition over `.skhema-card`) plus the
// shadow-DOM-only skeleton + error states (unchanged CSS-var styling).
const styles = `
:host {
  --skhema-primary: hsl(344 57% 54%);
  --skhema-primary-hover: hsl(344 50% 47%);
  --skhema-secondary: hsl(345 100% 75%);

  /* Light mode colors */
  --skhema-bg: hsl(0 0% 100%);
  --skhema-card: hsl(0 0% 100%);
  --skhema-border: hsl(214.3 31.8% 91.4%);
  --skhema-text: hsl(222.2 84% 4.9%);
  --skhema-text-muted: hsl(215.4 16.3% 46.9%);
  --skhema-accent: hsl(210 40% 96%);
  --skhema-surface-subtle: hsl(210 40% 97%);

  /* Shadows */
  --skhema-shadow: 0 1px 3px 0 hsl(0 0 0 / 0.1), 0 1px 2px -1px hsl(0 0 0 / 0.1);
  --skhema-shadow-md: 0 4px 6px -1px hsl(0 0 0 / 0.1), 0 2px 4px -2px hsl(0 0 0 / 0.1);
  --skhema-shadow-lg: 0 10px 15px -3px hsl(0 0 0 / 0.1), 0 4px 6px -4px hsl(0 0 0 / 0.1);
  --skhema-radius: 0.1rem;

  display: block;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Inter', sans-serif;
  line-height: 1.5;
  color: var(--skhema-text);
}

/* Dark mode (skeleton/error only) */
.skhema-component-card[data-theme="dark"],
.skhema-skeleton[data-theme="dark"] {
  --skhema-bg: hsl(222.2 84% 4.9%);
  --skhema-card: hsl(222.2 84% 4.9%);
  --skhema-border: hsl(217.2 32.6% 17.5%);
  --skhema-text: hsl(210 40% 98%);
  --skhema-text-muted: hsl(215 20.2% 65.1%);
  --skhema-accent: hsl(217.2 32.6% 17.5%);
  --skhema-surface-subtle: hsl(217.2 32.6% 12%);
}

/* Progressive enhancement over the inline-styled, rendered card. Inline styles
   win on specificity, so the changed properties use !important to layer on. */
.skhema-card {
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.skhema-card:hover {
  box-shadow: ${CARD_SHADOW_LG} !important;
  transform: translateY(-1px);
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
.skhema-component-card {
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

.skhema-skeleton-line.short { width: 40%; }
.skhema-skeleton-line.medium { width: 70%; }

.skhema-skeleton-content {
  margin: 16px 0;
}

@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
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

export class SkhemaComponent extends HTMLElement {
  private shadow: ShadowRoot
  private contentData: ComponentContentData | null = null
  private componentConnected = false
  private hasTrackedLoad = false
  private pendingRender: number | null = null
  private themeObserver: MutationObserver | null = null
  private mediaQueryListener: MediaQueryList | null = null

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'closed' })
    this.renderSkeleton()
  }

  static get observedAttributes(): (keyof SkhemaComponentAttributes)[] {
    return [
      'component-type',
      'contributor-id',
      'author-name',
      'author-slug',
      'contributor-name',
      'title',
      'theme',
      'track-analytics',
      'source-url',
    ]
  }

  connectedCallback() {
    if (this.componentConnected) return
    this.componentConnected = true

    try {
      this.addPreconnectHints()

      // Listen for child element ready events (fired by children that upgrade after us)
      this.addEventListener('skhema:element-ready', () => {
        this.scheduleRender()
      })

      // Children may have already upgraded and dispatched skhema:element-ready
      // before our listener was set up (registration order: skhema-element first).
      // Wait for any pending custom element upgrades, then render.
      if (typeof customElements.whenDefined === 'function') {
        customElements.whenDefined('skhema-element').then(() => {
          this.scheduleRender()
        })
      } else {
        this.scheduleRender()
      }

      this.setupThemeListeners()
    } catch (error) {
      this.renderError('Failed to initialize component', error)
    }
  }

  disconnectedCallback() {
    this.cleanupThemeListeners()
    if (this.pendingRender !== null) {
      cancelAnimationFrame(this.pendingRender)
      this.pendingRender = null
    }
  }

  attributeChangedCallback(
    _name: keyof SkhemaComponentAttributes,
    oldValue: string | null,
    newValue: string | null
  ) {
    if (oldValue !== newValue && this.componentConnected) {
      this.scheduleRender()
    }
  }

  private scheduleRender() {
    if (this.pendingRender !== null) {
      cancelAnimationFrame(this.pendingRender)
    }
    this.pendingRender = requestAnimationFrame(() => {
      this.pendingRender = null
      this.render()
    })
  }

  private render() {
    const validation = this.validateComponentAttributes()

    if (!validation.isValid) {
      this.renderError('Invalid component attributes', validation.errors)
      return
    }

    const componentType = validation.componentType!
    const contributorId = validation.contributorId
    const title = this.getAttribute('title') || ''

    // Gather child element data
    const childElements = this.gatherChildElements(componentType)

    if (childElements.length === 0) {
      this.renderError('Component requires child elements', [
        'Add <skhema-element> children inside this component',
      ])
      return
    }

    const componentHash = generateComponentHash(
      childElements.map((el) => ({
        elementType: el.elementType,
        content: el.content,
      }))
    )

    this.contentData = {
      contributor_id: contributorId,
      component_type: componentType,
      component_hash: componentHash,
      title,
      elements: childElements.map((el) => ({
        element_type: el.elementType,
        content: el.content,
        content_hash: el.contentHash,
      })),
      source_url: this.getAttribute('source-url') || window.location.href,
      timestamp: new Date().toISOString(),
      page_title: document.title,
    }

    this.renderContent(childElements)
    this.addStructuredData()
    this.trackLoad()
  }

  private validateComponentAttributes(): {
    isValid: boolean
    errors: string[]
    componentType?: ComponentValue
    contributorId?: string
  } {
    const errors: string[] = []
    const componentType = this.getAttribute('component-type')
    const contributorId = this.getAttribute('contributor-id')

    if (!componentType) {
      errors.push('Missing required attribute: component-type')
    } else if (!isValidComponentType(componentType)) {
      errors.push(`Invalid component-type "${componentType}"`)
    }

    // contributor-id is optional (Skhema-authored components have none)
    if (contributorId !== null && contributorId.trim().length === 0) {
      errors.push('contributor-id cannot be empty')
    }

    return {
      isValid: errors.length === 0,
      errors,
      componentType: isValidComponentType(componentType || '')
        ? (componentType as ComponentValue)
        : undefined,
      contributorId: contributorId || undefined,
    }
  }

  private gatherChildElements(
    componentType: ComponentValue
  ): NestedElementData[] {
    const children = Array.from(
      this.querySelectorAll('skhema-element')
    ) as SkhemaElement[]

    const elements: NestedElementData[] = []

    for (const child of children) {
      const data = child.getElementData?.()
      if (!data) continue

      // Validate element belongs to this component type
      if (!validateElementBelongsToComponent(data.elementType, componentType)) {
        console.warn(
          `skhema-component: element type "${data.elementType}" does not belong to component type "${componentType}"`
        )
        // Warn but don't block — still include the element
      }

      elements.push(data)
    }

    // Sort by elementFlow order for the component type
    const orderedTypes = getElementTypesForComponent(componentType)

    elements.sort((a, b) => {
      const aIdx = orderedTypes.indexOf(a.elementType as ElementValue)
      const bIdx = orderedTypes.indexOf(b.elementType as ElementValue)
      // Unknown types go to the end
      const aOrder = aIdx === -1 ? orderedTypes.length : aIdx
      const bOrder = bIdx === -1 ? orderedTypes.length : bIdx
      return aOrder - bOrder
    })

    return elements
  }

  private renderContent(elements: NestedElementData[]) {
    if (!this.contentData) return

    const { component_type, contributor_id, title } = this.contentData
    const componentLabel = getComponentTypeLabel(component_type)

    const themeAttribute = this.getAttribute('theme') || 'auto'
    const actualTheme = this.getActualTheme(themeAttribute)

    const redirectUrl = generateComponentRedirectUrl(
      this.contentData.component_hash,
      component_type,
      contributor_id
    )

    // Set ARIA attributes
    this.setAttribute('role', 'article')
    this.setAttribute(
      'aria-label',
      `${componentLabel} component${title ? ` — ${title}` : ''}`
    )

    // Card structure + base styling come from the shared, email-safe renderer
    // (single source of truth). The renderer groups elements by type; the
    // browser-only `<style>` layers hover / transitions on top.
    const cardHtml = renderComponentCardHtml({
      componentType: component_type,
      title,
      elements: elements.map((el) => ({
        elementType: el.elementType,
        content: el.content,
      })),
      saveUrl: redirectUrl,
      authorName:
        this.getAttribute('author-name') ||
        this.getAttribute('contributor-name'),
      authorSlug: this.getAttribute('author-slug'),
      contributorId: contributor_id,
      theme: actualTheme,
    })

    this.shadow.innerHTML = `<style>${styles}</style>${cardHtml}<slot style="display:none;"></slot>`

    // Add click listener
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

    const htmlElement = document.documentElement
    const bodyElement = document.body

    const htmlTheme =
      htmlElement.getAttribute('data-theme') ||
      htmlElement.getAttribute('theme') ||
      htmlElement.className.match(/theme-(\w+)/)?.[1]

    const bodyTheme =
      bodyElement.getAttribute('data-theme') ||
      bodyElement.getAttribute('theme') ||
      bodyElement.className.match(/theme-(\w+)/)?.[1]

    const hasDarkClass =
      htmlElement.classList.contains('dark') ||
      bodyElement.classList.contains('dark') ||
      htmlElement.classList.contains('dark-mode') ||
      bodyElement.classList.contains('dark-mode')

    if (hasDarkClass || htmlTheme === 'dark' || bodyTheme === 'dark') {
      return 'dark'
    }

    const computedStyles = window.getComputedStyle(htmlElement)
    const colorScheme = computedStyles.getPropertyValue('color-scheme')
    if (colorScheme && colorScheme.includes('dark')) {
      return 'dark'
    }

    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark'
    }

    return 'light'
  }

  private addPreconnectHints() {
    if (
      document.querySelector(
        'link[rel="preconnect"][href*="analytics.skhema.com"]'
      )
    ) {
      return
    }

    try {
      const preconnectApi = document.createElement('link')
      preconnectApi.rel = 'preconnect'
      preconnectApi.href = 'https://analytics.skhema.com'
      document.head.appendChild(preconnectApi)

      const dnsPrefetch = document.createElement('link')
      dnsPrefetch.rel = 'dns-prefetch'
      dnsPrefetch.href = 'https://skhema.com'
      document.head.appendChild(dnsPrefetch)
    } catch (error) {
      console.debug('Failed to add preconnect hints:', error)
    }
  }

  private renderSkeleton() {
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
          <div class="skhema-skeleton-line short"></div>
          <div class="skhema-skeleton-line"></div>
          <div class="skhema-skeleton-line short"></div>
          <div class="skhema-skeleton-line"></div>
          <div class="skhema-skeleton-line medium"></div>
        </div>
      </div>

      <slot style="display:none;"></slot>
    `
  }

  private renderError(title: string, errors: string | string[] | unknown) {
    const errorList = Array.isArray(errors) ? errors : [String(errors)]

    this.shadow.innerHTML = `
      <style>${styles}</style>

      <div class="skhema-component-card">
        <div class="skhema-error">
          <div class="skhema-error-title">Skhema Component Error: ${title}</div>
          <ul class="skhema-error-list">
            ${errorList.map((error) => `<li>${error}</li>`).join('')}
          </ul>
        </div>
      </div>

      <slot style="display:none;"></slot>
    `

    this.dispatchEvent(
      new CustomEvent('skhema:error', {
        detail: { error: title, details: errors },
        bubbles: true,
      })
    )
  }

  private addStructuredData() {
    if (!this.contentData) return

    const { component_type, contributor_id, title, elements, source_url } =
      this.contentData

    const structuredData = generateComponentStructuredData(
      title,
      component_type,
      contributor_id,
      elements.map((el) => ({
        elementType: el.element_type,
        content: el.content,
      })),
      source_url
    )

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    script.className = 'skhema-structured-data'
    document.head.appendChild(script)
  }

  private async trackLoad() {
    if (
      !shouldTrackAnalytics(this as HTMLElement) ||
      !this.contentData?.contributor_id ||
      !this.contentData ||
      this.hasTrackedLoad
    ) {
      return
    }

    this.hasTrackedLoad = true

    const analytics: ComponentEmbedAnalytics = {
      contributorId: this.contentData.contributor_id,
      componentType: this.contentData.component_type,
      componentHash: this.contentData.component_hash,
      title: this.contentData.title,
      elements: this.contentData.elements.map((el) => ({
        elementType: el.element_type,
        content: el.content,
        contentHash: el.content_hash,
      })),
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    }

    await trackComponentEmbedLoad(analytics)

    this.dispatchEvent(
      new CustomEvent('skhema:component-load', {
        detail: analytics,
        bubbles: true,
      })
    )
  }

  private async handleSaveClick(_event: Event) {
    if (!this.contentData) return

    if (
      shouldTrackAnalytics(this as HTMLElement) &&
      this.contentData.contributor_id
    ) {
      await trackComponentClick(this.contentData)
    }

    this.dispatchEvent(
      new CustomEvent('skhema:component-click', {
        detail: this.contentData,
        bubbles: true,
      })
    )
  }

  // Public API
  public getContentData(): ComponentContentData | null {
    return this.contentData
  }

  public refresh(): void {
    this.render()
  }

  private setupThemeListeners(): void {
    const themeAttribute = this.getAttribute('theme')
    if (themeAttribute === 'auto' || !themeAttribute) {
      if (window.matchMedia) {
        this.mediaQueryListener = window.matchMedia(
          '(prefers-color-scheme: dark)'
        )
        const handleThemeChange = () => this.updateTheme()
        this.mediaQueryListener.addEventListener('change', handleThemeChange)
      }

      this.themeObserver = new MutationObserver(() => this.updateTheme())

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
      this.mediaQueryListener = null
    }
  }

  private updateTheme(): void {
    // Theme is baked into the rendered card's inline hex, so re-render rather
    // than flip an attribute.
    const themeAttribute = this.getAttribute('theme') || 'auto'
    if (themeAttribute === 'auto' && this.contentData) {
      this.scheduleRender()
    }
  }
}

// Type augmentation for custom events and JSX elements
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLElementEventMap extends SkhemaComponentEventMap {}

  interface SkhemaComponentJSX extends Partial<SkhemaComponentAttributes> {
    [key: string]: unknown
  }

  interface JSXIntrinsicElements {
    'skhema-component': SkhemaComponentJSX
  }
}
