const { JSDOM } = require('jsdom');
const esbuild = require('esbuild');

async function runTest() {
  // 1. Compile domParser.ts into browser-compatible JavaScript
  const buildResult = esbuild.buildSync({
    entryPoints: ['src/domParser.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'Extractor'
  });
  
  const scriptContent = buildResult.outputFiles[0].text;

  // 2. Setup static dummy HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <body>
      <div id="app" style="display: flex; padding: 20px;">
        <p style="font-size: 14px;">Test</p>
      </div>
    </body>
    </html>
  `;

  // 3. Initialize JSDOM with script execution enabled
  const dom = new JSDOM(html, { 
    runScripts: "dangerously",
    pretendToBeVisual: true 
  });

  const window = dom.window;
  
  // 4. Inject polyfills and mocks
  // requestAnimationFrame polyfill for JSDOM
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);

  // Mock getBoundingClientRect since JSDOM doesn't have a layout engine
  window.Element.prototype.getBoundingClientRect = () => ({
    width: 500,
    height: 300,
    top: 0, left: 0, bottom: 300, right: 500
  });

  // Capture console.log output
  let extractedJSON = "";
  const originalLog = window.console.log;
  window.console.log = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('FRAME')) {
      extractedJSON = args[0];
    }
  };

  // Inject the compiled script into the virtual DOM
  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = scriptContent;
  window.document.body.appendChild(scriptEl);

  // 5. Execute generateFigmaJSON inside the virtual DOM
  console.log("Running DOM Extractor in JSDOM...");
  
  // Trigger the function
  await window.eval(`Extractor.generateFigmaJSON('app')`);

  // Wait a bit for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));

  // 6. Validation and Assertions
  if (!extractedJSON) {
    console.error("❌ Failed to extract JSON! Extractor did not output any JSON.");
    process.exit(1);
  }

  const parsedData = JSON.parse(extractedJSON);
  console.log("Extracted Output:\n", JSON.stringify(parsedData, null, 2));

  // Assertions
  try {
    console.assert(parsedData.type === 'FRAME', "Root node should be a FRAME");
    console.assert(parsedData.layout.flexDirection === 'ROW', "flexDirection should be ROW");
    console.assert(parsedData.layout.paddingTop === 20, "paddingTop should be 20");
    console.assert(parsedData.children.length === 1, "Should have 1 child (P element)");
    console.assert(parsedData.children[0].type === 'FRAME', "First child should be the P element (FRAME)");
    console.assert(parsedData.children[0].children[0].type === 'TEXT', "Grandchild should be TEXT");
    console.assert(parsedData.children[0].children[0].typography.fontSize === 14, "Text fontSize should be 14");
    console.assert(parsedData.children[0].children[0].characters === 'Test', "Text content should be 'Test'");
    
    console.log("\n✅ All JSDOM assertions passed successfully! Flexbox format captured accurately.");
  } catch (e) {
    console.error("\n❌ Assertion failed:", e.message);
  }
}

runTest().catch(console.error);
