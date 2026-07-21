import type { ElementValue } from '@skhema/method/vocabulary'
import { ELEMENT_TYPES } from '@skhema/method/vocabulary'

export function isValidElementType(
  elementType: string
): elementType is ElementValue {
  const validTypes = Object.values(ELEMENT_TYPES).map((type) => type.value)
  return validTypes.includes(elementType as ElementValue)
}

export function validateAttributes(element: HTMLElement): {
  isValid: boolean
  errors: string[]
  elementType?: ElementValue
  contributorId?: string
} {
  const errors: string[] = []

  const elementType = element.getAttribute('element-type')
  const contributorId = element.getAttribute('contributor-id')

  if (!elementType) {
    errors.push('Missing required attribute: element-type')
  } else if (!isValidElementType(elementType)) {
    const validTypes = Object.values(ELEMENT_TYPES)
      .map((t) => t.value)
      .join(', ')
    errors.push(
      `Invalid element-type "${elementType}". Valid types: ${validTypes}`
    )
  }

  // contributor-id is optional: Skhema-authored elements (authorType='skhema')
  // have no contributor. When present it must be non-blank.
  if (contributorId !== null && contributorId.trim().length === 0) {
    errors.push('contributor-id cannot be empty')
  }

  return {
    isValid: errors.length === 0,
    errors,
    elementType: isValidElementType(elementType || '')
      ? (elementType as ElementValue)
      : undefined,
    contributorId: contributorId || undefined,
  }
}

export function getElementTypeLabel(elementType: ElementValue): string {
  const type = Object.values(ELEMENT_TYPES).find((t) => t.value === elementType)
  return type?.label || elementType
}

export function getElementTypeAcronym(elementType: ElementValue): string {
  const type = Object.values(ELEMENT_TYPES).find((t) => t.value === elementType)
  return type?.acronym || elementType.substring(0, 2).toUpperCase()
}
