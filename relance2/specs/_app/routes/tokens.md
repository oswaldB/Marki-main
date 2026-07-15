# tokens.py - Routes tokens

**Fichier** : `app/routes/tokens.py`  
**Blueprint** : `tokens_bp` (préfixe `/api/tokens`)

## Routes

### GET `/api/tokens`

Liste des tokens actifs.

### POST `/api/tokens/revoke/:id`

Révoquer un token.

### POST `/api/tokens/cleanup`

Nettoyer les tokens expirés.

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `GET /api/tokens` | 1 | `print(f"[API.TOKENS.LIST] START: Liste tokens actifs user_id={g.current_user.id}")` | Début list |
| `GET /api/tokens` | 2 | `print(f"[API.TOKENS.LIST] STEP: Requête DB WHERE active=True")` | Query DB |
| `GET /api/tokens` | 3 | `print(f"[API.TOKENS.LIST] ERROR: Échec récupération tokens: {e}")` | Erreur DB |
| `GET /api/tokens` | 4 | `print(f"[API.TOKENS.LIST] SUCCESS: {count} tokens actifs retournés")` | Succès avec compteur |
| `GET /api/tokens` | 5 | `print(f"[API.TOKENS.LIST] STEP: Sérialisation (masquage token_value)")` | Masquage sensible |
| `GET /api/tokens` | 6 | `print(f"[API.TOKENS.LIST] SUCCESS: Réponse envoyée count={count}")` | Réponse OK |
| `POST /api/tokens/revoke/:id` | 1 | `print(f"[API.TOKENS.REVOKE] START: Révocation token_id={id} par user_id={g.current_user.id}")` | Début revoke |
| `POST /api/tokens/revoke/:id` | 2 | `print(f"[API.TOKENS.REVOKE] STEP: Recherche token token_id={id}")` | Recherche token |
| `POST /api/tokens/revoke/:id` | 3 | `print(f"[API.TOKENS.REVOKE] ERROR: Token non trouvé token_id={id}")` | Token introuvable |
| `POST /api/tokens/revoke/:id` | 4 | `print(f"[API.TOKENS.REVOKE] ERROR: Token déjà révoqué token_id={id}")` | Déjà révoqué |
| `POST /api/tokens/revoke/:id` | 5 | `print(f"[API.TOKENS.REVOKE] ERROR: Permission refusée (non-admin) user_id={g.current_user.id}")` | Pas admin |
| `POST /api/tokens/revoke/:id` | 6 | `print(f"[API.TOKENS.REVOKE] STEP: UPDATE tokens SET active=False WHERE id={id}")` | Update DB |
| `POST /api/tokens/revoke/:id` | 7 | `print(f"[API.TOKENS.REVOKE] SUCCESS: Token révoqué token_id={id} revoked_by={g.current_user.id}")` | Révocation OK |
| `POST /api/tokens/revoke/:id` | 8 | `print(f"[API.TOKENS.REVOKE] ERROR: Échec révocation: {e}")` | Erreur DB |
| `POST /api/tokens/cleanup` | 1 | `print(f"[API.TOKENS.CLEANUP] START: Nettoyage tokens expirés user_id={g.current_user.id}")` | Début cleanup |
| `POST /api/tokens/cleanup` | 2 | `print(f"[API.TOKENS.CLEANUP] STEP: Recherche tokens expirés (expires_at < NOW())")` | Query expirés |
| `POST /api/tokens/cleanup` | 3 | `print(f"[API.TOKENS.CLEANUP] STEP: {expired_count} tokens expirés détectés")` | Compte candidats |
| `POST /api/tokens/cleanup` | 4 | `print(f"[API.TOKENS.CLEANUP] ERROR: Échec cleanup: {e}")` | Erreur |
| `POST /api/tokens/cleanup` | 5 | `print(f"[API.TOKENS.CLEANUP] STEP: DELETE tokens WHERE expires_at < NOW()")` | Delete DB |
| `POST /api/tokens/cleanup` | 6 | `print(f"[API.TOKENS.CLEANUP] SUCCESS: {deleted_count} tokens expirés supprimés")` | Succès avec compteur |
| `POST /api/tokens/cleanup` | 7 | `print(f"[API.TOKENS.CLEANUP] SUCCESS: Nettoyage terminé deleted={deleted_count}")` | Cleanup terminé |
| `POST /api/tokens/validate` | 1 | `print(f"[API.TOKENS.VALIDATE] START: Validation token (len={len(token)})")` | Début - jamais le token en clair |
| `POST /api/tokens/validate` | 2 | `print(f"[API.TOKENS.VALIDATE] STEP: Décodage JWT")` | Décodage |
| `POST /api/tokens/validate` | 3 | `print(f"[API.TOKENS.VALIDATE] ERROR: Token invalide ou expiré")` | Token invalide |
| `POST /api/tokens/validate` | 4 | `print(f"[API.TOKENS.VALIDATE] STEP: Vérification signature")` | Vérif signature |
| `POST /api/tokens/validate` | 5 | `print(f"[API.TOKENS.VALIDATE] ERROR: Signature invalide")` | Signature KO |
| `POST /api/tokens/validate` | 6 | `print(f"[API.TOKENS.VALIDATE] STEP: Lookup DB token_id={decoded.get('jti')}")` | Lookup DB |
| `POST /api/tokens/validate` | 7 | `print(f"[API.TOKENS.VALIDATE] ERROR: Token révoqué en DB token_id={decoded.get('jti')}")` | Révoqué |
| `POST /api/tokens/validate` | 8 | `print(f"[API.TOKENS.VALIDATE] SUCCESS: Token valide token_id={decoded.get('jti')} user_id={decoded.get('user_id')}")` | Validation OK |
| `POST /api/tokens/generate` | 1 | `print(f"[API.TOKENS.CREATE] START: Génération token user_id={user_id}")` | Début génération |
| `POST /api/tokens/generate` | 2 | `print(f"[API.TOKENS.CREATE] STEP: Génération chaîne aléatoire (len={length})")` | Génération chaîne |
| `POST /api/tokens/generate` | 3 | `print(f"[API.TOKENS.CREATE] STEP: Hash token (jamais loggé en clair)")` | Hash sensible |
| `POST /api/tokens/generate` | 4 | `print(f"[API.TOKENS.CREATE] STEP: INSERT token en DB user_id={user_id}")` | Insert DB |
| `POST /api/tokens/generate` | 5 | `print(f"[API.TOKENS.CREATE] ERROR: Échec génération: {e}")` | Erreur |
| `POST /api/tokens/generate` | 6 | `print(f"[API.TOKENS.CREATE] SUCCESS: Token créé token_id={new_token.id} len={len(new_token.token_hash)}")` | Succès sans secret |
| `DELETE /api/tokens/:id` | 1 | `print(f"[API.TOKENS.DELETE] START: Suppression token token_id={id} par user_id={g.current_user.id}")` | Début suppression |
| `DELETE /api/tokens/:id` | 2 | `print(f"[API.TOKENS.DELETE] STEP: Recherche token token_id={id}")` | Lookup |
| `DELETE /api/tokens/:id` | 3 | `print(f"[API.TOKENS.DELETE] ERROR: Token non trouvé token_id={id}")` | Introuvable |
| `DELETE /api/tokens/:id` | 4 | `print(f"[API.TOKENS.DELETE] ERROR: Permission refusée user_id={g.current_user.id}")` | Pas autorisé |
| `DELETE /api/tokens/:id` | 5 | `print(f"[API.TOKENS.DELETE] STEP: DELETE token WHERE id={id}")` | Delete DB |
| `DELETE /api/tokens/:id` | 6 | `print(f"[API.TOKENS.DELETE] SUCCESS: Token supprimé token_id={id}")` | Suppression OK |
| `DELETE /api/tokens/:id` | 7 | `print(f"[API.TOKENS.DELETE] ERROR: Échec suppression: {e}")` | Erreur DB |
