/**
 * Composant Sidebar Navigation Dual
 * Navigation à deux niveaux pour Marki
 * Usage: <sidebar-nav-dual page="dashboard"></sidebar-nav-dual>
 */

class SidebarNavDual extends HTMLElement {
  constructor() {
    super();
    this.currentPage = this.getAttribute('page') || 'dashboard';
  }

  connectedCallback() {
    this.innerHTML = this.render();
  }

  render() {
    const navItems = [
      { page: 'dashboard', icon: 'fa-home', label: 'Dashboard', href: '../dashboard/' },
      { page: 'impayes', icon: 'fa-file-invoice-dollar', label: 'Impayés', href: '../impayes/' },
      { page: 'relances', icon: 'fa-envelope', label: 'Relances', href: '../relances/' },
      { page: 'relances-calendrier', icon: 'fa-calendar', label: 'Calendrier', href: '../relances-calendrier/' },
      { page: 'sequences', icon: 'fa-stream', label: 'Séquences', href: '../sequences/' },
      { page: 'contacts', icon: 'fa-users', label: 'Contacts', href: '../contacts/' },
    ];

    const bottomItems = [
      { page: 'evenements', icon: 'fa-bell', label: 'Événements', href: '../evenements/', badge: true },
      { page: 'settings', icon: 'fa-cog', label: 'Paramètres', href: '../settings-smtp/' },
    ];

    const isActive = (page) => this.currentPage === page ? 'active' : '';

    return `
      <aside x-data="sidebarNav()" x-init="init()" 
             class="fixed left-0 top-0 h-screen w-[72px] bg-white border-r border-slate-200 z-50 flex flex-col">
        
        <!-- Logo -->
        <div class="h-16 flex items-center justify-center border-b border-slate-100">
          <a href="../dashboard/" class="w-10 h-10 flex items-center justify-center">
            <img src="./marki-logo.png" alt="Marki" class="w-8 h-8 object-contain"
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=text-xl font-bold text-sky-600>M</span>'">
          </a>
        </div>
        
        <!-- Navigation principale -->
        <nav class="flex-1 py-4 space-y-1 px-2">
          ${navItems.map(item => `
            <a href="${item.href}" 
               title="${item.label}"
               class="sidebar-item ${isActive(item.page)}"
               @mouseenter="hovered = '${item.page}'"
               @mouseleave="hovered = null">
              <i class="fas ${item.icon} text-lg"></i>
              <span x-show="hovered === '${item.page}'" x-transition class="tooltip">${item.label}</span>
            </a>
          `).join('')}
        </nav>
        
        <!-- Section basse -->
        <div class="py-4 border-t border-slate-100 space-y-1 px-2">
          ${bottomItems.map(item => `
            <a href="${item.href}" 
               title="${item.label}"
               class="sidebar-item ${isActive(item.page)}"
               @mouseenter="hovered = '${item.page}'"
               @mouseleave="hovered = null">
              <div class="relative">
                <i class="fas ${item.icon} text-lg"></i>
                ${item.badge ? `
                  <span x-show="unreadCount > 0" 
                        x-text="unreadCount > 9 ? '9+' : unreadCount"
                        class="absolute -top-1 -right-1 w-4 h-4 bg-sky-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  ></span>
                ` : ''}
              </div>
              <span x-show="hovered === '${item.page}'" x-transition class="tooltip">${item.label}</span>
            </a>
          `).join('')}
          
          <a href="#" 
             @click.prevent="logout()"
             class="sidebar-item text-slate-400 hover:text-sky-500"
             @mouseenter="hovered = 'logout'"
             @mouseleave="hovered = null"
             title="Déconnexion">
            <i class="fas fa-sign-out-alt text-lg"></i>
            <span x-show="hovered === 'logout'" x-transition class="tooltip">Déconnexion</span>
          </a>
        </div>
        
        <style>
          .sidebar-item {
            @apply relative flex items-center justify-center h-11 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-all;
          }
          .sidebar-item.active {
            @apply text-sky-500 bg-sky-50;
          }
          .tooltip {
            @apply absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-50;
          }
        </style>
        
      </aside>
      
      <script>
        function sidebarNav() {
          return {
            hovered: null,
            unreadCount: 3,
            
            init() {
              // Charger les événements non lus depuis l'API
            },
            
            logout() {
              if (confirm('Voulez-vous vous déconnecter ?')) {
                localStorage.removeItem('marki_token');
                window.location.href = '../login/';
              }
            }
          }
        }
      </script>
    `;
  }
}

customElements.define('sidebar-nav-dual', SidebarNavDual);
