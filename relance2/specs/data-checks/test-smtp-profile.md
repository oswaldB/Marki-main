# Data Check: test-smtp-profile.md

## Résumé
- Workflow analysé: `workflows/backend/test-smtp-profile.md`
- Status: ✗ Problèmes trouvés
- Tables identifiées: 1

## Tables Utilisées

| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| smtp_profiles | id, host, port, secure, username, password, from_email, from_name, nom, require_tls | ✓ Oui | ⚠️ Partielle |

## Colonnes Détaillées: smtp_profiles

| Colonne | Utilisée dans workflow | Existe dans schema | Type schema | Requis | Statut |
|---------|----------------------|-------------------|-------------|--------|--------|
| id | ✓ (profileId) | ✓ | TEXT PRIMARY KEY | NOT NULL | ✓ OK |
| nom | ✓ (profile.nom) | ✓ | TEXT | NOT NULL | ✓ OK |
| host | ✓ | ✓ | TEXT | NOT NULL | ✓ OK |
| port | ✓ | ✓ | INTEGER | NOT NULL | ✓ OK |
| secure | ✓ | ✓ | INTEGER | - | ✓ OK |
| username | ✓ | ✓ | TEXT | NOT NULL | ✓ OK |
| password | ✓ | ✓ | TEXT | NOT NULL | ✓ OK |
| from_email | ✓ | ✓ | TEXT | NOT NULL | ✓ OK |
| from_name | ✓ | ✓ | TEXT | NOT NULL | ✓ OK |
| require_tls | ✓ (code JS) | ✗ NON | - | - | ⚠️ **INEXISTANT** |
| actif | ✗ | ✓ | INTEGER | - | - |
| is_default | ✗ | ✓ | INTEGER | - | - |
| signature_html | ✗ | ✓ | TEXT | - | - |
| created_at | ✗ | ✓ | TEXT | NOT NULL | - |
| updated_at | ✗ | ✓ | TEXT | NOT NULL | - |

## Requêtes SQL Analysées

| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| READ | smtp_profiles | profileId (WHERE), toutes les colonnes du profil | ⚠️ Partielle - require_tls absent |

## Vérifications

- [x] Tables existent dans schema.sql
- [x] Colonnes existent (majorité)
- [ ] Types de données cohérents
- [ ] Foreign keys valides
- [x] Contraintes respectées (pas de FK à vérifier)

### Détail des Vérifications

#### ✓ Table `smtp_profiles` existe
La table existe bien dans le schéma avec toutes les colonnes principales.

#### ✗ Colonne `require_tls` INEXISTANTE
**Problème majeur:** Le code JavaScript utilise `profile.require_tls`:

```javascript
requireTLS: profile.require_tls
```

Cette colonne n'existe PAS dans la table `smtp_profiles` du schéma.

**Colonnes disponibles alternatives:**
- `secure INTEGER DEFAULT 0` - Pourrait être utilisé à la place (0=STARTTLS, 1=SSL/TLS)
- `port INTEGER DEFAULT 587` - Le port peut indiquer TLS (587) ou SSL (465)

## Problèmes Identifiés

### 🔴 CRITIQUE: Colonne inexistante `require_tls`

- **Localisation:** Code JavaScript ligne `requireTLS: profile.require_tls`
- **Impact:** Erreur runtime - `profile.require_tls` sera `undefined`
- **Correction:** Utiliser la colonne `secure` existante ou ajouter `require_tls` au schéma

**Code problématique:**
```javascript
const transporter = nodemailer.createTransport({
  host: profile.host,
  port: profile.port,
  secure: profile.secure,
  auth: {
    user: profile.username,
    pass: decryptPassword(profile.password)
  },
  requireTLS: profile.require_tls  // ← CETTE COLONNE N'EXISTE PAS
});
```

### 🟡 MINEUR: Documentation incomplète

La section "Data Model" du workflow ne mentionne pas:
- `nom` (pourtant utilisé dans le code)
- `actif`, `is_default`, `signature_html`, `created_at`, `updated_at`

### 🟢 Note: `profile.nom` dans le message

Le code utilise `profile.nom` dans le texte de l'email:
```javascript
text: `...Profil: ${profile.nom}\nServeur:...`
```

Cette colonne existe bien dans le schéma (TEXT NOT NULL), c'est correct.

## Recommandations

### 1. Correction immédiate requise

Remplacer dans le code:
```javascript
// AVANT (incorrect)
requireTLS: profile.require_tls

// APRÈS (corrigé)
requireTLS: profile.secure === 1 || profile.port === 587
```

Ou alternativement, si `requireTLS` doit être indépendant de `secure`:

```javascript
// Utiliser secure comme proxy pour requireTLS
requireTLS: profile.secure === 1
```

### 2. Mise à jour de la documentation

Ajouter `nom` dans la section Data Model du workflow:

```markdown
| Champ | Description |
|-------|-------------|
| `nom` | Nom du profil |
| ... | ... |
```

### 3. Option: Ajouter la colonne au schéma (si besoin réel)

Si `require_tls` doit être distinct de `secure`:

```sql
ALTER TABLE smtp_profiles ADD COLUMN require_tls INTEGER DEFAULT 0;
```

### 4. Validation des données

Vérifier que tous les profils SMTP ont:
- `host` non NULL
- `port` non NULL (587 par défaut)
- `username` non NULL
- `password` non NULL
- `from_email` non NULL
- `from_name` non NULL

---

*Rapport généré le: 2026-01-22*
*Schéma analysé: /home/ubuntu/marki/relance2/specs/schema.sql*
*Workflow analysé: /home/ubuntu/marki/relance2/specs/workflows/backend/test-smtp-profile.md*
