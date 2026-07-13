# Data Model Frontend - Marki

Application en Alpine.js avec stores globaux et data models par page.

---

## 🏪 Stores Alpine.js Globaux

### `authStore` - Authentification

```javascript
Alpine.store('auth', {
  user: null,           // { id, nom, email, role, avatar }
  token: null,          // JWT token
  isAuthenticated: false,
  
  login(credentials) { /* ... */ },
  logout() { /* ... */ },
  checkSession() { /* ... */ },
  
  get isAdmin() { return this.user?.role === 'admin'; },
  get isDiagnostiqueur() { return this.user?.role === 'diagnostiqueur'; }
});
```

### `uiStore` - État UI Global

```javascript
Alpine.store('ui', {
  // Navigation
  sidebarCollapsed: false,
  currentPage: '',
  
  // Modals globaux
  modals: {
    confirmation: { show: false, title: '', message: '', onConfirm: null },
    error: { show: false, message: '', code: null }
  },
  
  // Notifications toast
  toasts: [],
  addToast(message, type = 'info', duration = 5000) { /* ... */ },
  removeToast(id) { /* ... */ },
  
  // Loading global
  globalLoading: false,
  
  // Thème
  darkMode: false
});
```

### `syncStore` - Synchronisation

```javascript
Alpine.store('sync', {
  lastSyncTime: null,
  syncing: false,
  syncProgress: 0,      // 0-100
  syncStatus: 'idle',   // idle | syncing | success | error
  
  async sync() { /* ... */ },
  async syncPartial(types) { /* ... */ } // ['factures', 'contacts', 'relances']
});
```

---

## 📄 Data Models par Page

---

### Page: `login.html` - Login Page

```javascript
function loginPage() {
  return {
    // Form data
    form: {
      username: '',
      password: '',
      rememberMe: false
    },
    
    // UI state
    loading: false,
    error: null,
    
    // Methods
    async handleLogin() { /* ... */ },
    clearError() { this.error = null; }
  };
}
```

**Types:**
```typescript
interface LoginForm {
  username: string;
  password: string;
  rememberMe: boolean;
}
```

---

### Page: `dashboard.html` - Dashboard

```javascript
function dashboardPage() {
  return {
    // Data
    kpis: {
      facturesEnAttente: 0,
      impayesActifs: 0,
      montantTotal: 0,
      relancesDuJour: 0,
      tauxRecouvrement: 0,
      dso: 0
    },
    chartData: {
      evolution: [],      // [{ mois, montant, cumul }]
      repartition: [],    // [{ statut, count, montant }]
      delaiPaiement: []   // [{ tranche, count }]
    },
    activiteRecente: [],  // ActionLog[]
    
    // UI state
    loading: true,
    error: null,
    syncing: false,
    lastSyncTime: null,
    periode: '30j',     // 7j | 30j | 90j | 12m
    
    // Methods
    async loadData() { /* ... */ },
    async syncData() { /* ... */ },
    formatMoney(value) { /* ... */ },
    
    // Computed (via getters)
    get hasAlertes() { return this.impayesCritiques > 0; }
  };
}
```

**Types:**
```typescript
interface DashboardKPIs {
  facturesEnAttente: number;
  impayesActifs: number;
  montantTotal: number;
  relancesDuJour: number;
  tauxRecouvrement: number;
  dso: number;  // Days Sales Outstanding
}

interface ActionLog {
  id: string;
  type: 'sync' | 'relance' | 'paiement' | 'creation';
  description: string;
  date: string;
  user?: string;
  metadata?: Record<string, any>;
}
```

---

### Page: `impayes.html` - Liste Impayés

