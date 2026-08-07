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

| Attribute             | Required | Description                                       |
| --------------------- | -------- | ------------------------------------------------- |
| `element-type`        | ✓        | Type of strategic element                         |
| `contributor-id`      | ✓        | Your contributor identifier                       |
| `content`             |          | Alternative to inner text                         |
| `theme`               |          | Visual theme: `light`, `dark`, `auto`             |
| `provenance-org`      |          | Organization the content originated from          |
| `provenance-document` |          | Title of the source document                      |
| `provenance-url`      |          | Absolute `http(s)` URL of the source document     |
| `provenance-date`     |          | Source date as a display string, e.g. `2024–2027` |

### Source provenance

Author attribution ("who curated this") and source provenance ("who originated
this") are separate. Add the `provenance-*` attributes when the content is
largely unedited from an external document; omit them entirely for content
original to you. The card then renders a `Source: {organization}` line beneath
the contributor byline, linking the organization when `provenance-url` is an
absolute `http(s)` URL — anything else renders as plain text, never a link.

Each attribute degrades on its own: without `provenance-org` nothing renders at
all (no empty line, no dangling separators).

```html
<skhema-element
  element-type="key_challenge"
  contributor-id="analyst"
  provenance-org="Australian Sports Commission"
  provenance-document="Play Well Strategy"
  provenance-url="https://www.example.org/sport-strategy"
  provenance-date="2024–2027"
>
  Participation in community sport is falling among 15–17 year olds.
</skhema-element>
```

## Element Types

- `key_challenge` - Business challenges
- `fact` - Evidence and data points
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
  provenanceOrg: 'Australian Sports Commission', // optional; renders "Source: …"
  provenanceUrl: 'https://www.example.org/sport-strategy', // optional; links the org
  provenanceDerived: false, // optional; true renders "Derived from: …"
})

// Component card (the renderer groups elements by type)
const componentHtml = renderComponentCardHtml({
  componentType: 'diagnosis',
  title: 'Second-hand apparel shift', // optional
  elements: [
    { elementType: 'key_challenge', content: '…' },
    { elementType: 'fact', content: '…' },
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

## Snippet generator (`@skhema/embed/snippets`)

`@skhema/embed/snippets` is the **canonical, DOM-free generator of copy-ready
embed snippets** — the single implementation behind the contributor app's
composer/docs and `@skhema/cli`'s `skhema generate embed|link`. One content
model, three destinations:

```ts
import {
  generateWebsiteEmbed, // pinned-CDN <script> + <skhema-element> block
  generateEmailEmbed, // email-safe card HTML + email-tagged save URL
  buildSaveUrl, // bare /save handoff link (per-channel UTM defaults)
  buildEmbedPageUrl, // skhema.com/embed/e|c/<id> share-page URL
  EMBED_CDN_VERSION, // the version pin snippets are generated with
} from '@skhema/embed/snippets'

const { snippet } = generateWebsiteEmbed({
  elementType: 'key_challenge',
  content: 'Metropolitan unemployment is redirecting apparel demand.',
  contributorId: 'ctr_123',
  authorName: 'Jordan Mills',
  authorSlug: 'jordan-mills',
})
```

The four card generators (website + email, element + component) accept an
optional `provenance` object (`{ organization, documentName?, url?, date? }`),
emitted as the flat `provenance-*` attributes on website snippets and rendered
as the `Source:` line on email cards. The save-URL builders take no provenance —
a `/save` link carries no card. A `url` that is not an absolute `http(s)` URL is
dropped at generation, so a copied snippet never ships an unusable link.

`date` is a pre-collapsed display string. Callers holding the stored shape
should collapse it with `collapseProvenanceDate({ documentDate, dateRange })`
(exported from both `/snippets` and `/render`) rather than re-deriving the rule
— it owns the en-dash range format, and collapses an equal-ended or one-ended
range to a single date.

Component variants exist for every generator (`generateComponentWebsiteEmbed`,
`generateComponentEmailEmbed`, `buildComponentSaveUrl`). Inputs are validated
against the `@skhema/method` vocabulary and HTML-escaped.

`EMBED_CDN_VERSION` is injected at build time from this package's own version,
so generated snippets always pin the exact renderer they were generated with —
the pin cannot drift from the published package.

## License

MIT
