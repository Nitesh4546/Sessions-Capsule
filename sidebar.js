// sidebar.js
// Logic for the Tab Session Manager Sidebar Extension.

// State Variables
let savedSessions = [];
let maxSessionsLimit = 10;

// DOM Elements
const sessionNameInput = document.getElementById('session-name-input');
const saveSessionBtn = document.getElementById('save-session-btn');
const sessionsList = document.getElementById('sessions-list');
const emptyState = document.getElementById('empty-state');
const sessionCountSpan = document.getElementById('session-count');
const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const maxSessionsInput = document.getElementById('max-sessions-input');
const themeSelect = document.getElementById('theme-select');
const clearAllBtn = document.getElementById('clear-all-btn');
const toastContainer = document.getElementById('toast-container');

// Initialize Sidebar
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
});

// Initialize Application Settings and Sessions
async function initApp() {
  // Update name input with auto-generated default
  refreshDefaultSessionName();

  // Load data from chrome.storage.local
  chrome.storage.local.get(['saved_sessions', 'max_sessions', 'theme'], (result) => {
    if (result.saved_sessions) {
      savedSessions = result.saved_sessions;
    }
    if (result.max_sessions !== undefined) {
      maxSessionsLimit = parseInt(result.max_sessions, 10);
      maxSessionsInput.value = maxSessionsLimit;
    } else {
      // Default setup
      chrome.storage.local.set({ max_sessions: maxSessionsLimit });
    }
    
    // Theme setup
    const savedTheme = result.theme || 'system';
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
    
    renderSessions();
  });
}

// Apply Theme Mode (system, light, dark)
function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (theme === 'light') {
    root.classList.add('theme-light');
  } else if (theme === 'dark') {
    root.classList.add('theme-dark');
  }
}

// Set Event Listeners
function setupEventListeners() {
  // Save Session
  saveSessionBtn.addEventListener('click', saveCurrentSession);
  
  // Settings Panel Toggles
  toggleSettingsBtn.addEventListener('click', () => {
    refreshDefaultSessionName();
    settingsPanel.classList.add('open');
  });
  
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('open');
  });

  // Settings: Max Sessions Change
  maxSessionsInput.addEventListener('change', handleMaxSessionsChange);

  // Settings: Theme Change
  themeSelect.addEventListener('change', (e) => {
    const selectedTheme = e.target.value;
    chrome.storage.local.set({ theme: selectedTheme }, () => {
      applyTheme(selectedTheme);
      showToast(`Theme set to ${selectedTheme === 'system' ? 'System Default' : selectedTheme === 'light' ? 'Light Mode' : 'Dark Mode'}.`, 'success');
    });
  });

  // Settings: Reset All
  clearAllBtn.addEventListener('click', handleClearAll);

  // Allow saving by pressing Enter in input field
  sessionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveCurrentSession();
    }
  });
}

// Generate Default Name in Format: Session-YYYY-MM-DD-HH-MM
function generateDefaultSessionName() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `Session-${yyyy}-${mm}-${dd}-${hh}-${min}`;
}

// Refresh the value inside input field
function refreshDefaultSessionName() {
  sessionNameInput.value = generateDefaultSessionName();
}

// Save Current Window Tabs
function saveCurrentSession() {
  const name = sessionNameInput.value.trim() || generateDefaultSessionName();

  // Query active window tabs
  chrome.tabs.query({ currentWindow: true }, async (tabs) => {
    if (!tabs || tabs.length === 0) {
      showToast("No active tabs found to save.", "danger");
      return;
    }

    // Prepare tab info list
    const tabDetails = tabs.map(tab => ({
      title: tab.title || "Untitled Tab",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl || ""
    }));

    // Create session object
    const newSession = {
      id: 'session_' + Date.now(),
      name: name,
      timestamp: Date.now(),
      tabs: tabDetails
    };

    // FIFO Queue Logic
    let prunedCount = 0;
    // If sessions length is equal to or greater than limit, remove oldest (FIFO)
    // We store sessions in chronological order (oldest at index 0, newest pushed to end)
    while (savedSessions.length >= maxSessionsLimit) {
      savedSessions.shift(); // Remove oldest session
      prunedCount++;
    }

    // Add new session to storage
    savedSessions.push(newSession);

    // Save to storage.local
    chrome.storage.local.set({ saved_sessions: savedSessions }, () => {
      renderSessions();
      refreshDefaultSessionName(); // Refresh field for next save
      
      if (prunedCount > 0) {
        showToast(`Saved! Oldest session deleted to stay within limit.`, "success");
      } else {
        showToast("Session saved successfully!", "success");
      }
    });
  });
}

