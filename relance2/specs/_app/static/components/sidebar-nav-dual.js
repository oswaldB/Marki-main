class SidebarNavDual extends HTMLElement {
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
          activeRail: 'relance',
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
          
          switchApp(rail) {
            this.activeRail = rail;
          },
          
          init() {
            // Auto-detect active app based on URL
            if (this.url.includes('tantiem')) this.activeRail = 'tantiem';
            else if (this.url.includes('commande')) this.activeRail = 'commande';
            else if (this.url.includes('regie')) this.activeRail = 'regie';
            else if (this.url.includes('commissions')) this.activeRail = 'commissions';
            else if (this.url.includes('agenda-optimise')) this.activeRail = 'agenda-optimise';
            else if (this.url.includes('portail')) this.activeRail = 'portail';
            else this.activeRail = 'relance';
            
            // Auto-expand sections based on URL
            if (this.url.includes('impayes')) this.expanded.impayes = true;
            if (this.url.includes('relances')) this.expanded.relances = true;
          }
        }"
        x-init="init()"
        class="fixed left-0 top-0 z-[100] flex h-screen font-sans"
      >
        <!-- Colonne 1 : Rail etroit (64px) -->
        <div class="flex h-full w-16 flex-col items-center border-r border-gray-200 bg-gray-50 py-3">
          
          <!-- Logo Marki (statique, en haut) -->
          <div class="flex h-11 w-11 items-center justify-center rounded-xl mb-4" title="Marki">
            <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
              <img src="./marki-logo.png" alt="Marki" class="h-full w-full object-contain">
            </div>
          </div>
          
          <!-- Divider -->
          <div class="w-10 h-px bg-gray-200 mb-3"></div>
          
          <!-- App 1 : Relance -->
          <button 
            @click="switchApp('relance')"
            :class="activeRail === 'relance' ? 'bg-white shadow-md ring-2 ring-sky-200' : 'hover:bg-white hover:shadow-sm'"
            class="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 mb-2"
            title="Relance"
          >
            <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-sky-500">
              <span class="text-white font-bold text-xs">RE</span>
            </div>
          </button>
          
          <!-- App 2 : Tantiem Manager -->
          <button 
            @click="switchApp('tantiem')"
            :class="activeRail === 'tantiem' ? 'bg-white shadow-md ring-2 ring-emerald-200' : 'hover:bg-white hover:shadow-sm'"
            class="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 mb-2"
            title="Tantiem Manager"
          >
            <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-emerald-500">
              <span class="text-white font-bold text-xs">TM</span>
            </div>
          </button>
          
          <!-- App 3 : Commande plus -->
          <button 
            @click="switchApp('commande')"
            :class="activeRail === 'commande' ? 'bg-white shadow-md ring-2 ring-violet-200' : 'hover:bg-white hover:shadow-sm'"
            class="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 mb-2"
            title="Commande plus"
          >
            <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-violet-500">
              <span class="text-white font-bold text-xs">CP</span>
            </div>
          </button>
          
          <!-- App 4 : Régie totale -->
          <button 
            @click="switchApp('regie')"
            :class="activeRail === 'regie' ? 'bg-white shadow-md ring-2 ring-amber-200' : 'hover:bg-white hover:shadow-sm'"
            class="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 mb-2"
            title="Régie totale"
          >
            <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-amber-500">
              <span class="text-white font-bold text-xs">RT</span>
            </div>
          </button>
          
          <!-- App 5 : Commissions transparentes -->
          <button 
            @click="switchApp('commissions')"
            :class="activeRail === 'commissions' ? 'bg-white shadow-md ring-2 ring-orange-200' : 'hover:bg-white hover:shadow-sm'"
            class="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 mb-2"
            title="Commissions transparentes"
          >
            <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-orange-500">
              <span class="text-white font-bold text-xs">CT</span>
            </div>
          </button>
          
          <!-- App 6 : Agenda optimisé -->
          <button 
            @click="switchApp('agenda-optimise')"
            :class="activeRail === 'agenda-optimise' ? 'bg-white shadow-md ring-2 ring-cyan-200' : 'hover:bg-white hover:shadow-sm'"
            class="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 mb-2"
            title="Agenda optimisé"
          >
            <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-cyan-500">
              <span class="text-white font-bold text-xs">AO</span>
            </div>
          </button>
          
          <!-- App 7 : Portail client -->
          <button 
            @click="switchApp('portail')"
            :class="activeRail === 'portail' ? 'bg-white shadow-md ring-2 ring-indigo-200' : 'hover:bg-white hover:shadow-sm'"
            class="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200"
            title="Portail client"
          >
            <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-indigo-500">
              <span class="text-white font-bold text-xs">PC</span>
            </div>
          </button>
          
          <!-- Spacer -->
          <div class="flex-1"></div>
          
          <!-- Deconnexion -->
          <a 
            href="./login.html"
            class="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition-all duration-200 hover:bg-white hover:shadow-sm hover:text-gray-600"
          >
            <i class="fas fa-sign-out-alt"></i>
          </a>
        </div>
        
        <!-- Colonne 2 : Menu detaille (220px) -->
        <div class="flex h-full w-[220px] flex-col border-r border-gray-200 bg-white">
          
          <!-- Header avec titre de l'outil -->
          <div class="flex h-14 items-center px-5 border-b border-gray-100">
            <template x-if="activeRail === 'relance'">
              <div class="flex items-center gap-2.5">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100">
                  <span class="text-sky-600 font-bold text-xs">RE</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">Relance</span>
              </div>
            </template>
            <template x-if="activeRail === 'tantiem'">
              <div class="flex items-center gap-2.5">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                  <span class="text-emerald-600 font-bold text-xs">TM</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">Tantiem Manager</span>
              </div>
            </template>
            <template x-if="activeRail === 'commande'">
              <div class="flex items-center gap-2.5">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
                  <span class="text-violet-600 font-bold text-xs">CP</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">Commande plus</span>
              </div>
            </template>
            <template x-if="activeRail === 'regie'">
              <div class="flex items-center gap-2.5">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
                  <span class="text-amber-600 font-bold text-xs">RT</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">Régie totale</span>
              </div>
            </template>
            
            <template x-if="activeRail === 'commissions'">
              <div class="flex items-center gap-2.5">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100">
                  <span class="text-orange-600 font-bold text-xs">CT</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">Commissions transparentes</span>
              </div>
            </template>
            
            <template x-if="activeRail === 'agenda-optimise'">
              <div class="flex items-center gap-2.5">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100">
                  <span class="text-cyan-600 font-bold text-xs">AO</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">Agenda optimisé</span>
              </div>
            </template>
            
            <template x-if="activeRail === 'portail'">
              <div class="flex items-center gap-2.5">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100">
                  <span class="text-indigo-600 font-bold text-xs">PC</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">Portail client</span>
              </div>
            </template>
          </div>
          
          <!-- Navigation -->
          <nav class="flex-1 overflow-y-auto px-3 py-4">
            
            <!-- Relance Menu (le menu Marki original) -->
            <template x-if="activeRail === 'relance'">
              <div>
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
              </div>
            </template>
            
            <!-- Tantiem Manager Menu -->
            <template x-if="activeRail === 'tantiem'">
              <div class="flex h-full items-center justify-center px-4">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <span class="text-emerald-600 font-bold text-sm">TM</span>
                  </div>
                  <p class="text-sm font-medium text-gray-900 mb-1">Tantiem Manager</p>
                  <p class="text-xs text-gray-400">ne fait pas partie de vos abonnements</p>
                </div>
              </div>
            </template>
            
            <!-- Commande plus Menu -->
            <template x-if="activeRail === 'commande'">
              <div class="flex h-full items-center justify-center px-4">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-violet-100 flex items-center justify-center">
                    <span class="text-violet-600 font-bold text-sm">CP</span>
                  </div>
                  <p class="text-sm font-medium text-gray-900 mb-1">Commande plus</p>
                  <p class="text-xs text-gray-400">ne fait pas partie de vos abonnements</p>
                </div>
              </div>
            </template>
            
            <!-- Régie totale Menu -->
            <template x-if="activeRail === 'regie'">
              <div class="flex h-full items-center justify-center px-4">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-100 flex items-center justify-center">
                    <span class="text-amber-600 font-bold text-sm">RT</span>
                  </div>
                  <p class="text-sm font-medium text-gray-900 mb-1">Régie totale</p>
                  <p class="text-xs text-gray-400">ne fait pas partie de vos abonnements</p>
                </div>
              </div>
            </template>
            
            <!-- Commissions transparentes Menu -->
            <template x-if="activeRail === 'commissions'">
              <div class="flex h-full items-center justify-center px-4">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-orange-100 flex items-center justify-center">
                    <span class="text-orange-600 font-bold text-sm">CT</span>
                  </div>
                  <p class="text-sm font-medium text-gray-900 mb-1">Commissions transparentes</p>
                  <p class="text-xs text-gray-400">ne fait pas partie de vos abonnements</p>
                </div>
              </div>
            </template>
            
            <!-- Agenda optimisé Menu -->
            <template x-if="activeRail === 'agenda-optimise'">
              <div class="flex h-full items-center justify-center px-4">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-cyan-100 flex items-center justify-center">
                    <span class="text-cyan-600 font-bold text-sm">AO</span>
                  </div>
                  <p class="text-sm font-medium text-gray-900 mb-1">Agenda optimisé</p>
                  <p class="text-xs text-gray-400">ne fait pas partie de vos abonnements</p>
                </div>
              </div>
            </template>
            
            <!-- Portail client Menu -->
            <template x-if="activeRail === 'portail'">
              <div class="flex h-full items-center justify-center px-4">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <span class="text-indigo-600 font-bold text-sm">PC</span>
                  </div>
                  <p class="text-sm font-medium text-gray-900 mb-1">Portail client</p>
                  <p class="text-xs text-gray-400">ne fait pas partie de vos abonnements</p>
                </div>
              </div>
            </template>
          </nav>
          
          <!-- Footer -->
          <div class="border-t border-gray-200 p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-600">AD</div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-gray-900">admin@marki.fr</div>
                <div class="text-xs text-gray-500">Administrateur</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    `;
  }
}

customElements.define('sidebar-nav-dual', SidebarNavDual);
