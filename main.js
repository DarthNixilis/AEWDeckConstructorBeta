// main.js
// --- EMERGENCY DEBUGGING ---
console.log('🚨 MAIN.JS: Starting application...');

// Global error handler to catch any initialization errors
window.addEventListener('error', (event) => {
    console.error('🚨 GLOBAL ERROR:', event.error);
    console.error('🚨 Error at:', event.filename, event.lineno, event.colno);
    document.body.innerHTML = `<div style="padding: 20px; color: red;"><h2>Global Error Caught</h2><p>${event.message}</p><pre>${event.error.stack}</pre></div>`;
});

// Unhandled promise rejection handler (for failed fetches, etc.)
window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
    document.body.innerHTML = `<div style="padding: 20px; color: red;"><h2>Unhandled Promise Rejection</h2><p>${event.reason.message}</p><pre>${event.reason.stack}</pre></div>`;
});
// --- END EMERGENCY DEBUGGING ---

import './debug-manager.js'; // MUST be first to create window.debug
import { bootstrapApp } from './app-bootstrap.js';

console.log('🚨 MAIN.JS: About to call bootstrapApp...');
bootstrapApp();
console.log('🚨 MAIN.JS: bootstrapApp called successfully');