// Restore a Session (open all URLs in active window)
function restoreSession(sessionId) {
  const session = savedSessions.find(s => s.id === sessionId);
  if (!session) {
    showToast("Session not found.", "danger");
    return;
  }

  if (session.tabs.length === 0) {
    showToast("No tabs in this session to restore.", "danger");
    return;
  }

  // Restore tabs in the active window
  session.tabs.forEach((tab) => {
    chrome.tabs.create({ url: tab.url });
  });

  showToast(`Restoring ${session.tabs.length} tabs...`, "success");
}

// Delete a Single Session
function deleteSession(sessionId) {
  const sessionIndex = savedSessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) return;

  const sessionName = savedSessions[sessionIndex].name;
  savedSessions.splice(sessionIndex, 1);

  chrome.storage.local.set({ saved_sessions: savedSessions }, () => {
    renderSessions();
    showToast(`Deleted "${sessionName}"`, "success");
  });
}

// Clear all Saved Sessions
function handleClearAll() {
  if (savedSessions.length === 0) {
    showToast("No sessions to clear.", "danger");
    return;
  }

  const confirmed = confirm("Are you sure you want to permanently delete all saved sessions?");
  if (confirmed) {
    savedSessions = [];
    chrome.storage.local.set({ saved_sessions: savedSessions }, () => {
      renderSessions();
      settingsPanel.classList.remove('open');
      showToast("All saved sessions cleared.", "success");
    });
  }
}

// Handle Max Sessions Setting Update
function handleMaxSessionsChange() {
  let newLimit = parseInt(maxSessionsInput.value, 10);
  
  if (isNaN(newLimit) || newLimit < 1) {
    newLimit = 1;
    maxSessionsInput.value = 1;
  } else if (newLimit > 100) {
    newLimit = 100;
    maxSessionsInput.value = 100;
  }

  maxSessionsLimit = newLimit;
  chrome.storage.local.set({ max_sessions: maxSessionsLimit });

  // If new limit is lower than current sessions count, ask to prune or prune immediately
  if (savedSessions.length > maxSessionsLimit) {
    const overflowCount = savedSessions.length - maxSessionsLimit;
    // Prune immediately (FIFO - oldest are at the beginning of the array)
    savedSessions.splice(0, overflowCount);
    
    chrome.storage.local.set({ saved_sessions: savedSessions }, () => {
      renderSessions();
      showToast(`Pruned ${overflowCount} oldest sessions to match new limit of ${maxSessionsLimit}.`, "success");
    });
  } else {
    showToast(`Maximum limit set to ${maxSessionsLimit} sessions.`, "success");
  }
}

