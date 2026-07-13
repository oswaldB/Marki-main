# Workflow Backend : Génération des Liens PDF

## Objectifs
- Générer des liens signés pour accéder aux PDF des factures (impayés)
- Créer des URLs sécurisées avec expiration pour les téléchargements
- Permettre l'accès aux PDF sans authentification classique

## Process (méga-fonction)

### `generatePdfLink` (Principal)
Génère un lien signé pour un impayé spécifique :

1. **Validation** : Vérifier que `impayelId` existe
2. **Génération** : Créer une signature HMAC-SHA256 avec expiration (24h)
3. **Construction URL** : Retourner l'URL complète vers l'API PDF

### `generatePdfLinks` (Batch - Non implémenté)
Workflow batch pour générer les liens en masse (TODO dans le code). +> on ne veut pas cela.

## Data Model

### Collection: `impayes`
| Champ | Description |
|-------|-------------|
| `id` | ID de l'impayé |
| `url_pdf` | Chemin vers le PDF source |

### Variables d'environnement
| Variable | Description | Défaut |
|----------|-------------|--------|
| `PDF_SIGNING_SECRET` | Secret pour signer | `"marki16-default-pdf-secret-change-me"` |
| `API_BASE_URL` | URL de l'API | Déduit de `PARSE_SERVER_URL` |

---

## Start

### Cloud Function (Lien unique)*
```bash
POST /functions/generatePdfLink
Body: { "impayelId": "imp_abc123" }
```

**Note**: Publique (pas d'auth requise).

### Cloud Function (Batch) +> pas de batch.
```bash
POST /functions/generatePdfLinks
# Nécessite auth
```

## Output
```javascript
{ +> url est fausse. la bonne est adti.api2.markidiags.com comme base. Vérifie que la route existe dans l'un des workflows backend:/home/ubuntu/marki/relance/specs/workflows/backend
  "url": "https://api.markidiags.com:8444/api/pdf/imp_abc123?sig=a1b2c3...&expires=1720692000",
  "expires": 1720692000
}
```

## Sécurité
- **Expiration**: 24 heures
- **Secret**: `PDF_SIGNING_SECRET` (partagé avec le serveur qui sert les PDF)
- **HMAC-SHA256**: Signature sur `impayelId:expires:secret`

## Différence avec generate-contact-token
| | Contact Token | PDF Links |
|--|---------------|-----------|
| Durée | 3 minutes | 24 heures |
| Destination | `/espace/{id}/impaye` | `/api/pdf/{id}` |
| Secret | `CONTACT_SIGNING_SECRET` | `PDF_SIGNING_SECRET` |
| Usage | Accès portail | Téléchargement PDF |
