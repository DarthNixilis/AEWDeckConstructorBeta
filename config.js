// config.js

// --- STATE MANAGEMENT ---
export let cardDatabase = [];
export let keywordDatabase = {};
export let startingDeck = [];
export let purchaseDeck = [];
export let selectedWrestler = null;
export let selectedManager = null;
export let activeFilters = [{}, {}, {}];
export let currentViewMode = 'grid';
export let currentSort = 'alpha-asc';
export let showZeroCost = true;
export let showNonZeroCost = true;
export let numGridColumns = 2;
export let lastFocusedElement;

export const CACHE_KEY = 'aewDeckBuilderCache';

// --- SETTERS (to modify state from other modules) ---
export function setCardDatabase(db) { cardDatabase = db; }
export function setKeywordDatabase(db) { keywordDatabase = db; }
export function setStartingDeck(deck) { startingDeck = deck; }
export function setPurchaseDeck(deck) { purchaseDeck = deck; }
export function setSelectedWrestler(wrestler) { selectedWrestler = wrestler; }
export function setSelectedManager(manager) { selectedManager = manager; }
export function setActiveFilters(filters) { activeFilters = filters; }
export function setCurrentViewMode(mode) { currentViewMode = mode; }
export function setCurrentSort(sort) { currentSort = sort; }
export function setShowZeroCost(value) { showZeroCost = value; }
export function setShowNonZeroCost(value) { showNonZeroCost = value; }
export function setNumGridColumns(num) { numGridColumns = num; }
export function setLastFocusedElement(el) { lastFocusedElement = el; }
