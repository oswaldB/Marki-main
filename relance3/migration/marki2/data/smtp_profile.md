# Document `smtp_profile`

Configuration des serveurs SMTP pour l'envoi d'emails. Chaque profil SMTP définit les paramètres de connexion et la signature des emails envoyés.

## Structure JSON complète

```json
{
  "_id": "smtp:{id}",
  "_rev": "1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "type": "smtp_profile",
  "nom": "string",
  "host": "string",
  "port": "number",
  "secure": "boolean",
  "username": "string",
  "password_encrypted": "string",
  "from_email": "string",
  "from_name": "string",
  "signature_html": "string",
  "actif": "boolean",
  "is_default": "boolean",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## Description des champs

### Identification

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | `string` | Format: `smtp:{id}` (ex: `smtp:YPsNANpWhC`) |
| `type` | `string` | Toujours `"smtp_profile"` |
| `nom` | `string` | Nom descriptif du profil (affiché dans l'UI) |

### Configuration SMTP

| Champ | Type | Description |
|-------|------|-------------|
| `host` | `string` | Adresse du serveur SMTP (ex: `"mail.infomaniak.com"`) |
| `port` | `number` | Port du serveur (587, 465, 25...) |
| `secure` | `boolean` | Utilise TLS/SSL (true pour port 465, false pour 587 avec STARTTLS) |
| `username` | `string` | Identifiant de connexion SMTP |
| `password_encrypted` | `string` | Mot de passe (chiffré ou placeholder) |

### Configuration d'envoi

| Champ | Type | Description |
|-------|------|-------------|
| `from_email` | `string` | Adresse d'expédition (ex: `"comptabilite@adti06.com"`) |
| `from_name` | `string` | Nom d'affichage de l'expéditeur (ex: `"Service comptable"`) |
| `signature_html` | `string` | HTML de la signature des emails |

### Statut

| Champ | Type | Description |
|-------|------|-------------|
| `actif` | `boolean` | Le profil est-il actif et utilisable ? |
| `is_default` | `boolean` | Est-ce le profil par défaut pour les nouvelles séquences ? |

### Métadonnées

| Champ | Type | Description |
|-------|------|-------------|
| `created_at` | `ISO8601` | Date de création |
| `updated_at` | `ISO8601` | Date de dernière modification |

## Exemple concret

```json
{
  "_id": "smtp:YPsNANpWhC",
  "type": "smtp_profile",
  "nom": "EX'IM - comptabilité",
  "host": "mail.infomaniak.com",
  "port": 587,
  "secure": false,
  "username": "comptabilite@adti06.com",
  "password_encrypted": "[ENCRYPTED]",
  "from_email": "comptabilite@adti06.com",
  "from_name": "Service comptable",
  "signature_html": "<table cellpadding=\"0\" cellspacing=\"0\" style=\"font-family: Verdana;\"\u003e...\u003c/table\u003e",
  "actif": true,
  "is_default": false,
  "created_at": "2026-03-16T20:13:28.346Z",
  "updated_at": "2026-05-26T20:27:06.710Z"
}
```

## Configuration des ports

| Port | `secure` | Usage |
|------|----------|-------|
| 587 | `false` | Submission (STARTTLS) - **Recommandé** |
| 465 | `true` | SMTPS (SSL/TLS) |
| 25 | `false` | SMTP standard (souvent bloqué) |
| 2525 | `false` | Alternative au port 25 |

## Champs obligatoires

- `_id` : Format `smtp:{id}`
- `type` : `"smtp_profile"`
- `host` : Serveur SMTP
- `port` : Port
- `username` : Identifiant
- `from_email` : Adresse d'expédition

## Sécurité des mots de passe

⚠️ **Important** : Le mot de passe est actuellement stocké avec un placeholder :

```json
"password_encrypted": "[ENCRYPTED]"
// ou
"password_encrypted": "[MIGRATION_REQUISE]"
```

### Recommandations

1. **Variables d'environnement** : Stocker le mot de passe dans une variable d'environnement et l'injecter au démarrage

2. **Chiffrement** : Utiliser un algorithme de chiffrement (AES-256) avec une clé maître stockée séparément

3. **Vault** : Utiliser un système de secrets (HashiCorp Vault, AWS Secrets Manager, etc.)

4. **Réinitialisation** : Forcer la réinitialisation des mots de passe après migration

Exemple avec variable d'environnement :

```javascript
const smtpProfile = await db.get('smtp:YPsNANpWhC');
const password = process.env.SMTP_PASSWORD_INFOMANIAK;
// Utiliser password pour la connexion SMTP
```

## Utilisation dans les séquences

Les profils SMTP sont référencés dans les documents `sequence` :

```json
{
  "emails": [
    {
      "smtp": "YPsNANpWhC",  // Référence au smtp_profile
      "to": "[[payeur_email]]",
      "scenarios": [
        {
          "smtp": "YPsNANpWhC"  // Peut surcharger le SMTP par défaut
        }
      ]
    }
  ]
}
```

La référence `YPsNANpWhC` correspond à `_id = "smtp:YPsNANpWhC"`.

## Signature HTML

La `signature_html` est ajoutée automatiquement à la fin de chaque email envoyé via ce profil.

### Bonnes pratiques

- Utiliser des `table` pour la mise en page (compatibilité clients mail)
- Éviter les styles CSS complexes
- Utiliser des images hébergées (pas de pièces jointes)
- Limiter la largeur à 600px maximum
- Tester sur différents clients (Gmail, Outlook, Apple Mail)

---

*Document généré pour marki2*
