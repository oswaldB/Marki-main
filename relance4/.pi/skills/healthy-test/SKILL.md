---
name: healthy-test
description: Teste que Bun.js, Caddy et l'API sont opérationnels. Démarre l'API Bun.js si nécessaire et vérifie le endpoint /api/health.
---

# Healthy Test Skill

Vérifie que l'environnement de développement est prêt (Bun.js + Caddy + API).

## Usage

```bash
# Via la commande skill
/skill:healthy-test [project-dir]

# Ou directement via le script
python3 .pi/skills/healthy-test/scripts/healthy_test.py [project-dir]
```

## Arguments

- `project-dir` (optionnel) : Chemin du projet (défaut: cwd)

## Actions effectuées

1. Vérifie que Bun.js est installé (`which bun`)
2. Recharge Caddy (`sudo systemctl reload caddy`)
3. Démarre l'API Bun.js sur le port 3001 si pas déjà running
4. Appelle `http://localhost:3001/api/health`

## Résultat

- Retourne `(True, "OK")` si l'API répond
- Retourne `(False, "message")` si erreur

## Exemple

```bash
/skill:healthy-test
# Output:
#   → Vérification Bun.js...
#   → Rechargement Caddy...
#   → Démarrage API Bun.js...
# ✅ Services OK
```
