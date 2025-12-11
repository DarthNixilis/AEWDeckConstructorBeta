[file name]: data-loader.js
[file content begin]
// data-loader.js
import * as state from './config.js';
import { initializeApp } from './app-init.js';
import { updateCacheStatus } from './ui.js';

// --- DYNAMIC PATH DETECTION ---
function getBasePath() {
    const path = window.location.pathname;
    // This handles project pages like /RepoName/
    // It finds the first slash after the initial one.
    const secondSlashIndex = path.indexOf('/', 1); 
    if (secondSlashIndex !== -1) {
        // Extracts the repository name part (e.g., "/RepoName/")
        return path.substring(0, secondSlashIndex + 1);
    }
    // Fallback for root deployment (e.g., username.github.io) or local server
    return '/';
}
// --- END DYNAMIC PATH DETECTION ---

// Cache keys
const CARD_DATA_CACHE_KEY = 'aewCardDataCache';
const KEYWORD_DATA_CACHE_KEY = 'aewKeywordDataCache';
const CACHE_VERSION_KEY = 'aewCacheVersion';
const FILE_VERSIONS_KEY = 'aewFileVersions';

// Current cache version - increment this when cache structure changes
const CURRENT_CACHE_VERSION = '2.0';

// How long to cache before checking for updates (in milliseconds)
const CACHE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function getFileHash(url) {
    try {
        // For GitHub Pages, we can't reliably use HEAD requests due to CORS
        // Instead, we'll use a simpler approach with GET and cache busting
        const timestamp = new Date().getTime();
        const response = await fetch(`${url}?v=${timestamp}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        // Use content-length if available, otherwise fallback to timestamp
        const contentLength = response.headers.get('content-length');
        return `${url}|${contentLength || timestamp}`;
    } catch (error) {
        console.warn(`Could not get file info for ${url}:`, error);
        // Fallback: use current timestamp as version
        return `${url}|${new Date().getTime()}`;
    }
}

function saveToCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save to cache:', e);
        // If storage is full, clear old cache and try again
        if (e.name === 'QuotaExceededError') {
            localStorage.clear();
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (e2) {
                console.error('Still failed after clearing cache:', e2);
            }
        }
    }
}

function loadFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        console.warn('Failed to load from cache:', e);
        return null;
    }
}

async function checkFilesChanged(cardDbUrl, keywordsUrl) {
    const currentFileVersions = loadFromCache(FILE_VERSIONS_KEY) || {};
    
    try {
        // Get current file hashes
        const currentCardHash = await getFileHash(cardDbUrl);
        const currentKeywordHash = await getFileHash(keywordsUrl);
        
        // Check if files have changed
        const cardChanged = currentFileVersions.cardDbHash !== currentCardHash;
        const keywordChanged = currentFileVersions.keywordHash !== currentKeywordHash;
        
        // Update stored hashes
        if (cardChanged || keywordChanged) {
            currentFileVersions.cardDbHash = currentCardHash;
            currentFileVersions.keywordHash = currentKeywordHash;
            currentFileVersions.lastCheck = new Date().getTime();
            saveToCache(FILE_VERSIONS_KEY, currentFileVersions);
        }
        
        return { cardChanged, keywordChanged };
    } catch (error) {
        console.warn('Error checking file changes:', error);
        // If we can't check, assume files haven't changed
        return { cardChanged: false, keywordChanged: false };
    }
}

function isCacheValid() {
    const cacheVersion = localStorage.getItem(CACHE_VERSION_KEY);
    
    // Check cache version
    if (cacheVersion !== CURRENT_CACHE_VERSION) {
        console.log(`Cache version mismatch: ${cacheVersion} vs ${CURRENT_CACHE_VERSION}`);
        return false;
    }
    
    // Check if we have the required data
    const cachedCards = loadFromCache(CARD_DATA_CACHE_KEY);
    const cachedKeywords = loadFromCache(KEYWORD_DATA_CACHE_KEY);
    
    if (!cachedCards || !Array.isArray(cachedCards) || cachedCards.length === 0) {
        console.log('No valid card data in cache');
        return false;
    }
    
    if (!cachedKeywords || typeof cachedKeywords !== 'object' || Object.keys(cachedKeywords).length === 0) {
        console.log('No valid keyword data in cache');
        return false;
    }
    
    // Check last update time
    const fileVersions = loadFromCache(FILE_VERSIONS_KEY);
    if (fileVersions && fileVersions.lastCheck) {
        const timeSinceLastCheck = new Date().getTime() - fileVersions.lastCheck;
        if (timeSinceLastCheck > CACHE_CHECK_INTERVAL) {
            console.log(`Cache check interval exceeded (${timeSinceLastCheck}ms > ${CACHE_CHECK_INTERVAL}ms)`);
            return 'needs-check'; // Cache exists but needs to check for updates
        }
    }
    
    return true;
}

export async function loadGameData() {
    const searchResults = document.getElementById('searchResults');
    
    try {
        searchResults.innerHTML = '<p>Loading card data...</p>';
        updateCacheStatus('Loading...');
        
        const basePath = getBasePath();
        // UPDATED: Changed from cardDatabase.txt to CoreSet.txt
        const cardDbUrl = `${basePath}CoreSet.txt`;
        const keywordsUrl = `${basePath}keywords.txt`;
        
        console.log(`Base path: ${basePath}`);
        console.log(`Card DB URL: ${cardDbUrl}`);
        console.log(`Keywords URL: ${keywordsUrl}`);
        
        // Check cache validity
        const cacheValid = isCacheValid();
        
        if (cacheValid === true) {
            // Load from cache immediately
            console.log('Loading from cache...');
            updateCacheStatus('Loading from cache...');
            
            const cachedCards = loadFromCache(CARD_DATA_CACHE_KEY);
            const cachedKeywords = loadFromCache(KEYWORD_DATA_CACHE_KEY);
            
            if (cachedCards && cachedKeywords) {
                state.setCardDatabase(cachedCards);
                state.setKeywordDatabase(cachedKeywords);
                state.buildCardTitleCache();
                
                updateCacheStatus('Loaded from cache ✓');
                
                // Check for updates in background (with longer delay for GitHub Pages)
                setTimeout(async () => {
                    try {
                        updateCacheStatus('Checking for updates...');
                        
                        const { cardChanged, keywordChanged } = await checkFilesChanged(
                            cardDbUrl,
                            keywordsUrl
                        );
                        
                        if (cardChanged || keywordChanged) {
                            console.log('Files changed, fetching updates in background...');
                            updateCacheStatus('Updating cache...');
                            
                            // Re-fetch data silently
                            const updatedCards = await fetchAndParseCards(cardDbUrl);
                            const updatedKeywords = await fetchAndParseKeywords(keywordsUrl);
                            
                            if (updatedCards && updatedKeywords) {
                                // Update cache
                                saveToCache(CARD_DATA_CACHE_KEY, updatedCards);
                                saveToCache(KEYWORD_DATA_CACHE_KEY, updatedKeywords);
                                localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
                                
                                // Update app state
                                state.setCardDatabase(updatedCards);
                                state.setKeywordDatabase(updatedKeywords);
                                state.buildCardTitleCache();
                                
                                console.log('Cache updated in background');
                                updateCacheStatus('Cache updated ✓');
                                
                                // Revert to ready status after a few seconds
                                setTimeout(() => {
                                    updateCacheStatus('Ready');
                                }, 3000);
                            }
                        } else {
                            updateCacheStatus('Ready');
                        }
                    } catch (error) {
                        console.warn('Background cache check failed:', error);
                        updateCacheStatus('Ready');
                    }
                }, 2000); // Wait 2 seconds before background check for GitHub Pages
                
                return true;
            } else {
                console.log('Cache exists but data is invalid, fetching fresh data');
                updateCacheStatus('Cache invalid, fetching data...');
            }
        }
        
        // If cache needs checking or is invalid
        if (cacheValid === 'needs-check') {
            console.log('Checking for file updates...');
            updateCacheStatus('Checking for updates...');
            
            try {
                const { cardChanged, keywordChanged } = await checkFilesChanged(
                    cardDbUrl,
                    keywordsUrl
                );
                
                if (!cardChanged && !keywordChanged) {
                    // Files haven't changed, use cache
                    console.log('Files unchanged, using cache');
                    updateCacheStatus('Loading from cache...');
                    
                    const cachedCards = loadFromCache(CARD_DATA_CACHE_KEY);
                    const cachedKeywords = loadFromCache(KEYWORD_DATA_CACHE_KEY);
                    
                    if (cachedCards && cachedKeywords) {
                        state.setCardDatabase(cachedCards);
                        state.setKeywordDatabase(cachedKeywords);
                        state.buildCardTitleCache();
                        
                        updateCacheStatus('Loaded from cache ✓');
                        
                        setTimeout(() => {
                            updateCacheStatus('Ready');
                        }, 2000);
                        
                        return true;
                    }
                }
                
                console.log('Files changed or cache missing, fetching fresh data');
                updateCacheStatus('Fetching updated data...');
            } catch (error) {
                console.warn('Could not check file changes, using cache if available:', error);
                updateCacheStatus('Using cached data...');
                
                // Try to use cache as fallback
                const cachedCards = loadFromCache(CARD_DATA_CACHE_KEY);
                const cachedKeywords = loadFromCache(KEYWORD_DATA_CACHE_KEY);
                
                if (cachedCards && cachedKeywords) {
                    state.setCardDatabase(cachedCards);
                    state.setKeywordDatabase(cachedKeywords);
                    state.buildCardTitleCache();
                    
                    updateCacheStatus('Using cached data ✓');
                    
                    setTimeout(() => {
                        updateCacheStatus('Ready');
                    }, 2000);
                    
                    return true;
                }
                
                updateCacheStatus('Fetching data...');
            }
        } else {
            console.log('Cache invalid or missing, fetching fresh data');
            updateCacheStatus('Fetching data...');
        }
        
        // Fetch and parse fresh data with GitHub Pages-friendly approach
        const [parsedCards, parsedKeywords] = await Promise.all([
            fetchAndParseCards(cardDbUrl),
            fetchAndParseKeywords(keywordsUrl)
        ]);
        
        if (!parsedCards || !parsedKeywords) {
            throw new Error('Failed to parse data files');
        }
        
        // Save to cache
        saveToCache(CARD_DATA_CACHE_KEY, parsedCards);
        saveToCache(KEYWORD_DATA_CACHE_KEY, parsedKeywords);
        localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
        
        // Update file versions
        const fileVersions = loadFromCache(FILE_VERSIONS_KEY) || {};
        fileVersions.lastCheck = new Date().getTime();
        saveToCache(FILE_VERSIONS_KEY, fileVersions);
        
        // Update application state
        state.setCardDatabase(parsedCards);
        state.setKeywordDatabase(parsedKeywords);
        state.buildCardTitleCache();
        
        updateCacheStatus('Ready');
        
        return true;

    } catch (error) {
        console.error("Fatal Error during data load:", error);
        updateCacheStatus('Error loading data');
        
        // Try to use cache as fallback (even if invalid/expired)
        const cachedCards = loadFromCache(CARD_DATA_CACHE_KEY);
        const cachedKeywords = loadFromCache(KEYWORD_DATA_CACHE_KEY);
        
        if (cachedCards && cachedKeywords) {
            console.log('Using cached data as fallback due to error:', error.message);
            updateCacheStatus('Using cached data (offline)');
            
            state.setCardDatabase(cachedCards);
            state.setKeywordDatabase(cachedKeywords);
            state.buildCardTitleCache();
            
            setTimeout(() => {
                updateCacheStatus('Ready (offline)');
            }, 2000);
            
            return true;
        }
        
        // Show more detailed error for debugging
        const errorHtml = `
            <div style="color: red; padding: 20px; text-align: center;">
                <strong>FATAL ERROR:</strong> ${error.message}<br><br>
                <div style="background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 5px; text-align: left;">
                    <strong>Debug Info:</strong><br>
                    • URL: ${window.location.href}<br>
                    • Browser: ${navigator.userAgent}<br>
                    • Cache Available: ${localStorage.getItem(CARD_DATA_CACHE_KEY) ? 'Yes' : 'No'}<br>
                </div>
                <button onclick="location.reload()">Retry</button>
                <button onclick="localStorage.clear(); location.reload()" style="margin-left: 10px;">Clear Cache & Retry</button>
            </div>`;
        
        searchResults.innerHTML = errorHtml;
        
        updateCacheStatus('Failed to load data');
        
        return false;
    }
}

async function fetchAndParseCards(url) {
    try {
        // GitHub Pages-friendly fetch with cache busting
        const response = await fetch(`${url}?v=${new Date().getTime()}`, {
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.error(`Failed to fetch CoreSet.txt: ${response.status} ${response.statusText}`);
            throw new Error(`CoreSet.txt: ${response.status}`);
        }
        
        const tsvData = await response.text();
        if (!tsvData || tsvData.trim().length === 0) {
            throw new Error('CoreSet.txt is empty');
        }
        
        const cardLines = tsvData.trim().split(/\r?\n/);
        if (cardLines.length < 2) {
            throw new Error('CoreSet.txt has insufficient data');
        }
        
        const cardHeaders = cardLines.shift().trim().split('\t').map(h => h.trim());
        
        return cardLines.map(line => {
            const values = line.split('\t');
            const card = {};
            cardHeaders.forEach((header, index) => {
                const value = (values[index] || '').trim();
                if (value === 'null' || value === '') card[header] = null;
                else if (!isNaN(value) && value !== '') card[header] = Number(value);
                else card[header] = value;
            });
            card.title = card['Card Name'];
            card.card_type = card['Type'];
            card.cost = card['Cost'] === 'N/a' ? null : card['Cost'];
            card.damage = card['Damage'] === 'N/a' ? null : card['Damage'];
            card.momentum = card['Momentum'] === 'N/a' ? null : card['Momentum'];
            card.text_box = { raw_text: card['Card Raw Game Text'] };
            if (card.Keywords) card.text_box.keywords = card.Keywords.split(',').map(name => ({ name: name.trim() })).filter(k => k.name);
            else card.text_box.keywords = [];
            if (card.Traits) card.text_box.traits = card.Traits.split(',').map(traitStr => {
                const [name, value] = traitStr.split(':');
                return { name: name.trim(), value: value ? value.trim() : undefined };
            }).filter(t => t.name);
            else card.text_box.traits = [];
            return card;
        }).filter(card => card.title);
    } catch (error) {
        console.error('Failed to fetch/parse cards:', error);
        return null;
    }
}

async function fetchAndParseKeywords(url) {
    try {
        // GitHub Pages-friendly fetch with cache busting
        const response = await fetch(`${url}?v=${new Date().getTime()}`, {
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.error(`Failed to fetch keywords.txt: ${response.status} ${response.statusText}`);
            throw new Error(`Keywords: ${response.status}`);
        }
        
        const keywordText = await response.text();
        if (!keywordText || keywordText.trim().length === 0) {
            throw new Error('keywords.txt is empty');
        }
        
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
        
        return parsedKeywords;
    } catch (error) {
        console.error('Failed to fetch/parse keywords:', error);
        return null;
    }
}

// Export function to clear cache
export function clearDataCache() {
    try {
        localStorage.removeItem(CARD_DATA_CACHE_KEY);
        localStorage.removeItem(KEYWORD_DATA_CACHE_KEY);
        localStorage.removeItem(CACHE_VERSION_KEY);
        localStorage.removeItem(FILE_VERSIONS_KEY);
        console.log('Data cache cleared');
    } catch (error) {
        console.error('Failed to clear cache:', error);
    }
}
[file content end]
