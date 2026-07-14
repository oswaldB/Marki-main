# Workflow Backend : Envoi des Emails de Relance

## Objectifs
- Envoyer les relances validées programmées
- Gérer les erreurs et les relances en échec

## Process (méga-fonction)

La méga-fonction `sendEmails()` exécute les étapes suivantes :

### Étape 1 : Récupération
- Query relances avec : `statut === 'pret pour envoi'`, `valide === true`, `planifiee_le` aujourd'hui ou avant.

### Étape 2 : Envoi
Pour chaque relance :
- Lire contact et vérifier `is_blacklisted === false` +et aussi le contact_envoye.
- Lire profil SMTP
- Envoyer via nodemailer
- Mettre à jour : `statut = 'Envoyée'`, `date_envoi`
- +> déplacer l'email dans le folder sent de l'imap server.

### Étape 3 : Gestion erreurs
- En cas d'échec : `statut = 'erreur_envoi'`

## Data Model

### Collection: `relances`
**Stockage:** `/backend/data/relances/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (ex: `rel_0AnbUjTVKD`) |
| `contact_id` | string | ID du contact destinataire (pour lookup) |
| `impaye_ids` | string[] | IDs des impayés concernés |
| `sequence_id` | string | ID de la séquence |
| `smtp_profile_id` | string\|null | **Profil SMTP à utiliser pour l'envoi** |
| `objet` | string | Objet de l'email |
| `corps` | string | Contenu HTML de l'email |
| `corps_html` | string\|null | Version texte alternatif |
| `statut` | RelanceStatut | **Filtre d'entrée**: `pret pour envoi` → **Modifié**: `Envoyée` ou `erreur_envoi` |
| `valide` | boolean | **Filtre d'entrée**: doit être `true` |
| `planifiee_le` | ISO date\|null | **Filtre d'entrée**: date d'envoi planifiée |
| `manuelle` | boolean | Relance manuelle ou auto |
| `scenario` | RelanceScenario | `single`, `multiple`, `broker`, `both` |
| `date_creation` | ISO date | Date de création |
| `date_envoi` | ISO date\|null | **Modifié**: date d'envoi effective |
| `email_index` | number | Index de l'email dans la séquence |
| `clicks` | number | Compteur de clics (0 initialement) |
| `ouvert` | number | Nombre d'ouvertures (0 initialement) |
| `date_ouverture` | ISO date\|null | Date d'ouverture |
| `bcc` | string\|null | Destinataires en copie cachée |
| `cc` | string\|null | Destinataires en copie |
| `updated_at` | ISO date | Date de modification |
| `type` | string | `relance` |

### Collection: `contacts`
**Stockage:** `/backend/data/contacts/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (ex: `cont_00jPOdYCRP`) |
| `email` | string\|null | **Email destinataire** (obligatoire) |
| `nom` | string | Nom (pour personnalisation) |
| `prenom` | string | Prénom (pour personnalisation) |
| `civilite` | string\|null | Civilité |
| `is_blacklisted` | boolean | **Bloque l'envoi si true** |
| `statut` | ContactStatut | `actif` |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |
| `type` | string | `contact` |

### Collection: `smtp_profiles`
**Stockage:** `/backend/data/smtp_profiles/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (ex: `smtp_YPsNANpWhC`) |
| `nom` | string | Nom affiché du profil |
| `host` | string | Serveur SMTP (ex: `mail.infomaniak.com`) |
| `port` | number | Port SMTP (ex: `587`) |
| `secure` | boolean | SSL/TLS activé |
| `require_tls` | boolean | STARTTLS requis |
| `username` | string | Identifiant SMTP |
| `password` | string | Mot de passe (chiffré) |
| `from_email` | string | Email d'expédition |
| `from_name` | string | Nom d'expéditeur |
| `reply_to` | string | Adresse de réponse |
| `max_per_hour` | number | Limite d'envoi par heure |
| `description` | string | Description |
| `display_name` | string | Nom d'affichage |
| `actif` | boolean | Profil actif ou non |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |
| `type` | string | `smtp_profile` |


---

## Organisation des fichiers

```
/backend/
├── send-emails/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens (JSON Lines)
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/send-emails/`

---

## Start

### Route
```bash
POST /api/emails/send

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "https://dev.markidiags.com/api/emails/send"
```

### Cron
```javascript
cron.schedule("0 19 * * *", () => {
  sendEmails();
}, { timezone: "Europe/Paris" });
```

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'send-emails');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'send-emails'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

1. **Récupération relances à envoyer**
   ```javascript
   await log('info', 'Starting email sending process');
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   const tomorrow = new Date(today);
   tomorrow.setDate(tomorrow.getDate() + 1);
   
   const relances = db.query('relances')
     .where('statut').eq('pret pour envoi')
     .where('valide').eq(true)
     .where('planifiee_le').gte(today.toISOString())
     .where('planifiee_le').lt(tomorrow.toISOString())
     .data();
   await log('info', 'Retrieved relances to send', { count: relances.length });
   ```

2. **Envoi emails**
   ```javascript
   const nodemailer = require('nodemailer');
   const results = { sent: 0, errors: 0 };
   
   for (const relance of relances) {
     try {
       const contact = await db.read('contacts', relance.contact_id);
       const smtp = await db.read('smtp_profiles', relance.smtp_profile_id);
       
       if (!contact?.email) throw new Error("Contact sans email");
       if (contact.is_blacklisted) throw new Error("Contact blacklisté");
       
       const transporter = nodemailer.createTransport({
         host: smtp.host,
         port: smtp.port,
         secure: smtp.secure,
         auth: { user: smtp.username, pass: smtp.password }
       });
       
       await transporter.sendMail({
         from: smtp.from_email,
         to: contact.email,
         subject: relance.objet,
         html: relance.corps
       });
       
       await db.update('relances', relance.id, {
         statut: 'Envoyée',
         date_envoi: new Date().toISOString()
       });
       
       results.sent++;
       await log('info', 'Email sent successfully', { relanceId: relance.id, contactId: contact.id, email: contact.email });
     } catch (err) {
       await db.update('relances', relance.id, {
         statut: 'erreur_envoi'
       });
       results.errors++;
       await log('error', 'Email sending failed', { relanceId: relance.id, error: err.message });
     }
   }
   await log('info', 'Email sending process completed', { sent: results.sent, errors: results.errors });
   ```

#### Output
```javascript
{
  "status": 200,
  "data": {
    "sent": Number,
    "errors": Number
  }
}
```
