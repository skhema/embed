import { SkhemaComponent } from './components/SkhemaComponent.js'
import { SkhemaElement } from './components/SkhemaElement.js'

// Export component classes
export { SkhemaComponent, SkhemaElement }

// Export types for TypeScript users
export type {
  ComponentContentData,
  ComponentEmbedAnalytics,
  ContentData,
  EmbedAnalytics,
  NestedElementData,
  SkhemaComponentAttributes,
  SkhemaComponentEventMap,
  SkhemaElementAttributes,
  SkhemaElementEventMap,
} from './components/types.js'

// Export element utilities
export {
  getElementTypeAcronym,
  getElementTypeLabel,
  isValidElementType,
  validateAttributes,
} from './utils/validation.js'

// Export component utilities
export {
  getComponentTypeAcronym,
  getComponentTypeLabel,
  isValidComponentType,
  resolveComponentType,
  validateElementBelongsToComponent,
} from './utils/component-validation.js'

// Export hash utilities
export { generateComponentHash } from './utils/hash.js'

// Export analytics utilities
export {
  shouldTrackAnalytics,
  trackComponentClick,
  trackComponentEmbedLoad,
} from './utils/analytics.js'

// Export SEO utilities
export {
  generateComponentRedirectUrl,
  generateComponentStructuredData,
  generateRedirectUrl,
  generateStructuredData,
} from './utils/seo.js'

// Manual registration functions
export function registerSkhemaElement() {
  if (typeof window !== 'undefined' && !customElements.get('skhema-element')) {
    customElements.define(
      'skhema-element',
      SkhemaElement as CustomElementConstructor
    )
  }
}

export function registerSkhemaComponent() {
  if (
    typeof window !== 'undefined' &&
    !customElements.get('skhema-component')
  ) {
    customElements.define(
      'skhema-component',
      SkhemaComponent as CustomElementConstructor
    )
  }
}

// Auto-register in browser environments (can be tree-shaken if not needed)
if (typeof window !== 'undefined') {
  if (!customElements.get('skhema-element')) {
    customElements.define(
      'skhema-element',
      SkhemaElement as CustomElementConstructor
    )
  }
  if (!customElements.get('skhema-component')) {
    customElements.define(
      'skhema-component',
      SkhemaComponent as CustomElementConstructor
    )
  }
}

// Default export for convenience
export default SkhemaElement
