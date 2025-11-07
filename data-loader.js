// data-loader.js

import * as state from './config.js';
import { initializeApp } from './app-init.js';

// --- DYNAMIC PATH DETECTION ---
function getBasePath() {
    const path = window.location.pathname;
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    if (isGitHubPages) {
        // For URLs like "username.github.io/RepoName/"
        const segments = path.split('/').filter(Boolean);
        if (segments.length > 0) {
            return `/${segments[0]}/`;
        }
    }
    // Fallback for root deployment or local server
    return '/';
}

// --- ROBUST TSV PARSER ---
function parseTSV(text) {
    if (typeof text !== 'string' || !text) {
        console.error('parseTSV Error: Input is not a valid string.');
        return [];
    }

    // Standardize line endings and remove BOM
    let cleanText = text.replace(/\r/g, '').replace(/^\uFEFF/, '');
    const lines = cleanText.trim().split('\n');
    
    if (lines.length < 2) {
        console.error('parseTSV Error: Not enough lines for header and data.');
        return [];
    }

    const headerLine = lines.shift().trim();
    const headers = headerLine.split('\t').map(h => h.trim());
    
    return lines.map(line => {
        if (!line.trim()) return null; // Skip empty lines

        const values = line.split('\t');
        const card = {};

        headers.forEach((header, index) => {
            let value = (values[index] || '').trim();

            // Normalize "N/a", "null", or empty strings to actual null
            if (value.toLowerCase() === 'n/a' || value.toLowerCase() === 'null' || value === '') {
                card[header] = null;
            } else if (!isNaN(value) && value !== '') {
                card[header] = Number(value);
            } else {
                card[header] = value;
            }
        });

        // --- Map TSV headers to the required card object properties ---
        card.title = card['Card Name'];
        card.card_type = card['Type'];
        card.cost = card['Cost'];
        card.damage = card['Damage'];
        card.momentum = card['Momentum'];
        
        // Initialize text_box object
        card.text_box = {
            raw_text: card['Card Raw Game Text'] || '',
            keywords: [],
            traits: []
        };

        // Parse Keywords
        if (card.Keywords) {
            card.text_box.keywords = card.Keywords.split(',').map(name => ({ name: name.trim() })).filter(k => k.name);
        }

        // Parse Traits
        if (card.Traits) {
            card.text_box.traits = card.Traits.split(',').map(traitStr => {
                const [name, value] = traitStr.split(':');
                return { name: name.trim(), value: value ? value.trim() : undefined };
            }).filter(t => t.name);
        }
        
        return card;

    }).filter(card => card && card.title); // Filter out any null or invalid entries
}


export async function loadGameData() {
    const searchResults = document.getElementById('searchResults');
    try {
        searchResults.innerHTML = '<p>Loading card data...</p>';

        const basePath = getBasePath();
        const cacheBuster = `?v=${new Date().getTime()}`;
        const cardDbUrl = `${basePath}cardDatabase.txt${cacheBuster}`;
        const keywordsUrl = `${basePath}keywords.txt${cacheBuster}`;

        console.log(`Attempting to load data from base path: ${basePath}`);

        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(cardDbUrl),
            fetch(keywordsUrl)
        ]);

        if (!cardResponse.ok) throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);
        
        const tsvData = await cardResponse.text();
        if (!tsvData) throw new Error('cardDatabase.txt is empty.');

        const parsedCards = parseTSV(tsvData);
        if (parsedCards.length === 0) {
            throw new Error('Failed to parse any cards from cardDatabase.txt. Check file format.');
        }
        state.setCardDatabase(parsedCards);
        console.log(`Successfully parsed ${parsedCards.length} cards.`);

        if (keywordResponse.ok) {
            const keywordText = await keywordResponse.text();
            const parsedKeywords = {};
            const keywordLines = keywordText.trim().split(/\r?\n/);
            keywordLines.forEach(line => {
                if (line.trim() === '') return;
                const parts = line.split(':');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    parsedKeywords[key] = value;
                }
            });
            state.setKeywordDatabase(parsedKeywords);
            console.log(`Successfully loaded ${Object.keys(parsedKeywords).length} keywords.`);
        } else {
            console.warn(`Could not load keywords.txt (Status: ${keywordResponse.status}). Keyword definitions will be missing.`);
        }
        
        state.buildCardTitleCache();
        return true; // Signal success

    } catch (error) {
        console.error("Fatal Error during data load:", error);
        searchResults.innerHTML = `<div style="color: red; padding: 20px; text-align: center;"><strong>FATAL ERROR:</strong> ${error.message}<br><br>Please ensure the 'cardDatabase.txt' and 'keywords.txt' files are in the correct folder and are formatted correctly.<br><br><button onclick="location.reload()">Retry</button></div>`;
        return false; // Signal failure
    }
}

