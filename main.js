// main.js
import { loadGameData } from './data-loader.js';
import { showFatalError } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    loadGameData().catch(showFatalError);
});

