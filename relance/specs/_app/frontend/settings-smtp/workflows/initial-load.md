---
id: settings-smtp-initial-load
type: frontend
folder: specs/workflows/frontend/settings-smtp/
description: Charger les profils SMTP configurés
depends_on: [auth-check]
screen: settings-smtp
global: false
mockup_entry: specs/mockups/settings-smtp.html
---

# settings-smtp-initial-load : Chargement initial Profils SMTP

## Description

Charger la liste des profils SMTP avec leur statut et statistiques d'envoi.

## Étapes

```javascript
/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, liste en chargement
 */

/**
 * @action Récupérer les profils SMTP via GET /api/smtp-profiles
 * @checkpoint profils-fetched, profils SMTP reçus (sans mots de passe)
 */

/**
 * @action Les profils SMTP sont récupérés avec leur statut actif/inactif
 * @checkpoint profils-fetched, profils SMTP reçus (sans mots de passe)
 * 
 * **Note** : Pas de stats d'envoi. Seuls les champs de configuration sont retournés.
 */

/**
 * @action Stocker les données dans Alpine.store('smtp')
 * @checkpoint data-stored, profils avec stats disponibles
 */

/**
 * @action Rendre la liste des profils avec indicateurs de statut
 * @checkpoint list-rendered, badges actif/inactif et boutons test visibles
 */
```

## Mockups de référence

- `specs/mockups/settings-smtp.html`
