# smtp.py - Routes SMTP

**Fichier** : `app/routes/smtp.py`  
**Blueprint** : `smtp_bp` (préfixe `/api/smtp-profiles`)

## Routes

### GET `/api/smtp-profiles`

Liste des profils SMTP.

**Response:**
```json
{
  "profiles": [
    {
      "id": 1,
      "nom": "Gmail Principal",
      "host": "smtp.gmail.com",
      "port": 587,
      "username": "relance@marki.fr",
      "use_tls": true,
      "is_default": true
    }
  ]
}
```

### GET `/api/smtp-profiles/:id`

Détail d'un profil (sans le mot de passe).

### POST `/api/smtp-profiles`

Créer un profil SMTP.

**Body:**
```json
{
  "nom": "SMTP Secondaire",
  "host": "smtp.example.com",
  "port": 587,
  "username": "user@example.com",
  "password": "secret",
  "use_tls": true,
  "is_default": false
}
```

### PUT `/api/smtp-profiles/:id`

Modifier un profil.

### DELETE `/api/smtp-profiles/:id`

Supprimer un profil.

### POST `/api/smtp-profiles/:id/test`

Tester la connexion SMTP.

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `GET /api/smtp-profiles` | 1 | `print(f"[API.SMTP.LIST] START: Récupération liste profils SMTP user_id={g.current_user.id}")` | Début |
| `GET /api/smtp-profiles` | 2 | `print(f"[API.SMTP.LIST] STEP: Authentification requise via require_auth")` | Vérif auth |
| `GET /api/smtp-profiles` | 3 | `print(f"[API.SMTP.LIST] STEP: Query DB SELECT * FROM smtp_profiles ORDER BY is_default DESC, nom")` | Query DB |
| `GET /api/smtp-profiles` | 4 | `print(f"[API.SMTP.LIST] STEP: Masquage des mots de passe avant retour API")` | Masquage |
| `GET /api/smtp-profiles` | 5 | `print(f"[API.SMTP.LIST] ERROR: Erreur DB lors du SELECT profils: {e}")` | Erreur DB |
| `GET /api/smtp-profiles` | 6 | `print(f"[API.SMTP.LIST] ERROR: Échec d'authentification")` | Auth fail |
| `GET /api/smtp-profiles` | 7 | `print(f"[API.SMTP.LIST] SUCCESS: {len(profiles)} profils retournés")` | Compteur |
| `GET /api/smtp-profiles` | 8 | `print(f"[API.SMTP.LIST] SUCCESS: {default_count} profil(s) par défaut")` | Stats |
| `GET /api/smtp-profiles/:id` | 1 | `print(f"[API.SMTP.GET] START: Récupération profil_id={profil_id} user_id={g.current_user.id}")` | Début |
| `GET /api/smtp-profiles/:id` | 2 | `print(f"[API.SMTP.GET] STEP: Vérification authentification")` | Auth |
| `GET /api/smtp-profiles/:id` | 3 | `print(f"[API.SMTP.GET] STEP: Query DB SELECT profil WHERE id={profil_id}")` | Query DB |
| `GET /api/smtp-profiles/:id` | 4 | `print(f"[API.SMTP.GET] ERROR: Profil {profil_id} non trouvé")` | 404 not found |
| `GET /api/smtp-profiles/:id` | 5 | `print(f"[API.SMTP.GET] ERROR: Erreur DB lors du SELECT profil: {e}")` | DB error |
| `GET /api/smtp-profiles/:id` | 6 | `print(f"[API.SMTP.GET] STEP: Masquage mot de passe du profil {profil_id}")` | Masquage |
| `GET /api/smtp-profiles/:id` | 7 | `print(f"[API.SMTP.GET] STEP: Vérification droits d'accès sur profil {profil_id}")` | Droits |
| `GET /api/smtp-profiles/:id` | 8 | `print(f"[API.SMTP.GET] ERROR: Accès refusé au profil {profil_id}")` | 403 |
| `GET /api/smtp-profiles/:id` | 9 | `print(f"[API.SMTP.GET] SUCCESS: Profil {profil_id} '{profil.nom}' retourné")` | Succès |
| `POST /api/smtp-profiles` | 1 | `print(f"[API.SMTP.CREATE] START: Création profil SMTP user_id={g.current_user.id}")` | Début |
| `POST /api/smtp-profiles` | 2 | `print(f"[API.SMTP.CREATE] STEP: Authentification requise")` | Auth |
| `POST /api/smtp-profiles` | 3 | `print(f"[API.SMTP.CREATE] STEP: Validation données (nom={data.get('nom')}, host={data.get('host')}, port={data.get('port')})")` | Validation |
| `POST /api/smtp-profiles` | 4 | `print(f"[API.SMTP.CREATE] ERROR: Données invalides - host manquant ou port invalide")` | 400 bad input |
| `POST /api/smtp-profiles` | 5 | `print(f"[API.SMTP.CREATE] STEP: Vérification unicité du nom '{data.get('nom')}'")` | Unicité |
| `POST /api/smtp-profiles` | 6 | `print(f"[API.SMTP.CREATE] ERROR: Nom '{data.get('nom')}' déjà utilisé par un autre profil")` | Conflit |
| `POST /api/smtp-profiles` | 7 | `print(f"[API.SMTP.CREATE] STEP: Hash du mot de passe")` | Hash password |
| `POST /api/smtp-profiles` | 8 | `print(f"[API.SMTP.CREATE] STEP: Si is_default=true, unset des autres profils par défaut")` | Default mgmt |
| `POST /api/smtp-profiles` | 9 | `print(f"[API.SMTP.CREATE] STEP: INSERT INTO smtp_profiles")` | Insert DB |
| `POST /api/smtp-profiles` | 10 | `print(f"[API.SMTP.CREATE] ERROR: Erreur DB lors de l'INSERT: {e}")` | DB error |
| `POST /api/smtp-profiles` | 11 | `print(f"[API.SMTP.CREATE] SUCCESS: Profil créé id={new_id} nom='{profil.nom}' host={profil.host}:{profil.port}")` | Succès |
| `PUT /api/smtp-profiles/:id` | 1 | `print(f"[API.SMTP.UPDATE] START: MAJ profil_id={profil_id} user_id={g.current_user.id}")` | Début |
| `PUT /api/smtp-profiles/:id` | 2 | `print(f"[API.SMTP.UPDATE] STEP: Authentification requise")` | Auth |
| `PUT /api/smtp-profiles/:id` | 3 | `print(f"[API.SMTP.UPDATE] STEP: Vérification existence profil {profil_id}")` | Existence |
| `PUT /api/smtp-profiles/:id` | 4 | `print(f"[API.SMTP.UPDATE] ERROR: Profil {profil_id} non trouvé")` | 404 |
| `PUT /api/smtp-profiles/:id` | 5 | `print(f"[API.SMTP.UPDATE] STEP: Validation nouvelles données")` | Validation |
| `PUT /api/smtp-profiles/:id` | 6 | `print(f"[API.SMTP.UPDATE] ERROR: Données de mise à jour invalides")` | 400 |
| `PUT /api/smtp-profiles/:id` | 7 | `print(f"[API.SMTP.UPDATE] STEP: Hash du nouveau mot de passe si fourni")` | Hash |
| `PUT /api/smtp-profiles/:id` | 8 | `print(f"[API.SMTP.UPDATE] STEP: UPDATE smtp_profiles WHERE id={profil_id}")` | Update DB |
| `PUT /api/smtp-profiles/:id` | 9 | `print(f"[API.SMTP.UPDATE] ERROR: Erreur DB lors de l'UPDATE: {e}")` | DB error |
| `PUT /api/smtp-profiles/:id` | 10 | `print(f"[API.SMTP.UPDATE] STEP: Gestion is_default (unset autres si passé à true)")` | Default mgmt |
| `PUT /api/smtp-profiles/:id` | 11 | `print(f"[API.SMTP.UPDATE] SUCCESS: Profil {profil_id} mis à jour")` | Succès |
| `DELETE /api/smtp-profiles/:id` | 1 | `print(f"[API.SMTP.DELETE] START: Suppression profil_id={profil_id} user_id={g.current_user.id}")` | Début |
| `DELETE /api/smtp-profiles/:id` | 2 | `print(f"[API.SMTP.DELETE] STEP: Authentification + vérification rôle admin")` | Auth admin |
| `DELETE /api/smtp-profiles/:id` | 3 | `print(f"[API.SMTP.DELETE] STEP: Vérification existence profil {profil_id}")` | Existence |
| `DELETE /api/smtp-profiles/:id` | 4 | `print(f"[API.SMTP.DELETE] ERROR: Profil {profil_id} non trouvé")` | 404 |
| `DELETE /api/smtp-profiles/:id` | 5 | `print(f"[API.SMTP.DELETE] ERROR: Permission insuffisante (rôle admin requis)")` | 403 |
| `DELETE /api/smtp-profiles/:id` | 6 | `print(f"[API.SMTP.DELETE] STEP: Vérification utilisation par campagnes (SELECT COUNT FROM campaigns WHERE smtp_profile_id={profil_id})")` | Check usage |
| `DELETE /api/smtp-profiles/:id` | 7 | `print(f"[API.SMTP.DELETE] ERROR: Profil {profil_id} utilisé par {count} campagne(s) - suppression refusée")` | Conflit usage |
| `DELETE /api/smtp-profiles/:id` | 8 | `print(f"[API.SMTP.DELETE] STEP: DELETE FROM smtp_profiles WHERE id={profil_id}")` | Delete DB |
| `DELETE /api/smtp-profiles/:id` | 9 | `print(f"[API.SMTP.DELETE] ERROR: Erreur DB lors du DELETE: {e}")` | DB error |
| `DELETE /api/smtp-profiles/:id` | 10 | `print(f"[API.SMTP.DELETE] SUCCESS: Profil {profil_id} supprimé")` | Succès |
| `POST /api/smtp-profiles/:id/test` | 1 | `print(f"[API.SMTP.TEST] START: Test connexion SMTP profil_id={profil_id} user_id={g.current_user.id}")` | Début |
| `POST /api/smtp-profiles/:id/test` | 2 | `print(f"[API.SMTP.TEST] STEP: Authentification requise")` | Auth |
| `POST /api/smtp-profiles/:id/test` | 3 | `print(f"[API.SMTP.TEST] STEP: Récupération profil {profil_id} (host, port, username, use_tls)")` | Load profil |
| `POST /api/smtp-profiles/:id/test` | 4 | `print(f"[API.SMTP.TEST] ERROR: Profil {profil_id} non trouvé")` | 404 |
| `POST /api/smtp-profiles/:id/test` | 5 | `print(f"[API.SMTP.TEST] STEP: Tentative connexion SMTP {host}:{port} timeout={timeout}s")` | Connexion |
| `POST /api/smtp-profiles/:id/test` | 6 | `print(f"[API.SMTP.TEST] ERROR: Connexion refusée vers {host}:{port} ({e})")` | Conn refused |
| `POST /api/smtp-profiles/:id/test` | 7 | `print(f"[API.SMTP.TEST] ERROR: Timeout lors de la connexion à {host}:{port} après {timeout}s")` | Timeout |
| `POST /api/smtp-profiles/:id/test` | 8 | `print(f"[API.SMTP.TEST] ERROR: Échec authentification SMTP pour user={username} ({e})")` | Auth failed |
| `POST /api/smtp-profiles/:id/test` | 9 | `print(f"[API.SMTP.TEST] ERROR: Erreur TLS/SSL lors de la négociation STARTTLS ({e})")` | TLS error |
| `POST /api/smtp-profiles/:id/test` | 10 | `print(f"[API.SMTP.TEST] STEP: Envoi email test vers {test_recipient}")` | Send test |
| `POST /api/smtp-profiles/:id/test` | 11 | `print(f"[API.SMTP.TEST] ERROR: Échec envoi email test ({e})")` | Send failed |
| `POST /api/smtp-profiles/:id/test` | 12 | `print(f"[API.SMTP.TEST] SUCCESS: Connexion OK à {host}:{port} en {duration_ms}ms, email test envoyé")` | Succès |
