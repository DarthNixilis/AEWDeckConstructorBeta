// main.js
// This is the very first code that should run.

// --- BAREBONES DEBUGGER ---
// We are not relying on any other file. This is self-contained.
function log(message, isError = false) {
    const entry = document.createElement('p');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    if (isError) {
        entry.style.color = 'red';
        console.error(message);
    } else {
        console.log(message);
    }
    document.body.appendChild(entry);
}

try {
    log('main.js has started.');

    // Try to import the next file in the chain.
    // If this fails, the catch block will execute.
    log('Attempting to import data-loader.js...');
    const { loadGameData } = await import('./data-loader.js');
    log('Successfully imported data-loader.js.');

    log('Attempting to load game data...');
    await loadGameData();
    log('Game data loading process finished.');

} catch (error) {
    log(`A FATAL ERROR OCCURRED: ${error.message}`, true);
    log(error.stack, true);
}

