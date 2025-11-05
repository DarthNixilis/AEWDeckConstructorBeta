// app-bootstrap.js
import { initializeApp } from './app-init.js';
import { loadGameData } from './data-loader.js';
import { showFatalError } from './utils.js';

export function bootstrapApp() {
    document.addEventListener('DOMContentLoaded', () => {
        // Debug mode initialization
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('debug')) {
            localStorage.setItem('aewDebug', 'true');
            if (window.debug && !window.debug.isEnabled) {
                location.reload();
            }
        }

        if (window.debug) window.debug.log('App bootstrap starting...');
        
        // Load data first, then initialize the app with that data.
        loadGameData()
            .then(initializeApp) // Pass the result of loadGameData to initializeApp
            .catch(error => {
                if (window.debug) window.debug.error('A fatal error occurred during bootstrap.', error);
                showFatalError(error);
            });
    });
}
