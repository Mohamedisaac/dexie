'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // 1. SETUP: VARIABLES AND DATABASE
    // ===================================================================
    const db = new Dexie('TerminologyDictionary');
    const dictionaryFiles = ['biology.json', 'physics.json', 'soomaali_mansuur.json', 'geography.json'];

    // --- DOM Element References ---
    const installButton = document.getElementById('install-button');
    const searchTab = document.getElementById('search-tab');
    const showAllTab = document.getElementById('show-all-tab');
    const searchTabBtn = document.getElementById('search-tab-btn');
    const showAllTabBtn = document.getElementById('show-all-tab-btn');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const dictionarySelect = document.getElementById('dictionary-select');
    const viewport = document.getElementById('virtual-viewport');
    const content = document.getElementById('virtual-content');
    
    // NEW: Modal references
    const infoButton = document.getElementById('info-button');
    const aboutModal = document.getElementById('about-modal');
    const modalCloseButton = document.querySelector('.modal-close-button');

    // --- State Variables ---
    let currentDictionary = '';
    let totalEntries = 0;
    const entryHeight = 45;
    let deferredPrompt;
    let isScrolling = false;

    // --- Database Schema Definition ---
    db.version(1).stores({
        biology: '++id, term, definition',
        physics: '++id, term, definition',
        soomaali_mansuur: '++id, term, definition',
        geography: '++id, term, definition'
    });

    // ===================================================================
    // 2. CORE FUNCTIONS (Unchanged)
    // ===================================================================
    async function populateDatabase() { /* ... as before ... */ }
    async function renderVisibleEntries() { /* ... as before ... */ }
    function loadDictionaryList() { /* ... as before ... */ }

    // ===================================================================
    // 3. EVENT LISTENERS
    // ===================================================================

    // --- Tab, Search, Select, Scroll, and Install listeners (Unchanged) ---
    searchTabBtn.addEventListener('click', () => { /* ... as before ... */ });
    showAllTabBtn.addEventListener('click', () => { /* ... as before ... */ });
    searchInput.addEventListener('input', async (e) => { /* ... as before ... */ });
    dictionarySelect.addEventListener('change', async (e) => { /* ... as before ... */ });
    viewport.addEventListener('scroll', () => { /* ... as before ... */ });
    installButton.addEventListener('click', async () => { /* ... as before ... */ });

    // --- NEW: Modal Event Listeners ---
    infoButton.addEventListener('click', () => {
        aboutModal.classList.add('show');
    });

    modalCloseButton.addEventListener('click', () => {
        aboutModal.classList.remove('show');
    });

    // Close the modal if the user clicks on the dark background
    aboutModal.addEventListener('click', (event) => {
        if (event.target === aboutModal) {
            aboutModal.classList.remove('show');
        }
    });

    // ===================================================================
    // 4. APP INITIALIZATION (Unchanged)
    // ===================================================================
    window.addEventListener('beforeinstallprompt', (e) => { /* ... as before ... */ });
    window.addEventListener('appinstalled', () => { /* ... as before ... */ });
    if ('serviceWorker' in navigator) { /* ... as before ... */ }
    populateDatabase();
    loadDictionaryList();


    // --- UNCHANGED FUNCTIONS FOR COMPLETENESS ---
    async function populateDatabase() { for (const file of dictionaryFiles) { const tableName = file.replace('.json', ''); const table = db[tableName]; try { const count = await table.count(); if (count > 0) continue; const response = await fetch(file); if (!response.ok) throw new Error(`Network response was not ok for ${file}`); const data = await response.json(); const entries = Object.entries(data).map(([term, definition]) => ({ term, definition })); await table.bulkAdd(entries); } catch (error) { console.error(`CRITICAL ERROR while populating '${tableName}':`, error); } } }
    async function renderVisibleEntries() { if (!viewport || !currentDictionary) return; if (viewport.clientHeight === 0) return; const scrollTop = viewport.scrollTop; const startIndex = Math.floor(scrollTop / entryHeight); const visibleItemCount = Math.ceil(viewport.clientHeight / entryHeight); const endIndex = startIndex + visibleItemCount + 2; try { const visibleEntries = await db[currentDictionary].offset(startIndex).limit(endIndex - startIndex).toArray(); const fragment = document.createDocumentFragment(); visibleEntries.forEach(entryData => { const entryEl = document.createElement('div'); entryEl.className = 'entry'; entryEl.style.height = `${entryHeight}px`; entryEl.innerHTML = `<strong>${entryData.term}:</strong> ${entryData.definition}`; fragment.appendChild(entryEl); }); content.innerHTML = ''; content.style.paddingTop = `${startIndex * entryHeight}px`; content.appendChild(fragment); } catch (error) { console.error("Error rendering visible entries:", error); } }
    function loadDictionaryList() { if (dictionarySelect.options.length > 1) return; dictionarySelect.innerHTML = '<option value="">Select a dictionary</option>'; for (const file of dictionaryFiles) { const dictionaryName = file.replace('.json', ''); const option = document.createElement('option'); option.value = dictionaryName; option.textContent = dictionaryName.charAt(0).toUpperCase() + dictionaryName.slice(1); dictionarySelect.appendChild(option); } }
    searchTabBtn.addEventListener('click', () => { searchTab.classList.add('active'); showAllTab.classList.remove('active'); searchTabBtn.classList.add('active'); showAllTabBtn.classList.remove('active'); });
    showAllTabBtn.addEventListener('click', () => { showAllTab.classList.add('active'); searchTab.classList.remove('active'); showAllTabBtn.classList.add('active'); searchTabBtn.classList.remove('active'); if (totalEntries > 0) { setTimeout(renderVisibleEntries, 0); } });
    searchInput.addEventListener('input', async (e) => { const searchTerm = e.target.value.trim(); searchResults.innerHTML = ''; if (searchTerm.length < 1) return; try { const allTableNames = db.tables.map(table => table.name); const searchPromises = allTableNames.map(tableName => db[tableName].where('term').startsWithIgnoreCase(searchTerm).limit(100).toArray()); const resultsPerTable = await Promise.all(searchPromises); let foundResults = false; resultsPerTable.flat().forEach(entry => { foundResults = true; const resultEl = document.createElement('div'); resultEl.className = 'entry'; resultEl.innerHTML = `<strong>${entry.term}:</strong> ${entry.definition}`; searchResults.appendChild(resultEl); }); if (!foundResults) searchResults.innerHTML = '<div>No results found.</div>'; } catch (error) { console.error("Error during search:", error); } });
    dictionarySelect.addEventListener('change', async (e) => { const selectedDictionary = e.target.value; content.innerHTML = ''; totalEntries = 0; viewport.scrollTop = 0; if (!selectedDictionary) { currentDictionary = ''; content.style.height = '0px'; return; } currentDictionary = selectedDictionary; totalEntries = await db[currentDictionary].count(); content.style.height = `${totalEntries * entryHeight}px`; setTimeout(renderVisibleEntries, 0); });
    viewport.addEventListener('scroll', () => { if (!isScrolling) { window.requestAnimationFrame(() => { renderVisibleEntries(); isScrolling = false; }); isScrolling = true; } });
    installButton.addEventListener('click', async () => { if (!deferredPrompt) return; installButton.classList.remove('show'); deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; deferredPrompt = null; });
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installButton.classList.add('show'); });
    window.addEventListener('appinstalled', () => { deferredPrompt = null; });
    if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').then(registration => { console.log('ServiceWorker registration successful with scope: ', registration.scope); }, err => { console.log('ServiceWorker registration failed: ', err); }); }); }
});