---
id: relances-liste-smtp-profiles
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher la liste des profils SMTP configurés depuis PouchDB pour l'envoi des relances
depends_on: [auth-check]
screen: settings-smtp
global: false
mockup_entry: specs/mockups/settings-smtp.html
---

# relances-liste-smtp-profiles : Liste des profils SMTP (PouchDB)

## Description

Afficher la liste des profils SMTP configurés pour l'envoi des relances, avec leur statut de connexion et options de test. Les données sont chargées depuis PouchDB local.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, base configs prête
 * 
 * Code:
 * this.dbConfigs = new PouchDB('marki-configs');
 * this.dbConfigs.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser l'état de la page
 * @checkpoint state-initialized, filtres et pagination prêts
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, état de chargement visible
 */

/**
 * @action Récupérer les profils SMTP depuis PouchDB
 * @checkpoint profiles-fetched, liste des profils reçue
 * 
 * **Query PouchDB** :
 * const result = await dbConfigs.allDocs({
 *   startkey: 'smtp-profile:',
 *   endkey: 'smtp-profile:\ufff0',
 *   include_docs: true
 * });
 * const profiles = result.rows.map(r => r.doc);
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * dbConfigs.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { this.updateProfile(change.doc); });
 */

/**
 * @action Masquer les informations sensibles (mot de passe chiffré)
 * @checkpoint sensitive-hidden, champs sensibles masqués ou partiels
 */

/**
 * @action Calculer les statistiques d'utilisation
 * @checkpoint stats-calculated, nb relances envoyées par profil
 * 
 * **Approche** : Récupérer depuis PouchDB les events d'envoi
 * const events = await dbEvents.find({
 *   selector: { type: 'event', event_type: 'email_sent' }
 * });
 */

/**
 * @action Afficher le tableau des profils SMTP
 * @checkpoint table-rendered, lignes avec host et statut visibles
 */

/**
 * @action Afficher le badge du profil par défaut
 * @checkpoint default-badge-shown, étoile ou label visible sur le défaut
 */

/**
 * @action Afficher le statut de connexion (dernier test)
 * @checkpoint status-rendered, badge vert/rouge selon dernier test
 */

/**
 * @action Activer les boutons de test de connexion
 * @checkpoint test-enabled, bouton "Tester" actif par profil
 */

/**
 * @action Activer les boutons d'édition
 * @checkpoint edit-enabled, bouton "Modifier" fonctionnel
 */

/**
 * @action Activer le bouton de suppression (sauf profil par défaut)
 * @checkpoint delete-enabled, bouton disponible selon conditions
 */

/**
 * @action Afficher le bouton "Ajouter un profil"
 * @checkpoint add-button-shown, navigation vers création disponible
 */
```

## PouchDB Operations

### Chargement des profils SMTP

```javascript
async loadSmtpProfiles() {
  this.loading = true;
  
  try {
    // Récupérer les profils SMTP
    const result = await dbConfigs.allDocs({
      startkey: 'smtp-profile:',
      endkey: 'smtp-profile:\ufff0',
      include_docs: true
    });
    
    this.smtpProfiles = result.rows.map(r => r.doc);
    
    // Masquer les mots de passe
    this.smtpProfiles = this.smtpProfiles.map(p => ({
      ...p,
      password: p.password ? '********' : null
    }));
    
  } catch (error) {
    console.error('Erreur chargement profils SMTP:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

### Live Sync (temps réel)

```javascript
// Écouter les changements sur les profils SMTP
dbConfigs.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'smtp-profile') {
    const index = this.smtpProfiles.findIndex(p => p._id === change.doc._id);
    if (index >= 0) {
      this.smtpProfiles[index] = { ...change.doc, password: '********' };
    } else {
      this.smtpProfiles.push({ ...change.doc, password: '********' });
    }
  }
}).on('error', (err) => {
  console.error('Erreur sync profils SMTP:', err);
});
```

## Structure du document PouchDB

```javascript
{
  "_id": "smtp-profile:550e8400-e29b-41d4-a716-446655440000",
  "_rev": "1-abc123...",
  "type": "smtp-profile",
  "nom": "Gmail principal",
  "host": "smtp.gmail.com",
  "port": 587,
  "username": "contact@entreprise.fr",
  "password": "encrypted_password",
  "par_defaut": true,
  "statut": "ok",
  "date_dernier_test": "2026-07-21T10:00:00Z",
  "created_at": "2026-01-01T00:00:00Z"
}
```

## Colonnes affichées

| Colonne | Source | Description |
|---------|--------|-------------|
| Nom | profile.nom | Nom du profil |
| Serveur | profile.host | Host SMTP |
| Port | profile.port | Port SMTP |
| Utilisateur | profile.username | Email/username |
| Par défaut | profile.par_defaut | Badge étoile |
| Statut | profile.dernier_test | Dernier test OK/KO |
| Dernier test | profile.date_dernier_test | Date du dernier test |
| Actions | - | Tester, Modifier, Supprimer |

## Statuts possibles

| Statut | Badge | Description |
|--------|-------|-------------|
| ok | 🟢 Vert | Dernier test réussi |
| ko | 🔴 Rouge | Dernier test échoué |
| jamais_teste | ⚪ Gris | Jamais testé |

## Actions disponibles

| Action | Condition | Description |
|--------|-----------|-------------|
| Tester | Toujours | Vérifier la connexion SMTP |
| Modifier | Toujours | Éditer les paramètres |
| Définir défaut | Non défaut | Définir comme profil par défaut |
| Supprimer | Non défaut | Supprimer le profil |

## Mockups de référence

- `specs/mockups/settings-smtp.html` (liste des profils SMTP)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Profils SMTP | `GET /api/settings/smtp` | `dbConfigs.allDocs()` avec préfixe |
| Mises à jour temps réel | Polling | `dbConfigs.changes()` |
| Sécurité | Backend | Mot de passe masqué côté client |
| Latence | ~100-300ms | ~20-50ms (local) |
| Offline | ❌ Impossible | ✅ Consultation possible offline |
