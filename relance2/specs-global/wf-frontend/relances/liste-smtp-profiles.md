---
id: relances-liste-smtp-profiles
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher la liste des profils SMTP configurés pour l'envoi des relances
depends_on: [auth-check]
screen: settings-smtp
global: false
mockup_entry: specs/mockups/settings-smtp.html
---

# relances-liste-smtp-profiles : Liste des profils SMTP

## Description

Afficher la liste des profils SMTP configurés pour l'envoi des relances, avec leur statut de connexion et options de test.

## Étapes

```javascript
/**
 * @action Initialiser l'état de la page
 * @checkpoint state-initialized, filtres et pagination prêts
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, état de chargement visible
 */

/**
 * @action Récupérer les profils SMTP via GET /api/settings/smtp
 * @checkpoint profiles-fetched, liste des profils reçue
 * @api GET /api/settings/smtp
 * @response { profiles: [{ id, nom, host, port, username, statut, par_defaut }] }
 */

/**
 * @action Masquer les informations sensibles (mot de passe chiffré)
 * @checkpoint sensitive-hidden, champs sensibles masqués ou partiels
 */

/**
 * @action Calculer les statistiques d'utilisation
 * @checkpoint stats-calculated, nb relances envoyées par profil
 * 
 **Approche** : Si disponible, récupérer le nombre d'emails envoyés
 * par profil SMTP depuis les logs ou statistiques
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

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/settings/smtp` | Liste des profils SMTP |

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
