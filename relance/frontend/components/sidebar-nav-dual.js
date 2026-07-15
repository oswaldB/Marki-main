/**
 * Composant Sidebar Navigation Dual (Entreprise + Marki)
 * Custom Element pour la navigation latérale
 */

class SidebarNavDual extends HTMLElement {
  constructor() {
    super();
    this.page = this.getAttribute('page') || 'dashboard';
  }

  connectedCallback() {
    this.innerHTML = `
      <!-- Mobile Menu Button -->
      <div class="md:hidden fixed top-4 left-4 z-50">
        <button id="mobile-menu-btn" class="p-2 bg-white rounded-lg shadow-md border border-slate-200">
          <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      <!-- Sidebar Overlay -->
      <div id="sidebar-overlay" class="fixed inset-0 bg-black/50 z-40 hidden md:hidden" onclick="toggleSidebar()"></div>

      <!-- Sidebar -->
      <aside id="sidebar" class="fixed left-0 top-0 h-screen w-[284px] bg-slate-900 z-50 transform -translate-x-full md:translate-x-0 transition-transform duration-300 overflow-y-auto">
        
        <!-- Logo Section -->
        <div class="p-4 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center overflow-hidden">
              <img src="/asset./assets/marki-logo.png" alt="Marki" class="w-8 h-8 object-contain">
            </div>
            <div>
              <h1 class="text-white font-semibold text-lg">Marki</h1>
              <p class="text-slate-400 text-xs">Relances intelligentes</p>
            </div>
          </div>
        </div>

        <!-- Navigation Entreprise -->
        <div class="p-2">
          <p class="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Votre entreprise</p>
          <nav class="space-y-1">
            <a href="#" class="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <span class="text-sm">ADTI</span>
            </a>
            <a href="#" class="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <span class="text-sm">Contacts</span>
            </a>
            <a href="#" class="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span class="text-sm">Factures</span>
            </a>
          </nav>
        </div>

        <!-- Navigation Marki -->
        <div class="p-2">
          <p class="px-3 py-2 text-xs font-medium text-sky-400 uppercase tracking-wider">Marki</p>
          <nav class="space-y-1">
            <a href="/dashboard.html" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${this.page === 'dashboard' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              <span class="text-sm">Dashboard</span>
            </a>
            <a href="/impayes.html" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${this.page === 'impayes' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="text-sm">Impayés</span>
            </a>
            <a href="/relances.html" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${this.page === 'relances' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <span class="text-sm">Relances</span>
            </a>
            <a href="/sequences.html" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${this.page === 'sequences' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span class="text-sm">Séquences</span>
            </a>
            <a href="/evenements.html" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${this.page === 'evenements' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span class="text-sm">Événements</span>
            </a>
            <a href="/smart-marki.html" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${this.page === 'smart-marki' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <span class="text-sm">Smart Marki</span>
            </a>
            <a href="/settings.html" class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${this.page === 'settings' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span class="text-sm">Paramètres</span>
            </a>
          </nav>
        </div>

        <!-- User Section -->
        <div class="mt-auto p-4 border-t border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-medium">
              JD
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white truncate">Jean Dupont</p>
              <p class="text-xs text-slate-400 truncate">jean.dupont@example.com</p>
            </div>
            <button onclick="logout()" class="p-1.5 text-slate-400 hover:text-white transition-colors" title="Déconnexion">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <style>
        /* Hide scrollbar for sidebar */
        aside::-webkit-scrollbar {
          width: 4px;
        }
        aside::-webkit-scrollbar-track {
          background: #1e293b;
        }
        aside::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 2px;
        }
      </style>
    `;

    // Add mobile menu toggle functionality
    const mobileBtn = this.querySelector('#mobile-menu-btn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', toggleSidebar);
    }
  }
}

// Toggle sidebar function
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && overlay) {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
  }
}

// Logout function
function logout() {
  localStorage.removeItem('marki_token');
  localStorage.removeItem('marki_user');
  window.location.href = '/login.html';
}

// Register custom element
customElements.define('sidebar-nav-dual', SidebarNavDual);
