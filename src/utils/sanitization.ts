/**
 * Content sanitization utilities for Skhema cards.
 *
 * DOM-free by design: `sanitizeContent` is imported by the email-safe card
 * renderer (`@skhema/embed/render`), which must run in Node / email / CLI
 * runtimes with no `document`. Keep every export here free of DOM access at
 * call time (the legacy `stripHtml` below is the one exception and is not used
 * by the renderer).
 */

/**
 * HTML entity encoding for basic XSS protection. Regex-based (no DOM) so it is
 * safe in non-browser runtimes. Escapes the text-context entities plus quotes.
 */
function htmlEncode(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Sanitizes content to prevent XSS attacks and removes URLs
 * @param content The raw content to sanitize
 * @returns Sanitized HTML-safe content with URLs removed
 */
export function sanitizeContent(content: string): string {
  // Strip URLs first
  let sanitized = stripUrls(content)

  // Encode all HTML entities to prevent script injection
  sanitized = htmlEncode(sanitized)

  // Preserve line breaks for readability
  sanitized = sanitized.replace(/\n/g, '<br>')

  // Apply text wrapping rules for long text
  sanitized = applyTextWrapping(sanitized)

  return sanitized
}

/**
 * Strips all URLs from the content
 * @param text The text containing potential URLs
 * @returns Text with all URLs removed
 */
function stripUrls(text: string): string {
  // Comprehensive URL patterns to remove
  const patterns = [
    // Standard URLs with protocols
    /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
    // FTP URLs
    /ftp:\/\/[^\s<>"{}|\\^`[\]]+/gi,
    // URLs without protocol but with www
    /www\.[^\s<>"{}|\\^`[\]]+/gi,
    // Email-like patterns
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    // Common domain patterns (anything.com, anything.org, etc.)
    /(?:^|\s)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/gi,
  ]

  let stripped = text
  patterns.forEach((pattern) => {
    stripped = stripped.replace(pattern, '')
  })

  // Clean up any multiple spaces left after URL removal
  stripped = stripped.replace(/\s+/g, ' ').trim()

  return stripped
}

/**
 * Applies intelligent text wrapping to prevent layout breaking
 * @param text The text to apply wrapping rules to
 * @returns Text with appropriate wrapping hints
 */
function applyTextWrapping(text: string): string {
  // Split text into words
  const words = text.split(/(\s+)/)

  return words
    .map((word) => {
      // Skip if it's whitespace or already contains HTML
      if (/^\s+$/.test(word) || word.includes('<')) {
        return word
      }

      // For very long words (>30 chars), add word-break opportunities
      if (word.length > 30) {
        // Insert zero-width spaces every 10 characters for breaking
        return word.replace(/(.{10})/g, '$1\u200B')
      }

      return word
    })
    .join('')
}

/**
 * Validates if content contains potentially malicious patterns or URLs
 * @param content The content to validate
 * @returns Object with validation status and detected issues
 */
export function validateContentSecurity(content: string): {
  isSecure: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check for script tags
  if (/<script[\s>]/i.test(content)) {
    issues.push('Script tags detected')
  }

  // Check for event handlers
  if (/on\w+\s*=/i.test(content)) {
    issues.push('Event handlers detected')
  }

  // Check for javascript: protocol
  if (/javascript:/i.test(content)) {
    issues.push('JavaScript protocol detected')
  }

  // Check for data: URLs that could contain scripts
  if (/data:[^,]*script/i.test(content)) {
    issues.push('Data URL with script detected')
  }

  // Check for iframe tags
  if (/<iframe[\s>]/i.test(content)) {
    issues.push('Iframe tags detected')
  }

  // Check for URLs (since we want to disallow them)
  if (/https?:\/\//i.test(content) || /www\./i.test(content)) {
    issues.push('URLs detected in content')
  }

  return {
    isSecure: issues.length === 0,
    issues,
  }
}

/**
 * Strips all HTML tags from content
 * @param content The content to strip
 * @returns Plain text content
 */
export function stripHtml(content: string): string {
  const div = document.createElement('div')
  div.innerHTML = content
  return div.textContent || div.innerText || ''
}

/**
 * Checks if content contains any URLs
 * @param content The content to check
 * @returns True if URLs are found
 */
export function containsUrls(content: string): boolean {
  const urlPatterns = [
    /https?:\/\//i,
    /ftp:\/\//i,
    /www\./i,
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
    /(?:^|\s)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/i,
  ]

  return urlPatterns.some((pattern) => pattern.test(content))
}
