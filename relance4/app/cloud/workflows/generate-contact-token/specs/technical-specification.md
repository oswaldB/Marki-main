# Spécification Technique - Workflow Génération des Tokens de Contact

## Sommaire
1. [Vue d'ensemble](#vue-densemble)
2. [Modèles de Données](#modèles-de-données)
3. [Fonctionnement du Script](#fonctionnement-du-script)
4. [API Cloud Function](#api-cloud-function)

---

## Vue d'ensemble

**Objectif** : Générer un token signé sécurisé permettant l'accès temporaire à l'espace client d'un contact sans authentification classique.

**Cas d'usage** : 
- Lien direct depuis un email de relance vers l'espace impayés du client
- Accès ponctuel sans création de compte utilisateur
- URL à usage unique avec expiration courte (3 minutes)

**Entrée** : `contactId` (string) - L'objectId du contact Parse

**Sortie** : Objet JSON contenant :
- `url` (string) : URL complète signée vers l'espace client
- `expires` (number) : Timestamp Unix d'expiration

---

## Modèles de Données

### Commandes cURL de référence

```bash
# Récupération du schéma Contact
curl -X GET "https://dev.markidiags.com/api/parse/schemas/Contact" \
  -H "X-Parse-Application-Id: adti-marki" \
  -H "X-Parse-Master-Key: ${PARSE_MASTER_KEY}"

# Récupération d'un contact spécifique
curl -X GET "https://dev.markidiags.com/api/parse/classes/Contact/${CONTACT_ID}" \
  -H "X-Parse-Application-Id: adti-marki" \
  -H "X-Parse-Master-Key: ${PARSE_MASTER_KEY}"
```

### Classe `Contact`

**Description** : Représente un contact (payeur) dans le système

**Champs pertinents** :
```javascript
{
  "objectId": String,        // Identifiant unique du contact
  "nom": String,             // Nom de famille
  "prenom": String,          // Prénom
  "email": String,           // Email principal
  "telephone": String,       // Téléphone
  "civilite": String,        // Civilité (M., Mme, etc.)
  "type_personne": String,   // Type (particulier, professionnel)
  "adresse": String,         // Adresse postale
  "ville": String,
  "code_postal": String,
  "isBlacklisted": Boolean,  // Si true, accès interdit
  "nb_impayes": Number       // Nombre d'impayés associés
}
```

---

## Fonctionnement du Script

### Architecture

Le workflow est une fonction unique `generateContactTokenMaster` qui effectue les étapes suivantes :

### Étapes Détaillées

#### Étape 1 : Validation des paramètres d'entrée

**Logique** :
```javascript
const { contactId } = options;

if (!contactId) {
    throw new Error("contactId est requis");
}
```

**Vérifications** :
- Présence obligatoire du `contactId`
- Type : chaîne de caractères non vide

---

#### Étape 2 : Vérification de l'existence du contact

**Requête Parse** :
```javascript
const Contact = Parse.Object.extend("Contact");
const query = new Parse.Query(Contact);
await query.get(contactId, { useMasterKey: true });
```

**Comportement** :
- Si le contact n'existe pas : lève une erreur "Contact introuvable"
- Utilise `useMasterKey: true` pour accéder à tous les contacts
- Ne vérifie pas le statut `isBlacklisted` (laissé au frontend)

---

#### Étape 3 : Calcul de l'expiration

**Logique** :
```javascript
// Expiration dans 3 minutes (180 secondes)
const expires = Math.floor(Date.now() / 1000) + 3 * 60;
```

**Caractéristiques** :
- Durée de validité : 3 minutes
- Format : timestamp Unix (secondes depuis epoch)
- Calculé côté serveur pour éviter les désynchronisations

---

#### Étape 4 : Génération de la signature HMAC

**Configuration** :
```javascript
const CONTACT_SIGNING_SECRET = 
    process.env.CONTACT_SIGNING_SECRET ||
    process.env.PDF_SIGNING_SECRET ||
    "marki16-default-contact-secret-change-me";
```

**Algorithme de signature** :
```javascript
// Données à signer : contactId + expires + secret
const dataToSign = `${contactId}:${expires}:${CONTACT_SIGNING_SECRET}`;

// HMAC SHA256
const sig = crypto
    .createHmac("sha256", CONTACT_SIGNING_SECRET)
    .update(dataToSign)
    .digest("hex");
```

**Format de la signature** :
- Algorithme : HMAC-SHA256
- Sortie : hexadécimal (64 caractères)
- Données signées : `"{contactId}:{expires}:{secret}"`

**Sécurité** :
- Le secret est stocké dans les variables d'environnement
- Fallback sur `PDF_SIGNING_SECRET` si `CONTACT_SIGNING_SECRET` non défini
- La signature inclut l'expiration pour éviter la réutilisation

---

#### Étape 5 : Construction de l'URL

**Configuration** :
```javascript
const FRONTEND_URL = 
    process.env.FRONTEND_URL || 
    "https://dev.markidiags.com";
```

**Construction** :
```javascript
const url = `${FRONTEND_URL}/espace/${contactId}/impaye?sig=${sig}&expires=${expires}`;
```

**Format de l'URL** :
```
https://{FRONTEND_URL}/espace/{contactId}/impaye?sig={signature_hmac}&expires={timestamp}
```

**Paramètres de l'URL** :
- `sig` : Signature HMAC hexadécimale (64 caractères)
- `expires` : Timestamp Unix d'expiration

**Route frontend associée** :
- Le frontend doit implémenter la route `/espace/[contactId]/impaye`
- Cette route doit vérifier la signature côté client ou via une Cloud Function
- Afficher les impayés du contact si la signature est valide et non expirée

---

## API Cloud Function

### Définition

```javascript
Parse.Cloud.define("generateContactToken", async (request) => {
    const { contactId } = request.params;
    
    if (!contactId) {
        throw new Error("contactId est requis");
    }
    
    return await generateContactTokenMaster({ contactId });
});
```

### Appel via cURL

```bash
# Génération d'un token pour un contact
curl -X POST "https://dev.markidiags.com/api/parse/functions/generateContactToken" \
  -H "X-Parse-Application-Id: adti-marki" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "abc123xyz789"
  }'
```

**Note** : Cette Cloud Function est **publique** (pas d'authentification requise) car elle est appelée depuis des liens email par des clients non connectés.

### Réponse

```json
{
  "result": {
    "url": "https://dev.markidiags.com/espace/abc123xyz789/impaye?sig=a1b2c3...&expires=1719123456",
    "expires": 1719123456
  }
}
```

---

## Utilisation en CLI

### Commande

```bash
node backend/cloud/workflows/generate-contact-token/00-master.js <contactId>
```

### Exemple

```bash
node 00-master.js abc123xyz789
```

### Sortie

```
URL générée: https://dev.markidiags.com/espace/abc123xyz789/impaye?sig=a1b2c3d4e5f6...
```

### Code de retour

- `0` : Succès
- `1` : Erreur (contact introuvable, paramètres manquants, etc.)

---

## Validation côté Frontend

Pour vérifier la validité d'un token, le frontend doit :

1. **Extraire les paramètres** de l'URL (`sig`, `expires`)
2. **Vérifier l'expiration** : `expires > Date.now() / 1000`
3. **Recalculer la signature** avec le même algorithme HMAC-SHA256
4. **Comparer** la signature calculée avec celle reçue (timing-safe)

**Exemple de validation** :
```javascript
function validateToken(contactId, sig, expires, secret) {
    // Vérifier expiration
    if (Date.now() / 1000 > expires) {
        return false; // Token expiré
    }
    
    // Recalculer la signature
    const dataToSign = `${contactId}:${expires}:${secret}`;
    const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(dataToSign)
        .digest("hex");
    
    // Comparaison timing-safe
    return crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expectedSig)
    );
}
```

---

## Variables d'Environnement

| Variable | Description | Défaut | Obligatoire |
|----------|-------------|--------|-------------|
| `CONTACT_SIGNING_SECRET` | Clé secrète pour signer les tokens | `"marki16-default-contact-secret-change-me"` | Recommandé |
| `PDF_SIGNING_SECRET` | Clé secrète alternative (fallback) | - | Non |
| `FRONTEND_URL` | URL de base du frontend | `"https://dev.markidiags.com"` | Oui |
| `PARSE_APP_ID` | Application ID Parse | - | Oui |
| `PARSE_JAVASCRIPT_KEY` | JavaScript Key Parse | - | Oui |
| `PARSE_MASTER_KEY` | Master Key Parse | - | Oui |
| `PARSE_SERVER_URL` | URL du serveur Parse | - | Oui |

---

## Dépendances

- `parse/node` : SDK Parse pour Node.js
- `crypto` : Module natif Node.js pour HMAC-SHA256
- `dotenv` : Chargement des variables d'environnement
- `../../utils/logger` : Utilitaire de logging personnalisé

---

## Logs et Monitoring

Les événements suivants sont logués via le logger utilitaire :

| Événement | Niveau | Contexte |
|-----------|--------|----------|
| Début de génération | `info` | `{ contactId }` |
| Token généré avec succès | `info` | `{ contactId, expires, duration }` |
| Contact introuvable | `error` | `{ contactId, error }` |
| Erreur CLI | `error` | `{ error, stack }` |

**Format des logs** :
```
[generate-contact-token/master] Génération du token pour contact: {contactId}
[generate-contact-token/master] Token généré en {duration}ms
```
