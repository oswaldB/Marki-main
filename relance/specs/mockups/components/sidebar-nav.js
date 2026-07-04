class SidebarNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.currentPage = '';
  }

  connectedCallback() {
    this.currentPage = this.getAttribute('page') || '';
    this.render();
  }

  static get observedAttributes() {
    return ['page'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && name === 'page') {
      this.currentPage = newValue;
      this.render();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
        
        :host {
          display: block;
          width: 260px;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          background: #ffffff;
          border-right: 1px solid #e5e5e5;
          z-index: 100;
          overflow-y: auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid #e5e5e5;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        
        .logo img {
          height: 32px;
          width: auto;
        }
        
        .logo-text {
          font-size: 20px;
          font-weight: 600;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        
        .nav {
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .nav-section {
          margin-bottom: 16px;
        }
        
        .nav-title {
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          color: #64748b;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          border-radius: 10px;
          transition: all 0.2s;
          margin-bottom: 2px;
        }
        
        .nav-link:hover {
          color: #0ea5e9;
          background: #f0f9ff;
        }
        
        .nav-link.active {
          color: #0ea5e9;
          background: #e0f2fe;
        }
        
        .nav-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        
        .nav-link:hover .nav-icon,
        .nav-link.active .nav-icon {
          color: #0ea5e9;
        }
        
        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #e5e5e5;
          margin-top: auto;
        }
      </style>
      
      <div class="sidebar-header">
        <a href="./index.html" class="logo">
          <img src="marki-logo.png" alt="Marki">
          <span class="logo-text">Marki</span>
        </a>
      </div>
      
      <nav class="nav">
        <div class="nav-section">
          <div class="nav-title">Menu principal</div>
          
          <a href="./dashboard.html" class="nav-link ${this.currentPage === 'dashboard' ? 'active' : ''}">
            <span class="nav-icon"><i class="fas fa-chart-line"></i></span>
            <span>Dashboard</span>
          </a>
          
          <a href="./impayes.html" class="nav-link ${this.currentPage.startsWith('impayes') ? 'active' : ''}">
            <span class="nav-icon"><i class="fas fa-file-invoice"></i></span>
            <span>Impayés</span>
          </a>
          
          <a href="./relances.html" class="nav-link ${this.currentPage.startsWith('relances') ? 'active' : ''}">
            <span class="nav-icon"><i class="fas fa-envelope"></i></span>
            <span>Relances</span>
          </a>
          
          <a href="./suivi.html" class="nav-link ${this.currentPage.startsWith('suivi') ? 'active' : ''}">
            <span class="nav-icon"><i class="fas fa-eye"></i></span>
            <span>Suivi</span>
          </a>
          
          <a href="./sequences.html" class="nav-link ${this.currentPage.startsWith('sequences') ? 'active' : ''}">
            <span class="nav-icon"><i class="fas fa-sync-alt"></i></span>
            <span>Séquences</span>
          </a>
          
          <a href="./contacts.html" class="nav-link ${this.currentPage.startsWith('contacts') ? 'active' : ''}">
            <span class="nav-icon"><i class="fas fa-users"></i></span>
            <span>Contacts</span>
          </a>
        </div>
        
        <div class="nav-section">
          <div class="nav-title">Configuration</div>
          
          <a href="./settings-smtp.html" class="nav-link ${this.currentPage.startsWith('settings') ? 'active' : ''}">
            <span class="nav-icon"><i class="fas fa-cog"></i></span>
            <span>Paramètres</span>
          </a>
          
          <a href="./portail-mission.html" class="nav-link ${this.currentPage.startsWith('portail') ? 'active' : ''}">
            <span class="nav-icon"><i class="fas fa-globe"></i></span>
            <span>Portails</span>
          </a>
        </div>
      </nav>
      
      <div class="sidebar-footer">
        <a href="./login.html" class="nav-link ${this.currentPage === 'login' ? 'active' : ''}">
          <span class="nav-icon"><i class="fas fa-sign-in-alt"></i></span>
          <span>Connexion</span>
        </a>
      </div>
    `;
  }
}

customElements.define('sidebar-nav', SidebarNav);
