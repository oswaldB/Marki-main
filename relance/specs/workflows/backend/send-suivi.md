# Workflow Backend : Envoi des Emails de Suivi

## Objectifs
- Envoyer les emails de suivi générés par le workflow `generate-suivi`
- Gérer la copie automatique dans le dossier "Sent" via IMAP
- Gérer les erreurs d'envoi avec mise à jour du statut
- Envoyer en CC les adresses configurées dans le suivi

## Process (méga-fonction)

La méga-fonction `sendSuivisMaster()` exécute les étapes suivantes :

### Étape 1 : Récupération des Suivis
- Query les suivis avec `statut === 'pret pour envoi'` ET `dateEnvoi <= maintenant` +> dateEnvoi non, c'est planifie le, vérifie.
- OU filtrer par IDs spécifiques si `suiviIds` fourni
- Inclure les relations : `contact`, `sequence`, `impayes`, `smtpProfil`

### Étape 2 : Validation par Suivi
Pour chaque suivi, vérifier :
- Présence du contact et de son email
- Présence d'au moins un impayé associé
- Contact non blacklisté
- Impayés non blacklistés
- Présence du profil SMTP

### Étape 3 : Préparation de l'Email
- Récupérer la signature HTML du profil SMTP (si configurée)
- Construire le HTML final : `corps + "<br><br>" + signature`
- Récupérer les adresses CC configurées dans le suivi
- Configurer les options nodemailer (from, to, subject, html, replyTo, cc)

### Étape 4 : Envoi SMTP
- Créer le transporteur nodemailer avec le profil SMTP
- Envoyer l'email
- En cas d'échec : mise à jour statut `Erreur d'envoi` et arrêt

### Étape 5 : Copie IMAP vers Sent (Obligatoire)
- Se connecter au serveur IMAP (déduit du SMTP ou configuré explicitement)
- Ouvrir le dossier "Sent" (avec fallback sur plusieurs noms possibles)
- Appender le message avec flag `\Seen`
- En cas d'échec IMAP : considéré comme erreur bloquante

### Étape 6 : Mise à jour du Suivi
- Mettre à jour `statut: 'Envoyée'`
- Mettre à jour `dateEnvoiReelle: new Date()`
- Mettre à jour `emailSent: true`
- Sauvegarder le document

## Data Model

### Collection: `suivis`
**Stockage:** `/backend/data/suivis/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (préfixe `suiv_`) |
| `type` | string | `"suivi"` |
| `contact_id` | string | ID du contact destinataire |
| `sequence_id` | string | ID de la séquence |
| `impaye_ids` | string[] | IDs des impayés concernés |
| `smtp_profils_id` | string\|null | ID du profil SMTP |
| `email_index` | number | Index de l'email dans la séquence |
| `scenario` | SuiviScenario | `single`, `multiple`, `broker`, `both` |
| `frequence` | string | Fréquence du suivi |
| `objet` | string | Objet de l'email |
| `corps` | string | Corps HTML de l'email |
| `cc` | string\|null | Destinataires en copie (séparés par virgule) |
| `statut` | SuiviStatut | **Filtre d'entrée**: `pret pour envoi` → **Modifié**: `Envoyée` ou `Erreur d'envoi` |
| `manuelle` | boolean | `false` (automatique) |
| `valide` | boolean | `true` pour être envoyé |
| `dateEnvoi` | ISO date\|null | Date d'envoi planifiée (doit être ≤ maintenant) |
| `dateEnvoiReelle` | ISO date\|null | **Modifié**: date d'envoi effective |
| `emailSent` | boolean | **Modifié**: `true` si envoyé avec succès |
| `lastError` | string\|null | **Modifié**: message d'erreur en cas d'échec |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |

### Collection: `contacts`
**Stockage:** `/backend/data/contacts/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `email` | string\|null | **Obligatoire** - Email destinataire |
| `is_blacklisted` | boolean | **Bloque l'envoi si true** |

