import './ui.css';
import { generateFigmaJSON } from './domParser';

// 1. Get references to DOM elements with proper TypeScript casting
const htmlInput = document.getElementById('html-input') as HTMLTextAreaElement;
const useAutoLayout = document.getElementById('use-autolayout') as HTMLInputElement;
const btnImport = document.getElementById('btn-import') as HTMLButtonElement;
const btnCancel = document.getElementById('btn-cancel') as HTMLButtonElement;
const renderFrame = document.getElementById('render-frame') as HTMLIFrameElement;

// 2. Setup event listener for the Import button
if (btnImport) {
  btnImport.onclick = async () => {
    try {
      // 1. Get HTML from input
      const htmlData = htmlInput.value;
      if (!htmlData.trim()) return;

      const enforceAutoLayout = useAutoLayout.checked;
      
      btnImport.textContent = 'Processing...';
      btnImport.disabled = true;

      // 2. Inject HTML into hidden iframe
      const frameDoc = renderFrame.contentDocument || renderFrame.contentWindow?.document;
      if (!frameDoc) throw new Error("Could not access iframe document");

      frameDoc.open();
      frameDoc.write(htmlData);
      frameDoc.close();

      // Wait a bit for browser to calculate styles
      await new Promise(resolve => setTimeout(resolve, 150));

      // 3. Extract JSON using domParser
      const figmaNodeData = await generateFigmaJSON(frameDoc.body);
      if (!figmaNodeData) throw new Error("Failed to parse DOM");

      // 4. Send directly to Figma Sandbox
      parent.postMessage({
        pluginMessage: {
          type: 'import-json',
          data: JSON.stringify(figmaNodeData),
          autoLayout: enforceAutoLayout
        }
      }, '*');

    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      btnImport.textContent = 'Import to Canvas';
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
