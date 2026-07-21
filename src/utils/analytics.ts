import type {
  ComponentContentData,
  ComponentEmbedAnalytics,
  ContentData,
  EmbedAnalytics,
} from '../components/types.js'

/**
 * Public analytics ingest endpoint for embed telemetry.
 */
const ANALYTICS_ENDPOINT =
  'https://analytics.skhema.com/functions/v1/embed-manage'

// Cookie-based tracking management
interface TrackedEmbed {
  contentHash: string
  timestamp: number
}

const TRACKING_COOKIE_NAME = '_sk'
const TRACKING_EXPIRY_HOURS = 24
const MAX_TRACKED_ITEMS = 50 // Prevent cookie from growing too large

function getTrackedEmbeds(): TrackedEmbed[] {
  try {
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${TRACKING_COOKIE_NAME}=`))

    if (!cookie) return []

    const data = JSON.parse(decodeURIComponent(cookie.split('=')[1]))
    const now = Date.now()
    const cutoff = now - TRACKING_EXPIRY_HOURS * 60 * 60 * 1000

    // Filter out expired entries
    return data.filter((item: TrackedEmbed) => item.timestamp > cutoff)
  } catch {
    return []
  }
}

function setTrackedEmbeds(tracked: TrackedEmbed[]): void {
  try {
    // Keep only the most recent entries to prevent cookie bloat
    const limited = tracked.slice(-MAX_TRACKED_ITEMS)
    const expires = new Date(
      Date.now() + TRACKING_EXPIRY_HOURS * 60 * 60 * 1000
    )

    document.cookie = `${TRACKING_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify(limited)
    )}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
  } catch {
    // Fail silently if cookie storage fails
  }
}

function hasBeenTracked(contentHash: string): boolean {
  const tracked = getTrackedEmbeds()
  return tracked.some((item) => item.contentHash === contentHash)
}

function markAsTracked(contentHash: string): void {
  const tracked = getTrackedEmbeds()
  tracked.push({
    contentHash,
    timestamp: Date.now(),
  })
  setTrackedEmbeds(tracked)
}

// Batching system for analytics
interface BatchedAnalytics {
  embeds: EmbedAnalytics[]
  clicks: ContentData[]
  componentEmbeds: ComponentEmbedAnalytics[]
  componentClicks: ComponentContentData[]
}

class AnalyticsBatcher {
  private batch: BatchedAnalytics = {
    embeds: [],
    clicks: [],
    componentEmbeds: [],
    componentClicks: [],
  }
  private batchTimeout: number | null = null
  private readonly BATCH_DELAY = 2000 // 2 seconds
  private readonly MAX_BATCH_SIZE = 10

  addEmbedLoad(analytics: EmbedAnalytics): void {
    this.batch.embeds.push(analytics)
    this.scheduleBatchSend()
  }

  addClick(contentData: ContentData): void {
    this.batch.clicks.push(contentData)
    this.scheduleBatchSend()
  }

  addComponentEmbedLoad(analytics: ComponentEmbedAnalytics): void {
    this.batch.componentEmbeds.push(analytics)
    this.scheduleBatchSend()
  }

  addComponentClick(contentData: ComponentContentData): void {
    this.batch.componentClicks.push(contentData)
    this.scheduleBatchSend()
  }

  private scheduleBatchSend(): void {
    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    // Send immediately if any batch is full
    const totalItems =
      this.batch.embeds.length +
      this.batch.clicks.length +
      this.batch.componentEmbeds.length +
      this.batch.componentClicks.length

    if (totalItems >= this.MAX_BATCH_SIZE) {
      this.sendBatch()
      return
    }

    // Otherwise, wait for more events or timeout
    this.batchTimeout = window.setTimeout(() => {
      this.sendBatch()
    }, this.BATCH_DELAY)
  }

  private async sendBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    const currentBatch = { ...this.batch }
    this.batch = {
      embeds: [],
      clicks: [],
      componentEmbeds: [],
      componentClicks: [],
    }

    const hasItems =
      currentBatch.embeds.length > 0 ||
      currentBatch.clicks.length > 0 ||
      currentBatch.componentEmbeds.length > 0 ||
      currentBatch.componentClicks.length > 0

    if (!hasItems) return

