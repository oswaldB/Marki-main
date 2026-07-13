# Workflow Backend : Récupération des Impayés par Contact

## Objectifs
- Récupérer la liste des impayés d'un contact spécifique
- Sécuriser l'accès via vérification de signature HMAC
- Fournir les données nécessaires au portail client (espace client)
- Filtrer uniquement les impayés non soldés où le contact est payeur

## Type de Workflow
**API Sécurisée** - Endpoint public protégé par signature pour le portail client.

## Process (méga-fonction)

La fonction `getContactImpayesMaster({ contactId, sig, expires })` exécute les étapes suivantes :

### Étape 1 : Validation des Paramètres
- Vérifie que `contactId`, `sig` et `expires` sont fournis
- Retourne une erreur si un paramètre est manquant

### Étape 2 : Vérification de l'Expiration
- Convertit `expires` (timestamp Unix) en nombre
- Compare avec le timestamp actuel
- Retourne erreur "Lien expiré" si dépassé

### Étape 3 : Vérification de la Signature
- Recrée la chaîne à signer : `${contactId}:${expires}:${CONTACT_SIGNING_SECRET}`
- Calcule la signature HMAC-SHA256 attendue
- Compare avec la signature fournie
- Retourne erreur "Lien invalide" si différente

### Étape 4 : Récupération des Impayés
- Recherche les impayés où :
  - `payeur = contactId` (le contact est le payeur)
  - `facture_soldee != true` (facture non soldée)
  - `reste_a_payer > 0` (il reste quelque chose à payer)
- Trie par `createdAt` décroissant
- Limite à 1000 résultats

### Étape 5 : Formatage de la Réponse
- Transforme les objets Parse en objets JSON simples
- Inclut les champs pertinents pour l'affichage client

## Data Model

### Collection: `impayes`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `nfacture` | string | Numéro de facture |
| `ref_piece` | string | Référence pièce |
| `reference_facture` | string | Référence facture |
| `date_piece` | date | Date de la pièce |
| `date_facture` | date | Date de facture |
| `total_ttc` | number | Montant TTC |
| `montant_total_facture` | number | Montant total |
| `reste_a_payer` | number | Reste dû |
| `facture_soldee` | boolean | Statut soldé |
| `date_echeance` | date | Date d'échéance |
| `date_derniere_relance` | date | Dernière relance |
| `nombre_relances` | number | Nb de relances envoyées |
| `sequence_id` | string | Séquence de relance |
| `pdf_local_path` | string | Chemin du PDF |
| `numero_dossier` | string | Numéro de dossier |
| `adresse_bien` | string | Adresse du bien |
| `code_postal` | string | Code postal |
| `ville` | string | Ville |
| `commentaire_piece` | string | Commentaire |

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `CONTACT_SIGNING_SECRET` | Secret pour vérifier la signature | `PDF_SIGNING_SECRET` ou fallback |

---

## Organisation des fichiers

```
/backend/
├── get-contact-impayes/
│   ├── 00-master.js          # Point d'entrée
│   ├── logs/                 # Logs
│   └── specs/
│       └── spec.md           # Documentation
```

**Chemin complet:** `/backend/get-contact-impayes/`

---

## Start

### Cloud Function

```bash
POST /functions/getContactImpayes
Body: {
  "contactId": "cont_abc123",
  "sig": "a1b2c3d4e5f6...",
  "expires": "1720605600"
}
```

**Note**: Fonction publique mais protégée par signature.

### CLI

```bash
node 00-master.js cont_abc123 a1b2c3d4e5f6... 1720605600
```

## Process

### 00-master.js

**Objectif:** Récupérer les impayés d'un contact avec vérification de signature.