```javascript
function impayesPage() {
  return {
    // Data
    factures: [],         // Facture[]
    stats: {
      total: 0,
      aReparer: 0
    },
    
    // Filters
    searchQuery: '',
    filterStatut: '',     // '' | 'non-payee' | 'en-relance' | 'suspendue'
    filterSequence: '',   // '' | 'R1' | 'R2' | 'R3' | 'R4'
    filterDateStart: null,
    filterDateEnd: null,
    
    // Sorting
    sortColumn: 'dateEcheance',
    sortDirection: 'desc',
    
    // Pagination
    page: 1,
    perPage: 25,
    totalPages: 1,
    
    // UI state
    loading: true,
    error: null,
    syncing: false,
    showDetailPanel: false,
    selectedFacture: null,
    currentView: 'liste', // liste | detail | reparer
    
    // Computed
    get filteredFactures() { 
      // filtered + sorted + paginated
    },
    
    // Methods
    async loadData() { /* ... */ },
    async syncData() { /* ... */ },
    sortBy(column) { /* ... */ },
    selectFacture(facture) { /* ... */ },
    closeDetail() { /* ... */ },
    formatMoney(value) { /* ... */ },
    getStatutColor(statut) { /* ... */ }
  };
}
```

**Types:**
```typescript
interface Facture {
  id: string;
  numero: string;
  numeroDossier: string;
  dateFacture: string;
  dateEcheance: string;
  montantTotal: number;
  montantPaye: number;
  resteAPayer: number;
  statut: 'non-payee' | 'en-relance' | 'suspendue' | 'payee';
  
  // Relations
  payeur: PayeurSummary;
  sequence?: SequenceSummary;
  relances: RelanceSummary[];
  
  // Anomalies
  anomalies?: Anomalie[];
}

interface PayeurSummary {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
}

interface SequenceSummary {
  id: string;
  nom: string;
  etape: 'R1' | 'R2' | 'R3' | 'R4';
}

interface RelanceSummary {
  id: string;
  dateEnvoi: string;
  type: 'email' | 'sms' | 'courrier';
  statut: 'programmee' | 'envoyee' | 'recue' | 'repondu';
}

interface Anomalie {
  type: 'sans-contact' | 'email-invalide' | 'doublon' | 'echeance-anterieure';
  severite: 'warning' | 'error';
  description: string;
}
```

---

### Page: `impayes-payeur.html` - Vue par Payeur

```javascript
function impayesPayeurPage() {
  return {
    // Data
    payeurs: [],          // PayeurImpaye[]
    
    // Filters
    searchQuery: '',
    filterStatut: '',     // '' | 'regulier' | 'retard' | 'critique'
    
    // Sorting
    sortBy: 'montant',
    sortDirection: 'desc',
    
    // UI state
    loading: true,
    error: null,
    expandedPayeur: null, // ID du payeur dont le détail est ouvert
    
    // Methods
    async loadData() { /* ... */ },
    togglePayeur(id) { /* ... */ },
    formatMoney(value) { /* ... */ }
  };
}
```

**Types:**
```typescript
interface PayeurImpaye {
  id: string;
  nom: string;
  email: string;
  telephone?: string;
  statut: 'regulier' | 'retard' | 'critique';
  totalImpayes: number;
  nombreFactures: number;
  ancienneFacture: string;  // date
  factures: Facture[];
  contacts: Contact[];
}
```

---

### Page: `impayes-detail.html` - Détail Facture

```javascript
function impayesDetailPage() {
  return {
    // Data
    facture: null,         // FactureComplete
    historiquePaiements: [],
    historiqueRelances: [],
    
    // UI state
    loading: true,
    error: null,
    activeTab: 'details', // details | paiements | relances | anomalies
    
    // Actions
    showMarkAsPaidModal: false,
    showAddRelanceModal: false,
    showEditFactureModal: false,
    
    // Methods
    async loadFacture(id) { /* ... */ },
    async markAsPaid(data) { /* ... */ },
    async addRelance(data) { /* ... */ },
    async suspendre() { /* ... */ },
    async reprendre() { /* ... */ }
  };
}
```

**Types:**
```typescript
interface FactureComplete extends Facture {
  lignes?: LigneFacture[];
  historique: ActionLog[];
  documents: Document[];
}

interface Paiement {
  id: string;
  date: string;
  montant: number;
  mode: 'virement' | 'cheque' | 'carte' | 'especes';
  reference?: string;
}
```

---

### Page: `contacts.html` - Liste Contacts

