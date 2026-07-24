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
const tabFile = document.getElementById('tab-file') as HTMLButtonElement;
const tabUrl = document.getElementById('tab-url') as HTMLButtonElement;
const areaCode = document.getElementById('area-code') as HTMLDivElement;
const areaFile = document.getElementById('area-file') as HTMLDivElement;
const areaUrl = document.getElementById('area-url') as HTMLDivElement;

const dropzone = document.getElementById('dropzone') as HTMLDivElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const fileStatus = document.getElementById('file-status') as HTMLParagraphElement;

let currentMode: 'code' | 'url' | 'file' = 'code';
let uploadedFiles: { name: string, html: string }[] = [];

// Setup Tabs
function resetTabs() {
  const activeClass = 'flex-1 py-1 text-[11px] font-medium rounded bg-figma-bg text-white shadow-sm transition-colors duration-200 focus:outline-none';
  const inactiveClass = 'flex-1 py-1 text-[11px] font-medium rounded text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none';
  
  tabCode.className = currentMode === 'code' ? activeClass : inactiveClass;
  tabFile.className = currentMode === 'file' ? activeClass : inactiveClass;
  tabUrl.className = currentMode === 'url' ? activeClass : inactiveClass;

  areaCode.classList.toggle('hidden', currentMode !== 'code');
  areaFile.classList.toggle('hidden', currentMode !== 'file');
  areaUrl.classList.toggle('hidden', currentMode !== 'url');
}

tabCode.onclick = () => {
  currentMode = 'code';
  resetTabs();
};

tabFile.onclick = () => {
  currentMode = 'file';
  resetTabs();
};

tabUrl.onclick = () => {
  currentMode = 'url';
  resetTabs();
};

// Setup Drag and Drop
dropzone.addEventListener('click', () => {
  fileInput.click();
});

function handleFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList).filter(f => f.name.endsWith('.html') || f.name.endsWith('.htm') || f.type === 'text/html');
  
  if (files.length === 0) {
    fileStatus.textContent = 'Invalid file type. Please upload .html files.';
    fileStatus.classList.remove('hidden');
    return;
  }

  uploadedFiles = [];
  let filesRead = 0;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedFiles.push({
        name: file.name,
        html: e.target?.result as string
      });
      filesRead++;
      
      if (filesRead === files.length) {
        fileStatus.textContent = `Loaded: ${files.length} file(s)`;
        fileStatus.classList.remove('hidden');
      }
    };
    reader.readAsText(file);
  });
}

fileInput.addEventListener('change', (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (files && files.length > 0) handleFiles(files);
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('border-figma-blue', 'bg-figma-surface/80');
});

dropzone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropzone.classList.remove('border-figma-blue', 'bg-figma-surface/80');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('border-figma-blue', 'bg-figma-surface/80');
  
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) handleFiles(files);
});

