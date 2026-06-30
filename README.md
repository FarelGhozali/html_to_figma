<div align="center">
  
# HTML to Figma

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](#)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)
[![Figma API](https://img.shields.io/badge/Figma%20API-Supported-ff69b4.svg)](#)

A powerful, standalone Figma Plugin that instantly converts your HTML & CSS code into native Figma node hierarchies (Auto Layout Frames and Text).


</div>

---

## Overview

Tired of manually recreating web components in Figma? This plugin acts as your personal bridge from code to design. It operates **100% locally** within your Figma Plugin sandbox without external servers, backends, or lag. Simply paste your HTML, and watch it render into pixel-perfect Figma layers.

## Features

- **No Backend Required**: Runs entirely inside Figma's UI iframe using a virtual DOM environment.
- **Auto Layout Mastery**: Automatically translates CSS Flexbox rules (`flex-direction`, `justify-content`, `align-items`, `gap`, `padding`) into strict Figma Auto Layout parameters.
- **Modern UI**: Built with Tailwind CSS, featuring a sleek, minimal dark mode interface.
- **Typography Extraction**: Accurately pulls font families, weights, sizes, and colors directly from your CSS.
- **Instant Translation**: Paste your HTML code and see it instantly rendered as native Figma layers.

---

## Prerequisites

Before you begin, ensure you have met the following requirements:
- **Node.js** (v14.0.0 or higher)
- **NPM** or **Yarn**
- **Figma Desktop App**

---

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/FarelGhozali/html_to_figma.git
   cd html_to_figma
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the plugin:**
   Start the development server with hot-reload:
   ```bash
   npm run dev
   ```
   *Or build for production:*
   ```bash
   npm run build
   ```
   > The compiled files will be generated in the `dist/` directory.

### Development Workflow & Caching
When running `npm run dev`, Vite will automatically recompile your TypeScript files upon saving. However, due to Figma's strict sandbox caching:
- Changes to the **UI** (`ui.html`, `ui.ts`) might require you to close and reopen the plugin window, depending on your setup.
- Changes to the **Core Logic** (`code.ts`, `domParser.ts`) **strictly require** you to close the plugin window and reopen it (`Plugins > Development > HTML to Figma`) for Figma to load the new `code.js` bundle.

---

## How to Use

1. Open the **Figma Desktop App** and open any design file.
2. Right-click on the canvas and navigate to **Plugins > Development > Import plugin from manifest...**
3. Select the `manifest.json` file located in the root directory of this project.
4. Once the plugin UI opens, paste your HTML and inline CSS into the text area. 

### Usage Example

Paste the following code into the plugin:
```html
<div style="display: flex; flex-direction: column; gap: 16px; padding: 32px; background-color: #18a0fb; border-radius: 12px;">
  <h1 style="color: white; font-family: Inter; font-size: 24px; font-weight: bold;">Hello Figma!</h1>
  <p style="color: #e0e0e0; font-family: Inter; font-size: 14px;">This was generated directly from HTML code.</p>
</div>
```
Click **Import to Canvas**, and the plugin will magically generate a Figma Frame with Vertical Auto Layout, correct padding, gap, and text nodes!

---

## Known Limitations

Translating web DOM to Figma is highly complex. Currently, the plugin excels at Flexbox and basic styling, but has a few limitations:
- **CSS Grid**: Not currently supported (mapped to standard Auto Layout frames).
- **Complex Pseudo-elements**: `::before` and `::after` are ignored.
- **Images/SVG**: `<img>` tags and inline `<svg>` are currently skipped and need manual insertion.

---

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the ISC License. See `package.json` for more information.