```javascript
function contactsPage() {
  return {
    // Data
    contacts: [],         // Contact[]
    stats: {
      total: 0,
      sansEmail: 0,
      blacklistes: 0,
      avecFactures: 0
    },
    
    // Filters
    searchQuery: '',
    filterType: 'all',    // all | sans-email | blacklist
    filterClientType: '', // '' | 'particulier' | 'professionnel'
    
    // Sorting
    sortColumn: 'nom',
    sortDirection: 'asc',
    
    // Pagination
    page: 1,
    perPage: 50,
    
    // UI state
    loading: true,
    error: null,
    selectedContacts: [], // multi-select IDs
    showContactModal: false,
    editingContact: null,
    
    // Export
    exportNotification: {
      show: false,
      message: '',
      type: 'info'
    },
    
    // Methods
    async loadData() { /* ... */ },
    async exportData() { /* ... */ },
    async saveContact(contact) { /* ... */ },
    async toggleBlacklist(id) { /* ... */ },
    selectAll(checked) { /* ... */ },
    
    get filteredContacts() { /* ... */ }
  };
}
```

**Types:**
```typescript
interface Contact {
  id: string;
  nom: string;
  prenom?: string;
  email?: string;
  emailValide: boolean;
  telephone?: string;
  mobile?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  
  // Classification
  type: 'particulier' | 'professionnel';
  categorie?: string;
  
  // Facturation
  nombreFactures: number;
  montantTotalFacture: number;
  solde: number;
  
  // Etat
  blacklisted: boolean;
  dateBlacklist?: string;
  motifBlacklist?: string;
  
  // Relations
  factures: string[];     // IDs
  sequences: string[];    // IDs
}
```

---

### Page: `relances.html` - Gestion Relances

```javascript
function relancesPage() {
  return {
    // Data
    payeurs: [],          // PayeurAvecRelances[]
    stats: {
      aValider: 0,
      programmees: 0,
      envoyees: 0
    },
    sequences: [],        // pour sélection
    
    // Filters
    searchQuery: '',
    filterStatut: '',     // '' | 'programmee' | 'envoyee'
    
    // UI state
    loading: true,
    error: null,
    expandedPayeur: null,
    
    // Modals
    showNewRelanceModal: false,
    showEditRelanceModal: false,
    showSequenceModal: false,
    selectedPayeur: null,
    selectedRelance: null,
    
    // Editor
    editorContent: '',
    editorMode: 'html',   // html | markdown
    
    // Methods
    async loadData() { /* ... */ },
    async loadSequences() { /* ... */ },
    openNewRelanceModal(payeur) { /* ... */ },
    async saveRelance(data) { /* ... */ },
    async envoyerRelance(id) { /* ... */ },
    async programmerRelance(id, date) { /* ... */ },
    formatMoney(value) { /* ... */ }
  };
}
```

**Types:**
```typescript
interface Relance {
  id: string;
  payeurId: string;
  type: 'email' | 'sms' | 'courrier';
  statut: 'brouillon' | 'a_valider' | 'programmee' | 'envoyee' | 'recue' | 'repondu';
  
  // Contenu
  sujet?: string;
  contenu: string;
  contenuHtml?: string;
  
  // Programmation
  dateCreation: string;
  dateProgrammation?: string;
  dateEnvoi?: string;
  
  // Factures liées
  factures: string[];
  montantTotal: number;
  
  // Métadonnées
  createdBy: string;
  validatedBy?: string;
  sequenceId?: string;
  etapeSequence?: 'R1' | 'R2' | 'R3' | 'R4';
}

interface PayeurAvecRelances {
  id: string;
  nom: string;
  email: string;
  statut: 'regulier' | 'retard' | 'critique';
  totalImpayes: number;
  relances: Relance[];
}
```

---

### Page: `relances-validation.html` - Validation Relances

```javascript
function relancesValidationPage() {
  return {
    // Data
    relancesAValider: [], // RelanceAValider[]
    
    // Sélection
    selectedRelances: [], // IDs
    selectAll: false,
    
    // UI state
    loading: true,
    error: null,
    previewMode: false,
    previewRelance: null,
    
    // Actions en batch
    processing: false,
    
    // Methods
    async loadData() { /* ... */ },
    async validerSelection() { /* ... */ },
    async rejeterSelection() { /* ... */ },
    async validerTout() { /* ... */ },
    toggleSelection(id) { /* ... */ },
    selectAllVisible(checked) { /* ... */ },
    openPreview(relance) { /* ... */ }
  };
}
```

