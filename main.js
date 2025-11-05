// main.js
import { showFatalError } from './utils.js';
import './debug-manager.js';

// This is the very first code that should run.
async function startApp() {
    try {
        debug.log('main.js has started.');
        
        // --- CACHE BUSTING FIX ---
        // We add `?v=${Date.now()}` to the import path.
        // This forces the browser to download a fresh copy of the file.
        debug.log('Attempting to import data-loader.js...');
        const { loadGameData } = await import(`./data-loader.js?v=${Date.now()}`);
        debug.log('Successfully imported data-loader.js.');

        debug.log('Attempting to load game data...');
        await loadGameData();
        debug.log('Game data loading process finished.');

    } catch (error) {
        debug.error('A FATAL ERROR OCCURRED in main.js', error);
        showFatalError(error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug')) {
        localStorage.setItem('aewDebug', 'true');
    }
    startApp();
});

