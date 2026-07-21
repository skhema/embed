import type { ComponentValue, ElementValue } from '@skhema/method/vocabulary'
import { COMPONENT_TYPES, SKHEMA_MAPPING } from '@skhema/method/vocabulary'

/**
 * Validate that a string is a valid component type.
 */
export function isValidComponentType(
  componentType: string
): componentType is ComponentValue {
  const validTypes = Object.values(COMPONENT_TYPES).map((t) => t.value)
  return validTypes.includes(componentType as ComponentValue)
}

/**
 * Validate that an element type belongs to the given component type.
 */
export function validateElementBelongsToComponent(
  elementType: string,
  componentType: string
): boolean {
  if (!isValidComponentType(componentType)) return false

  const validElements =
    SKHEMA_MAPPING.elementFlow[
      componentType as keyof typeof SKHEMA_MAPPING.elementFlow
    ]
  if (!validElements) return false

  return validElements.some((e) => e.value === elementType)
}

/**
 * Get the human-readable label for a component type.
 */
export function getComponentTypeLabel(componentType: string): string {
  const type = Object.values(COMPONENT_TYPES).find(
    (t) => t.value === componentType
  )
  return type?.label || componentType
}

/**
 * Get the acronym for a component type (e.g., 'BD' for diagnosis).
 */
export function getComponentTypeAcronym(componentType: string): string {
  const type = Object.values(COMPONENT_TYPES).find(
    (t) => t.value === componentType
  )
  return type?.acronym || componentType.substring(0, 2).toUpperCase()
}

/**
 * Resolve which component type an element belongs to.
 * Returns the component value, or 'diagnosis' as fallback.
 */
export function resolveComponentType(elementType: string): ComponentValue {
  for (const [componentValue, elements] of Object.entries(
    SKHEMA_MAPPING.elementFlow
  )) {
    if (elements.some((e) => e.value === elementType)) {
      return componentValue as ComponentValue
    }
  }
  return 'diagnosis'
}

/**
 * Get all valid element types for a given component, ordered per the mapping.
 */
export function getElementTypesForComponent(
  componentType: string
): ElementValue[] {
  if (!isValidComponentType(componentType)) return []
  const elements =
    SKHEMA_MAPPING.elementFlow[
      componentType as keyof typeof SKHEMA_MAPPING.elementFlow
    ]
  return elements?.map((e) => e.value) || []
}
