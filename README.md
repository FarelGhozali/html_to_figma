# HTML to Figma

This project is a boilerplate and development environment for building a Figma Plugin using TypeScript and Vite. It is designed to handle both the plugin logic (sandbox) and the user interface (iframe) efficiently.

## Architecture

Figma plugins that feature a user interface require all HTML, CSS, and JavaScript to be bundled into a single file, as local external assets are not supported within the Figma iframe. This project solves that by utilizing Vite and esbuild:

- **src/ui.html & src/ui.ts**: The user interface is bundled by Vite. The `vite-plugin-singlefile` extension ensures that all CSS and JavaScript are inlined directly into the final `ui.html` output.
- **src/code.ts**: The main Figma sandbox script is bundled simultaneously using esbuild (which is built into Vite), compiling it down to a single `dist/code.js` file.

## Prerequisites

- Node.js (version 14 or higher is recommended)
- Figma Desktop App

## Getting Started

1. Install the dependencies:
   ```bash
   npm install
   ```

2. Build the plugin:
   To build the project once for production, run:
   ```bash
   npm run build
   ```
   
   To start the development environment that automatically watches for file changes and rebuilds the project, run:
   ```bash
   npm run dev
   ```

   The build output will be generated inside the `dist/` directory.

## Importing into Figma

1. Open the Figma Desktop App.
2. Open any design file.
3. Right-click on the canvas, navigate to **Plugins** -> **Development** -> **Import plugin from manifest...**.
4. Select the `manifest.json` file located in the root directory of this project.
5. The plugin is now ready to use and test within Figma.

## Project Structure

- `manifest.json`: The core configuration file for the Figma plugin.
- `vite.config.ts`: The build configuration for Vite and esbuild.
- `src/code.ts`: The main plugin logic that interacts directly with the Figma API.
- `src/ui.html`: The markup for the plugin's user interface.
- `src/ui.ts`: The interactive logic and scripts for the user interface.
- `src/ui.css`: The styling for the user interface.
- `dist/`: The output folder containing the bundled files ready for Figma.
