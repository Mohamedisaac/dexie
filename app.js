'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // 1. SETUP: VARIABLES AND DATABASE
    // ===================================================================
    // ... (All previous variables are the same)
    
    // NEW: Theme Toggle reference
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const body = document.body;

    // ... (The rest of the variables are the same)
    const db = new Dexie('TerminologyDictionary');
    const dictionaryFiles = ['xisaab.json', 'bayoloji.json', 'fisikis.json', 'soomaali_mansuur.json', 'juqraafi.json', 'doorashooyinka.json'];
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
    const infoButton = document.getElementById('info-button');
    const aboutModal = document.getElementById('about-modal');
    const modalCloseButton = document.querySelector('.modal-close-button');
    let currentDictionary = '';
    let totalEntries = 0;
    const entryHeight = 45;
    let deferredPrompt;
    let isScrolling = false;
    db.version(1).stores({
        xisaab: '++id, term, definition',
        bayoloji: '++id, term, definition',
        fisikis: '++id, term, definition',
        soomaali_mansuur: '++id, term, definition',
        juqraafi: '++id, term, definition',
        doorashooyinka: '++id, term, definition'
    });

    // ===================================================================
    // 2. CORE FUNCTIONS (Unchanged)
    // ===================================================================
    async function populateDatabase() { /* ... */ }
    async function renderVisibleEntries() { /* ... */ }
    function loadDictionaryList() { /* ... */ }

    // NEW: Function to show update notification
    function showUpdateNotification() {
        if (confirm('A new version is available! Would you like to update now?')) {
            // Send message to service worker to skip waiting
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SKIP_WAITING'
                });
            }
        }
    }

    // ===================================================================
    // 3. EVENT LISTENERS
    // ===================================================================
    
    // --- NEW: Theme Toggle Listener ---
    themeToggleButton.addEventListener('click', () => {
        body.classList.toggle('dark-mode');

        // Save preference and update icon
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggleButton.textContent = '☀️';
        } else {
            localStorage.removeItem('theme');
            themeToggleButton.textContent = '🌙';
        }
    });

    // --- Other Listeners (Unchanged) ---
    // ... (All other event listeners are the same)
    infoButton.addEventListener('click', () => { aboutModal.classList.add('show'); });
    modalCloseButton.addEventListener('click', () => { aboutModal.classList.remove('show'); });
    aboutModal.addEventListener('click', (event) => { if (event.target === aboutModal) { aboutModal.classList.remove('show'); } });
    searchTabBtn.addEventListener('click', () => { searchTab.classList.add('active'); showAllTab.classList.remove('active'); searchTabBtn.classList.add('active'); showAllTabBtn.classList.remove('active'); });
    showAllTabBtn.addEventListener('click', () => { showAllTab.classList.add('active'); searchTab.classList.remove('active'); showAllTabBtn.classList.add('active'); searchTabBtn.classList.remove('active'); if (totalEntries > 0) { setTimeout(renderVisibleEntries, 0); } });
    searchInput.addEventListener('input', async (e) => { const searchTerm = e.target.value.trim(); searchResults.innerHTML = ''; if (searchTerm.length < 1) return; try { const allTableNames = db.tables.map(table => table.name); const searchPromises = allTableNames.map(tableName => db[tableName].where('term').startsWithIgnoreCase(searchTerm).limit(100).toArray()); const resultsPerTable = await Promise.all(searchPromises); let foundResults = false; resultsPerTable.flat().forEach(entry => { foundResults = true; const resultEl = document.createElement('div'); resultEl.className = 'entry'; resultEl.innerHTML = `<strong>${entry.term}:</strong> ${entry.definition}`; searchResults.appendChild(resultEl); }); if (!foundResults) searchResults.innerHTML = '<div>No results found.</div>'; } catch (error) { console.error("Error during search:", error); } });
    dictionarySelect.addEventListener('change', async (e) => { const selectedDictionary = e.target.value; content.innerHTML = ''; totalEntries = 0; viewport.scrollTop = 0; if (!selectedDictionary) { currentDictionary = ''; content.style.height = '0px'; return; } currentDictionary = selectedDictionary; totalEntries = await db[currentDictionary].count(); content.style.height = `${totalEntries * entryHeight}px`; setTimeout(renderVisibleEntries, 0); });
    viewport.addEventListener('scroll', () => { if (!isScrolling) { window.requestAnimationFrame(() => { renderVisibleEntries(); isScrolling = false; }); isScrolling = true; } });
    installButton.addEventListener('click', async () => { if (!deferredPrompt) return; installButton.classList.remove('show'); deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; deferredPrompt = null; });

    // ===================================================================
    // 4. APP INITIALIZATION
    // ===================================================================
    
    // --- NEW: Check for saved theme on page load ---
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        themeToggleButton.textContent = '☀️';
    }

    // --- PWA Listeners (Updated) ---
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installButton.classList.add('show'); });
    window.addEventListener('appinstalled', () => { deferredPrompt = null; });

    populateDatabase();
    loadDictionaryList();

    // --- UNCHANGED FUNCTIONS FOR COMPLETENESS ---
    async function populateDatabase() { for (const file of dictionaryFiles) { const tableName = file.replace('.json', ''); const table = db[tableName]; try { const count = await table.count(); if (count > 0) continue; const response = await fetch(file); if (!response.ok) throw new Error(`Network response was not ok for ${file}`); const data = await response.json(); const entries = Object.entries(data).map(([term, definition]) => ({ term, definition })); await table.bulkAdd(entries); } catch (error) { console.error(`CRITICAL ERROR while populating '${tableName}':`, error); } } }
    async function renderVisibleEntries() { if (!viewport || !currentDictionary) return; if (viewport.clientHeight === 0) return; const scrollTop = viewport.scrollTop; const startIndex = Math.floor(scrollTop / entryHeight); const visibleItemCount = Math.ceil(viewport.clientHeight / entryHeight); const endIndex = startIndex + visibleItemCount + 2; try { const visibleEntries = await db[currentDictionary].offset(startIndex).limit(endIndex - startIndex).toArray(); const fragment = document.createDocumentFragment(); visibleEntries.forEach(entryData => { const entryEl = document.createElement('div'); entryEl.className = 'entry'; entryEl.style.height = `${entryHeight}px`; entryEl.innerHTML = `<strong>${entryData.term}:</strong> ${entryData.definition}`; fragment.appendChild(entryEl); }); content.innerHTML = ''; content.style.paddingTop = `${startIndex * entryHeight}px`; content.appendChild(fragment); } catch (error) { console.error("Error rendering visible entries:", error); } }
    function loadDictionaryList() { if (dictionarySelect.options.length > 1) return; dictionarySelect.innerHTML = '<option value="">Dooro Qaamuus</option>'; for (const file of dictionaryFiles) { const dictionaryName = file.replace('.json', ''); const option = document.createElement('option'); option.value = dictionaryName; option.textContent = dictionaryName.charAt(0).toUpperCase() + dictionaryName.slice(1); dictionarySelect.appendChild(option); } }
});

// NEW: Service Worker Registration with Update Logic
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(registration => {
    console.log('SW registered: ', registration);
    
    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour

    // Listen for controller change (update available)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New service worker activated, reloading page...');
      window.location.reload();
    });

    // Check if there's a waiting service worker (update ready)
    if (registration.waiting) {
      showUpdateNotification();
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            showUpdateNotification();
          }
        }
      });
    });

  }).catch(registrationError => {
    console.log('SW registration failed: ', registrationError);
  });
}

// Check for updates on page load
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.update();
    });
  }
});