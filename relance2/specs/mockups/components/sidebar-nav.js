class SidebarNav extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    const currentPage = this.getAttribute('page') || '';
    
    this.innerHTML = `
      <aside 
        x-data="{
          current: '${currentPage}',
          url: window.location.pathname + window.location.search,
          expanded: { impayes: false, relances: false },
          
          isActive(page) {
            if (page === this.current) return true;
            if (page === 'impayes' && this.url.includes('impayes.html') && !this.url.includes('payeur') && !this.url.includes('suspendus')) return true;
            if (page === 'impayes-payeur' && this.url.includes('impayes-payeur')) return true;
            if (page === 'relances-liste' && this.url.includes('relances.html') && !this.url.includes('calendrier') && !this.url.includes('validation')) return true;
            if (page === 'relances-calendrier' && this.url.includes('relances-calendrier')) return true;
            if (page === 'relances-validation' && this.url.includes('relances-validation')) return true;
            if (page === 'impayes-suspendus' && this.url.includes('impayes-suspendus')) return true;
            return false;
          },
          
          isActiveSection(section) {
            if (this.current.startsWith(section)) return true;
            if (this.url.includes(section)) return true;
            return false;
          },
          
          toggle(section) {
            this.expanded[section] = !this.expanded[section];
          },
          
          init() {
            // Auto-expand sections basées sur l'URL
            if (this.url.includes('impayes')) this.expanded.impayes = true;
            if (this.url.includes('relances')) this.expanded.relances = true;
          }
        }"
        x-init="init()"
        class="fixed left-0 top-0 z-[100] flex h-screen w-[264px] flex-col border-r border-gray-200 bg-white font-sans"
      >
        <!-- Header -->
        <div class="flex h-16 items-center border-b border-gray-200 px-6">
          <a href="./index.html" class="flex items-center gap-3 no-underline text-inherit">
            <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
              <img src="./marki-logo.png" alt="Marki" class="h-full w-full object-contain">
            </div>
            <span class="text-lg font-semibold tracking-tight text-gray-900">Marki</span>
          </a>
        </div>
        
        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto px-3 py-4">
          <!-- Dashboard Section -->
          <div class="mb-2">
            <div class="flex flex-col gap-0.5">
              <a 
                href="./dashboard.html" 
                :class="isActive('dashboard') ? 'bg-sky-50 text-sky-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
              >
                <span class="flex h-5 w-5 items-center justify-center text-base" :class="isActive('dashboard') ? 'text-sky-600' : ''">
                  <i class="fas fa-home"></i>
                </span>
                <span>Dashboard</span>
              </a>
              
              <a 
                href="./smart-marki.html" 
                :class="isActive('smart-marki') ? 'bg-sky-50 text-sky-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
              >
                <span class="flex h-5 w-5 items-center justify-center text-base" :class="isActive('smart-marki') ? 'text-sky-600' : ''">
                  <i class="fas fa-brain"></i>
                </span>
                <span>Smart Marki</span>
                <span class="ml-auto flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">5</span>
              </a>
              
              <a 
                href="./evenements.html" 
                :class="isActive('evenements') ? 'bg-sky-50 text-sky-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
              >
                <span class="flex h-5 w-5 items-center justify-center text-base" :class="isActive('evenements') ? 'text-sky-600' : ''">
                  <i class="fas fa-bell"></i>
                </span>
                <span>Événements</span>
                <span class="ml-auto flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">5</span>
              </a>
            </div>
          </div>
          
          <!-- Impayés Section -->
          <div class="mb-2">
            <div class="flex flex-col gap-0.5">
              <button 
                @click="toggle('impayes')"
                :class="isActiveSection('impayes') ? 'bg-sky-50 text-sky-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150"
              >
                <span class="flex h-5 w-5 items-center justify-center text-base" :class="isActiveSection('impayes') ? 'text-sky-600' : ''">
                  <i class="fas fa-file-invoice-dollar"></i>
                </span>
                <span>Impayés</span>
                <i class="fas fa-chevron-down ml-auto text-xs transition-transform" :class="expanded.impayes ? 'rotate-180' : ''"></i>
              </button>
            </div>
            
            <!-- Subnav -->
            <div 
              x-show="expanded.impayes" 
              x-transition:enter="transition ease-out duration-150"
              x-transition:enter-start="opacity-0 -translate-y-1"
              x-transition:enter-end="opacity-100 translate-y-0"
              x-transition:leave="transition ease-in duration-100"
              x-transition:leave-start="opacity-100 translate-y-0"
              x-transition:leave-end="opacity-0 -translate-y-1"
              class="ml-8 mt-1 flex flex-col gap-0.5 border-l-2 border-gray-200 pl-2"
              :class="isActiveSection('impayes') ? 'border-sky-600' : ''"
            >
              <a 
                href="./impayes.html" 
                :class="isActive('impayes') ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
                class="relative flex items-center gap-2 rounded-md py-1.5 pl-3 pr-2.5 text-xs font-medium transition-all duration-150"
              >
                <span 
                  class="absolute -left-2.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full"
                  :class="isActive('impayes') ? 'bg-sky-600' : 'bg-gray-400'"
                ></span>
                Vue Liste
              </a>
              <a 
                href="./impayes-payeur.html" 
                :class="isActive('impayes-payeur') ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
                class="relative flex items-center gap-2 rounded-md py-1.5 pl-3 pr-2.5 text-xs font-medium transition-all duration-150"
              >
                <span 
                  class="absolute -left-2.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full"
                  :class="isActive('impayes-payeur') ? 'bg-sky-600' : 'bg-gray-400'"
                ></span>
                Par Payeur
              </a>
              <a 
                href="./impayes-suspendus.html" 
                :class="isActive('impayes-suspendus') ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
                class="relative flex items-center gap-2 rounded-md py-1.5 pl-3 pr-2.5 text-xs font-medium transition-all duration-150"
              >
                <span 
                  class="absolute -left-2.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full"
                  :class="isActive('impayes-suspendus') ? 'bg-sky-600' : 'bg-gray-400'"
                ></span>
                Suspendus
              </a>
            </div>
          </div>
          
          <!-- Relances Section -->
          <div class="mb-2">
            <div class="flex flex-col gap-0.5">
              <button 
                @click="toggle('relances')"
                :class="isActiveSection('relances') ? 'bg-sky-50 text-sky-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150"
              >
                <span class="flex h-5 w-5 items-center justify-center text-base" :class="isActiveSection('relances') ? 'text-sky-600' : ''">
                  <i class="fas fa-paper-plane"></i>
                </span>
                <span>Relances</span>
                <i class="fas fa-chevron-down ml-auto text-xs transition-transform" :class="expanded.relances ? 'rotate-180' : ''"></i>
              </button>
            </div>
            
            <!-- Subnav -->
            <div 
              x-show="expanded.relances" 
              x-transition:enter="transition ease-out duration-150"
              x-transition:enter-start="opacity-0 -translate-y-1"
              x-transition:enter-end="opacity-100 translate-y-0"
              x-transition:leave="transition ease-in duration-100"
              x-transition:leave-start="opacity-100 translate-y-0"
              x-transition:leave-end="opacity-0 -translate-y-1"
              class="ml-8 mt-1 flex flex-col gap-0.5 border-l-2 border-gray-200 pl-2"
              :class="isActiveSection('relances') ? 'border-sky-600' : ''"
            >
              <a 
                href="./relances.html" 
                :class="isActive('relances-liste') ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
                class="relative flex items-center gap-2 rounded-md py-1.5 pl-3 pr-2.5 text-xs font-medium transition-all duration-150"
              >
                <span 
                  class="absolute -left-2.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full"
                  :class="isActive('relances-liste') ? 'bg-sky-600' : 'bg-gray-400'"
                ></span>
                Vue Liste
              </a>
              <a 
                href="./relances-calendrier.html" 
                :class="isActive('relances-calendrier') ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
                class="relative flex items-center gap-2 rounded-md py-1.5 pl-3 pr-2.5 text-xs font-medium transition-all duration-150"
              >
                <span 
                  class="absolute -left-2.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full"
                  :class="isActive('relances-calendrier') ? 'bg-sky-600' : 'bg-gray-400'"
                ></span>
                Calendrier
              </a>
              <a 
                href="./relances-validation.html" 
                :class="isActive('relances-validation') ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
                class="relative flex items-center gap-2 rounded-md py-1.5 pl-3 pr-2.5 text-xs font-medium transition-all duration-150"
              >
                <span 
                  class="absolute -left-2.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full"
                  :class="isActive('relances-validation') ? 'bg-sky-600' : 'bg-gray-400'"
                ></span>
                À Valider
              </a>
            </div>
          </div>
          
          <!-- Contacts Section -->
          <div class="mb-2">
            <div class="flex flex-col gap-0.5">
              <a 
                href="./contacts.html" 
                :class="isActive('contacts') ? 'bg-sky-50 text-sky-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
              >
                <span class="flex h-5 w-5 items-center justify-center text-base" :class="isActive('contacts') ? 'text-sky-600' : ''">
                  <i class="fas fa-address-book"></i>
                </span>
                <span>Contacts</span>
              </a>
            </div>
          </div>
          
          <!-- Settings Section -->
          <div class="mb-2">
            <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Paramètres</div>
            <div class="flex flex-col gap-0.5">
              <a 
                href="./sequences.html" 
                :class="isActive('sequences') ? 'bg-sky-50 text-sky-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
              >
                <span class="flex h-5 w-5 items-center justify-center text-base" :class="isActive('sequences') ? 'text-sky-600' : ''">
                  <i class="fas fa-stream"></i>
                </span>
                <span>Séquences</span>
              </a>
              
              <a 
                href="./settings-smtp.html" 
                :class="isActive('settings-smtp') ? 'bg-sky-50 text-sky-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
              >
                <span class="flex h-5 w-5 items-center justify-center text-base" :class="isActive('settings-smtp') ? 'text-sky-600' : ''">
                  <i class="fas fa-envelope"></i>
                </span>
                <span>SMTP</span>
              </a>
              
              <a 
                href="./settings-utilisateurs.html" 
                :class="isActive('settings-utilisateurs') ? 'bg-sky-50 text-sky-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
              >
                <span class="flex h-5 w-5 items-center justify-center text-base" :class="isActive('settings-utilisateurs') ? 'text-sky-600' : ''">
                  <i class="fas fa-users-cog"></i>
                </span>
                <span>Utilisateurs</span>
              </a>
            </div>
          </div>
        </nav>
        
        <!-- Footer / User Menu -->
        <div class="border-t border-gray-200 p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-600">AD</div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium text-gray-900">admin@marki.fr</div>
              <div class="text-xs text-gray-500">Administrateur</div>
            </div>
            <a 
              href="./login.html" 
              class="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-gray-600"
              title="Déconnexion"
            >
              <i class="fas fa-sign-out-alt"></i>
            </a>
          </div>
        </div>
      </aside>
    `;
  }
}

customElements.define('sidebar-nav', SidebarNav);
