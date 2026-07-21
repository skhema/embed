> [!IMPORTANT]
> **Generated mirror of a private source repo — do not open PRs here.**
> This repository is an automatically generated, read-only mirror of a package
> built from Skhema's private monorepo. Pull requests are disabled and any change
> pushed here is overwritten on the next release. Questions and bug reports:
> support@skhema.com. Security: see [SECURITY.md](./SECURITY.md).

# @skhema/embed

An embeddable component for contributors to wrap content that can be immediately integrated into Skhema's business strategy platform.

## CDN Usage

```html
<script src="https://unpkg.com/@skhema/embed"></script>

<skhema-element element-type="key_challenge" contributor-id="your_username">
  Strategic business content goes here.
</skhema-element>
```

## NPM Usage

```bash
npm install @skhema/embed
```

```javascript
import '@skhema/embed'
// Component is automatically registered
```

## Attributes

| Attribute        | Required | Description                           |
| ---------------- | -------- | ------------------------------------- |
| `element-type`   | ✓        | Type of strategic element             |
| `contributor-id` | ✓        | Your contributor identifier           |
| `content`        |          | Alternative to inner text             |
| `theme`          |          | Visual theme: `light`, `dark`, `auto` |

## Element Types

- `key_challenge` - Business challenges
- `supporting_fact` - Evidence and data points
- `guiding_policy` - Strategic approaches
- `solution` - Potential solutions
- And more...

## Example

```html
<article>
  <p>The automotive industry is undergoing transformation...</p>

  <skhema-element element-type="key_challenge" contributor-id="analyst">
    Traditional automakers face retooling challenges while competing with Tesla.
  </skhema-element>
</article>
```

## Card renderer (`@skhema/embed/render`)

`@skhema/embed/render` is the **canonical, DOM-free source of truth for the
official Skhema card HTML**. It is the same function that backs the live web
embed above — extracted so email templates, the `sk comms curated` command, and
third-party / contributor generators all produce the identical card without
hand-porting markup.

It returns **email-safe** HTML: a `role="presentation"` table layout with every
style inlined as flat hex — no shadow DOM, no `<style>`, no `oklch()`, no CSS
vars. Importing it never touches the DOM, so it is safe in Node, edge, and email
build runtimes. It builds **no URLs**: pass the fully-formed `saveUrl` (the
`/save` handoff) so each surface owns its own UTM tagging.

> If you are generating Skhema cards for email or any non-browser surface, this
> is the official, supported format. Use it instead of re-creating the markup.

```ts
import {
  renderElementCardHtml,
  renderComponentCardHtml,
} from '@skhema/embed/render'

// Element card
const html = renderElementCardHtml({
  elementType: 'key_challenge', // Skhema element-type value
  content: 'Metropolitan unemployment is redirecting apparel demand.',
  saveUrl: 'https://app.skhema.com/save?...', // pre-built /save handoff
  authorName: 'Jordan Mills', // optional; falls back to contributorId
  authorSlug: 'jordan-mills', // optional; links the name to the profile
  contributorId: 'ctr_123', // optional; author-name fallback source
  theme: 'light', // 'light' (default) | 'dark'
})

// Component card (the renderer groups elements by type)
const componentHtml = renderComponentCardHtml({
  componentType: 'diagnosis',
  title: 'Second-hand apparel shift', // optional
  elements: [
    { elementType: 'key_challenge', content: '…' },
    { elementType: 'supporting_fact', content: '…' },
  ],
  saveUrl: 'https://app.skhema.com/save?...',
  authorName: 'Jordan Mills',
  authorSlug: 'jordan-mills',
  contributorId: 'ctr_123',
  theme: 'light',
})
```

Content is HTML-escaped, URL-stripped, and newline-preserved for you. The live
web components render this same HTML and layer browser-only hover/transition CSS
on top; a snapshot-parity test (`src/render/index.test.ts`) guards the output so
any change to the official format is a deliberate, reviewed diff.

## License

MIT
