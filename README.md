# HTML to Figma

This project provides a complete infrastructure for converting web-based DOM structures into Figma-compatible node hierarchies. It consists of a Figma Plugin frontend (TypeScript and Vite) and a robust backend microservice written in pure Golang.

## Architecture Overview

The system is divided into two primary components:

1. **Figma Plugin (Frontend)**
   - **User Interface**: Built with Tailwind CSS, featuring a modern, minimal dark mode developer interface.
   - **DOM Parser (`src/domParser.ts`)**: A strict JavaScript engine that recursively traverses the DOM tree, extracts absolute dimensions, computes CSS Flexbox rules, and filters out invisible elements.
   - **Sandbox API (`src/code.ts`)**: Generates Figma native UI elements (Frames and Texts), applies Auto Layout rules, and manages asynchronous font loading.

2. **Golang Microservice (Backend)**
   - **Translation Engine (`backend/main.go`)**: A pure Golang `net/http` microservice that receives raw JSON from the frontend parser.
   - **Data Structures**: Utilizes efficient pointer-based structs to manage deep recursive DOM trees without memory leaks.
   - **Logic Mapping**: Translates CSS Flexbox rules (such as `flex-direction`, `justify-content`, and `align-items`) into strict Figma Auto Layout parameters (`layoutMode`, `primaryAxisAlignItems`, etc.).

## Prerequisites

- Node.js (version 14 or higher)
- Go (version 1.20 or higher)
- Figma Desktop App

## Getting Started

### 1. Starting the Go Microservice

Navigate to the backend directory and run the server:

```bash
cd backend
go run main.go
```
The microservice will start on port `8080` and expose the `/parse-layout` endpoint.

### 2. Building the Figma Plugin

Open a new terminal at the root of the project.

Install dependencies:
```bash
npm install
```

Start the development environment (which automatically rebuilds on file changes):
```bash
npm run dev
```
Alternatively, build for production:
```bash
npm run build
```
The output will be bundled inside the `dist/` directory.

## Importing into Figma

1. Open the Figma Desktop App.
2. Open any design file.
3. Right-click on the canvas, navigate to **Plugins** -> **Development** -> **Import plugin from manifest...**.
4. Select the `manifest.json` file located in the root directory.
5. The plugin interface will appear, ready to accept JSON payloads for conversion.

## Project Structure

- `backend/main.go`: The pure Go microservice handling spatial translation and recursion depth safety.
- `manifest.json`: Configuration file for the Figma plugin.
- `vite.config.ts`: Build configuration ensuring the UI and sandbox are compiled correctly.
- `src/domParser.ts`: The DOM traversal and CSS extraction engine.
- `src/types.ts`: Strict TypeScript interfaces for the node structures.
- `src/code.ts`: Figma sandbox logic.
- `src/ui.html`: The markup for the plugin's UI utilizing Tailwind CSS.
- `src/ui.ts`: UI logic that handles user input and dispatches messages to the Figma API.
- `dist/`: The final bundled folder for Figma.
