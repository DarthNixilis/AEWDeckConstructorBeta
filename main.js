// main.js
import { loadGameData } from './data-loader.js';

// Wait until the entire HTML document is loaded and ready before starting the app.
document.addEventListener('DOMContentLoaded', () => {
    loadGameData();
});

