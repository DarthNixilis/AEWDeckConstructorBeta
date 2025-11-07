// main.js

// Import the module loader first.
import { loadAllModules } from './module-loader.js';

async function bootstrap() {
    try {
        // Use the loader to get all other modules.
        // This guarantees they are the latest versions.
        const modules = await loadAllModules();

        await modules.dataLoader.loadGameData();
        modules.appInit.initializeApp();

        const isDevMode = true;
        if (isDevMode) {
            modules.devTools.initializeDevTools();
        }

    } catch (error) {
        console.error("A fatal error occurred during application bootstrap:", error);
        // Use the showFatalError function from the loaded utils module
        // We need to ensure utils is loaded before we can use it.
        const utils = (await import('./utils.js'));
        utils.showFatalError(error.message);
    }
}

bootstrap();

