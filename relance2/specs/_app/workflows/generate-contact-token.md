# generate-contact-token.py - Token portail

**Fichier** : `app/workflows/generate-contact-token.py`

## Description

Génère un token JWT pour l'accès portail client.

## Entrée

```json
{
  "contact_id": 123,
  "expires_days": 30
}
```

## Sortie

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "url": "https://marki.fr/portail/eyJhbG...",
  "expires_at": "2024-04-15T10:00:00"
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.generate-contact-token] START: contact_id={contact_id}, expires_days={expires_days}")` | Début génération token portail |
| 2 | `print(f"[WORKFLOW.generate-contact-token] STEP: Validation champs requis (contact_id, expires_days)")` | Validation input |
| 3 | `print(f"[WORKFLOW.generate-contact-token] ERROR: Champs manquants ou invalides (contact_id={contact_id})")` | Missing/invalid fields |
| 4 | `print(f"[WORKFLOW.generate-contact-token] STEP: Recherche contact '{contact_id}' en DB")` | Recherche contact |
| 5 | `print(f"[WORKFLOW.generate-contact-token] ERROR: Contact '{contact_id}' non trouvé en DB")` | Contact inexistant |
| 6 | `print(f"[WORKFLOW.generate-contact-token] STEP: Récupération email du contact pour envoi portail")` | Lookup email |
| 7 | `print(f"[WORKFLOW.generate-contact-token] STEP: Génération token via secrets.token_urlsafe (len={token_len}) - JAMAIS logué en clair")` | Génération token (sécurisé) |
| 8 | `print(f"[WORKFLOW.generate-contact-token] STEP: Hash SHA256 du token pour persistance DB (hash_len=64)")` | Hash pour stockage |
| 9 | `print(f"[WORKFLOW.generate-contact-token] STEP: Persistance token en DB (contact_id, hash, expires_at)")` | Insert DB |
| 10 | `print(f"[WORKFLOW.generate-contact-token] ERROR: Échec persistance token en DB (contact_id={contact_id})")` | DB insert failed |
| 11 | `print(f"[WORKFLOW.generate-contact-token] STEP: Construction URL portail (base_url + token)")` | Build URL |
| 12 | `print(f"[WORKFLOW.generate-contact-token] STEP: Envoi email au contact '{email}' avec URL portail")` | Send email |
| 13 | `print(f"[WORKFLOW.generate-contact-token] ERROR: Échec envoi email (token_id={token_id} persisté, contact non notifié)")` | Email failure |
| 14 | `print(f"[WORKFLOW.generate-contact-token] SUCCESS: token_id={token_id}, len={token_len}, expires_at={expires_at}, email_sent={email_sent}")` | Succès (token JAMAIS en clair) |
| 15 | `print(f"[WORKFLOW.generate-contact-token] END: Durée={duree}ms")` | End |
