# Tests Preflight

## Vérifications obligatoires avant production

### dev.markidiags.com

- [ ] **Healthy check**
  - L'URL `https://dev.markidiags.com/healthy` retourne le healthy screen via curl
  - Commande : `curl -sSf https://dev.markidiags.com/healthy | grep -i healthy`

- [ ] **Récupération du schema**
  - On peut faire un GET sur le schema de `https://dev.markidiags.com/parse` en curl
  - La réponse contient un schema valide

- [ ] **Enregistrement du schema**
  - Le schema est enregistré dans `workshop/output/artefacts/schema`

## Commandes de vérification

```bash
# Vérifier le healthy screen
curl -sSf https://dev.markidiags.com/healthy

# Récupérer le schema
curl -sSf https://dev.markidiags.com/parse > workshop/output/artefacts/schema
```
