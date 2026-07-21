# Workflow: Nouveau profil SMTP (PouchDB Version)

## Description

Version PouchDB du workflow `new-profil`. Ce workflow est **purement UI** (pas d'appel API) mais suit le pattern PouchDB pour cohérence avec l'architecture local-first de l'application.

### Principes Clés

| Principe | Implémentation |
|----------|----------------|
| **Local-First** | Préparation du document CouchDB côté client |
| **ID généré côté client** | `_id` créé avant sauvegarde (format CouchDB) |
| **Sync cohérente** | `syncStatus` disponible pour cohérence UI |

## Architecture

```
┌─────────────────┐     newProfil()    ┌─────────────────┐
│  Alpine.js UI   │ ──────────────────▶ │  Formulaire     │
│                 │                     │  (UI State)     │
│  x-data         │ ◀────────────────── │                 │
│  syncStatus     │    init form        │  ID CouchDB     │
└─────────────────┘                     │  généré         │
                                      └─────────────────┘
```

## Différences avec la version REST

| Aspect | REST API | PouchDB |
|--------|----------|---------|
| ID généré | Serveur | Client (`smtpprofil_timestamp_random`) |
| Structure | `id: "prof_001"` | `_id: "smtpprofil_1721581200000_a3f9b2"` |
| Type | Implicite | Explicite (`type: "smtpprofil"`) |
| Timestamps | Serveur | Client (ISO 8601) |

## Modèle de Données CouchDB (préparé)

```json
{
  "_id": "smtpprofil_1721581200000_a3f9b2",
  "_rev": null,
  "type": "smtpprofil",
  "nom": "Serveur SMTP Principal",
  "email": "noreply@example.com",
  "serveur": "smtp.example.com",
  "port": 587,
  "securite": "tls",
  "username": "user@example.com",
  "password": "encrypted_password",
  "actif": true,
  "is_default": false,
  "created_at": "2026-07-21T14:00:00.000Z",
  "updated_at": "2026-07-21T14:00:00.000Z"
}
```

## Étapes du Workflow

```javascript
/**
 * @action Réinitialiser le formulaire
 * @checkpoint form-initialized
 * 
 * - Générer ID CouchDB: smtpprofil_<timestamp>_<random>
 * - Réinitialiser tous les champs avec valeurs par défaut
 * - Port: 587, Sécurité: 'tls', Actif: true
 */

/**
 * @action Afficher le formulaire
 * @checkpoint new-profil-form-shown
 * 
 * - showNewProfilForm = true
 * - Focus sur premier input après render
 */
```

## États de Synchronisation

Même si ce workflow n'a pas d'appel API, il expose `syncStatus` pour cohérence :

```javascript
syncStatus: {
  status: 'initializing' | 'online' | 'offline' | 'syncing' | 'synced' | 'error',
  isOnline: boolean,
  isSyncing: boolean
}
```

## Utilisation dans HTML

```html
<div x-data="newProfilPouchDB()">
  
  <!-- Bouton d'ouverture -->
  <button @click="newProfil()" :disabled="loading">
    Nouveau profil SMTP
  </button>
  
  <!-- Modal Formulaire -->
  <div x-show="showNewProfilForm" class="modal">
    <h3>Nouveau profil SMTP</h3>
    
    <!-- ID CouchDB (debug) -->
    <small x-show="newProfil._id" x-text="'ID: ' + newProfil._id"></small>
    
    <form @submit.prevent="$dispatch('create-profil')">
      <input 
        x-model="newProfil.nom" 
        placeholder="Nom du profil"
        x-ref="nomInput"
        required
      >
      
      <input 
        x-model="newProfil.email" 
        type="email"
        placeholder="Email d'envoi"
        required
      >
      
      <input 
        x-model="newProfil.serveur" 
        placeholder="Serveur SMTP"
        required
      >
      
      <input 
        x-model.number="newProfil.port" 
        type="number"
        min="1"
        max="65535"
        required
      >
      
      <select x-model="newProfil.securite">
        <option value="tls">TLS</option>
        <option value="ssl">SSL</option>
        <option value="none">Aucune</option>
      </select>
      
      <input x-model="newProfil.username" placeholder="Nom d'utilisateur">
      <input x-model="newProfil.password" type="password" placeholder="Mot de passe">
      
      <label>
        <input x-model="newProfil.actif" type="checkbox">
        Profil actif
      </label>
      
      <button type="submit" :disabled="!isNewProfilValid">
        Créer (ID: <span x-text="newProfil._id?.slice(-8)"></span>)
      </button>
      
      <button type="button" @click="cancelNewProfil()">
        Annuler
      </button>
    </form>
  </div>
</div>

<!-- Dépendances -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
<script type="module" src="new-profil-pouchdb.js"></script>
```

## Champs du Formulaire

| Champ | Type | Défaut | Description |
|-------|------|--------|-------------|
| `nom` | string | `''` | Nom du profil (affichage) |
| `email` | string | `''` | Adresse d'envoi |
| `serveur` | string | `''` | Hostname SMTP |
| `port` | number | `587` | Port (25, 465, 587, 2525) |
| `securite` | enum | `'tls'` | 'tls' \| 'ssl' \| 'none' |
| `username` | string | `''` | Auth SMTP |
| `password` | string | `''` | Mot de passe |
| `actif` | boolean | `true` | Profil actif/inactif |
| `is_default` | boolean | `false` | Profil par défaut |

## Validation

```javascript
get isNewProfilValid() {
  return this.newProfil.nom?.trim() &&
         this.newProfil.email?.trim() &&
         this.newProfil.serveur?.trim() &&
         this.newProfil.port > 0 &&
         this.newProfil.port <= 65535;
}
```

## Intégration avec `create-profil`

Ce workflow prépare le document. La sauvegarde réelle se fait dans `create-profil-pouchdb.js` :

```javascript
// Dans create-profil-pouchdb.js
async createProfil() {
  // Utilise le newProfil préparé par new-profil-pouchdb.js
  const doc = { ...this.newProfil };
  
  // Sauvegarde dans PouchDB local
  const result = await this.localDB.put(doc);
  
  // Réplication automatique vers CouchDB
}
```

## Fichiers

```
workflows/frontend/settings-smtp/
├── new-profil.md                    # Documentation originale
├── new-profil-pouchdb.md            # Documentation PouchDB (ce fichier)
├── new-profil-pouchdb.js            # Implémentation PouchDB
└── create-profil-pouchdb.js         # Workflow de sauvegarde
```

## Notes

- **Pas d'appel API** : Ce workflow est purement UI
- **ID généré côté client** : Pour compatibilité CouchDB offline-first
- **Champs enrichis** : Ajout de `type`, `is_default`, timestamps
- **Prêt pour PouchDB** : Le document est au format CouchDB dès l'initialisation