### Collection: `impayes`
**Stockage:** `/backend/data/impayes/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `is_blacklisted` | boolean | **Bloque l'envoi si true** |

### Collection: `smtp_profiles`
**Stockage:** `/backend/data/smtp_profiles/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `host` | string | Serveur SMTP |
| `port` | number | Port SMTP |
| `username` | string | Identifiant SMTP |
| `password` | string | Mot de passe SMTP |
| `email_from` | string | Email d'expédition |
| `signature_html` | string\|null | Signature HTML à ajouter |
| `imapHost` | string\|null | Serveur IMAP (optionnel, déduit du SMTP) |
| `imapPort` | number\|null | Port IMAP (optionnel) |
| `imapUsername` | string\|null | Identifiant IMAP (fallback: username) |
| `imapPassword` | string\|null | Mot de passe IMAP (fallback: password) |
| `imapSecure` | boolean | TLS IMAP (défaut: `true`) |

---

## Organisation des fichiers

```
/backend/
├── send-suivi/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens (JSON Lines)
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/send-suivi/`

---

## Start

### Route
```bash
POST /api/suivis/send

# cURL avec filtres spécifiques
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "suiviIds": ["suiv_abc123", "suivi_def456"]
  }' \
  "https://dev.markidiags.com/api/suivis/send"
```

### Cron (tous les jours à 9h)
```javascript
cron.schedule("0 9 * * *", () => {
  sendSuivisMaster({ trigger: "cron" });
}, { timezone: "Europe/Paris" });
```

### CLI
```bash
node index.js --trigger manual
node index.js --trigger test --suiviIds id1,id2,id3
```

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const Imap = require('imap');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'send-suivi');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'send-suivi'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}

// Vider les logs au démarrage (sauf en mode test)
if (trigger !== 'test') {
  clearLogs();
}
```

**Process**
```javascript
// 1. Récupérer les suivis à envoyer
let suivisQuery = db.query('suivis');

if (suiviIds && suiviIds.length > 0) {
  // Mode spécifique
  suivisQuery = suivisQuery.where('id').in(suiviIds);
} else {
  // Mode automatique : suivis en attente dont la date est arrivée
  const now = new Date().toISOString();
  suivisQuery = suivisQuery
    .where('statut').eq('pret pour envoi')
    .where('dateEnvoi').lte(now);
}

const suivis = suivisQuery.data();
await log('info', `${suivis.length} suivis à traiter`);

const result = { envoyes: 0, erreurs: 0, details: [] };

// 2. Traiter chaque suivi
for (const suivi of suivis) {
  try {
    // Validation
    const contact = await db.read('contacts', suivi.contact_id);
    if (!contact || !contact.email) {
      throw new Error("Contact ou email manquant");
    }
    if (contact.is_blacklisted) {
      throw new Error("Contact blacklisté");
    }
    
    const impayes = await db.search('impayes', { id: suivi.impaye_ids });
    if (impayes.length === 0) {
      throw new Error("Aucun impayé associé");
    }
    
    for (const impaye of impayes) {
      if (impaye.is_blacklisted) {
        throw new Error(`Impayé ${impaye.id} blacklisté`);
      }
    }
    
    const smtp = await db.read('smtp_profiles', suivi.smtp_profils_id);
    if (!smtp) {
      throw new Error("Profil SMTP manquant");
    }
    
    // 3. Préparer l'email
    let html = suivi.corps;
    if (smtp.signature_html) {
      html = html + "<br><br>" + smtp.signature_html;
    }
    
    const emailOptions = {
      from: smtp.email_from || smtp.username,
      to: contact.email,
      subject: suivi.objet,
      html: html,
      replyTo: smtp.email_from || null
    };
    
    // Ajouter CC si présent
    if (suivi.cc) {
      const ccList = suivi.cc.split(',').map(e => e.trim()).filter(Boolean);
      if (ccList.length > 0) {
        emailOptions.cc = ccList;
      }
    }
    
    // 4. Envoyer via SMTP
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.username,
        pass: smtp.password
      }
    });
    
    const emailInfo = await transporter.sendMail(emailOptions);
    await log('info', `Email envoyé`, { messageId: emailInfo.messageId });
    
    // 5. Copier vers Sent via IMAP
    await copyToSentFolder(smtp, emailOptions, emailInfo);
    await log('info', `Copie vers Sent réussie`);
    
    // 6. Mettre à jour le suivi
    await db.update('suivis', suivi.id, {
      statut: 'Envoyée',
      dateEnvoiReelle: new Date().toISOString(),
      emailSent: true
    });
    
    result.envoyes++;
    await log('info', `Suivi envoyé avec succès`, { suiviId: suivi.id });
    
  } catch (err) {
    // Mettre à jour avec l'erreur
    await db.update('suivis', suivi.id, {
      statut: 'Erreur d\'envoi',
      lastError: err.message
    });
    
    result.erreurs++;
    result.details.push({ suiviId: suivi.id, erreur: err.message });
    await log('error', `Erreur envoi suivi`, { suiviId: suivi.id, error: err.message });
  }
}