```javascript
const CONTACT_SIGNING_SECRET = process.env.CONTACT_SIGNING_SECRET || 
                               process.env.PDF_SIGNING_SECRET ||
                               "marki16-default-contact-secret-change-me";

async function getContactImpayesMaster({ contactId, sig, expires }) {
  // 1. Validation
  if (!contactId || !sig || !expires) {
    throw new Error("Paramètres manquants");
  }
  
  // 2. Vérifier expiration
  const now = Math.floor(Date.now() / 1000);
  if (parseInt(expires) < now) {
    throw new Error("Lien expiré");
  }
  
  // 3. Vérifier signature
  const dataToSign = `${contactId}:${expires}:${CONTACT_SIGNING_SECRET}`;
  const expectedSig = crypto
    .createHmac("sha256", CONTACT_SIGNING_SECRET)
    .update(dataToSign)
    .digest("hex");
  
  if (sig !== expectedSig) {
    throw new Error("Lien invalide");
  }
  
  // 4. Récupérer les impayés
  const impayes = db.query('impayes')
    .where('payeur_id', contactId)
    .where('facture_soldee', '!=', true)
    .where('reste_a_payer', '>', 0)
    .orderBy('created_at', 'desc')
    .limit(1000)
    .data();
  
  // 5. Formater la réponse
  const result = impayes.map(impaye => ({
    id: impaye.id,
    nfacture: impaye.nfacture,
    ref_piece: impaye.ref_piece,
    montant_total: impaye.total_ttc,
    reste_a_payer: impaye.reste_a_payer,
    date_echeance: impaye.date_echeance,
    // ... autres champs
  }));
  
  return { impayes: result };
}
```

#### Output

```javascript
{
  "impayes": [
    {
      "id": "imp_abc123",
      "nfacture": "F2024001",
      "ref_piece": "PIECE001",
      "reference_facture": "REF001",
      "date_piece": "2024-01-15T00:00:00.000Z",
      "date_facture": "2024-01-15T00:00:00.000Z",
      "montant_total": 1250.50,
      "montant_total_facture": 1250.50,
      "reste_a_payer": 1250.50,
      "facture_soldee": false,
      "date_echeance": "2024-02-15T00:00:00.000Z",
      "date_derniere_relance": null,
      "nombre_relances": 0,
      "sequence_id": "seq_xyz789",
      "pdf_local_path": "/data/pdfs/F2024001.pdf",
      "numero_dossier": "DOS001",
      "adresse_bien": "123 Rue Example",
      "code_postal": "75001",
      "ville": "Paris",
      "commentaire_piece": "Facture mensuelle",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Sécurité

- **Signature HMAC-SHA256** : Vérification cryptographique de l'authenticité
- **Expiration** : Les liens ont une durée de vie limitée (3 minutes pour les tokens générés par `generate-contact-token`)
- **Accès restreint** : Uniquement les impayés où le contact est `payeur` (pas `contact_relance` ou `apporteur`)
- **Filtre soldes** : Exclut automatiquement les factures soldées

## Flux Complet (Portail Client)

1. **Lien email** : L'utilisateur clique sur `[[lien_espace]]` dans un email
2. **generate-contact-token** : Crée un token signé avec `contactId` + `expires` + `sig`
3. **Redirection** : L'utilisateur arrive sur `/espace/{contactId}/impaye?sig=...&expires=...`
4. **Frontend** : Appelle `getContactImpayes` avec les paramètres de l'URL
5. **Vérification** : Le workflow vérifie la signature et l'expiration
6. **Affichage** : Retourne les impayés à afficher dans l'espace client

## Différence avec les autres workflows

| Workflow | Usage | Sécurité |
|----------|-------|----------|
| `get-contact-impayes` | Portail client (lecture) | Token signé, accès public |
| `portail-client` | Génération du portail | Authentification requise |
| `generate-contact-token` | Création du lien magique | Secret serveur |

## Notes

- Ce workflow est **lecture seule** (GET-like)
- Il ne modifie aucune donnée
- Il est conçu pour être appelé depuis le frontend du portail client
- La signature doit être générée par `generate-contact-token` ou équivalent