---

### Page: `relances-calendrier.html` - Calendrier Relances

```javascript
function relancesCalendrierPage() {
  return {
    // Data
    relancesProgrammees: [], // par jour
    
    // Calendar state
    currentDate: new Date(),
    viewMode: 'month',    // month | week | day
    
    // UI state
    loading: true,
    error: null,
    selectedDate: null,
    relancesDuJour: [],
    
    // Methods
    async loadData() { /* ... */ },
    prevPeriod() { /* ... */ },
    nextPeriod() { /* ... */ },
    selectDate(date) { /* ... */ },
    getRelancesForDay(date) { /* ... */ },
    
    // Computed
    get calendarDays() { /* ... */ },
    get currentMonthLabel() { /* ... */ }
  };
}
```

---

### Page: `sequences.html` - Liste Séquences

```javascript
function sequencesPage() {
  return {
    // Data
    sequences: [],        // Sequence[]
    
    // Filters
    searchQuery: '',
    filterType: 'all',    // all | relance | suivi
    
    // UI state
    loading: true,
    error: null,
    
    // Modals
    showNewSequenceModal: false,
    showEditSequenceModal: false,
    showDeleteModal: false,
    editingSequence: null,
    deletingSequence: null,
    
    // New sequence form
    newSequence: {
      nom: '',
      type: 'relance',
      description: ''
    },
    
    // Methods
    async loadData() { /* ... */ },
    async createSequence(data) { /* ... */ },
    async updateSequence(data) { /* ... */ },
    async deleteSequence(id) { /* ... */ },
    editSequence(sequence) { /* ... */ },
    confirmDelete(sequence) { /* ... */ },
    
    get filteredSequences() { /* ... */ },
    get stats() { /* ... */ }
  };
}
```

**Types:**
```typescript
interface Sequence {
  id: string;
  nom: string;
  type: 'relance' | 'suivi';
  description?: string;
  active: boolean;
  
  // Compteur
  etapesCount: number;
  facturesLiees: number;
  
  // Métadonnées
  dateCreation: string;
  dateModification: string;
}
```

---

### Page: `sequences-relance-detail.html` - Détail Séquence Relance

```javascript
function sequencesRelanceDetailPage() {
  return {
    // Data
    sequence: null,         // SequenceComplete
    etapes: [],           // EtapeRelance[]
    modeles: [],          // ModeleEmail[]
    
    // UI state
    loading: true,
    error: null,
    saving: false,
    hasChanges: false,
    
    // Tabs
    activeTab: 'etapes',  // etapes | modeles | regles | apercu
    
    // Drag & drop
    draggingEtape: null,
    
    // Modals
    showEtapeModal: false,
    showModeleModal: false,
    showDeleteEtapeModal: false,
    editingEtape: null,
    
    // Editor
    editorInstance: null,
    
    // Methods
    async loadSequence(id) { /* ... */ },
    async saveSequence() { /* ... */ },
    async addEtape(etape) { /* ... */ },
    async updateEtape(etape) { /* ... */ },
    async deleteEtape(id) { /* ... */ },
    reorderEtapes(fromIndex, toIndex) { /* ... */ },
    initEditor() { /* ... */ },
    
    // Validation
    validateEtape(etape) { /* ... */ },
    
    // Watch
    onDataChange() { this.hasChanges = true; }
  };
}
```

**Types:**
```typescript
interface SequenceComplete extends Sequence {
  etapes: EtapeRelance[];
  modeles: ModeleEmail[];
  regles?: RegleSequence;
}

interface EtapeRelance {
  id: string;
  ordre: number;
  nom: string;
  delaiJours: number;     // jours après étape précédente
  typeAction: 'email' | 'sms' | 'courrier' | 'appel' | 'task';
  
  // Contenu
  modeleId?: string;
  sujet?: string;
  contenu?: string;
  
  // Conditions
  conditions?: Condition[];
  
  // Options
  genererTask: boolean;
  taskAssignee?: string;
  taskDescription?: string;
}

interface ModeleEmail {
  id: string;
  nom: string;
  sujet: string;
  contenuHtml: string;
  variables: string[];    // ['nom', 'montant', 'date_echeance', ...]
}

interface RegleSequence {
  declenchement: 'auto' | 'manuel';
  heureEnvoi: string;     // "09:00"
  joursOuvres: boolean;
  arreterSiPaiement: boolean;
}
```

