# Workflow Backend : Génération de Token Contact (Portail) +>quelle différence avec /home/ubuntu/marki/relance/specs/workflows/backend/portail-client.md ? réponse ici %% 

**Différence fondamentale :**

| Workflow | Rôle | Quand l'utiliser |
|----------|------|------------------|
| `generate-contact-token` | Crée un **lien magique temporaire** (3 min) signé avec HMAC-SHA256 pour accès direct sans login | Dans les emails de relance - le client clique et accède directement à son espace |
| `portail-client` | **Authentification JWT classique** + récupération des données (factures impayées) | Quand l'utilisateur est déjà authentifié avec un JWT valide |

**En résumé :**
- `generate-contact-token` = génère une URL sécurisée à usage unique (`/espace/{id}/impaye?sig=...&expires=...`)
- `portail-client` = vérifie le JWT et retourne les données du contact connecté

Ces deux workflows fonctionnent ensemble : le premier crée le lien dans l'email, le second gère l'accès authentifié au portail.

%%.

## Objectifs
- Générer un token signé pour l'accès à l'espace client (portail)
- Créer une URL sécurisée avec expiration pour les liens dans les emails
- Permettre l'accès au portail sans authentification classique (lien magique)

## Process (méga-fonction)

La méga-fonction `generateContactTokenMaster()` exécute les étapes suivantes :

### Étape 1 : Validation
- Vérifier que `contactId` est fourni
- Vérifier que le contact existe dans Parse

### Étape 2 : Génération du Token
- Calculer la date d'expiration (3 minutes par défaut)
- Créer la chaîne à signer : `${contactId}:${expires}:${secret}`
- Générer la signature HMAC-SHA256 avec le secret

### Étape 3 : Construction de l'URL
- Construire l'URL complète : `${FRONTEND_URL}/espace/{contactId}/impaye?sig={signature}&expires={timestamp}`
- Retourner l'URL et la date d'expiration

## Data Model

### Collection: `contacts`
**Stockage:** `/backend/data/contacts/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant du contact (utilisé dans le token) |

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `CONTACT_SIGNING_SECRET` | Secret pour signer les tokens | `PDF_SIGNING_SECRET` ou valeur par défaut |
| `FRONTEND_URL` | URL de base du frontend | `https://dev.markidiags.com` |

---

## Organisation des fichiers

```
/backend/
├── generate-contact-token/
│   ├── 00-master.js          # Point d'entrée
│   ├── specs/
│   │   └── spec.md           # Documentation
│   └── logs/                 # Logs
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/generate-contact-token/`

---

## Start

### Route (Cloud Function)
```bash
POST /functions/generateContactToken

# cURL
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"contactId": "cont_abc123"}' \
  "http://adti.api2.markidiags.com/functions/generateContactToken"
```

**Note**: Cette Cloud Function est publique (pas d'authentification requise) car elle est appelée depuis un lien email par un client non connecté.

### CLI
```bash
node 00-master.js cont_abc123
```

## Process

### index.js (00-master.js)
**Objectif :** Générer un token signé pour accès portail.

#### Operations

```javascript
const crypto = require('crypto');

// Secret de signature (depuis env ou fallback)
const CONTACT_SIGNING_SECRET = process.env.CONTACT_SIGNING_SECRET || 
                               process.env.PDF_SIGNING_SECRET || 
                               'marki16-default-contact-secret-change-me';

// URL frontend
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dev.markidiags.com';

async function generateContactTokenMaster({ contactId }) {
  // 1. Validation
  if (!contactId) {
    throw new Error('contactId est requis');
  }
  
  // Vérifier existence du contact
  const contact = await db.read('contacts', contactId);
  if (!contact) {
    throw new Error('Contact introuvable');
  }
  
  // 2. Génération du token
  // Expiration dans 3 minutes (timestamp Unix en secondes)
  const expires = Math.floor(Date.now() / 1000) + 3 * 60;
  
  // Créer la chaîne à signer
  const dataToSign = `${contactId}:${expires}:${CONTACT_SIGNING_SECRET}`;
  
  // Générer la signature HMAC-SHA256
  const sig = crypto
    .createHmac('sha256', CONTACT_SIGNING_SECRET)
    .update(dataToSign)
    .digest('hex');
  
  // 3. Construction de l'URL
  const url = `${FRONTEND_URL}/espace/${contactId}/impaye?sig=${sig}&expires=${expires}`;
  
  return { url, expires };
}
```

#### Output
```javascript
{
  "url": "https://adti.markidiags.com/espace/cont_abc123/impaye?sig=a1b2c3d4e5f6...&expires=1720605600",
  "expires": 1720605600
}
```

## Vérification du Token (côté Frontend/Portail)

Le frontend doit vérifier la signature lors de l'accès à l'URL :

```javascript
function verifyContactToken(contactId, expires, sig) {
  // Vérifier expiration
  const now = Math.floor(Date.now() / 1000);
  if (now > parseInt(expires)) {
    throw new Error('Token expiré');
  }
  
  // Recalculer la signature
  const secret = process.env.CONTACT_SIGNING_SECRET;
  const dataToSign = `${contactId}:${expires}:${secret}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('hex');
  
  // Comparer les signatures
  if (sig !== expectedSig) {
    throw new Error('Signature invalide');
  }
  
  return true; // Token valide
}
```

## Error Handling

| Code | Description |
|------|-------------|
| 400 | `contactId` manquant |
| 404 | Contact introuvable |
| 500 | Erreur de génération du token |

## Sécurité

- **Secret**: Utilise un secret dédié (`CONTACT_SIGNING_SECRET`) ou fallback sur `PDF_SIGNING_SECRET`
- **Expiration**: Les tokens expirent après 3 minutes (configurable)
- **HMAC-SHA256**: Algorithme de signature robuste
- **Accès public**: La Cloud Function est publique mais ne retourne que l'URL, pas les données sensibles

## Utilisation Typique

Ce workflow est utilisé dans les emails de relance pour générer le lien vers l'espace client :

```javascript
// Dans le workflow send-emails
const { url } = await generateContactTokenMaster({ 
  contactId: contact.id 
});

// Remplacer dans le template
const emailBody = template.replace(
  '[[lien_espace]]', 
  url
);
```

L'utilisateur clique sur le lien et accède directement à son espace sans saisir de mot de passe, grâce au token signé dans l'URL.
