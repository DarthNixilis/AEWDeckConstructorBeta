// main.js
import { loadGameData } from './data-loader.js';
import { showFatalError } from './utils.js';
import './debug-manager.js'; // Import to initialize the debug system

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug')) {
        localStorage.setItem('aewDebug', 'true');
    }
    
    loadGameData().catch(showFatalError);
});