    // Send embeds if any
    if (currentBatch.embeds.length > 0) {
      await this.sendEmbeds(currentBatch.embeds)
    }

    // Send clicks if any
    if (currentBatch.clicks.length > 0) {
      await this.sendClicks(currentBatch.clicks)
    }

    // Send component embeds if any
    if (currentBatch.componentEmbeds.length > 0) {
      await this.sendComponentEmbeds(currentBatch.componentEmbeds)
    }

    // Send component clicks if any
    if (currentBatch.componentClicks.length > 0) {
      await this.sendComponentClicks(currentBatch.componentClicks)
    }
  }

  private async sendEmbeds(embeds: EmbedAnalytics[]): Promise<void> {
    if (embeds.length === 0) return

    try {
      const payload = {
        action: 'embed',
        events: embeds.map((embed) => ({
          contributor_id: embed.contributorId,
          element_type: embed.elementType,
          content_hash: embed.contentHash,
          content: embed.content,
          page_url: embed.pageUrl,
          page_title: embed.pageTitle || '',
          user_agent: embed.userAgent || '',
        })),
      }

      await sendWithRetry(ANALYTICS_ENDPOINT, payload, 'json')
    } catch (error) {
      console.debug('Embed tracking failed:', error)
    }
  }

  private async sendClicks(clicks: ContentData[]): Promise<void> {
    // Send clicks individually since they typically navigate away from page
    for (const click of clicks) {
      try {
        const data = {
          action: 'click',
          contributor_id: click.contributor_id,
          content_hash: click.content_hash,
          source_url: click.source_url,
          element_type: click.element_type,
        }

        fetch(ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'omit',
          keepalive: true,
        }).catch(() => {
          // Fail silently
        })
      } catch (error) {
        console.debug('Click tracking failed:', error)
      }
    }
  }

  private async sendComponentEmbeds(
    embeds: ComponentEmbedAnalytics[]
  ): Promise<void> {
    if (embeds.length === 0) return

    // The ingest endpoint expects flat fields at top level, not wrapped in events[]
    for (const embed of embeds) {
      try {
        const payload = {
          action: 'component_embed',
          contributor_id: embed.contributorId,
          component_type: embed.componentType,
          component_hash: embed.componentHash,
          title: embed.title,
          elements: embed.elements.map((el) => ({
            element_type: el.elementType,
            content: el.content,
            content_hash: el.contentHash,
          })),
          page_url: embed.pageUrl,
          page_title: embed.pageTitle || '',
          user_agent: embed.userAgent || '',
        }

        await sendWithRetry(ANALYTICS_ENDPOINT, payload, 'json')
      } catch (error) {
        console.debug('Component embed tracking failed:', error)
      }
    }
  }

  private async sendComponentClicks(
    clicks: ComponentContentData[]
  ): Promise<void> {
    for (const click of clicks) {
      try {
        const data = {
          action: 'component_click',
          contributor_id: click.contributor_id,
          component_type: click.component_type,
          component_hash: click.component_hash,
          title: click.title,
          source_url: click.source_url,
        }

        fetch(ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'omit',
          keepalive: true,
        }).catch(() => {
          // Fail silently
        })
      } catch (error) {
        console.debug('Component click tracking failed:', error)
      }
    }
  }

  // Ensure batch is sent when page unloads.
  // Uses sendBeacon for reliability — async fetch won't complete during unload.
  flush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    const currentBatch = { ...this.batch }
    this.batch = {
      embeds: [],
      clicks: [],
      componentEmbeds: [],
      componentClicks: [],
    }

    // Send embeds via beacon
    if (currentBatch.embeds.length > 0) {
      const payload = {
        action: 'embed',
        events: currentBatch.embeds.map((embed) => ({
          contributor_id: embed.contributorId,
          element_type: embed.elementType,
          content_hash: embed.contentHash,
          content: embed.content,
          page_url: embed.pageUrl,
          page_title: embed.pageTitle || '',
          user_agent: embed.userAgent || '',
        })),
      }
      this.sendViaBeacon(payload)
    }

    // Send clicks via beacon
    for (const click of currentBatch.clicks) {
      this.sendViaBeacon({
        action: 'click',
        contributor_id: click.contributor_id,
        content_hash: click.content_hash,
        source_url: click.source_url,
        element_type: click.element_type,
      })
    }

    // Send component embeds via beacon (flat fields, not wrapped in events[])
    for (const embed of currentBatch.componentEmbeds) {
      this.sendViaBeacon({
        action: 'component_embed',
        contributor_id: embed.contributorId,
        component_type: embed.componentType,
        component_hash: embed.componentHash,
        title: embed.title,
        elements: embed.elements.map((el) => ({
          element_type: el.elementType,
          content: el.content,
          content_hash: el.contentHash,
        })),
        page_url: embed.pageUrl,
        page_title: embed.pageTitle || '',
        user_agent: embed.userAgent || '',
      })
    }

    // Send component clicks via beacon
    for (const click of currentBatch.componentClicks) {
      this.sendViaBeacon({
        action: 'component_click',
        contributor_id: click.contributor_id,
        component_type: click.component_type,
        component_hash: click.component_hash,
        title: click.title,
        source_url: click.source_url,
      })
    }
  }

  private sendViaBeacon(payload: Record<string, unknown>): void {
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          ANALYTICS_ENDPOINT,
          new Blob([JSON.stringify(payload)], { type: 'application/json' })
        )
      } else {
        // Fallback to fetch with keepalive
        fetch(ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'omit',
          keepalive: true,
        }).catch(() => {})
      }
    } catch {
      // Fail silently during unload
    }
  }
}

