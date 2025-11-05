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
                return; // Prevent further execution after reload
            }
        }

        if (window.debug) window.debug.log('App bootstrap starting...');
        
        // Corrected Flow: Wait for loadGameData to finish, then call initializeApp.
        loadGameData()
            .then(() => {
                if (window.debug) window.debug.log('Data loaded successfully, initializing app...');
                initializeApp();
            })
            .catch(error => {
                if (window.debug) window.debug.error('A fatal error occurred during bootstrap.', error);
                showFatalError(error);
            });
    });
}

