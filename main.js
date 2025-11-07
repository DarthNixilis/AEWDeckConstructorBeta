// main.js
import { loadGameData } from './data-loader.js';
import { initializeApp } from './app-init.js';
import { initializeDevTools } from './dev-tools.js';
import { showFatalError } from './utils.js';

async function bootstrap() {
    try {
        await loadGameData();
        initializeApp();

        // For testing, we will always initialize the dev tools.
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

