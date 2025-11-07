// main.js
import { loadGameData } from './data-loader.js';
import { initializeApp } from './app-init.js';
import { initializeDevTools } from './dev-tools.js';
import { showFatalError } from './utils.js';

// --- Main Application Bootstrap ---
async function bootstrap() {
    try {
        await loadGameData();
        initializeApp();

        // Check for a "dev mode" flag before initializing dev tools
        // For now, we can assume it's always on for testing.
        const isDevMode = true; 
        if (isDevMode) {
            initializeDevTools();
        }

    } catch (error) {
        console.error("A fatal error occurred during application bootstrap:", error);
        showFatalError(error.message);
    }
}

bootstrap();