// 2. Setup event listener for the Import button
if (btnImport) {
  btnImport.onclick = async () => {
    try {
      let htmlData = '';

      btnImportText.textContent = 'Processing...';
      btnImportSpinner.classList.remove('hidden');
      btnImport.disabled = true;

      const enforceAutoLayout = useAutoLayout.checked;

      // Helper to process a single HTML string
      const processHtml = async (html: string, index: number, isBatch: boolean = false) => {
        btnImportText.textContent = `Rendering${isBatch ? ` (${index + 1}/${uploadedFiles.length})` : ''}...`;

        const frameDoc = renderFrame.contentDocument || renderFrame.contentWindow?.document;
        if (!frameDoc) throw new Error('Could not access iframe document');

        frameDoc.open();
        frameDoc.write(html);
        frameDoc.write(`
          <style>
            *, *::before, *::after {
              animation: none !important;
              animation-delay: 0s !important;
              transition: none !important;
              transform: none !important;
              visibility: visible !important;
            }
          </style>
        `);
        frameDoc.close();

        await new Promise((resolve) => setTimeout(resolve, 600));

        const allElements = frameDoc.querySelectorAll('*');
        allElements.forEach((el: Element) => {
          const computedOpacity = parseFloat(frameDoc.defaultView!.getComputedStyle(el).opacity);
          if (computedOpacity === 0) {
            (el as HTMLElement).style.setProperty('opacity', '1', 'important');
          }
        });

        const figmaNodeData = await generateFigmaJSON(frameDoc.body);
        if (!figmaNodeData) throw new Error('Failed to parse DOM');

        btnImportText.textContent = `Processing Images${isBatch ? ` (${index + 1}/${uploadedFiles.length})` : ''}...`;
        const fetchImages = async (node: any) => {
          if (node.imageUrls && node.imageUrls.length > 0) {
            node.imageFills = [];
            for (const url of node.imageUrls) {
              try {
                let res = await fetch(url).catch(() => null);
                if (!res || !res.ok) {
                  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                  res = await fetch(proxyUrl).catch(() => null);
                }
                if (res && res.ok) {
                  const buffer = await res.arrayBuffer();
                  node.imageFills.push(new Uint8Array(buffer));
                }
              } catch (e) {
                console.warn('Failed to fetch image:', url, e);
              }
            }
          }
          if (node.children) {
            await Promise.all(node.children.map((child: any) => fetchImages(child)));
          }
        };

        await fetchImages(figmaNodeData);
        
        // Return parsed data
        return figmaNodeData;
      };

      let nodesToImport = [];

      if (currentMode === 'url') {
        const url = urlInput.value.trim();
        if (!url) throw new Error('Please enter a valid URL');
        btnImportText.textContent = 'Fetching URL...';
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        let response = await fetch(proxyUrl).catch(() => null);
        if (!response || !response.ok) throw new Error('Failed to fetch URL. It might be blocking proxies.');
        let jsonResponse = await response.json().catch(() => null);
        if (!jsonResponse || !jsonResponse.contents) throw new Error('Invalid response from proxy.');
        let htmlData = jsonResponse.contents;
        const baseTag = `<base href="${url}">`;
        htmlData = htmlData.includes('<head>') ? htmlData.replace('<head>', `<head>${baseTag}`) : `${baseTag}${htmlData}`;
        const nodeData = await processHtml(htmlData, 0);
        nodesToImport.push(nodeData);
      } else if (currentMode === 'file') {
        if (!uploadedFiles || uploadedFiles.length === 0) throw new Error('Please upload HTML files first.');
        for (let i = 0; i < uploadedFiles.length; i++) {
          const nodeData = await processHtml(uploadedFiles[i].html, i, true);
          nodesToImport.push(nodeData);
        }
      } else {
        const htmlData = htmlInput.value;
        if (!htmlData.trim()) throw new Error('Please enter some HTML code');
        const nodeData = await processHtml(htmlData, 0);
        nodesToImport.push(nodeData);
      }

      btnImportText.textContent = 'Drawing in Figma...';
      parent.postMessage(
        {
          pluginMessage: {
            type: 'import-json',
            data: nodesToImport, // Sending array of nodes
            autoLayout: enforceAutoLayout,
          },
        },
        '*',
      );
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);

      // Only reset UI if there was an error in ui.ts
      btnImportText.textContent = 'Import to Canvas';
      btnImportSpinner.classList.add('hidden');
      btnImport.disabled = false;
    }
  };
}

// 4. Setup message listener from Figma sandbox to UI
window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === 'import-done' || msg.type === 'import-error') {
    if (btnImport && btnImportText && btnImportSpinner) {
      btnImportText.textContent = 'Import to Canvas';
      btnImportSpinner.classList.add('hidden');
      btnImport.disabled = false;
    }
  }
};

// 3. Setup event listener for the Cancel button
if (btnCancel) {
  btnCancel.onclick = () => {
    // Send a cancellation signal to the Figma Sandbox
    parent.postMessage(
      {
        pluginMessage: {
          type: 'cancel',
        },
      },
      '*',
    );
  };
}

// 4. Setup event listener for the Auto Test Render button
const btnTest = document.getElementById('btn-test') as HTMLButtonElement;
if (btnTest) {
  btnTest.onclick = () => {
    htmlInput.value =
      '<div style="display: flex; gap: 20px; padding: 40px; background-color: #18a0fb; color: white; font-family: Inter, sans-serif; font-size: 24px; font-weight: bold; border-radius: 8px;">\n  <div>Auto Test</div>\n  <div>Render</div>\n</div>';
  };
}
