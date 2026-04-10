# Lighthouse Test Runner

A Node.js tool for running Google Lighthouse performance audits on websites with intelligent file naming and organization.

## Features

- **Smart File Naming**: Automatically fetches page titles to name reports meaningfully
- **Client Organization**: Organizes reports by hostname in separate folders
- **Multiple URL Support**: Test multiple pages in a single command
- **Mobile & Desktop Testing**: Run tests for both form factors or individually
- **Timestamped Reports**: Includes timestamps for tracking report history

## Prerequisites

- [Node.js](https://nodejs.org/en/download) installed
- [curl](https://curl.se/download.html) and [perl](https://www.perl.org/get.html) (usually pre-installed on macOS/Linux, installation likely required on Windows)

## Installation

1. Clone or download this repository
2. Install dependencies: `npm install`
3. Ensure you have `lighthouse.config.js` in the same directory
4. Make the runner executable: `chmod +x runner.js`

## Usage

### Commands

```bash
# Test a single URL for both mobile and desktop
npm run test:both -- https://example.com

# Test mobile only
npm run test:mobile -- https://example.com

# Test desktop only
npm run test:desktop -- https://example.com

# Test multiple URLs
npm run test:both -- https://example.com https://example.com/collections/collection-handle https://example.com/products/product-handle
```

**Note**: If you don't specify a URL it will fall back to `http://localhost:9292`.

### Multiple URL Examples

```bash
# Test multiple pages for a client
npm run test:both -- \
  https://example.com \
  https://example.com/collections/collection-handle \
  https://example.com/products/product-handle

# Test multiple client sites (mobile only)
node runner.js mobile \
  https://client1.com \
  https://client2.com \
  https://client3.com
```

## Output Structure

Reports are automatically organized by hostname under the `reports/` directory:

```
reports/
├── client1.com/
│   ├── mobile-HOME-Page-Title-2026-04-10T10-45-20.html
│   ├── mobile-HOME-Page-Title-2026-04-10T10-45-20.json
│   ├── desktop-HOME-Page-Title-2026-04-10T10-45-20.html
│   ├── desktop-HOME-Page-Title-2026-04-10T10-45-20.json
│   ├── mobile-PLP-Collection-Title-2026-04-10T10-46-15.html
│   ├── mobile-PLP-Collection-Title-2026-04-10T10-46-15.json
│   ├── mobile-PDP-Product-Title-2026-04-10T10-47-00.html
│   └── mobile-PDP-Product-Title-2026-04-10T10-47-00.json
├── client2.com/
│   ├── mobile-PAGE-About-Us-2026-04-10T11-00-00.html
│   └── mobile-PAGE-About-Us-2026-04-10T11-00-00.json
└── example.com/
    ├── desktop-HOME-Example-Domain-2026-04-10T12-00-00.html
    └── desktop-HOME-Example-Domain-2026-04-10T12-00-00.json
```

## File Naming Convention

Files are named using the pattern:
`{formFactor}-{pageType}-{sanitizedPageTitle}-{timestamp}.{extension}`

Where:

- **formFactor**: `mobile` or `desktop`
- **pageType**: Automatically detected page type:
  - `HOME`: Homepage (including locale variants like `/en-us`, `/fr-ca`)
  - `PLP`: Product Listing Page (URLs containing `/collections/`)
  - `PDP`: Product Detail Page (URLs containing `/products/`)
  - `BLOG`: Blog category page (e.g., `/blogs/category-name`)
  - `ARTICLE`: Blog article page (e.g., `/blogs/category/article-name`)
  - `PAGE`: Generic page (default for other pages)
- **sanitizedPageTitle**: Page title with invalid characters removed, spaces replaced with hyphens, and truncated to 100 characters
- **timestamp**: ISO timestamp when the test was run (e.g., `2026-04-10T10-45-20`)
- **extension**: `html` or `json`

## Configuration

- **Default URL**: Set via `LIGHTHOUSE_URL` environment variable (defaults to `http://localhost:9292`)
- **Lighthouse Config**: Uses `lighthouse.config.js` in the same directory
- **Chrome Flags**: Runs in headless mode by default

### Mobile Configuration Details

- **Form Factor**: Mobile
- **Throttling**: CPU slowdown multiplier of 1.2 (PSI benchmark)
- **Screen**: 412x823 pixels with 2.625x device scale
- **User Agent**: Android mobile Chrome

### Desktop Configuration Details

- **Form Factor**: Desktop
- **Throttling**: Dense 4G simulation (40ms RTT, 10MB throughput)
- **Screen**: 1350x940 pixels
- **User Agent**: macOS Chrome

### Performance Budgets

The configuration includes Shopify-optimized performance budgets:

- **JavaScript**: 400KB limit
- **Images**: 500KB limit
- **CSS**: 100KB limit
- **Total Resources**: 1.5MB limit
- **Third-party requests**: 20 maximum

## Error Handling

- Invalid URLs are automatically filtered out with warnings
- If page title extraction fails, falls back to hostname
- Failed tests for individual URLs don't stop the entire batch
- Comprehensive error reporting at the end of multi-URL runs

## Examples

### Single Client Deep Audit

```bash
# Comprehensive audit of client site
npm run test:both -- \
  https://site.com \
  https://site.com/collections/collection-handle \
  https://site.com/products/product-handle \
  https://site.com/pages/about \
  https://site.com/pages/contact
```

### Multi-Client Mobile Performance Check

```bash
# Quick mobile performance check across multiple clients
npm run test:mobile -- \
  https://client1.com \
  https://client2.com \
  https://client3.com
```

### Desktop Focus Testing

```bash
# Desktop-specific testing for sites with complex layouts
npm run test:desktop -- \
  https://site1.com/products/product-handle \
  https://site2.com/products/product-handle \
  https://site3.com/products/product-handle
```

## Claude Desktop Integration

This lighthouse testing tool integrates seamlessly with Claude Desktop for AI-powered performance analysis and workflow automation.

### Report Analysis

Claude Desktop can automatically:

- Parse JSON report files for structured data
- Identify performance bottlenecks and optimization opportunities
- Generate executive summaries from technical lighthouse data
- Create before/after comparisons when you run tests over time
- Suggest priority fixes based on impact and implementation difficulty

This combination of automated testing and AI analysis creates a powerful workflow for performance optimization consultancy.

## Output Information

The tool provides detailed console output including:

- Page title extraction status
- Progress indicators for multiple URLs
- Success/failure status for each test
- File paths for generated reports
- Comprehensive summaries at completion

Each run generates both HTML (visual report) and JSON (raw data) formats for maximum flexibility in reporting and analysis.
