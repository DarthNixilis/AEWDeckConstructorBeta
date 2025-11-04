// data-loader.js
import { setCardDatabase, setKeywordDatabase } from './state.js';
import { initializeApp } from './app-init.js';

/**
 * Parses Tab-Separated Value (TSV) text into an array of objects.
 * It assumes the first line is a tab-separated header row.
 * @param {string} text The raw TSV text content from the file.
 * @returns {Array<Object>} An array of JavaScript objects.
 */
function parseTSV(text) {
    const lines = text.trim().replace(/"/g, '').split(/\r?\n/); // Remove all quotes and split by lines
    if (lines.length < 2) return [];

    // --- THIS IS THE CORE FIX ---
    // Split the header row by TABS, not commas.
    const headers = lines[0].split('\t').map(h => h.trim());
    // --- END OF CORE FIX ---
    
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Skip empty lines

        // --- THIS IS THE CORE FIX ---
        // Split each data row by TABS, not commas.
        const values = lines[i].split('\t').map(v => v.trim());
        // --- END OF CORE FIX ---

        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            const key = headers[j];
            let value = values[j];

            // Auto-convert numbers and booleans
            if (key !== 'title' && key !== 'text' && !isNaN(value) && value.trim() !== '') {
                value = Number(value);
            } else if (value === 'TRUE') {
                value = true;
            } else if (value === 'FALSE') {
                value = false;
            } else if (key === 'traits' || key === 'keywords') {
                // Handle pipe-separated values within a field
                value = value ? value.split('|').map(t => t.trim()).filter(t => t) : [];
            }
            
            obj[key] = value;
        }
        data.push(obj);
    }
    return data;
}

export async function loadGameData() {
    try {
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch('./cardDatabase.txt'),
            fetch('./Keywords.txt')
        ]);

        if (!cardResponse.ok) throw new Error(`Failed to load cardDatabase.txt: ${cardResponse.statusText}`);
        if (!keywordResponse.ok) throw new Error(`Failed to load Keywords.txt: ${keywordResponse.statusText}`);

        const cardText = await cardResponse.text();
        const keywordText = await keywordResponse.text();

        // Use the correct TSV parser
        const cardData = parseTSV(cardText);
        const keywordData = parseTSV(keywordText); // Assuming Keywords.txt is also TSV

        if (!Array.isArray(cardData) || cardData.length === 0) {
            throw new Error("Parsing cardDatabase.txt resulted in empty or invalid data. Check if it's a valid TSV file.");
        }

        setCardDatabase(cardData);
        
        // Convert the keyword array into a lookup object
        const keywordObject = keywordData.reduce((acc, kw) => {
            if (kw.Keyword) { // Use the header name from your Keywords.txt file
                acc[kw.Keyword] = kw.Description;
            }
            return acc;
        }, {});
        setKeywordDatabase(keywordObject);

        // Defer app initialization until the DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        }

    } catch (error) {
        console.error('CRITICAL ERROR in loadGameData:', error);
        document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif;">
            <h2>Application Failed to Load</h2>
            <p>There was a critical error processing the data from <strong>cardDatabase.txt</strong> or <strong>Keywords.txt</strong>.</p>
            <p><strong>Error details:</strong> ${error.message}</p>
            <p>Please check the browser's developer console (F12) for more information.</p>
        </div>`;
    }
}

