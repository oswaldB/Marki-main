/**
 * Sidebar Navigation Dual - Web Component
 * Rail (64px) + Menu détaillé (220px)
 */
class SidebarNavDual extends HTMLElement {
  constructor() {
    super();
    this.activePage = this.getAttribute('page') || 'dashboard';
    this.activeRail = 'relance';
    this.expanded = {
      impayes: this.activePage.startsWith('impayes'),
      relances: this.activePage.startsWith('relance')
    };
  }

  connectedCallback() {
    this.render();
    this.initAlpine();
  }

  initAlpine() {
    // Attendre qu'Alpine soit chargé
    if (window.Alpine) {
      this.setupAlpineData();
    } else {
      document.addEventListener('alpine:init', () => this.setupAlpineData());
    }
  }

  setupAlpineData() {
    const el = this.querySelector('[x-data]');
    if (el && el._x_dataStack) return; // Déjà initialisé

    // Le x-data est déjà dans le HTML généré
  }

  render() {
    this.innerHTML = `
    <aside class="fixed left-0 top-0 h-screen z-[100] flex" 
           x-data="{ 
             activeRail: 'relance',
             expanded: { impayes: ${this.expanded.impayes}, relances: ${this.expanded.relances} },
             isActive(page) {
               const current = '${this.activePage}';
               if (page === current) return true;
               if (page === 'impayes' && current.startsWith('impayes')) return true;
               if (page === 'relances-liste' && current.startsWith('relance')) return true;
               return false;
             }
           }"
           x-cloak>
      
      <!-- Rail d'applications (64px) -->
      <div class="w-16 h-full bg-slate-900 flex flex-col border-r border-slate-800">
        <!-- Logo -->
        <div class="h-16 flex items-center justify-center border-b border-slate-800">
          <div class="w-10 h-10 rounded-xl overflow-hidden bg-white">
            <img src="/static/marki-logo.png" alt="Marki" class="w-full h-full object-contain">
          </div>
        </div>
        
        <!-- Apps -->
        <div class="flex-1 flex flex-col items-center py-4 gap-2">
          <!-- Relance -->
          <a href="/dashboard" 
             @click="activeRail = 'relance'"
             :class="activeRail === 'relance' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
             class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all">
            RE
          </a>
          
          <!-- Tantiem Manager -->
          <button 
            @click="activeRail = 'tantiem'"
            :class="activeRail === 'tantiem' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
            class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer">
            TM
          </button>
          
          <!-- Commande Plus -->
          <button 
            @click="activeRail = 'commande'"
            :class="activeRail === 'commande' ? 'bg-violet-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
            class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer">
            CP
          </button>
          
          <!-- Régie Totale -->
          <button 
            @click="activeRail = 'regie'"
            :class="activeRail === 'regie' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
            class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer">
            RT
          </button>
          
          <!-- Commissions -->
          <button 
            @click="activeRail = 'commissions'"
            :class="activeRail === 'commissions' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
            class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer">
            CT
          </button>
          
          <!-- Agenda -->
          <button 
            @click="activeRail = 'agenda'"
            :class="activeRail === 'agenda' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
            class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer">
            AO
          </button>
          
          <!-- Portail Client -->
          <button 
            @click="activeRail = 'portail'"
            :class="activeRail === 'portail' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
            class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer">
            PC
          </button>
        </div>
        
        <!-- Déconnexion -->
        <div class="p-4 border-t border-slate-800">
          <button onclick="logout()" 
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
                  title="Déconnexion">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
      
      <!-- Menu détaillé (220px) - App Relance -->
      <div class="w-[220px] h-full bg-white border-r border-slate-200 flex flex-col">
        <!-- Header -->
        <div class="h-16 flex items-center px-4 border-b border-slate-200">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white text-xs font-bold">
              RE
            </div>
            <span class="font-semibold text-slate-900">Relance</span>
          </div>
        </div>
        
        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto py-4">
          
          <!-- Tableau de bord -->
          <a href="/dashboard" 
             :class="isActive('dashboard') ? 'bg-sky-50 text-sky-700 border-r-2 border-sky-500' : 'text-slate-600 hover:bg-slate-50'"
             class="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-home w-5 text-center"></i>
            <span>Tableau de bord</span>
          </a>
          
          <!-- Impayés (expandable) -->
          <div class="mt-1">
            <button @click="expanded.impayes = !expanded.impayes"
                    :class="isActive('impayes') ? 'text-sky-700' : 'text-slate-600 hover:text-slate-900'"
                    class="flex items-center justify-between w-full px-4 py-2.5 mx-2 text-sm font-medium transition-all">
              <div class="flex items-center gap-3">
                <i class="fas fa-file-invoice-dollar w-5 text-center"></i>
                <span>Impayés</span>
              </div>
              <i class="fas fa-chevron-down text-xs transition-transform" :class="expanded.impayes ? 'rotate-180' : ''"></i>
            </button>
            
            <!-- Sous-menu -->
            <div x-show="expanded.impayes" x-collapse class="ml-4">
              <a href="/impayes" 
                 :class="isActive('impayes') ? 'text-sky-700' : 'text-slate-500 hover:text-slate-700'"
                 class="flex items-center gap-3 px-4 py-2 text-sm transition-all">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>Tous les impayés</span>
              </a>
              <a href="/impayes-payeur" 
                 :class="isActive('impayes-payeur') ? 'text-sky-700' : 'text-slate-500 hover:text-slate-700'"
                 class="flex items-center gap-3 px-4 py-2 text-sm transition-all">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>Par payeur</span>
              </a>
              <a href="/impayes-suspendus" 
                 :class="isActive('impayes-suspendus') ? 'text-sky-700' : 'text-slate-500 hover:text-slate-700'"
                 class="flex items-center gap-3 px-4 py-2 text-sm transition-all">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>Suspendus</span>
              </a>
            </div>
          </div>
          
          <!-- Relances (expandable) -->
          <div class="mt-1">
            <button @click="expanded.relances = !expanded.relances"
                    :class="isActive('relances-liste') ? 'text-sky-700' : 'text-slate-600 hover:text-slate-900'"
                    class="flex items-center justify-between w-full px-4 py-2.5 mx-2 text-sm font-medium transition-all">
              <div class="flex items-center gap-3">
                <i class="fas fa-envelope w-5 text-center"></i>
                <span>Relances</span>
              </div>
              <i class="fas fa-chevron-down text-xs transition-transform" :class="expanded.relances ? 'rotate-180' : ''"></i>
            </button>
            
            <!-- Sous-menu -->
            <div x-show="expanded.relances" x-collapse class="ml-4">
              <a href="/relances" 
                 :class="isActive('relances-liste') ? 'text-sky-700' : 'text-slate-500 hover:text-slate-700'"
                 class="flex items-center gap-3 px-4 py-2 text-sm transition-all">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>Liste des relances</span>
              </a>
              <a href="/relances-calendrier" 
                 :class="isActive('relances-calendrier') ? 'text-sky-700' : 'text-slate-500 hover:text-slate-700'"
                 class="flex items-center gap-3 px-4 py-2 text-sm transition-all">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>Calendrier</span>
              </a>
              <a href="/relances-validation" 
                 :class="isActive('relances-validation') ? 'text-sky-700' : 'text-slate-500 hover:text-slate-700'"
                 class="flex items-center gap-3 px-4 py-2 text-sm transition-all">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>Validation</span>
              </a>
            </div>
          </div>
          
          <!-- Contacts -->
          <a href="/contacts" 
             :class="isActive('contacts') ? 'bg-sky-50 text-sky-700 border-r-2 border-sky-500' : 'text-slate-600 hover:bg-slate-50'"
             class="flex items-center gap-3 px-4 py-2.5 mx-2 mt-1 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-address-book w-5 text-center"></i>
            <span>Contacts</span>
          </a>
          
          <!-- Séquences -->
          <a href="/sequences" 
             :class="isActive('sequences') ? 'bg-sky-50 text-sky-700 border-r-2 border-sky-500' : 'text-slate-600 hover:bg-slate-50'"
             class="flex items-center gap-3 px-4 py-2.5 mx-2 mt-1 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-stream w-5 text-center"></i>
            <span>Séquences</span>
          </a>
          
          <!-- Événements -->
          <a href="/evenements" 
             :class="isActive('evenements') ? 'bg-sky-50 text-sky-700 border-r-2 border-sky-500' : 'text-slate-600 hover:bg-slate-50'"
             class="flex items-center gap-3 px-4 py-2.5 mx-2 mt-1 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-bell w-5 text-center"></i>
            <span>Événements</span>
            <span class="ml-auto px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full">3</span>
          </a>
          
          <!-- Smart Marki -->
          <a href="/smart-marki" 
             :class="isActive('smart-marki') ? 'bg-sky-50 text-sky-700 border-r-2 border-sky-500' : 'text-slate-600 hover:bg-slate-50'"
             class="flex items-center gap-3 px-4 py-2.5 mx-2 mt-1 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-brain w-5 text-center"></i>
            <span>Smart Marki</span>
            <span class="ml-auto px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">IA</span>
          </a>
        </nav>
        
        <!-- Footer - Paramètres -->
        <div class="p-4 border-t border-slate-200">
          <a href="/settings" 
             :class="isActive('settings') ? 'text-sky-700' : 'text-slate-600 hover:text-slate-900'"
             class="flex items-center gap-3 text-sm font-medium transition-all">
            <i class="fas fa-cog w-5 text-center"></i>
            <span>Paramètres</span>
          </a>
        </div>
      </div>
    </aside>
    
    <script>
      function logout() {
        localStorage.removeItem('marki_token');
        localStorage.removeItem('marki_user');
        window.location.href = '/login';
      }
    </script>
    `;
  }
}

customElements.define('sidebar-nav-dual', SidebarNavDual);
