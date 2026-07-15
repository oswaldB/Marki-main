# portail.py - Routes portail

**Fichier** : `app/routes/portail.py`  
**Blueprint** : `portail_bp` (préfixe `/api/portail`)

## Routes

### GET `/api/portail/config`

Configuration du portail client.

### POST `/api/portail/token`

Générer un token pour un contact (accès portail).

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "url": "https://marki.fr/portail/eyJhbGci..."
}
```

### GET `/api/portail/stats`

Statistiques d'utilisation du portail.

### POST `/api/portail/send-reminder`

Envoyer un rappel de token par email.

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `GET /api/portail/config` | 1 | `print(f"[API.PORTAIL.GET] START: Récupération config portail user_id={g.current_user.id}")` | Début |
| `GET /api/portail/config` | 2 | `print(f"[API.PORTAIL.GET] STEP: Vérification accès portail user_id={g.current_user.id}")` | Check accès |
| `GET /api/portail/config` | 3 | `print(f"[API.PORTAIL.GET] ERROR: Accès portail refusé user_id={g.current_user.id}")` | Accès refusé |
| `GET /api/portail/config` | 4 | `print(f"[API.PORTAIL.GET] STEP: Chargement config depuis DB")` | Load config |
| `GET /api/portail/config` | 5 | `print(f"[API.PORTAIL.GET] ERROR: Erreur chargement config: {e}")` | Erreur DB |
| `GET /api/portail/config` | 6 | `print(f"[API.PORTAIL.GET] SUCCESS: Config retournée user_id={g.current_user.id}")` | Succès |
| `POST /api/portail/token` | 1 | `print(f"[API.PORTAIL.CREATE] START: Génération token contact_id={data.get('contact_id')}")` | Début |
| `POST /api/portail/token` | 2 | `print(f"[API.PORTAIL.CREATE] STEP: Validation données contact_id={data.get('contact_id')}")` | Validation |
| `POST /api/portail/token` | 3 | `print(f"[API.PORTAIL.CREATE] ERROR: contact_id manquant")` | Missing field |
| `POST /api/portail/token` | 4 | `print(f"[API.PORTAIL.CREATE] ERROR: Contact introuvable contact_id={contact_id}")` | Not found |
| `POST /api/portail/token` | 5 | `print(f"[API.PORTAIL.CREATE] STEP: Génération JWT token contact_id={contact_id}")` | Génération |
| `POST /api/portail/token` | 6 | `print(f"[API.PORTAIL.CREATE] STEP: Sauvegarde token en DB contact_id={contact_id}")` | Save DB |
| `POST /api/portail/token` | 7 | `print(f"[API.PORTAIL.CREATE] ERROR: Erreur génération token: {e}")` | Erreur |
| `POST /api/portail/token` | 8 | `print(f"[API.PORTAIL.CREATE] SUCCESS: Token généré contact_id={contact_id} token={token[:20]}...")` | Succès |
| `GET /api/portail/stats` | 1 | `print(f"[API.PORTAIL.LIST] START: Récupération stats portail user_id={g.current_user.id}")` | Début |
| `GET /api/portail/stats` | 2 | `print(f"[API.PORTAIL.LIST] STEP: Agrégation stats tokens actifs/expirés")` | Agrégation |
| `GET /api/portail/stats` | 3 | `print(f"[API.PORTAIL.LIST] ERROR: Erreur calcul stats: {e}")` | Erreur |
| `GET /api/portail/stats` | 4 | `print(f"[API.PORTAIL.LIST] SUCCESS: Stats retournées actifs={stats['active']} expires={stats['expired']} total={stats['total']}")` | Succès |
| `POST /api/portail/send-reminder` | 1 | `print(f"[API.PORTAIL.UPDATE] START: Envoi rappel token contact_id={data.get('contact_id')}")` | Début |
| `POST /api/portail/send-reminder` | 2 | `print(f"[API.PORTAIL.UPDATE] STEP: Validation contact_id={data.get('contact_id')}")` | Validation |
| `POST /api/portail/send-reminder` | 3 | `print(f"[API.PORTAIL.UPDATE] ERROR: contact_id manquant")` | Missing field |
| `POST /api/portail/send-reminder` | 4 | `print(f"[API.PORTAIL.UPDATE] ERROR: Contact introuvable contact_id={contact_id}")` | Not found |
| `POST /api/portail/send-reminder` | 5 | `print(f"[API.PORTAIL.UPDATE] STEP: Recherche token actif contact_id={contact_id}")` | Recherche token |
| `POST /api/portail/send-reminder` | 6 | `print(f"[API.PORTAIL.UPDATE] ERROR: Aucun token actif pour contact_id={contact_id}")` | Pas de token |
| `POST /api/portail/send-reminder` | 7 | `print(f"[API.PORTAIL.UPDATE] STEP: Envoi email à {contact.email}")` | Envoi email |
| `POST /api/portail/send-reminder` | 8 | `print(f"[API.PORTAIL.UPDATE] ERROR: Échec envoi email: {e}")` | Erreur envoi |
| `POST /api/portail/send-reminder` | 9 | `print(f"[API.PORTAIL.UPDATE] SUCCESS: Rappel envoyé contact_id={contact_id} email={contact.email}")` | Succès |
| `require_auth` | 1 | `print(f"[API.PORTAIL.REQUIRE] START: Vérification token portail")` | Début vérif |
| `require_auth` | 2 | `print(f"[API.PORTAIL.REQUIRE] ERROR: Token manquant")` | Token missing |
| `require_auth` | 3 | `print(f"[API.PORTAIL.REQUIRE] ERROR: Token invalide ou expiré")` | Token invalid |
| `require_auth` | 4 | `print(f"[API.PORTAIL.REQUIRE] SUCCESS: Authentification OK user={user.username}")` | Auth OK |