---

### Page: `sequences-suivi-detail.html` - Détail Séquence Suivi

```javascript
function sequencesSuiviDetailPage() {
  return {
    // Similaire à sequences-relance-detail
    // mais avec type: 'suivi' par défaut
    // et actions adaptées (pas de relance agressive)
    
    sequence: null,
    etapes: [],
    
    // Spécifique suivi
    typeRelanceOptions: ['educative', 'amicale', 'ferme'],
    selectedType: 'educative',
    
    // Methods
    async loadSequence(id) { /* ... */ },
    async saveSequence() { /* ... */ }
  };
}
```

---

### Page: `settings-smtp.html` - Profils SMTP

```javascript
function settingsSmtpPage() {
  return {
    // Data
    profils: [],           // ProfilSMTP[]
    
    // UI state
    loading: true,
    error: null,
    
    // Form nouvelle profil
    showNewProfilForm: false,
    newProfil: {
      nom: '',
      email: '',
      serveur: '',
      port: 587,
      securite: 'tls',    // none | ssl | tls
      username: '',
      password: '',
      actif: true
    },
    
    // Test
    testingProfil: null,
    testResult: null,
    
    // Methods
    async loadData() { /* ... */ },
    async createProfil() { /* ... */ },
    async testerProfil(profil) { /* ... */ },
    async toggleActif(profil) { /* ... */ },
    editProfil(profil) { /* ... */ },
    deleteProfil(profil) { /* ... */ },
    validateForm() { /* ... */ }
  };
}
```

**Types:**
```typescript
interface ProfilSMTP {
  id: string;
  nom: string;
  email: string;
  serveur: string;
  port: number;
  securite: 'none' | 'ssl' | 'tls';
  username: string;
  // password masqué côté client
  actif: boolean;
  
  // Stats
  emailsEnvoyes: number;
  dernierEnvoi?: string;
  
  // Test
  dernierTest?: {
    date: string;
    succes: boolean;
    message?: string;
  };
}
```

---

### Page: `settings-smtp-detail.html` - Détail Profil SMTP

```javascript
function settingsSmtpDetailPage() {
  return {
    // Data
    profil: null,
    historique: [],       // Logs d'envoi
    stats: {
      envoyes: 0,
      erreurs: 0,
      tauxOuverture: 0,
      tauxClic: 0
    },
    
    // UI state
    loading: true,
    error: null,
    saving: false,
    activeTab: 'config',  // config | historique | stats
    
    // Edit
    editMode: false,
    editedProfil: null,
    
    // Methods
    async loadProfil(id) { /* ... */ },
    async saveProfil() { /* ... */ },
    async deleteProfil() { /* ... */ },
    async testConnection() { /* ... */ },
    enterEditMode() { /* ... */ },
    cancelEdit() { /* ... */ }
  };
}
```

---

### Page: `settings-utilisateurs.html` - Gestion Utilisateurs

```javascript
function settingsUtilisateursPage() {
  return {
    // Data
    utilisateurs: [],     // Utilisateur[]
    roles: ['admin', 'diagnostiqueur', 'assistant'],
    
    // Filters
    searchQuery: '',
    filterRole: '',
    
    // UI state
    loading: true,
    error: null,
    
    // Modals
    showUserModal: false,
    showDeleteModal: false,
    showPermissionsModal: false,
    editingUser: null,
    deletingUser: null,
    
    // New/Edit user form
    userForm: {
      nom: '',
      email: '',
      role: 'diagnostiqueur',
      actif: true,
      password: '',
      confirmPassword: ''
    },
    
    // Methods
    async loadData() { /* ... */ },
    async saveUser() { /* ... */ },
    async deleteUser(id) { /* ... */ },
    async toggleActif(user) { /* ... */ },
    openNewUserModal() { /* ... */ },
    openEditUserModal(user) { /* ... */ },
    validateForm() { /* ... */ },
    
    get filteredUsers() { /* ... */ }
  };
}
```

