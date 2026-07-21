/**
 * Mega-fonction du workflow contacts-page
 * Source: specs/workflows/frontend/contacts/*.md
 * Framework: Alpine.js
 */

document.addEventListener('alpine:init', () => {
  Alpine.data('contactsPage', () => ({
    // State UI
    loadingPhysiques: false,
    loadingMorales: false,
    loadingBlacklist: false,
    loadingSansEmail: false,
    
    searchQuery: '',
    filterType: 'all',
    
    // Pagination indépendante pour chaque tableau
    currentPagePhysiques: 1,
    currentPageMorales: 1,
    currentPageBlacklist: 1,
    currentPageSansEmail: 1,
    itemsPerPage: 10,
    
    sortField: 'dateImpaye',
    sortDirection: 'desc',
    
    // Modals
    showDetailSlideover: false,
    showImpayesModal: false,
    showSetEmailForceModal: false,
    selectedContact: null,
    selectedContactForImpayes: null,
    selectedContactForEmailForce: null,
    emailForceMode: 'select',
    selectedContactEmail: '',
    manualEmailForce: '',
    emailForceSearchQuery: '',
    emailForceSearchResults: [],
    exportNotification: { show: false },
    
    // Data séparée par tableau
    contactsPhysiques: [],
    contactsMorales: [],
    contactsBlacklist: [],
    contactsSansEmail: [],
    
    // Stats
    stats: { 
      total: 0, 
      avecImpayes: 0, 
      personnesPhysiques: 0, 
      personnesMorales: 0, 
      blacklist: 0, 
      sansEmail: 0 
    },
    error: null,

    // ============ LIFECYCLE ============
    
    async init() {
      this.filterType = 'all';
      this.currentPagePhysiques = 1;
      this.currentPageMorales = 1;
      this.currentPageBlacklist = 1;
      this.currentPageSansEmail = 1;
      console.log('[CHECKPOINT]', 'state-initialized');

      // Charger tous les tableaux en parallèle
      await this.loadAllTables();
    },
    
    async loadAllTables() {
      /**
       * @action Charger les 4 tableaux indépendamment
       */
      console.log('[CHECKPOINT]', 'loading-all-tables');
      
      try {
        await Promise.all([
          this.loadPhysiques(),
          this.loadMorales(),
          this.loadBlacklist(),
          this.loadSansEmail()
        ]);
        await this.loadStats();
      } catch (err) {
        console.error('[ERROR] loadAllTables:', err);
      }
    },

    // ============ WORKFLOWS FRONTEND SÉPARÉS ============
    
    /**
     * WORKFLOW: load-contact-p
     * Charge les personnes physiques depuis l'API
     */
    async workflowLoadContactP() {
      /**
       * @action Initialiser le workflow personnes physiques
       * @checkpoint wf-p-init
       */
      this.loadingPhysiques = true;
      this.contactsPhysiques = [];
      console.log('[CHECKPOINT]', 'wf-p-init');
      
      try {
        /**
         * @action Construire l'URL avec paramètres
         * @checkpoint wf-p-url-built
         */
        const params = { statut: 'P' };
        if (this.searchQuery?.trim()) params.search = this.searchQuery.trim();
        console.log('[CHECKPOINT]', 'wf-p-url-built', params);
        
        /**
         * @action Fetch API /api/contacts?statut=P
         * @checkpoint wf-p-api-called
         */
        const data = await this.fetchContacts(params);
        console.log('[CHECKPOINT]', 'wf-p-api-called', { count: data.contacts?.length || 0 });
        
        /**
         * @action Normaliser les données reçues
         * @checkpoint wf-p-data-normalized
         */
        this.contactsPhysiques = (data.contacts || []).map(c => this.normalizeContact(c));
        console.log('[CHECKPOINT]', 'wf-p-data-normalized', { count: this.contactsPhysiques.length });
        
        /**
         * @action Workflow terminé avec succès
         * @checkpoint wf-p-complete
         */
        console.log('[CHECKPOINT]', 'wf-p-complete', { 
          count: this.contactsPhysiques.length,
          page: this.currentPagePhysiques 
        });
        
      } catch (err) {
        /**
         * @action Gestion d'erreur du workflow
         * @checkpoint wf-p-error
         */
        console.error('[CHECKPOINT]', 'wf-p-error', { message: err.message });
        this.contactsPhysiques = [];
      } finally {
        this.loadingPhysiques = false;
      }
    },
    
    /**
     * WORKFLOW: load-contact-m
     * Charge les personnes morales depuis l'API
     */
    async workflowLoadContactM() {
      /**
       * @action Initialiser le workflow personnes morales
       * @checkpoint wf-m-init
       */
      this.loadingMorales = true;
      this.contactsMorales = [];
      console.log('[CHECKPOINT]', 'wf-m-init');
      
      try {
        /**
         * @action Construire l'URL avec paramètres
         * @checkpoint wf-m-url-built
         */
        const params = { statut: 'M' };
        if (this.searchQuery?.trim()) params.search = this.searchQuery.trim();
        console.log('[CHECKPOINT]', 'wf-m-url-built', params);
        
        /**
         * @action Fetch API /api/contacts?statut=M
         * @checkpoint wf-m-api-called
         */
        const data = await this.fetchContacts(params);
        console.log('[CHECKPOINT]', 'wf-m-api-called', { count: data.contacts?.length || 0 });
        
        /**
         * @action Normaliser les données reçues
         * @checkpoint wf-m-data-normalized
         */
        this.contactsMorales = (data.contacts || []).map(c => this.normalizeContact(c));
        console.log('[CHECKPOINT]', 'wf-m-data-normalized', { count: this.contactsMorales.length });
        
        /**
         * @action Workflow terminé avec succès
         * @checkpoint wf-m-complete
         */
        console.log('[CHECKPOINT]', 'wf-m-complete', { 
          count: this.contactsMorales.length,
          page: this.currentPageMorales 
        });
        
      } catch (err) {
        /**
         * @action Gestion d'erreur du workflow
         * @checkpoint wf-m-error
         */
        console.error('[CHECKPOINT]', 'wf-m-error', { message: err.message });
        this.contactsMorales = [];
      } finally {
        this.loadingMorales = false;
      }
    },
    
    /**
     * WORKFLOW: load-blacklist
     * Charge les contacts blacklistés depuis l'API
     */
    async workflowLoadBlacklist() {
      /**
       * @action Initialiser le workflow blacklist
       * @checkpoint wf-blacklist-init
       */
      this.loadingBlacklist = true;
      this.contactsBlacklist = [];
      console.log('[CHECKPOINT]', 'wf-blacklist-init');
      
      try {
        /**
         * @action Construire l'URL avec paramètres
         * @checkpoint wf-blacklist-url-built
         */
        const params = { is_blacklisted: '1' };
        if (this.searchQuery?.trim()) params.search = this.searchQuery.trim();
        console.log('[CHECKPOINT]', 'wf-blacklist-url-built', params);
        
        /**
         * @action Fetch API /api/contacts?is_blacklisted=1
         * @checkpoint wf-blacklist-api-called
         */
        const data = await this.fetchContacts(params);
        console.log('[CHECKPOINT]', 'wf-blacklist-api-called', { count: data.contacts?.length || 0 });
        
        /**
         * @action Normaliser les données reçues
         * @checkpoint wf-blacklist-data-normalized
         */
        this.contactsBlacklist = (data.contacts || []).map(c => this.normalizeContact(c));
        console.log('[CHECKPOINT]', 'wf-blacklist-data-normalized', { count: this.contactsBlacklist.length });
        
        /**
         * @action Workflow terminé avec succès
         * @checkpoint wf-blacklist-complete
         */
        console.log('[CHECKPOINT]', 'wf-blacklist-complete', { 
          count: this.contactsBlacklist.length,
          page: this.currentPageBlacklist 
        });
        
      } catch (err) {
        /**
         * @action Gestion d'erreur du workflow
         * @checkpoint wf-blacklist-error
         */
        console.error('[CHECKPOINT]', 'wf-blacklist-error', { message: err.message });
        this.contactsBlacklist = [];
      } finally {
        this.loadingBlacklist = false;
      }
    },
    
    /**
     * WORKFLOW: load-sans-email
     * Charge les contacts sans email depuis l'API
     */
    async workflowLoadSansEmail() {
      /**
       * @action Initialiser le workflow sans-email
       * @checkpoint wf-sans-email-init
       */
      this.loadingSansEmail = true;
      this.contactsSansEmail = [];
      console.log('[CHECKPOINT]', 'wf-sans-email-init');
      
      try {
        /**
         * @action Construire l'URL avec paramètres
         * @checkpoint wf-sans-email-url-built
         */
        const params = { sans_email: '1' };
        if (this.searchQuery?.trim()) params.search = this.searchQuery.trim();
        console.log('[CHECKPOINT]', 'wf-sans-email-url-built', params);
        
        /**
         * @action Fetch API /api/contacts?sans_email=1
         * @checkpoint wf-sans-email-api-called
         */
        const data = await this.fetchContacts(params);
        console.log('[CHECKPOINT]', 'wf-sans-email-api-called', { count: data.contacts?.length || 0 });
        
        /**
         * @action Normaliser les données reçues
         * @checkpoint wf-sans-email-data-normalized
         */
        this.contactsSansEmail = (data.contacts || []).map(c => this.normalizeContact(c));
        console.log('[CHECKPOINT]', 'wf-sans-email-data-normalized', { count: this.contactsSansEmail.length });
        
        /**
         * @action Workflow terminé avec succès
         * @checkpoint wf-sans-email-complete
         */
        console.log('[CHECKPOINT]', 'wf-sans-email-complete', { 
          count: this.contactsSansEmail.length,
          page: this.currentPageSansEmail 
        });
        
      } catch (err) {
        /**
         * @action Gestion d'erreur du workflow
         * @checkpoint wf-sans-email-error
         */
        console.error('[CHECKPOINT]', 'wf-sans-email-error', { message: err.message });
        this.contactsSansEmail = [];
      } finally {
        this.loadingSansEmail = false;
      }
    },
    
    // ============ ORCHESTRATEUR ============
    
    async loadAllTables() {
      /**
       * @action Orchestrateur - Lance les 4 workflows en parallèle
       * @checkpoint orchestrator-start
       */
      console.log('[CHECKPOINT]', 'orchestrator-start');
      
      try {
        await Promise.all([
          this.workflowLoadContactP(),
          this.workflowLoadContactM(),
          this.workflowLoadBlacklist(),
          this.workflowLoadSansEmail()
        ]);
        
        /**
         * @action Tous les workflows terminés
         * @checkpoint orchestrator-all-complete
         */
        await this.loadStats();
        console.log('[CHECKPOINT]', 'orchestrator-all-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT]', 'orchestrator-error', { message: err.message });
      }
    },

    // ============ SEARCH ============
    
    async searchContacts() {
      /**
       * @action Recherche avec debounce - relance tous les workflows
       * @checkpoint search-triggered
       */
      this.currentPagePhysiques = 1;
      this.currentPageMorales = 1;
      this.currentPageBlacklist = 1;
      this.currentPageSansEmail = 1;
      console.log('[CHECKPOINT]', 'search-triggered', { query: this.searchQuery });
      await this.loadAllTables();
    },
    
    async fetchContacts(params = {}) {
      /**
       * @action Helper pour faire les requêtes API
       */
      const token = localStorage.getItem('marki_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) urlParams.append(key, value);
      });
      
      const url = '/api/contacts/' + (urlParams.toString() ? '?' + urlParams.toString() : '');
      
      const response = await fetch(url, { headers });
      
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Non authentifié');
      }
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      
      return await response.json();
    },

    async loadStats() {
      /**
       * @action Calculer les stats globales
       */
      this.stats = {
        personnesPhysiques: this.contactsPhysiques.length,
        personnesMorales: this.contactsMorales.length,
        blacklist: this.contactsBlacklist.length,
        sansEmail: this.contactsSansEmail.length,
        total: this.contactsPhysiques.length + this.contactsMorales.length,
        avecImpayes: [
          ...this.contactsPhysiques, 
          ...this.contactsMorales
        ].filter(c => (c.impayes_count || c.impayesCount || 0) > 0).length
      };
      console.log('[CHECKPOINT]', 'stats-fetched', this.stats);
    },

    // ============ COMPUTED PROPERTIES ============
    
    // Personnes physiques - pagination
    get paginatedContactsPhysiques() {
      const start = (this.currentPagePhysiques - 1) * this.itemsPerPage;
      const sorted = this.sortContacts(this.contactsPhysiques);
      return sorted.slice(start, start + this.itemsPerPage);
    },
    
    get totalPagesPhysiques() {
      return Math.ceil(this.contactsPhysiques.length / this.itemsPerPage) || 1;
    },
    
    get visiblePagesPhysiques() {
      return this.getVisiblePages(this.currentPagePhysiques, this.totalPagesPhysiques);
    },
    
    // Personnes morales - pagination
    get paginatedContactsMorales() {
      const start = (this.currentPageMorales - 1) * this.itemsPerPage;
      const sorted = this.sortContacts(this.contactsMorales);
      return sorted.slice(start, start + this.itemsPerPage);
    },
    
    get totalPagesMorales() {
      return Math.ceil(this.contactsMorales.length / this.itemsPerPage) || 1;
    },
    
    get visiblePagesMorales() {
      return this.getVisiblePages(this.currentPageMorales, this.totalPagesMorales);
    },
    
    // Blacklist - pagination
    get paginatedContactsBlacklist() {
      const start = (this.currentPageBlacklist - 1) * this.itemsPerPage;
      return this.contactsBlacklist.slice(start, start + this.itemsPerPage);
    },
    
    get totalPagesBlacklist() {
      return Math.ceil(this.contactsBlacklist.length / this.itemsPerPage) || 1;
    },
    
    get visiblePagesBlacklist() {
      return this.getVisiblePages(this.currentPageBlacklist, this.totalPagesBlacklist);
    },
    
    // Sans email - pagination
    get paginatedContactsSansEmail() {
      const start = (this.currentPageSansEmail - 1) * this.itemsPerPage;
      return this.contactsSansEmail.slice(start, start + this.itemsPerPage);
    },
    
    get totalPagesSansEmail() {
      return Math.ceil(this.contactsSansEmail.length / this.itemsPerPage) || 1;
    },
    
    get visiblePagesSansEmail() {
      return this.getVisiblePages(this.currentPageSansEmail, this.totalPagesSansEmail);
    },
    
    sortContacts(contacts) {
      /**
       * @action Trier les contacts selon le champ et direction
       */
      const sorted = [...contacts];
      
      if (this.sortField === 'dateImpaye') {
        sorted.sort((a, b) => {
          const dateA = a.date_dernier_impaye || a.dateDernierImpaye ? new Date(a.date_dernier_impaye || a.dateDernierImpaye) : new Date(0);
          const dateB = b.date_dernier_impaye || b.dateDernierImpaye ? new Date(b.date_dernier_impaye || b.dateDernierImpaye) : new Date(0);
          return this.sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        });
      } else if (this.sortField === 'impayesCount') {
        sorted.sort((a, b) => {
          const countA = a.impayes_count || a.impayesCount || 0;
          const countB = b.impayes_count || b.impayesCount || 0;
          return this.sortDirection === 'asc' ? countA - countB : countB - countA;
        });
      }
      
      return sorted;
    },
    
    getVisiblePages(currentPage, totalPages) {
      const pages = [];
      const maxVisible = 5;
      let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    },

    // ============ ACTIONS ============
    
    async viewContact(contact) {
      /**
       * @action Ouvrir le slideover détail du contact avec relations
       * @checkpoint detail-slideover-opened
       */
      this.selectedContact = contact;
      this.showDetailSlideover = true;
      console.log('[CHECKPOINT]', 'detail-slideover-opened', { contactId: contact.id });
      
      // Charger les relations du contact
      await this.loadContactRelations(contact);
    },
    
    async loadContactRelations(contact) {
      /**
       * @action Charger les relations du contact
       * @checkpoint contact-relations-loaded
       */
      try {
        const token = localStorage.getItem('marki_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`/api/contacts/${contact.id}/relations`, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        contact.relations = data.relations || [];
        
        console.log('[CHECKPOINT]', 'contact-relations-loaded', { 
          contactId: contact.id, 
          count: contact.relations.length 
        });
        
      } catch (err) {
        console.error('[ERROR] loadContactRelations:', err);
        contact.relations = [];
      }
    },
    
    async createContactRelation(contactCibleId, typeRelation) {
      /**
       * @action Créer une nouvelle relation entre contacts
       * @checkpoint contact-relation-created
       */
      if (!this.selectedContact) return;
      
      try {
        const token = localStorage.getItem('marki_token');
        const response = await fetch(`/api/contacts/${this.selectedContact.id}/relations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            contact_cible_id: contactCibleId,
            type_relation: typeRelation
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur création relation');
        }
        
        // Recharger les relations
        await this.loadContactRelations(this.selectedContact);
        
        console.log('[CHECKPOINT]', 'contact-relation-created');
        
      } catch (err) {
        console.error('[ERROR] createContactRelation:', err);
        alert(err.message);
      }
    },
    
    async deleteContactRelation(relationId) {
      /**
       * @action Supprimer une relation entre contacts
       * @checkpoint contact-relation-deleted
       */
      if (!this.selectedContact) return;
      
      try {
        const token = localStorage.getItem('marki_token');
        const response = await fetch(`/api/contacts/${this.selectedContact.id}/relations/${relationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Erreur suppression relation');
        
        // Mettre à jour la liste locale
        this.selectedContact.relations = this.selectedContact.relations.filter(r => r.relation_id !== relationId);
        
        console.log('[CHECKPOINT]', 'contact-relation-deleted');
        
      } catch (err) {
        console.error('[ERROR] deleteContactRelation:', err);
        alert('Erreur lors de la suppression');
      }
    },
    
    closeDetailSlideover() {
      this.showDetailSlideover = false;
      this.selectedContact = null;
    },
    
    showImpayesDetail(contact) {
      /**
       * @action Afficher la modale des impayés du contact
       * @checkpoint impayes-modal-opened
       */
      this.selectedContactForImpayes = contact;
      this.showImpayesModal = true;
      console.log('[CHECKPOINT]', 'impayes-modal-opened', { contactId: contact.id });
    },
    
    openSetEmailForce(contact) {
      /**
       * @action Ouvrir la modale pour définir l'email forcé
       * @checkpoint email-force-modal-opened
       */
      this.selectedContactForEmailForce = contact;
      const hasEmailForce = contact.email_force || contact.emailForce;
      this.emailForceMode = hasEmailForce ? 'remove' : 'select';
      this.selectedContactEmail = '';
      this.manualEmailForce = '';
      this.emailForceSearchQuery = '';
      this.emailForceSearchResults = [];
      this.showSetEmailForceModal = true;
      console.log('[CHECKPOINT]', 'email-force-modal-opened', { contactId: contact.id });
    },
    
    searchEmailForceContacts() {
      const query = this.emailForceSearchQuery.toLowerCase().trim();
      if (!query) {
        this.emailForceSearchResults = [];
        return;
      }
      
      this.emailForceSearchResults = this.contacts
        .filter(c => c.id !== this.selectedContactForEmailForce?.id && c.email)
        .filter(c => 
          (c.nomComplet || (c.prenom + ' ' + c.nom)).toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          (c.entreprise || '').toLowerCase().includes(query)
        )
        .slice(0, 10);
    },
    
    async saveEmailForce() {
      /**
       * @action Sauvegarder l'email forcé
       * @checkpoint email-force-saved
       */
      if (!this.selectedContactForEmailForce) return;
      
      const contactId = this.selectedContactForEmailForce.id;
      let emailValue = null;
      
      if (this.emailForceMode === 'remove') {
        emailValue = null;
      } else if (this.emailForceMode === 'select' && this.selectedContactEmail) {
        emailValue = this.selectedContactEmail;
      } else if (this.emailForceMode === 'manual' && this.manualEmailForce) {
        emailValue = this.manualEmailForce;
      }
      
      try {
        const token = localStorage.getItem('marki_token');
        const response = await fetch(`/api/contacts/${contactId}/email-force`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email_force: emailValue })
        });
        
        if (!response.ok) throw new Error('Erreur sauvegarde');
        
        // Mettre à jour le contact local
        const contact = this.contacts.find(c => c.id === contactId);
        if (contact) {
          contact.email_force = emailValue;
          contact.emailForce = emailValue;
        }
        
        // Mettre à jour le selectedContact si ouvert
        if (this.selectedContact?.id === contactId) {
          this.selectedContact.email_force = emailValue;
          this.selectedContact.emailForce = emailValue;
        }
        
        console.log('[CHECKPOINT]', 'email-force-saved', { contactId, email: emailValue });
        
      } catch (err) {
        console.error('[ERROR] saveEmailForce:', err);
        alert('Erreur lors de la sauvegarde');
      }
      
      this.showSetEmailForceModal = false;
      this.selectedContactForEmailForce = null;
    },
    
    async toggleBlacklist(contact) {
      /**
       * @action Basculer le statut blacklist d'un contact
       * @checkpoint blacklist-toggled
       */
      try {
        const token = localStorage.getItem('marki_token');
        const response = await fetch(`/api/contacts/${contact.id}/blacklist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({})
        });
        
        if (!response.ok) throw new Error('Erreur toggle blacklist');
        
        const data = await response.json();
        
        // Mettre à jour le contact local
        contact.is_blacklisted = data.contact.is_blacklisted;
        contact.blacklist = data.contact.is_blacklisted;
        
        // Mettre à jour les stats
        this.stats.blacklist += data.contact.is_blacklisted ? 1 : -1;
        
        console.log('[CHECKPOINT]', 'blacklist-toggled', { 
          contactId: contact.id, 
          isBlacklisted: data.contact.is_blacklisted 
        });
        
      } catch (err) {
        console.error('[ERROR] toggleBlacklist:', err);
        alert('Erreur lors du changement de statut');
      }
    },
    
    exportData() {
      /**
       * @action Lancer l'export Excel
       * @checkpoint export-started
       */
      this.exportNotification.show = true;
      setTimeout(() => {
        this.exportNotification.show = false;
      }, 5000);
      console.log('[CHECKPOINT]', 'export-started');
    },
    
    sortByImpayes() {
      this.sortField = 'impayesCount';
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    },
    
    sortByDateImpaye() {
      this.sortField = 'dateImpaye';
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    },

    // ============ HELPERS ============
    
    normalizeContact(c) {
      // Normaliser les noms de propriétés (snake_case vs camelCase)
      // Pour les personnes morales (type 'M'), le nom de l'entreprise est dans 'nom'
      const isMorale = c.type_personne === 'M' || c.type === 'societe';
      const entreprise = isMorale ? (c.nom || '') : '';
      
      return {
        ...c,
        id: c.id,
        nom: c.nom || c.name || '',
        prenom: c.prenom || c.firstname || '',
        nomComplet: c.nomComplet || c.full_name || `${c.prenom || ''} ${c.nom || ''}`.trim(),
        initials: c.initials || ((c.prenom?.[0] || '') + (c.nom?.[0] || '')).toUpperCase(),
        // Entreprise: pour les sociétés, c'est dans 'nom'
        entreprise: entreprise,
        email: c.email || '',
        emailForce: c.email_force || c.emailForce || '',
        email_force: c.email_force || c.emailForce || '',
        telephone: c.telephone || c.phone || '',
        fonction: c.fonction || c.role || '',
        is_blacklisted: c.is_blacklisted || c.blacklist || false,
        blacklist: c.is_blacklisted || c.blacklist || false,
        impayesCount: c.impayes_count || c.impayesCount || 0,
        impayes_count: c.impayes_count || c.impayesCount || 0,
        dateDernierImpaye: c.date_dernier_impaye || c.dateDernierImpaye || null,
        date_dernier_impaye: c.date_dernier_impaye || c.dateDernierImpaye || null,
        // Relations (sera chargé séparément)
        relations: c.relations || []
      };
    },
    
    getStatutLabel(contact) {
      if (contact.is_blacklisted || contact.blacklist) return 'Blacklist';
      if (contact.statut === 'inactif') return 'Inactif';
      return 'Actif';
    },
    
    formatDate(dateStr) {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    },
    
    formatMoney(amount) {
      const val = parseFloat(amount) || 0;
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(val);
    }
  }));
});

// Émettre le checkpoint de chargement du script
console.log('[CHECKPOINT]', 'contacts-workflow-loaded');
