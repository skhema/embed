// CDN bundle entry point - automatically registers the components
import { SkhemaComponent } from './components/SkhemaComponent.js'
import { SkhemaElement } from './components/SkhemaElement.js'

// Register the custom elements for CDN usage
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

// Expose on global for UMD builds
if (typeof window !== 'undefined') {
  ;(
    window as unknown as {
      SkhemaElement: typeof SkhemaElement
      SkhemaComponent: typeof SkhemaComponent
    }
  ).SkhemaElement = SkhemaElement
  ;(
    window as unknown as {
      SkhemaElement: typeof SkhemaElement
      SkhemaComponent: typeof SkhemaComponent
    }
  ).SkhemaComponent = SkhemaComponent
}

export { SkhemaComponent, SkhemaElement }
