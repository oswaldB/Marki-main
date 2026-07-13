# 🔐 Système d'Authentification - ADTI Relances

Système d'authentification **sans Express** pour la base de données flat-files YAML.

## 📁 Structure

```
backend/
├── lib/
│   ├── flat-file-db.js    # DB avec méthodes sécurisées (createSecure, etc.)
│   └── auth-local.js      # Auth JWT + bcrypt
├── scripts/
│   ├── init-admin.js      # Créer le premier admin
│   ├── create-user.js      # Créer un utilisateur (admin only)
│   ├── change-password.js # Changer un mot de passe
│   └── creer-contact.js   # Exemple d'usage avec auth
└── data/
    ├── users/             # Utilisateurs (YAML)
    └── sessions/          # Sessions audit (YAML)
```

## 🚀 Démarrage rapide

### 1. Initialiser le premier administrateur

```bash
npm run init-admin
# ou avec paramètres:
node scripts/init-admin.js mon@email.com monpassword
```

**Par défaut :** `admin@adti.fr` / `admin123`

### 2. Créer un utilisateur (admin uniquement)

```bash
npm run create-user -- user@adti.fr password123 user
# Rôles possibles : admin | user | readonly
```

### 3. Changer un mot de passe

```bash
# En tant qu'admin (pas besoin de l'ancien)
npm run change-password -- user@adti.fr nouveaupass

# En tant qu'utilisateur (avec l'ancien)
node scripts/change-password.js user@adti.fr ancienpass nouveaupass
```

## 🔧 Utilisation dans le code

### Authentification simple

```javascript
const AuthLocal = require('./lib/auth-local');
const FlatFileDB = require('./lib/flat-file-db');

const db = new FlatFileDB('./data');
await db.loadAll();

// 1. Login
const session = await AuthLocal.login(db, 'admin@adti.fr', 'admin123');
if (!session) {
  throw new Error('Auth échouée');
}

// 2. Exécuter avec contexte utilisateur
await AuthLocal.asUser(session.token, async () => {
  // Toutes les opérations ici sont authentifiées
  const contacts = await db.querySecure('contacts', {});
  console.log(`${contacts.length} contacts visibles`);
});
```

### Création sécurisée (avec ACL)

```javascript
await AuthLocal.asUser(session.token, async () => {
  const contact = await db.createSecure('contacts', {
    id: 'contact_001',
    nom: 'Société ABC',
    email: 'abc@example.com'
  });
  // ACL ajouté automatiquement:
  // _acl: { owner: "user_123", created_by: "user_123", ... }
});
```

### Lecture sécurisée

```javascript
// Vérifie les permissions ACL
const contact = await db.readSecure('contacts', 'contact_001');

// Query filtrée selon les droits
const mesContacts = await db.querySecure('contacts', { type: 'client' });
```

### Vérification des droits

```javascript
// Dans un contexte asUser()
if (AuthLocal.isAdmin()) {
  // Action admin uniquement
}

if (AuthLocal.hasRole('user')) {
  // Action pour user et admin
}
```

## 👥 Rôles et Permissions

| Rôle | Description |
|------|-------------|
| `admin` | Accès total à tout |
| `user` | CRUD sur ses propres documents |
| `readonly` | Lecture seule |

## 🛡️ ACL (Access Control List)

Chaque document créé avec `createSecure` contient un champ `_acl` :

```yaml
id: contact_001
nom: "Société ABC"
_acl:
  owner: "user_123"
  created_by: "user_123"
  created_at: "2026-07-09T10:00:00Z"
  updated_at: "2026-07-09T10:00:00Z"
  permissions:
    owner: ["read", "write", "delete"]
    admin: ["read", "write", "delete"]
    user: ["read"]
```

## 📋 Scripts npm disponibles

```bash
npm run init-admin         # Créer le premier admin
npm run create-user        # Créer un utilisateur
npm run change-password    # Changer mot de passe
npm run demo-auth          # Démo création de contact
```

## 🔒 Sécurité

- **JWT** : Tokens signés avec expiration (15 min par défaut)
- **bcrypt** : Mots de passe hashés avec salt (12 rounds)
- **ACL inline** : Permissions dans chaque document YAML
- **Pas de sessions serveur** : Stateless, scalable

## 📝 Variables d'environnement

```bash
# .env
JWT_SECRET=votre_cle_secrete_tres_longue
```

Si non définie, une clé aléatoire est générée (pas persistante entre redémarrages !)

## 🧪 Test rapide

```bash
cd backend

# 1. Créer l'admin
node scripts/init-admin.js

# 2. Créer un user
node scripts/create-user.js user@test.com pass123 user

# 3. Tester la création de contact
node scripts/creer-contact.js user@test.com pass123
```
