# Workflow Backend : Envoi des Emails

## Objectifs
- Envoyer les relances programmées
- Utiliser les profils SMTP configurés
- Mettre à jour les statuts des relances
- Logger les envois et erreurs

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `relances`, `contacts`, `smtp_profiles`, `impayes`

## Process

### Étape 1 : Récupération Relances à Envoyer
Query les relances avec statut `pret pour envoi` ou `planifiee` dont la date est atteinte.

### Étape 2 : Vérification Pré-envoi
- Vérifier que le contact a un email valide
- Vérifier que le profil SMTP est actif
- Vérifier que les impayés liés ne sont pas soldés

### Étape 3 : Envoi
Envoi via SMTP avec retry en cas d'échec.

### Étape 4 : Mise à Jour
- Mettre à jour statut `Envoyée`
- Enregistrer date d'envoi
- Mettre à jour les impayés (email_index++)

---

## Data Models SQLite

### Table `relances`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (rel_xxx) |
| `contact_id` | TEXT | ID contact |
| `sequence_id` | TEXT | ID séquence |
| `statut` | TEXT | `pret pour envoi`, `planifiee`, `Envoyée`, etc. |
| `sujet` | TEXT | Objet email |
| `corps` | TEXT | Corps HTML |
| `date_programmation` | TEXT | Date planifiée d'envoi |
| `date_envoi` | TEXT | Date effective d'envoi |
| `valide` | INTEGER | 0 ou 1 |

### Table `smtp_profiles`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (smtp_xxx) |
| `nom` | TEXT | Nom du profil |
| `host` | TEXT | Serveur SMTP |
| `port` | INTEGER | Port (587 ou 465) |
| `secure` | INTEGER | 0 ou 1 |
| `username` | TEXT | Identifiant |
| `password` | TEXT | Mot de passe |
| `from_email` | TEXT | Email expéditeur |
| `actif` | INTEGER | 0 ou 1 |

---

## Code Workflow (SQLite)

### Étape 1 : Récupération
```javascript
const SQLiteDB = require('../lib/sqlite-db');
const nodemailer = require('nodemailer');
const db = new SQLiteDB();

// Relances à envoyer (date atteinte ou non planifiée)
const relances = db.query(`
  SELECT r.*, c.nom, c.prenom, c.email as contact_email
  FROM relances r
  JOIN contacts c ON r.contact_id = c.id
  WHERE r.statut IN ('pret pour envoi', 'planifiee')
    AND (r.date_programmation IS NULL OR r.date_programmation <= datetime('now'))
    AND r.valide = 1
`, []);
```

### Étape 2 : Vérification
```javascript
const verifiees = [];

for (const relance of relances) {
  // Vérifier email contact
  if (!relance.contact_email) {
    await log('warn', 'Email manquant', { relanceId: relance.id });
    continue;
  }
  
  // Vérifier impayés non soldés
  const impayes = db.query(
    'SELECT * FROM impayes WHERE contact_relance_id = ? AND facture_soldee = 0',
    [relance.contact_id]
  );
  
  if (impayes.length === 0) {
    await log('warn', 'Aucun impayé actif', { relanceId: relance.id });
    db.update('relances', relance.id, { statut: 'annulee' });
    continue;
  }
  
  verifiees.push({ ...relance, impayes });
}
```

### Étape 3 : Envoi
```javascript
async function envoyerRelance(relance) {
  // Récupérer profil SMTP par défaut
  const smtp = db.getSmtpProfileDefault();
  if (!smtp) throw new Error('Aucun profil SMTP actif');
  
  // Configurer transport
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure === 1,
    auth: {
      user: smtp.username,
      pass: smtp.password
    }
  });
  
  // Envoyer
  const info = await transporter.sendMail({
    from: `"${smtp.from_name}" <${smtp.from_email}>`,
    to: relance.contact_email,
    subject: relance.sujet,
    html: relance.corps
  });
  
  return info;
}
```

### Étape 4 : Mise à Jour
```javascript
for (const relance of verifiees) {
  try {
    await envoyerRelance(relance);
    
    // Mettre à jour relance
    db.update('relances', relance.id, {
      statut: 'Envoyée',
      date_envoi: new Date().toISOString()
    });
    
    // Incrémenter email_index des impayés
    for (const impaye of relance.impayes) {
      db.update('impayes', impaye.id, {
        email_index: (impaye.email_index || 0) + 1
      });
    }
    
    await log('info', 'Email envoyé', { relanceId: relance.id });
  } catch (err) {
    db.update('relances', relance.id, {
      statut: 'erreur_envoi'
    });
    await log('error', 'Erreur envoi', { relanceId: relance.id, error: err.message });
  }
}
```

---

## Route API

```bash
POST /api/emails/send

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/emails/send"
```

---

## Output

```json
{
  "status": 200,
  "data": {
    "total": 25,
    "envoyes": 23,
    "erreurs": 2
  }
}
```

---

## Error Handling

| Erreur | Gestion |
|--------|---------|
| SMTP Error | Statut `erreur_envoi`, retry manuel |
| Email invalide | Log warning, skip |
| Impayé soldé | Annuler relance |
