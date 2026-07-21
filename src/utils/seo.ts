import type { ComponentValue, ElementValue } from '@skhema/method/vocabulary'
import { getComponentTypeLabel } from './component-validation.js'
import { generateContentHash } from './hash.js'
import { getElementTypeLabel } from './validation.js'

export function generateStructuredData(
  content: string,
  elementType: ElementValue,
  contributorId: string | undefined,
  sourceUrl: string,
  elementId?: string
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'AnalysisContent',
    text: content,
    analysisType: elementType,
    category: getElementTypeLabel(elementType),
    // Skhema-authored elements have no contributor
    contributor: contributorId || 'Skhema',
    url: generateRedirectUrl(content, elementType, contributorId, {
      elementId,
    }),
    provider: {
      '@type': 'Organization',
      name: 'Skhema',
      url: 'https://skhema.com',
    },
    isPartOf: {
      '@type': 'WebPage',
      url: sourceUrl,
    },
    dateCreated: new Date().toISOString(),
    platform: 'Skhema',
  }
}

export function generateRedirectUrl(
  content: string,
  elementType: ElementValue,
  contributorId?: string,
  options: {
    baseUrl?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    /** sysauthElement id; routes contributor-less saves via the repository lane */
    elementId?: string
  } = {}
): string {
  const baseUrl = options.baseUrl || 'https://app.skhema.com/save' // This page will handle the authentication and content saving
  const contentHash = generateContentHash(content)
  const sourceUrl = encodeURIComponent(window.location.href)
  const timestamp = Date.now()

  const params = new URLSearchParams({
    source: sourceUrl,
    t: timestamp.toString(),
    utm_source: options.utmSource || 'web_component',
    utm_medium: options.utmMedium || 'embedded',
    utm_campaign: options.utmCampaign || elementType,
    utm_content: contributorId || 'skhema',
  })

  if (contributorId) {
    return `${baseUrl}?type=contributor&contributor_id=${contributorId}&element_type=${elementType}&content_hash=${contentHash}&${params.toString()}`
  }

  // Skhema-authored elements: the owned-assets (repository) save lane
  if (options.elementId) {
    return `${baseUrl}?type=repository&element_id=${options.elementId}&element_type=${elementType}&content_hash=${contentHash}&${params.toString()}`
  }

  // No contributor and no element id: keep the save payload so the app can
  // still resolve the content by hash.
  return `${baseUrl}?element_type=${elementType}&content_hash=${contentHash}&${params.toString()}`
}

export function createMetaTags(
  content: string,
  elementType: ElementValue,
  contributorId?: string
): string {
  const label = getElementTypeLabel(elementType)

  return `
    <div itemscope itemtype="https://schema.org/AnalysisContent" style="display:none;">
      <meta itemprop="analysisType" content="${elementType}">
      <meta itemprop="text" content="${content}">
      <meta itemprop="contributor" content="${contributorId || 'Skhema'}">
      <meta itemprop="category" content="${label}">
      <meta itemprop="platform" content="Skhema">
    </div>
  `
}

export function generateComponentStructuredData(
  title: string,
  componentType: ComponentValue,
  contributorId: string | undefined,
  elements: Array<{ elementType: string; content: string }>,
  sourceUrl: string
): object {
  const componentLabel = getComponentTypeLabel(componentType)

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: title,
    description: `${componentLabel} strategy component`,
    category: componentLabel,
    contributor: contributorId || 'Skhema',
    url: generateComponentRedirectUrl(
      generateContentHash(elements.map((e) => e.content).join('|')),
      componentType,
      contributorId
    ),
    hasPart: elements.map((el) => ({
      '@type': 'AnalysisContent',
      text: el.content,
      analysisType: el.elementType,
      category: getElementTypeLabel(el.elementType as ElementValue),
    })),
    provider: {
      '@type': 'Organization',
      name: 'Skhema',
      url: 'https://skhema.com',
    },
    isPartOf: {
      '@type': 'WebPage',
      url: sourceUrl,
    },
    dateCreated: new Date().toISOString(),
    platform: 'Skhema',
  }
}

export function generateComponentRedirectUrl(
  componentHash: string,
  componentType: ComponentValue,
  contributorId?: string,
  options: {
    baseUrl?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
  } = {}
): string {
  const baseUrl = options.baseUrl || 'https://app.skhema.com/save'
  const sourceUrl = encodeURIComponent(window.location.href)
  const timestamp = Date.now()

  const params = new URLSearchParams({
    source: sourceUrl,
    t: timestamp.toString(),
    utm_source: options.utmSource || 'web_component',
    utm_medium: options.utmMedium || 'embedded',
    utm_campaign: options.utmCampaign || componentType,
    utm_content: contributorId || 'skhema',
  })

  const contributorParam = contributorId
    ? `&contributor_id=${contributorId}`
    : ''
  return `${baseUrl}?type=component&component_type=${componentType}&component_hash=${componentHash}${contributorParam}&${params.toString()}`
}

export function createAriaAttributes(
  elementType: ElementValue
): Record<string, string> {
  const label = getElementTypeLabel(elementType)

  return {
    role: 'article',
    'aria-label': `${label} - Strategic element`,
    'aria-describedby': 'skhema-description',
  }
}
