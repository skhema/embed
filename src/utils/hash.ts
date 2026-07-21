export function generateContentHash(content: string): string {
  // Simple hash function for content identification
  let hash = 0
  const cleanContent = content.trim().substring(0, 200)

  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36).substring(0, 12)
}

/**
 * Generate a hash for a component by concatenating sorted element content.
 * Used for component-level deduplication and analytics.
 */
export function generateComponentHash(
  elements: Array<{ elementType: string; content: string }>
): string {
  const sorted = [...elements].sort((a, b) => {
    const typeCompare = a.elementType.localeCompare(b.elementType)
    if (typeCompare !== 0) return typeCompare
    return a.content.localeCompare(b.content)
  })

  const combined = sorted.map((e) => `${e.elementType}:${e.content}`).join('|')
  return generateContentHash(combined)
}
