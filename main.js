// main.js

// --- THIS IS THE FINAL FIX ---
// Import and initialize the debug manager FIRST.
// This ensures the global `window.debug` object exists before any other module can try to use it.
import './debug-manager.js';
// --- END OF FIX ---

import { loadGameData } from './data-loader.js';
import { showFatalError } from './utils.js';

// Now that the debugger is guaranteed to exist, we can safely add the DOMContentLoaded listener.
document.addEventListener('DOMContentLoaded', () => {
    // Debug mode can be enabled via localStorage or URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug')) {
        localStorage.setItem('aewDebug', 'true');
        // If we just enabled it, we need to reload for the debug manager to initialize properly.
        // This check prevents an infinite reload loop.
        if (window.debug && !window.debug.isEnabled) {
            location.reload();
        }
    }

    if (window.debug) window.debug.log('main.js: DOMContentLoaded event fired.');
    
    loadGameData().catch(error => {
        if (window.debug) window.debug.error('A fatal error occurred during loadGameData.', error);
        showFatalError(error);
    });
});