**Types:**
```typescript
interface Utilisateur {
  id: string;
  nom: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'diagnostiqueur' | 'assistant';
  actif: boolean;
  
  // Préférences
  preferences: {
    notificationsEmail: boolean;
    notificationsApp: boolean;
    langue: string;
    fuseauHoraire: string;
  };
  
  // Métadonnées
  dateCreation: string;
  derniereConnexion?: string;
}
```

---

### Page: `smart-marki.html` - IA / Smart Features

```javascript
function smartMarkiPage() {
  return {
    // Data
    suggestions: [],      // SuggestionIA[]
    historiqueActions: [],
    stats: {
      suggestionsAcceptees: 0,
      tempsEconomise: 0,
      tauxSucces: 0
    },
    
    // Features activées
    features: {
      autoRelance: true,
      suggestModeles: true,
      detectAnomalies: true,
      optimizeSequences: true
    },
    
    // UI state
    loading: true,
    error: null,
    processing: false,
    
    // Chat/Assistant
    chatOpen: false,
    chatMessages: [],
    chatInput: '',
    
    // Methods
    async loadSuggestions() { /* ... */ },
    async accepterSuggestion(id) { /* ... */ },
    async refuserSuggestion(id) { /* ... */ },
    async genererModele(data) { /* ... */ },
    toggleFeature(feature) { /* ... */ },
    async sendChatMessage() { /* ... */ }
  };
}
```

**Types:**
```typescript
interface SuggestionIA {
  id: string;
  type: 'modele' | 'sequence' | 'relance' | 'anomalie' | 'optimisation';
  titre: string;
  description: string;
  confiance: number;      // 0-100
  data?: any;             // données spécifiques au type
  dateCreation: string;
  statut: 'pending' | 'accepted' | 'rejected' | 'applied';
}
```

---

### Page: `portail-client.html` - Portail Client

```javascript
function portailClientPage() {
  return {
    // Data
    client: null,         // InfoClient
    factures: [],         // FacturePortail[]
    documents: [],        // DocumentPartage[]
    
    // UI state
    loading: true,
    error: null,
    
    // Actions
    showPaiementModal: false,
    factureAPayer: null,
    
    // Methods
    async loadClientData(token) { /* ... */ },
    async initPaiement(factureId) { /* ... */ },
    async telechargerFacture(id) { /* ... */ },
    async telechargerRapport(id) { /* ... */ },
    formatMoney(value) { /* ... */ }
  };
}
```

**Types:**
```typescript
interface InfoClient {
  id: string;
  nom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  tokenAcces: string;
  dateExpirationToken: string;
}

interface FacturePortail {
  id: string;
  numero: string;
  dateFacture: string;
  dateEcheance: string;
  montantTotal: number;
  resteAPayer: number;
  statut: 'payee' | 'partielle' | 'impayee';
  lienPaiement?: string;
  missions: Mission[];
}

interface Mission {
  id: string;
  type: string;
  adresse: string;
  dateRealisation: string;
  documents: DocumentPartage[];
}

interface DocumentPartage {
  id: string;
  nom: string;
  type: 'facture' | 'rapport' | 'annexe';
  dateUpload: string;
  taille: number;
  urlTelechargement: string;
}
```

---

### Page: `portail-mission.html` - Détail Mission Portail

```javascript
function portailMissionPage() {
  return {
    // Data
    mission: null,
    documents: [],
    paiements: [],
    
    // UI state
    loading: true,
    error: null,
    activeTab: 'documents', // documents | details | paiements
    
    // Methods
    async loadMission(id) { /* ... */ },
    async telechargerDocument(doc) { /* ... */ },
    async initPaiement() { /* ... */ }
  };
}
```

---

### Page: `impayes-suspendus.html` - Impayés Suspendus

