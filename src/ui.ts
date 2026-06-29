import './ui.css';
import { generateFigmaJSON } from './domParser';

// 1. Get references to DOM elements with proper TypeScript casting
const htmlInput = document.getElementById('html-input') as HTMLTextAreaElement;
const urlInput = document.getElementById('url-input') as HTMLInputElement;
const useAutoLayout = document.getElementById('use-autolayout') as HTMLInputElement;
const btnImport = document.getElementById('btn-import') as HTMLButtonElement;
const btnImportText = document.getElementById('btn-import-text') as HTMLSpanElement;
const btnImportSpinner = document.getElementById('btn-import-spinner') as HTMLElement;
const btnCancel = document.getElementById('btn-cancel') as HTMLButtonElement;
const renderFrame = document.getElementById('render-frame') as HTMLIFrameElement;

const tabCode = document.getElementById('tab-code') as HTMLButtonElement;
const tabUrl = document.getElementById('tab-url') as HTMLButtonElement;
const areaCode = document.getElementById('area-code') as HTMLDivElement;
const areaUrl = document.getElementById('area-url') as HTMLDivElement;

let currentMode: 'code' | 'url' = 'code';

// Setup Tabs
tabCode.onclick = () => {
  currentMode = 'code';
  tabCode.className = 'flex-1 py-1 text-[11px] font-medium rounded bg-figma-bg text-white shadow-sm transition-colors duration-200 focus:outline-none';
  tabUrl.className = 'flex-1 py-1 text-[11px] font-medium rounded text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none';
  areaCode.classList.remove('hidden');
  areaUrl.classList.add('hidden');
};

tabUrl.onclick = () => {
  currentMode = 'url';
  tabUrl.className = 'flex-1 py-1 text-[11px] font-medium rounded bg-figma-bg text-white shadow-sm transition-colors duration-200 focus:outline-none';
  tabCode.className = 'flex-1 py-1 text-[11px] font-medium rounded text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none';
  areaUrl.classList.remove('hidden');
  areaCode.classList.add('hidden');
};

// 2. Setup event listener for the Import button
if (btnImport) {
  btnImport.onclick = async () => {
    try {
      let htmlData = '';
      
      btnImportText.textContent = 'Processing...';
      btnImportSpinner.classList.remove('hidden');
      btnImport.disabled = true;

      if (currentMode === 'url') {
        const url = urlInput.value.trim();
        if (!url) {
          throw new Error("Please enter a valid URL");
        }
        
        btnImportText.textContent = 'Fetching URL...';
        
        // Use allorigins CORS proxy to fetch the HTML (using JSON endpoint to guarantee CORS bypass)
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        let response;
        try {
          response = await fetch(proxyUrl);
        } catch (e) {
          throw new Error("Network error: The website might be actively blocking our proxy (Bot Protection). Please use the 'Paste Code' method instead for this website.");
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch URL (Status: ${response.status}). The website might be blocking proxies.`);
        }
        
        let jsonResponse;
        try {
          jsonResponse = await response.json();
        } catch (e) {
          throw new Error("Invalid response from proxy. The website might be blocking proxies. Please use the 'Paste Code' method.");
        }
        
        htmlData = jsonResponse.contents;
        
        if (!htmlData) {
          throw new Error("Received empty content from proxy.");
        }
        
        // Inject <base> tag to resolve relative paths (images, CSS) to the target URL
        const baseTag = `<base href="${url}">`;
        if (htmlData.includes('<head>')) {
          htmlData = htmlData.replace('<head>', `<head>${baseTag}`);
        } else {
          htmlData = `${baseTag}${htmlData}`;
        }
      } else {
        // 1. Get HTML from input
        htmlData = htmlInput.value;
        if (!htmlData.trim()) {
          throw new Error("Please enter some HTML code");
        }
      }

      const enforceAutoLayout = useAutoLayout.checked;
      
      btnImportText.textContent = 'Rendering...';

      // 2. Inject HTML into hidden iframe
      const frameDoc = renderFrame.contentDocument || renderFrame.contentWindow?.document;
      if (!frameDoc) throw new Error("Could not access iframe document");

      frameDoc.open();
      frameDoc.write(htmlData);
      
      // Inject CSS to disable animations and force elements to their final visual state
      frameDoc.write(`
        <style>
          * {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        </style>
      `);
      
      frameDoc.close();

      // Wait for browser to load external CSS (like Google Fonts) and calculate styles
      await new Promise(resolve => setTimeout(resolve, 600));

      // 3. Extract JSON using domParser
      const figmaNodeData = await generateFigmaJSON(frameDoc.body);
      if (!figmaNodeData) throw new Error("Failed to parse DOM");

      // 4. Fetch images and attach as Uint8Array
      btnImportText.textContent = 'Processing Images...';
      const fetchImages = async (node: any) => {
        if (node.imageUrls && node.imageUrls.length > 0) {
          node.imageFills = [];
          for (const url of node.imageUrls) {
            try {
              // Note: Using corsproxy or direct fetch if same origin
              // We'll try fetching directly first, if it fails, fallback to cors proxy
              let res = await fetch(url).catch(() => null);
              if (!res || !res.ok) {
                 // Try via corsproxy
                 const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                 res = await fetch(proxyUrl).catch(() => null);
              }
              if (res && res.ok) {
                const buffer = await res.arrayBuffer();
                node.imageFills.push(new Uint8Array(buffer));
              }
            } catch (e) {
              console.warn("Failed to fetch image:", url, e);
            }
          }
        }
        if (node.children) {
          await Promise.all(node.children.map((child: any) => fetchImages(child)));
        }
      };
      
      await fetchImages(figmaNodeData);

      // 5. Send directly to Figma Sandbox (Structured Clone handles Uint8Array automatically)
      parent.postMessage({
        pluginMessage: {
          type: 'import-json',
          data: figmaNodeData, // Sending raw object instead of JSON string
          autoLayout: enforceAutoLayout
        }
      }, '*');

    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      btnImportText.textContent = 'Import to Canvas';
      btnImportSpinner.classList.add('hidden');
      btnImport.disabled = false;
    }
  };
}

// 3. Setup event listener for the Cancel button
if (btnCancel) {
  btnCancel.onclick = () => {
    // Send a cancellation signal to the Figma Sandbox
    parent.postMessage({
      pluginMessage: {
        type: 'cancel'
      }
    }, '*');
  };
}

// 4. Setup event listener for the Auto Test Render button
const btnTest = document.getElementById('btn-test') as HTMLButtonElement;
if (btnTest) {
  btnTest.onclick = () => {
    htmlInput.value = '<div style="display: flex; gap: 20px; padding: 40px; background-color: #18a0fb; color: white; font-family: Inter, sans-serif; font-size: 24px; font-weight: bold; border-radius: 8px;">\n  <div>Auto Test</div>\n  <div>Render</div>\n</div>';
  };
}