// Fetch Favicon Helper
function getFaviconUrl(url, originalFavicon) {
  if (originalFavicon && !originalFavicon.startsWith('chrome://') && !originalFavicon.startsWith('about:')) {
    return originalFavicon;
  }
  
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`;
    }
  } catch (e) {
    // Leave it to default fallback icon
  }
  
  // Return standard icon SVG marker data URI or empty string for default icon css
  return '';
}

// Render Saved Sessions List
function renderSessions() {
  const count = savedSessions.length;
  sessionCountSpan.textContent = count;

  if (count === 0) {
    emptyState.classList.remove('hidden');
    sessionsList.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  sessionsList.classList.remove('hidden');

  // Clear existing items
  sessionsList.innerHTML = '';

  // Render from newest to oldest in the list (view order), 
  // but remember FIFO logic targets index 0 of the savedSessions array.
  // So we reverse for display purposes.
  const displaySessions = [...savedSessions].reverse();

  displaySessions.forEach((session) => {
    const card = document.createElement('div');
    card.className = 'session-card';
    card.dataset.id = session.id;

    // Format Date/Time
    const dateStr = new Date(session.timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const tabCountText = session.tabs.length === 1 ? '1 tab' : `${session.tabs.length} tabs`;

    // Card Header
    const cardHeader = document.createElement('div');
    cardHeader.className = 'session-card-header';
    cardHeader.innerHTML = `
      <div class="session-info">
        <div class="session-name" title="${escapeHtml(session.name)}">${escapeHtml(session.name)}</div>
        <div class="session-meta">
          <span class="session-date">${dateStr}</span>
          <span class="tab-badge">${tabCountText}</span>
        </div>
      </div>
      <div class="session-actions">
        <button class="action-btn restore-btn" title="Restore Session">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </button>
        <button class="action-btn delete-btn" title="Delete Session">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
        <button class="action-btn toggle-details-btn" title="View Tabs">
          <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    `;

    // Accordion click toggle
    cardHeader.addEventListener('click', () => {
      const isExpanded = card.classList.contains('expanded');
      
      // Collapse other expanded ones (optional, for accordion cleanliness)
      document.querySelectorAll('.session-card.expanded').forEach(c => {
        if (c !== card) c.classList.remove('expanded');
      });
      
      card.classList.toggle('expanded', !isExpanded);
    });

    // Wire up buttons
    const sessionActions = cardHeader.querySelector('.session-actions');
    sessionActions.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    cardHeader.querySelector('.restore-btn').addEventListener('click', () => restoreSession(session.id));
    cardHeader.querySelector('.delete-btn').addEventListener('click', () => deleteSession(session.id));
    cardHeader.querySelector('.toggle-details-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      cardHeader.click();
    });

    // Session Details Accordion
    const cardDetails = document.createElement('div');
    cardDetails.className = 'session-card-details';
    
    const tabList = document.createElement('ul');
    tabList.className = 'tab-list';

    session.tabs.forEach((tab) => {
      const tabItem = document.createElement('li');
      const faviconUrl = getFaviconUrl(tab.url, tab.favIconUrl);

      const a = document.createElement('a');
      a.className = 'tab-item';
      a.href = '#';
      a.title = tab.title + '\n' + tab.url;
      
      const faviconDiv = document.createElement('div');
      faviconDiv.className = 'tab-favicon';
      
      const fallbackSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;color:var(--text-tertiary)"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

      if (faviconUrl) {
        const img = document.createElement('img');
        img.src = faviconUrl;
        img.alt = '';
        img.addEventListener('error', () => {
          img.style.display = 'none';
          faviconDiv.innerHTML = fallbackSvg;
        });
        faviconDiv.appendChild(img);
      } else {
        faviconDiv.innerHTML = fallbackSvg;
      }

      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = tab.title;

      a.appendChild(faviconDiv);
      a.appendChild(titleSpan);

      // Clicking a tab inside details opens just that tab
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        chrome.tabs.create({ url: tab.url });
        showToast("Opening tab...", "success");
      });

      tabItem.appendChild(a);
      tabList.appendChild(tabItem);
    });

    cardDetails.appendChild(tabList);
    card.appendChild(cardHeader);
    card.appendChild(cardDetails);
    sessionsList.appendChild(card);
  });
}

// Escape HTML utility to prevent XSS injection from tab titles/names
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Show Floating Toast Notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'danger' ? 'toast-danger' : ''}`;
  
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Close Notification">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  // Close toast on button click
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  });

  // Auto remove toast after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => toast.remove());
    }
  }, 3200);

  toastContainer.appendChild(toast);
}
