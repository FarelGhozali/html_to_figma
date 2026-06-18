import './ui.css';

// 1. Get references to DOM elements with proper TypeScript casting
const jsonInput = document.getElementById('json-input') as HTMLTextAreaElement;
const useAutoLayout = document.getElementById('use-autolayout') as HTMLInputElement;
const btnImport = document.getElementById('btn-import') as HTMLButtonElement;
const btnCancel = document.getElementById('btn-cancel') as HTMLButtonElement;

// 2. Setup event listener for the Import button
if (btnImport) {
  btnImport.onclick = () => {
    // Extract the raw JSON string from the textarea
    const jsonData = jsonInput.value;
    
    // Extract the boolean state of the checkbox
    const enforceAutoLayout = useAutoLayout.checked;

    // Send the structured payload to the Figma Sandbox (code.ts)
    parent.postMessage({
      pluginMessage: {
        type: 'import-json',
        data: jsonData,
        autoLayout: enforceAutoLayout
      }
    }, '*');
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
