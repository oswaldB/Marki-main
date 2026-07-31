# Workflow send-suivi - Spécifications Techniques

## Objectifs
- Envoyer les emails de suivi générés par le workflow `generate-suivi`
- Gérer la livraison via SMTP avec support du champ CC
- Différencier les suivis des relances (modèle de données spécifique)

---

## Différence clé : Suivi vs Relance

| Aspect | Relance | Suivi |
|--------|---------|-------|
| **Type Sequence** | `type: "relance"` | `type: "suivi"` |
| **Fréquence** | Quotidienne (tous les jours) avec règles d'attribution | Fixe (quotidien, hebdomadaire, lundi, 15...) avec règles d'attribution |
| **Scénarios** | single, multiple | single, multiple, both, broker |
| **Champ CC** | Non présent | `cc: string` (copie à l'apporteur) |
| **Objectif** | Recouvrement d'impayés | Information pédagogique sur l'état des dossiers |
| **Workflow génération** | `generate-relances` | `generate-suivi` |

---

## Data Model

### Suivi (classe Parse)

```javascript
{
  objectId: string,           // Identifiant unique
  statut: string,             // "pret pour envoi", "Envoyée", "Erreur d'envoi", "Contact blacklisté", "Impayé blacklisté"
  dateEnvoi: Date,            // Date programmée d'envoi
  dateEnvoiReelle: Date,      // Date réelle d'envoi (mis à jour après envoi)
  objet: string,              // Sujet de l'email généré par LLM
  corps: string,              // Contenu HTML généré par LLM
  emailSent: boolean,         // Indique si l'email a été envoyé
  lastError: string,          // Dernière erreur rencontrée
  erreur_count: number,       // Nombre de tentatives en échec
  
  // Relations
  contact: Pointer<Contact>,          // Contact destinataire
  sequence: Pointer<Sequence>,          // Séquence de suivi (type: "suivi")
  impayes: Pointer<Impaye>[],         // Liste des impayés concernés
  smtpProfil: Pointer<SmtpProfile>,   // Profil SMTP pour l'envoi
  
  // Métadonnées
  email_index: number,        // Index de l'email dans la séquence (ex: 1)
  scenario: string,           // "single", "multiple", "both", "broker"
  frequence: string,          // "quotidien", "hebdomadaire", "lundi", "15", etc.
  valide: boolean,            // Si validation manuelle requise
  manuelle: boolean,          // false = auto, true = création manuelle
  
  // Spécifique Suivi
  cc: string,                 // Adresses email en copie (séparées par virgule)
}
```

### Sequence (type: "suivi")

Structure d'une séquence de suivi (ex: xsqjGJ4mw3) :

```javascript
{
  objectId: "xsqjGJ4mw3",
  nom: "Suivi agences début de mois",
  type: "suivi",                    // Différent des relances
  publiee: true,
  validation_obligatoire: true,
  
  // Fréquences dans emails[].frequence
  emails: [
    {
      email_index: 1,
      frequence: "hebdomadaire",    // "quotidien", "hebdomadaire", "lundi", "15"
      smtp: "",                     // SMTP par défaut (peut être surchargé par scenario)
      to: "[[payeur_email]]",
      cc: "",                       // CC par défaut
      
      // 4 scénarios possibles pour les suivis
      scenarios: [
        {
          format: "single",         // 1 facture = tableau simple
          active: true,
          smtp: "YPsNANpWhC",       // SMTP spécifique au scénario
          cc: "",
          objet: "Suivi de vos dossiers - Facture [[nfacture]]...",
          corps: "<p>Bonjour...</p>"  // Avec placeholders [[...]]
        },
        {
          format: "multiple",       // N factures = tableau avec boucle
          active: true,
          smtp: "",
          cc: "",
          objet: "Suivi de vos dossiers - Plusieurs factures...",
          corps: "<p>...[[loop impayes]]...</p>"
        },
        {
          format: "both",           // Multiple + CC apporteur
          active: true,
          smtp: "",
          cc: "",
          objet: "Suivi de vos dossiers...",
          corps: "<p>...en copie à votre apporteur [[apporteur_contact_prenom]]...</p>"
        },
        {
          format: "broker",         // Format spécifique apporteur
          active: true,
          smtp: "",
          cc: "",
          objet: "Suivi de vos dossiers",
          corps: "<p>...</p>"
        }
      ]
    }
  ],
  
  // Règles d'attribution automatique
  attribution_automatique: true,
  groupes_regles: [
    {
      logique: "ET",
      regles: [
        {
          champ: "payeur_type",
          operateur: "egal",
          valeur: ["Apporteur d'affaire"]
        }
      ]
    }
  ]
}
```

### Fréquences supportées

Le champ `frequence` dans la Sequence et le Suivi peut être :

| Valeur | Signification | Exemple d'exécution |
|--------|---------------|---------------------|
| `"quotidien"` | Tous les jours | Tous les jours |
| `"hebdomadaire"` | Tous les lundis | Chaque lundi |
| `"mensuel"` | Le 1er du mois | Le 1er de chaque mois |
| `"lundi"` | Les lundis | Chaque lundi |
| `"mardi"` | Les mardis | Chaque mardi |
| `"mercredi"` | Les mercredis | Chaque mercredi |
| `"jeudi"` | Les jeudis | Chaque jeudi |
| `"vendredi"` | Les vendredis | Chaque vendredi |
| `"samedi"` | Les samedis | Chaque samedi |
| `"dimanche"` | Les dimanches | Chaque dimanche |
| `"1"` à `"31"` | Jour précis du mois | Le N du mois (ex: "15" = le 15) |

### Placeholders dans les templates

Les scénarios de suivi utilisent des placeholders spécifiques :

```javascript
[[nfacture]]                    // Numéro de facture
[[numero_dossier]]             // Numéro de dossier
[[date_piece, date("DD/MM/YYYY")]]  // Date formatée
[[date_echeance, date("DD/MM/YYYY")]]
[[adresse_bien]]               // Adresse du bien
[[code_postal]]
[[ville]]
[[proprietaire_nom]]
[[proprietaire_prenom]]
[[payeur_nom]]
[[montant_total]]             // Montant TTC
[[reste_a_payer]]             // Reste dû
[[aujourdhui, date("DD/MM/YYYY")]]   // Date du jour
[[lien_espace]]               // Lien espace client
[[lien_pdf]]                  // Lien PDF facture
[[apporteur_contact_prenom]]  // Spécifique "both" et "broker"
[[apporteur_contact_nom]]
[[apporteur_societe]]

// Boucle pour scénario "multiple" et "both"
[[loop impayes]]
| [[numero_dossier]] | [[nfacture]] | ...
[[endloop]]
```

---

## Processus complet

### 1. Génération (generate-suivi)

Le workflow `generate-suivi` (déjà existant) crée les objets `Suivi` :

```
Pour chaque Sequence de type "suivi" publiée :
  └─ Vérifier si frequence correspond à aujourd'hui
      └─ Récupérer impayés non soldés pour cette séquence
          └─ Grouper par contact_relance (ou payeur)
              └─ Pour chaque contact :
                  ├─ Vérifier historique (pas de doublon aujourd'hui)
                  ├─ Pour chaque scénario actif :
                  │   └─ Appeler LLM (Ollama) avec prompt
                  │       └─ Remplacer placeholders
                  │           └─ Créer objet Suivi (statut: "pret pour envoi")
                  └─ Sauvegarder en base
```

### 2. Envoi (send-suivi) ← À implémenter

Ce workflow envoie les `Suivi` avec `statut: "pret pour envoi"` :

```
Query Suivi where statut = "pret pour envoi" AND dateEnvoi <= now
  └─ Pour chaque suivi :
      ├─ Validation : contact présent, email valide, impayés présents
      ├─ Blacklist check (contact + impayés)
      ├─ Récupérer SMTP profil
      ├─ Construire email options (avec CC si présent)
      ├─ Ajouter signature_html du SMTP profil
      ├─ Envoyer via Nodemailer
      ├─ Copier dans Sent (IMAP) - obligatoire
      └─ Mettre à jour statut : "Envoyée"
```

---

## Start (send-suivi)

### Cron

Le workflow doit être exécuté automatiquement tous les jours à **19h** (Europe/Paris) via `backend/cron.js`.

```javascript
// À ajouter dans cron.js
cron.schedule("0 19 * * *", () => {
    sendSuivisMaster({ trigger: "cron" });
}, { timezone: "Europe/Paris" });
```

### Routes d'accès

| Méthode | Commande |
|---------|----------|
| CLI | `node 00-master.js` |
| Programmatic | `require('./send-suivi/00-master').sendSuivisMaster(options)` |
| Cloud Function | `POST /functions/sendSuivis` |

### cURL

```bash
# Envoyer tous les suivis du jour
 curl -X POST \
   -H "X-Parse-Application-Id: $PARSE_APP_ID" \
   -H "X-Parse-Master-Key: $PARSE_MASTER_KEY" \
   -H "Content-Type: application/json" \
   "$PARSE_SERVER_URL/functions/sendSuivis"

# Envoyer des suivis spécifiques
 curl -X POST \
   -H "X-Parse-Application-Id: $PARSE_APP_ID" \
   -H "X-Parse-Master-Key: $PARSE_MASTER_KEY" \
   -H "Content-Type: application/json" \
   -d '{"suiviIds": ["abc123", "def456"]}' \
   "$PARSE_SERVER_URL/functions/sendSuivis"
```

### Entry Data

```javascript
{
  trigger: string,      // "manual" | "cron" | "cloud" | "test"
  suiviIds: string[]   // Optionnel - IDs spécifiques à envoyer
}
```

---

## Process (00-master.js)

### Input
- `options`: `{ trigger: string, suiviIds?: string[] }`

### Operations

1. **Initialisation**
   - Charger `.env`
   - Initialiser Parse SDK
   - Vider logs (si trigger !== "test")
   - Logger début workflow

2. **Query Suivis**
   ```javascript
   const query = new Parse.Query("Suivi");
   
   if (suiviIds?.length) {
     query.containedIn("objectId", suiviIds);
   } else {
     query.equalTo("statut", "pret pour envoi");
     query.lessThanOrEqualTo("dateEnvoi", new Date());
   }
   
   query.include(["contact", "sequence", "impayes", "smtpProfil"]);
   query.limit(9999);
   ```

3. **Traitement par suivi**

   Pour chaque suivi :
   
   a. **Validation**
   - Vérifier `contact` et `contact.get("email")`
   - Vérifier `impayes.length > 0`
   - Si invalide → statut "Erreur d'envoi", sauvegarder, continuer
   
   b. **Blacklist check**
   - Si `contact.get("isBlacklisted")` → statut "Contact blacklisté"
   - Si un `impaye.get("isBlacklisted")` → statut "Impayé blacklisté"
   
   c. **Préparation email**
   ```javascript
   const smtpProfil = suivi.get("smtpProfil");
   const from = smtpProfil.get("fromEmail") || smtpProfil.get("username");
   const to = contact.get("email");
   const subject = suivi.get("objet");
   const baseHtml = suivi.get("corps");
   const signatureHtml = smtpProfil.get("signature_html");
   const replyTo = smtpProfil.get("replyToEmail");
   
   // SPÉCIFIQUE SUIVI : Champ CC
   const cc = suivi.get("cc");
   ```
   
   d. **Construction HTML**
   ```javascript
   let html = baseHtml;
   if (signatureHtml?.trim()) {
     html = baseHtml + "<br><br>" + signatureHtml;
   }
   ```
   
   e. **Options email**
   ```javascript
   const emailOptions = {
     from,
     to,
     subject,
     html,
     replyTo
   };
   
   // Ajouter CC si présent (SPÉCIFIQUE SUIVI)
   if (cc?.trim()) {
     emailOptions.cc = cc.split(',').map(e => e.trim()).filter(Boolean);
   }
   ```
   
   f. **Envoi SMTP**
   - Créer transporter Nodemailer avec host/port/auth du smtpProfil
   - `await transporter.sendMail(emailOptions)`
   - Copier dans dossier Sent (IMAP) - obligatoire
   
   g. **Mise à jour Suivi**
   ```javascript
   suivi.set("statut", "Envoyée");
   suivi.set("dateEnvoiReelle", new Date());  // Date réelle d'envoi
   suivi.set("emailSent", true);
   await suivi.save(null, { useMasterKey: true });
   ```

### Output

```javascript
{
  result: {
    suivisEnvoyes: number,      // Nombre d'emails envoyés avec succès
    suivisErreurs: number,      // Nombre d'erreurs
    totalSuivis: number,        // Total traités
    erreurs: [                  // Détails des erreurs
      { suiviId: string, erreur: string }
    ]
  },
  errors: [],                   // Erreurs globales
  total: {
    startedAt: string,          // ISO date
    finishedAt: string,
    durationMs: number
  }
}
```

---

## End

### États finaux possibles

| Statut | Description |
|--------|-------------|
| `"Envoyée"` | Email envoyé avec succès |
| `"Erreur d'envoi"` | Échec de l'envoi SMTP |
| `"Contact blacklisté"` | Contact marqué comme blacklisté |
| `"Impayé blacklisté"` | Au moins un impayé blacklisté |

### Résultat
- Tous les suivis avec `statut="pret pour envoi"` ont été traités
- Les suivis envoyés ont `emailSent=true` et `dateEnvoiReelle` renseignée
- La signature SMTP a été ajoutée automatiquement
- Les adresses CC ont été incluses dans l'envoi

---

## Dépendances

- `nodemailer` : Envoi SMTP
- `parse/node` : Communication avec Parse Server
- `dotenv` : Variables d'environnement
- `../../utils/logger` : Logging standardisé

## Fichiers connexes

- `generate-suivi/index.js` : Workflow de création des suivis
- `send-emails/00-master.js` : Workflow similaire pour les relances (référence)
- `../../utils/logger.js` : Utilitaire de logging
- `../../../.env` : Configuration environnement
