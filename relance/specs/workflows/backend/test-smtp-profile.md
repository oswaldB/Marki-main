# Workflow Backend : Tester un profil SMTP

## Objectif
- Tester la connexion à un serveur SMTP
- Vérifier que les identifiants sont valides
- Envoyer un email de test

## Process

### `testSmtpProfile()`
Teste la connexion SMTP et envoie un email de test :

1. **Validation** : Vérifier que `profileId` existe et que le profil SMTP existe
2. **Récupération** : Charger le profil SMTP depuis la base
3. **Test connexion** : Se connecter au serveur SMTP avec les credentials
4. **Envoi test** : Envoyer un email de test à l'adresse `from_email`
5. **Résultat** : Retourner succès ou erreur

## Data Model

### Collection: `smtp_profiles`
| Champ | Description |
|-------|-------------|
| `id` | ID du profil |
| `host` | Serveur SMTP |
| `port` | Port SMTP |
| `secure` | SSL/TLS |
| `username` | Identifiant |
| `password` | Mot de passe (chiffré) |
| `from_email` | Email d'expédition |
| `from_name` | Nom d'affichage |

---

## Start

### Route (Cloud Function)
```bash
POST /functions/testSmtpProfile
Body: { "profileId": "smtp_abc123" }
```

**Note**: Nécessite authentification admin.

## Implementation

```javascript
const nodemailer = require('nodemailer');

async function testSmtpProfile({ profileId }) {
  // 1. Validation
  if (!profileId) {
    throw new Error('profileId est requis');
  }
  
  // 2. Récupérer le profil
  const profile = await db.read('smtp_profiles', profileId);
  if (!profile) {
    throw new Error('Profil SMTP introuvable');
  }
  
  // 3. Créer le transporteur
  const transporter = nodemailer.createTransport({
    host: profile.host,
    port: profile.port,
    secure: profile.secure,
    auth: {
      user: profile.username,
      pass: decryptPassword(profile.password) // Déchiffrer si nécessaire
    },
    requireTLS: profile.require_tls
  });
  
  // 4. Vérifier la connexion
  await transporter.verify();
  
  // 5. Envoyer email de test
  await transporter.sendMail({
    from: `"${profile.from_name}" <${profile.from_email}>`,
    to: profile.from_email, // Envoyer à soi-même
    subject: 'Test de connexion SMTP - Marki',
    text: `Ce email confirme que la connexion SMTP fonctionne correctement.\n\nProfil: ${profile.nom}\nServeur: ${profile.host}:${profile.port}`
  });
  
  return {
    success: true,
    message: 'Connexion SMTP testée avec succès. Email envoyé.'
  };
}
```

## Error Handling

| Code | Description |
|------|-------------|
| 400 | `profileId` manquant |
| 404 | Profil SMTP introuvable |
| 500 | Erreur de connexion SMTP (credentials invalides, serveur inaccessible) |

## Response

```json
{
  "success": true,
  "message": "Connexion SMTP testée avec succès. Email envoyé."
}
```

Ou en cas d'erreur :

```json
{
  "success": false,
  "error": {
    "code": "SMTP_CONNECTION_FAILED",
    "message": "Connexion refusée au serveur smtp.example.com:587"
  }
}
```