```javascript
function impayesSuspendusPage() {
  return {
    // Data
    facturesSuspendues: [],
    
    // Filters
    searchQuery: '',
    filterMotif: '',
    
    // UI state
    loading: true,
    error: null,
    selectedFacture: null,
    
    // Reactivation modal
    showReactivateModal: false,
    reactivateData: {
      motif: '',
      commentaire: ''
    },
    
    // Methods
    async loadData() { /* ... */ },
    async reactivateFacture(id) { /* ... */ },
    openReactivateModal(facture) { /* ... */ }
  };
}
```

---

### Page: `evenements.html` - Journal d'Événements

```javascript
function evenementsPage() {
  return {
    // Data
    evenements: [],       // Evenement[]
    
    // Filters
    searchQuery: '',
    filterType: '',       // '' | 'sync' | 'relance' | 'paiement' | 'error' | 'user'
    filterDateStart: null,
    filterDateEnd: null,
    filterUser: '',
    
    // Pagination
    page: 1,
    perPage: 50,
    hasMore: true,
    
    // UI state
    loading: true,
    loadingMore: false,
    error: null,
    selectedEvent: null,
    showDetailModal: false,
    
    // Methods
    async loadData() { /* ... */ },
    async loadMore() { /* ... */ },
    openDetail(event) { /* ... */ },
    async exportLogs() { /* ... */ },
    getEventIcon(type) { /* ... */ },
    getEventColor(type) { /* ... */ }
  };
}
```

**Types:**
```typescript
interface Evenement {
  id: string;
  type: 'sync' | 'relance' | 'paiement' | 'error' | 'user' | 'system';
  niveau: 'info' | 'warning' | 'error' | 'success';
  titre: string;
  description?: string;
  date: string;
  utilisateur?: string;
  ip?: string;
  metadata?: Record<string, any>;
  entiteType?: 'facture' | 'contact' | 'relance' | 'sequence';
  entiteId?: string;
}
```

---

## 🔄 États UI Communs

### Loading States
```javascript
// Par page
loading: boolean        // Chargement initial
loadingMore: boolean    // Chargement pagination
saving: boolean         // Sauvegarde en cours
deleting: boolean       // Suppression en cours
syncing: boolean       // Synchronisation
processing: boolean     // Traitement générique
```

### Error Handling
```javascript
// Par page
error: string | null    // Message d'erreur
errorCode: string       // Code erreur pour i18n
validationErrors: {     // Erreurs de formulaire
  [field: string]: string[]
}
```

### Selection States
```javascript
// Multi-sélection
selectedItems: string[]
selectedAll: boolean
indeterminate: boolean

// Single select
selectedItem: object | null
activeItem: string      // ID item actif/ouvert
```

### Modal States
```javascript
// Pattern standard par modal
showXXXModal: boolean
editingXXX: object | null  // null = création, objet = édition
deleteXXX: object | null   // Item à supprimer
```

---

## 📡 Conventions API

### Format de réponse standard
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}
```

### Gestion des erreurs
```javascript
// Dans les méthodes async
try {
  const response = await fetch('/api/...');
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'Erreur inconnue');
  }
  
  return data.data;
} catch (error) {
  this.error = error.message;
  Alpine.store('ui').addToast(error.message, 'error');
  throw error;
}
```

---

## 💾 Persistence Locale (optionnel)

### localStorage keys
```javascript
'marki:auth:token'           // JWT
'marki:auth:user'            // User info
'markui:ui:sidebarCollapsed' // État sidebar
'markui:filters:{page}'      // Filtres sauvegardés par page
```

---

## 🎯 Helpers Globaux

```javascript
// Formatage
window.formatMoney = (value, currency = 'EUR') => { /* ... */ };
window.formatDate = (date, format = 'DD/MM/YYYY') => { /* ... */ };
window.formatDateTime = (date) => { /* ... */ };
window.formatDuration = (days) => { /* ... */ };

// Validation
window.validateEmail = (email) => { /* ... */ };
window.validatePhone = (phone) => { /* ... */ };
window.validateSiret = (siret) => { /* ... */ };

// Utils
window.debounce = (fn, delay) => { /* ... */ };
window.throttle = (fn, limit) => { /* ... */ };
window.generateId = () => { /* ... */ };
```
