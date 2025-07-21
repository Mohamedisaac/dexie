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

    // --- Virtual Scroller State ---
    let allEntries = [];
    const entryHeight = 45; // The fixed pixel height of a single dictionary entry.

    // --- PWA Install Prompt State ---
    let deferredPrompt;

    // --- Database Schema Definition ---
    db.version(1).stores({
        biology: '++id, term, definition',
        physics: '++id, term, definition',
        soomaali_mansuur: '++id, term, definition',
        geography: '++id, term, definition'
    });

    // ===================================================================
    // 2. CORE FUNCTIONS
    // ===================================================================

    async function populateDatabase() {
        for (const file of dictionaryFiles) {
            const tableName = file.replace('.json', '');
            const table = db[tableName];
            try {
                const count = await table.count();
                if (count > 0) { console.log(`Table '${tableName}' is already populated.`); continue; }
                const response = await fetch(file);
                if (!response.ok) throw new Error(`Network response was not ok for ${file}`);
                const data = await response.json();
                const entries = Object.entries(data).map(([term, definition]) => ({ term, definition }));
                await table.bulkAdd(entries);
            } catch (error) { console.error(`CRITICAL ERROR while populating '${tableName}':`, error); }
        }
    }
    
    function renderVisibleEntries() {
        if (!viewport) return;
        const scrollTop = viewport.scrollTop;
        const startIndex = Math.floor(scrollTop / entryHeight);
        const visibleItemCount = Math.ceil(viewport.clientHeight / entryHeight);
        const endIndex = startIndex + visibleItemCount + 2; // +2 for buffer
        const visibleEntries = allEntries.slice(startIndex, endIndex);

        const fragment = document.createDocumentFragment();
        visibleEntries.forEach(entryData => {
            const entryEl = document.createElement('div');
            entryEl.className = 'entry';
            entryEl.style.height = `${entryHeight}px`;
            entryEl.innerHTML = `<strong>${entryData.term}:</strong> ${entryData.definition}`;
            fragment.appendChild(entryEl);
        });

        content.innerHTML = '';
        content.style.paddingTop = `${startIndex * entryHeight}px`;
        content.appendChild(fragment);
    }
    
    function loadDictionaryList() {
        if (dictionarySelect.options.length > 1) return;
        dictionarySelect.innerHTML = '<option value="">Select a dictionary</option>';
        for (const file of dictionaryFiles) {
            const dictionaryName = file.replace('.json', '');
            const option = document.createElement('option');
            option.value = dictionaryName;
            option.textContent = dictionaryName.charAt(0).toUpperCase() + dictionaryName.slice(1);
            dictionarySelect.appendChild(option);
        }
    }

    // ===================================================================
    // 3. EVENT LISTENERS
    // ===================================================================

    searchTabBtn.addEventListener('click', () => {
        searchTab.classList.add('active');
        showAllTab.classList.remove('active');
        searchTabBtn.classList.add('active');
        showAllTabBtn.classList.remove('active');
    });

    showAllTabBtn.addEventListener('click', () => {
        showAllTab.classList.add('active');
        searchTab.classList.remove('active');
        showAllTabBtn.classList.add('active');
        searchTabBtn.classList.remove('active');
        if (allEntries.length > 0) {
            setTimeout(renderVisibleEntries, 0);
        }
    });

    searchInput.addEventListener('input', async (e) => {
        const searchTerm = e.target.value.trim();
        searchResults.innerHTML = '';
        if (searchTerm.length < 1) return;
        try {
            const allTableNames = db.tables.map(table => table.name);
            const searchPromises = allTableNames.map(tableName => db[tableName].where('term').startsWithIgnoreCase(searchTerm).toArray());
            const resultsPerTable = await Promise.all(searchPromises);
            let foundResults = false;
            resultsPerTable.flat().forEach(entry => {
                foundResults = true;
                const resultEl = document.createElement('div');
                resultEl.className = 'entry';
                resultEl.innerHTML = `<strong>${entry.term}:</strong> ${entry.definition}`;
                searchResults.appendChild(resultEl);
            });
            if (!foundResults) searchResults.innerHTML = '<div>No results found.</div>';
        } catch (error) { console.error("Error during search:", error); }
    });

    dictionarySelect.addEventListener('change', async (e) => {
        const selectedDictionary = e.target.value;
        content.innerHTML = '';
        allEntries = [];
        viewport.scrollTop = 0; 
        
        if (!selectedDictionary) {
            content.style.height = '0px';
            return;
        }

        allEntries = await db[selectedDictionary].toArray();
        content.style.height = `${allEntries.length * entryHeight}px`;
        setTimeout(renderVisibleEntries, 0);
    });

    viewport.addEventListener('scroll', renderVisibleEntries);

    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        installButton.classList.remove('show');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
    });

    // ===================================================================
    // 4. APP INITIALIZATION
    // ===================================================================
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.classList.add('show');
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        installButton.classList.remove('show');
        deferredPrompt = null;
    });
    
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }

    populateDatabase();
    loadDictionaryList();
});