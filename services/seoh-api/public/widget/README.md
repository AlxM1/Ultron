# SEOh Embeddable Widget

Drop-in GEO audit widget for any website. Shadow DOM isolated, zero dependencies.

## Usage

### Script tag (simplest)
```html
<script src="https://api.seoh.ca/widget/embed.js" data-api="https://api.seoh.ca"></script>
```

### Container div (more control)
```html
<div id="seoh-widget" data-api="https://api.seoh.ca" data-theme="dark"></div>
<script src="https://api.seoh.ca/widget/embed.js"></script>
```

## Data Attributes

| Attribute | Default | Description |
|---|---|---|
| `data-api` | `https://api.seoh.ca` | SEOh API base URL |
| `data-theme` | `dark` | `dark` or `light` |
| `data-report-url` | `https://seoh.ca` | "Get Full Report" CTA link |

## Features

- Shadow DOM — fully isolated styles, no CSS conflicts
- Dark/light theme with amber accents
- Score ring + 5 dimension bars + top issues
- Responsive, max-width 480px
- Calls `POST /api/audit` with `{ url }` body

## Local Testing

```bash
# Start seoh-api
cd /path/to/seoh-api && npm start

# Open test page
open public/widget/test.html
```
