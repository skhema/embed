/**
 * DOM-free colour utilities for the email-safe card renderer.
 *
 * The card palette (`COMPONENT_COLORS`) is authored in `oklch()` for the live
 * browser embed, but email clients can't parse `oklch()` and `<style>` is
 * stripped, so every colour must be a pre-computed sRGB hex with all styles
 * inlined. This converts a single `oklch(...)` token to hex, compositing any
 * alpha over a flat background (white for light cards, the dark card surface
 * for dark cards) so the result is opaque and email-safe.
 *
 * This is the single source of the conversion that `sk comms curated` and the
 * `CuratedElements` email template previously duplicated.
 */

/** Brand pink (hsl(344 57% 54%)) — fallback when a component palette is missing. */
export const BRAND_PINK = '#cd476a'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/**
 * Convert a single `oklch(...)` token to an email-safe sRGB hex. When the token
 * carries an alpha (e.g. the badge `bg` @ 0.15 / `border` @ 0.3), the colour is
 * composited over `overHex` so the result is a flat opaque hex.
 *
 * @param token  An `oklch(L C H)` or `oklch(L C H / A)` string.
 * @param overHex The flat background to composite alpha over (default white).
 */
export function oklchToHex(token: string, overHex = '#ffffff'): string {
  const m = token.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)/
  )
  if (!m) return BRAND_PINK
  const L = parseFloat(m[1])
  const C = parseFloat(m[2])
  const H = parseFloat(m[3])
  const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const lr = l_ ** 3
  const mr = m_ ** 3
  const sr = s_ ** 3
  const R = 4.0767416621 * lr - 3.3077115913 * mr + 0.2309699292 * sr
  const G = -1.2684380046 * lr + 2.6097574011 * mr - 0.3413193965 * sr
  const B = -0.0041960863 * lr - 0.7034186147 * mr + 1.707614701 * sr
  const gamma = (x: number): number => {
    const c = Math.max(0, Math.min(1, x))
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  }
  let rgb = [gamma(R) * 255, gamma(G) * 255, gamma(B) * 255]
  if (alpha < 1) {
    const [br, bg, bb] = hexToRgb(overHex)
    rgb = [
      rgb[0] * alpha + br * (1 - alpha),
      rgb[1] * alpha + bg * (1 - alpha),
      rgb[2] * alpha + bb * (1 - alpha),
    ]
  }
  return (
    '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')
  )
}
