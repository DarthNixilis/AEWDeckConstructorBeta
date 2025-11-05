// main.js
import { showFatalError } from './utils.js';
import './debug-manager.js'; // This just initializes the debug system

// --- THE FINAL FIX: Wait for the DOM to be ready ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Now that the DOM is ready, we can safely import the rest of the app.
        const { loadGameData } = await import(`./data-loader.js?v=${Date.now()}`);
        
        // And now we can safely run it.
        await loadGameData();

    } catch (error) {
        // If anything fails during the load, show the fatal error screen.
        showFatalError(error);
    }
});