// Global batcher instance
const analyticsBatcher = new AnalyticsBatcher()

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    analyticsBatcher.flush()
  })

  // Also flush on visibility change (mobile browsers)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      analyticsBatcher.flush()
    }
  })
}

// Retry logic with exponential backoff
async function sendWithRetry(
  url: string,
  data: URLSearchParams | Record<string, unknown>,
  contentType: 'json' | 'urlencoded' = 'json',
  maxRetries = 3
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const options: RequestInit = {
        method: 'POST',
        credentials: 'omit',
        keepalive: true,
      }

      if (contentType === 'json') {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = JSON.stringify(data)
      } else {
        options.body = data as URLSearchParams
      }

      const response = await fetch(url, options)

      if (response.ok) return

      if (response.status >= 400 && response.status < 500) {
        // Client error, don't retry
        break
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.debug('Analytics failed after retries:', error)
        return
      }
    }

    // Exponential backoff: 1s, 2s, 4s
    await new Promise((resolve) =>
      setTimeout(resolve, Math.pow(2, attempt) * 1000)
    )
  }
}

// Main tracking functions
export async function trackEmbedLoad(analytics: EmbedAnalytics): Promise<void> {
  try {
    // Check if this embed has already been tracked
    if (hasBeenTracked(analytics.contentHash)) {
      console.debug('Embed already tracked, skipping:', analytics.contentHash)
      return
    }

    // Mark as tracked before sending to prevent race conditions
    markAsTracked(analytics.contentHash)

    // Add to batch instead of sending immediately
    analyticsBatcher.addEmbedLoad(analytics)
  } catch (error) {
    console.debug('Analytics tracking failed:', error)
  }
}

export async function trackClick(contentData: ContentData): Promise<void> {
  try {
    // Add to batch instead of sending immediately
    analyticsBatcher.addClick(contentData)
  } catch (error) {
    console.debug('Click tracking failed:', error)
  }
}

export async function trackComponentEmbedLoad(
  analytics: ComponentEmbedAnalytics
): Promise<void> {
  try {
    // Check if this component has already been tracked
    if (hasBeenTracked(analytics.componentHash)) {
      console.debug(
        'Component embed already tracked, skipping:',
        analytics.componentHash
      )
      return
    }

    // Mark as tracked before sending to prevent race conditions
    markAsTracked(analytics.componentHash)

    // Add to batch instead of sending immediately
    analyticsBatcher.addComponentEmbedLoad(analytics)
  } catch (error) {
    console.debug('Component analytics tracking failed:', error)
  }
}

export async function trackComponentClick(
  contentData: ComponentContentData
): Promise<void> {
  try {
    analyticsBatcher.addComponentClick(contentData)
  } catch (error) {
    console.debug('Component click tracking failed:', error)
  }
}

export function shouldTrackAnalytics(element: HTMLElement): boolean {
  const trackAnalytics = element.getAttribute('track-analytics')
  return trackAnalytics !== 'false'
}
