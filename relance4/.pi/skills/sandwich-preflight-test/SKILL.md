# Sandwich Preflight Test

## Description
Ce skill exécute les tests preflight pour l'environnement `dev.markidiags.com`. Il vérifie que :
1. L'URL `https://dev.markidiags.com/healthy` retourne le healthy screen
2. L'URL `https://dev.markidiags.com/parse` retourne le schema
3. Le schema est enregistré dans `workshop/output/artefacts/schema`

## Structure du skill
```
.pi/skills/sandwich-preflight-test/
├── SKILL.md
└── scripts/
    └── preflight.sh
```

## Utilisation

### 1. Exécuter le script preflight
```bash
bash .pi/skills/sandwich-preflight-test/scripts/preflight.sh [chemin_workshop]
```
Par défaut, le workshop est `./workshop`.

### 2. Si le script retourne un code d'erreur (non-zéro)
- Un rapport est généré dans `workshop/output/artefacts/preflight-ko.md`
- Lis ce rapport et les logs dans `workshop/output/artefacts/preflight.log`
- Analyse le problème et propose une solution
- Si tu trouves une solution, applique-la et relance le preflight
- Si tu ne trouves pas de solution, arrête-toi et signale l'erreur

## Comportement

- **Succès** : le schema est disponible dans `workshop/output/artefacts/schema`
- **Échec** : le rapport `preflight-ko.md` est créé avec la cause de l'échec
- Les logs complets sont dans `workshop/output/artefacts/preflight.log`

## Conditions préalables dans le workshop

Le skill s'attend à ce que le fichier `workshop/input/preflight.md` liste les vérifications suivantes :
- [ ] L'URL `https://dev.markidiags.com/healthy` retourne le healthy screen via curl
- [ ] On peut faire un GET sur le schema de `https://dev.markidiags.com/parse` en curl
- [ ] Le schema est enregistré dans `output/artefacts/schema`
