# Workflow Backend : Régénération des Relances pour un Contact

## Objectifs
- Régénérer les relances pour un contact spécifique après un événement (blacklist/unblacklist d'un impayé)
- Supprimer les relances "brouillons" existantes du contact
- Générer de nouvelles relances avec les données à jour
- Utiliser Ollama pour générer le contenu personnalisé

## Process (méga-fonction)

La méga-fonction `regenerateRelancesContact(contactId, excludeImpayeId)` exécute les étapes suivantes :

### Étape 1 : Vérification du Contact
- Vérifier que le contact existe
- Vérifier que le contact n'est pas blacklisté (sinon aucune génération)
- Vérifier que le contact a un email valide

### Étape 2 : Suppression des Brouillons Existants
- Recherche les relances du contact avec statut != "Envoyée" et sans `dateEnvoi`
- Supprime ces relances brouillons via `db.delete()` en boucle

### Étape 3 : Récupération des Impayés
- Récupère les impayés du contact où :
  - `contact_relance = contactId`
  - `facture_soldee = false`
  - `reste_a_payer > 0`
  - `sequence_id` existe
- Filtre les impayés blacklistés
- Exclut l'impayé spécifié (si `excludeImpayeId` fourni)

### Étape 4 : Regroupement par Séquence
- Regroupe les impayés par `sequence_id`
- Ignore les séquences de type autre que "relances"

### Étape 5 : Génération des Relances
Pour chaque groupe de séquence :
- Détermine le scénario (`single`, `multiple`, `broker`, `both`)
- Pour chaque email dans la séquence :
  - Vérifie si une relance envoyée existe déjà (évite les doublons)
  - Calcule la date d'envoi (`date_echeance + delai`)
  - Génère le contenu via Ollama avec le prompt spécifique au scénario
  - Remplace les placeholders (`[[lien_pdf]]`, `[[lien_espace]]`)
  - Crée la relance avec statut `pret pour envoi`

## Data Model

### Collection: `contacts`
| Champ | Description |
|-------|-------------|
| `id` | Identifiant |
| `email` | Email (vérifié) |
| `is_blacklisted` | Bloque la génération si true |

### Collection: `impayes`
| Champ | Description |
|-------|-------------|
| `id` | Identifiant |
| `contact_relance_id` | Contact pour relance |
| `facture_soldee` | Filtre: false |
| `reste_a_payer` | Filtre: > 0 |
| `sequence_id` | Séquence assignée |
| `is_blacklisted` | Exclu si true |

### Collection: `relances`
| Champ | Description |
|-------|-------------|
| `id` | Identifiant |
| `contact_id` | Contact destinataire |
| `sequence_id` | Séquence |
| `email_index` | Index de l'email |
| `impaye_ids` | Impayés liés |
| `statut` | Supprimé si != "Envoyée" |
| `date_envoi` | Supprimé si n'existe pas |

---

## Start

### Cloud Function
```bash
POST /functions/regenerateRelancesContact
Body: { 
  "contactId": "cont_abc123",
  "excludeImpayeId": "imp_def456"  // optionnel
}
```

**Note**: Nécessite authentification utilisateur.

## Output
```javascript
{
  "success": true,
  "createdCount": 3,
  "message": "3 relance(s) générée(s)"
}
```

## Checkpoints
- `regenerate-start` : Démarrage
- `regenerate-brouillons-loaded` : Brouillons chargés
- `regenerate-brouillons-deleted` : Brouillons supprimés
- `regenerate-impayes-loaded` : Impayés chargés
- `regenerate-generation-start` : Début génération
- `regenerate-generation-end` : Fin génération
- `regenerate-completed` : Terminé
- `regenerate-error` : Erreur

## Différence avec generate-relances
| | generate-relances | regenerate-relances-contact |
|--|-------------------|----------------------------|
| Portée | Tous les impayés | Un contact spécifique |
| Suppression | Non | Oui (brouillons existants) |
| Exclusion | Non | Oui (impayé spécifique) |
| Déclenchement | Cron/import | Manuel (après blacklist) |
