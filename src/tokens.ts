/**
 * DOM-free entry point for `@skhema/embed`.
 *
 * The package's main barrel (`@skhema/embed`) imports the `SkhemaElement` /
 * `SkhemaComponent` web-component classes, which `extends HTMLElement` at
 * module-evaluation time — that throws in a non-DOM runtime (Node). Server /
 * CLI consumers (e.g. `sk comms curated`) that only need the design tokens and
 * the pure component-type helpers must import them from here instead, so they
 * never load the web components.
 *
 * Everything re-exported below is pure (no DOM, no side effects).
 */
export {
  CARD_VARS,
  COMPONENT_COLORS,
  USER_ICON_SVG,
} from './styles/design-tokens.js'
export type { ComponentColorKey } from './styles/design-tokens.js'

export {
  getComponentTypeAcronym,
  getComponentTypeLabel,
  getElementTypesForComponent,
  isValidComponentType,
  resolveComponentType,
  validateElementBelongsToComponent,
} from './utils/component-validation.js'

export {
  getElementTypeAcronym,
  getElementTypeLabel,
  isValidElementType,
} from './utils/validation.js'