await log('info', 'Traitement terminé', { envoyes: result.envoyes, erreurs: result.erreurs });
```

#### Fonction copyToSentFolder(smtpProfil, emailOptions, emailInfo)

Copie l'email envoyé vers le dossier "Sent" du serveur IMAP.

```javascript
async function copyToSentFolder(smtpProfil, emailOptions, emailInfo) {
  // Déduire la config IMAP si non explicitée
  let imapHost = smtpProfil.imapHost;
  let imapPort = smtpProfil.imapPort;
  
  if (!imapHost) {
    // Règles de conversion SMTP -> IMAP
    const smtpHost = smtpProfil.host;
    if (smtpHost.includes('smtp.')) {
      imapHost = smtpHost.replace('smtp.', 'imap.');
      imapPort = 993;
    } else if (smtpHost.includes('infomaniak')) {
      imapHost = 'mail.infomaniak.com';
      imapPort = 993;
    }
    // etc.
  }
  
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      host: imapHost,
      port: imapPort,
      tls: true,
      user: smtpProfil.imapUsername || smtpProfil.username,
      password: smtpProfil.imapPassword || smtpProfil.password
    });
    
    imap.once('ready', () => {
      // Essayer plusieurs noms de dossier Sent
      const sentFolders = ['Sent', 'Sent Items', 'Envoyés', '&BB4EQgQ,BEAEMAQyBDsENQQ9BD0-'];
      
      function tryOpenSent(index) {
        if (index >= sentFolders.length) {
          return reject(new Error('Dossier Sent introuvable'));
        }
        
        imap.openBox(sentFolders[index], false, (err, box) => {
          if (err) return tryOpenSent(index + 1);
          
          // Construire le message RFC822 complet
          const date = new Date().toUTCString();
          const messageId = emailInfo.messageId;
          
          const fullMessage = [
            `Date: ${date}`,
            `Message-Id: ${messageId}`,
            `From: ${emailOptions.from}`,
            `To: ${emailOptions.to}`,
            emailOptions.cc ? `Cc: ${Array.isArray(emailOptions.cc) ? emailOptions.cc.join(', ') : emailOptions.cc}` : "",
            `Subject: ${emailOptions.subject}`,
            `Content-Type: text/html; charset=utf-8`,
            `Mime-Version: 1.0`,
            `\n`,
            emailOptions.html
          ].filter(Boolean).join('\r\n');
          
          // Ajouter au dossier Sent avec flag Seen
          imap.append(fullMessage, { mailbox: box.name, flags: ['\\Seen'] }, (err) => {
            imap.end();
            if (err) return reject(err);
            resolve();
          });
        });
      }
      
      tryOpenSent(0);
    });
    
    imap.once('error', reject);
    imap.connect();
  });
}
```

#### Output
```javascript
{
  "status": 200,
  "data": {
    "envoyes": 15,
    "erreurs": 2,
    "details": [
      { "suiviId": "suiv_abc123", "erreur": "Contact blacklisté" },
      { "suiviId": "suivi_def456", "erreur": "Erreur IMAP: Connection refused" }
    ],
    "durationMs": 45000
  }
}
```

## Error Handling

| Code | Description |
|------|-------------|
| Validation | "Contact ou email manquant" → Statut: `Erreur d'envoi` |
| Validation | "Contact blacklisté" → Statut: `Contact blacklisté` |
| Validation | "Impayé blacklisté" → Statut: `Impayé blacklisté` |
| Validation | "Profil SMTP manquant" → Statut: `Erreur d'envoi` |
| SMTP | Échec d'envoi → Statut: `Erreur d'envoi` + `lastError` |
| IMAP | Échec copie Sent → Considéré comme erreur bloquante |

### Gestion des erreurs IMAP
- Si la copie vers Sent échoue, le suivi est marqué en erreur même si l'email a été envoyé
- Cela garantit la traçabilité complète de l'envoi
- Les erreurs IMAP sont loguées avec détails pour diagnostic
