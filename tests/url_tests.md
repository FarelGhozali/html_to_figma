# Extensive URL Collection for "From URL" Testing

Use the links below to test various capabilities of the "From URL" feature in the HTML to Figma plugin. This list has been expanded to provide you with various testing scenarios from the simplest to the complex.

## 1. Static Web & Documentation (Highly Recommended)
These types of websites are usually Server-Side Rendered (SSR) or static, with excellent and clean DOM structures. Ideal for testing layouts, text, tables, and grids.

**Framework & Documentation:**
- `https://tailwindcss.com/docs/flex`
- `https://getbootstrap.com/docs/5.3/components/card/`
- `https://developer.mozilla.org/en-US/docs/Web/CSS/flex`
- `https://vuejs.org/guide/introduction.html`
- `https://react.dev/learn`
- `https://svelte.dev/docs`
- `https://bulma.io/documentation/components/card/`
- `https://material-ui.com/components/cards/`
- `https://chakra-ui.com/docs/components/box`
- `https://ant.design/components/button/`

**Static Articles & Blogs:**
- `https://en.wikipedia.org/wiki/Web_design`
- `https://en.wikipedia.org/wiki/Figma_(software)`
- `https://daringfireball.net/` (Classic minimalist look)
- `https://www.paulgraham.com/articles.html` (Super simple)
- `https://motherfuckingwebsite.com/` (Pure HTML only)
- `https://github.com/microsoft/TypeScript`

## 2. Image-Heavy & Landing Pages (For Image Feature Testing)
These websites rely heavily on high-resolution images (`<img>`), SVG backgrounds, and CSS `background-image`.

**Gallery & Photography:**
- `https://unsplash.com/t/nature` (Note: some assets might be lazy-loaded)
- `https://www.pexels.com/search/design/`
- `https://dribbble.com/shots/popular`
- `https://www.behance.net/galleries/graphic-design`
- `https://500px.com/popular`

**SaaS Landing Pages (Modern Design):**
- `https://stripe.com/` (Complex design, gradients, SVGs)
- `https://vercel.com/`
- `https://linear.app/`
- `https://webflow.com/`
- `https://framermerge.com/`
- `https://slack.com/`
- `https://www.notion.so/`
- `https://asana.com/`
- `https://www.figma.com/`

## 3. Typography, Magazines, & Complex Grids
News and article websites with multi-layered grid layout systems and typography. Great for seeing how Figma handles nested Flexbox.

**News & Articles:**
- `https://www.theverge.com/`
- `https://techcrunch.com/`
- `https://www.wired.com/`
- `https://www.smashingmagazine.com/`
- `https://css-tricks.com/`
- `https://www.awwwards.com/blog/`
- `https://www.nytimes.com/`
- `https://news.ycombinator.com/` (Hacker News - Old school table structure)
- `https://medium.com/`
- `https://dev.to/`

## 4. E-Commerce (Product Catalogs & Cards)
Full of product grids, star ratings, strikethrough prices, and discount badges.

- `https://www.amazon.com/` (Very complex and dense)
- `https://www.ebay.com/`
- `https://www.etsy.com/`
- `https://www.shopify.com/` (Landing page)
- `https://store.steampowered.com/` (Lots of background images and color overlays)

## 5. Specific Web Elements
- **Complex Tables**: `https://www.w3schools.com/html/html_tables.asp`
- **Forms**: `https://getbootstrap.com/docs/5.3/forms/overview/`
- **Hidden CSS Grids**: `https://gridbyexample.com/examples/`
- **Text with various Styles**: `https://html5test.com/`

---

## 6. Single Page Applications / Highly Protected Web (⚠️ USE PASTE CODE)
The links below will most likely **FAIL** if using the "From URL" feature. This is because these websites use pure Client-Side Rendering (CSR) which requires JavaScript execution (like pure React/Angular), **or** use military-grade Bot Protection (Cloudflare/Akamai) that will block the public proxy servers used by the plugin.

If you want to test the design of these websites, you **must use the "Paste Code" feature** (Inspect Element -> Copy outerHTML):

**Very Strict Bot Protection:**
- `https://www.apple.com/`
- `https://www.google.com/`
- `https://www.cloudflare.com/`

**Pure CSR & Requires Login:**
- `https://www.youtube.com/` (Will render an empty skeleton)
- `https://www.instagram.com/`
- `https://twitter.com/` / `https://x.com/`
- `https://www.facebook.com/`
- `https://www.tiktok.com/`
- `https://www.netflix.com/`
- `https://app.slack.com/`
- `https://web.whatsapp.com/`
