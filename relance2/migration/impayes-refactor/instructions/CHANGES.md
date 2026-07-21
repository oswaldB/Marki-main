# Changements effectués - Refactoring Impayes

## Résumé
Séparation du dossier `templates/impayes/` (3 pages en 1) en 3 dossiers distincts.

## Structure créée

### 1. templates/impayes/ (conservé)
- `index.html` - Page liste des factures impayées
- `alpinejs.html` - JS pour la liste
- `workflows/` - Workflows spécifiques à la liste
- `reparer.html` - Page "à réparer" (conservée ici car liée)

### 2. templates/impayes-payeur/ (nouveau)
- `index.html` - Page vue par payeur (cartes rétractables)
- `alpinejs.html` - JS pour la vue payeur (copié depuis alpinejs-payeur.html)

### 3. templates/impayes-suspendus/ (nouveau)
- `index.html` - Page impayés suspendus
- `alpinejs.html` - JS pour les suspendus (copié depuis alpinejs-suspendus.html)

## Routes mises à jour (app.py)

| Ancienne | Nouvelle | Action |
|----------|----------|--------|
| `/impayes/payeur` | `/impayes-payeur` | Redirection ajoutée |
| `/impayes/suspendus` | `/impayes-suspendus` | Redirection ajoutée |

Les anciennes routes `/impayes/payeur` et `/impayes/suspendus` redirigent maintenant vers les nouvelles URLs.

## Liens mis à jour

### Dans templates/impayes/index.html
- Lien "Vue par payeur" : `/impayes/payeur` → `/impayes-payeur`

### Navigation globale (à vérifier dans layout_app.html)
Les liens vers ces pages dans la navigation principale doivent être mis à jour :
- `/impayes/payeur` → `/impayes-payeur`
- `/impayes/suspendus` → `/impayes-suspendus`

## Fichiers déplacés/copiés

### Copiés (nouveaux emplacements)
- `impayes/alpinejs-payeur.html` → `impayes-payeur/alpinejs.html`
- `impayes/alpinejs-suspendus.html` → `impayes-suspendus/alpinejs.html`
- `impayes/payeur.html` → `impayes-payeur/index.html` (adapté)
- `impayes/suspendus.html` → `impayes-suspendus/index.html` (adapté)

### Conservés à leur place
- `impayes/index.html`
- `impayes/alpinejs.html`
- `impayes/reparer.html`
- `impayes/workflows/` (tous les workflows)

## Prochaines étapes

1. **Vérifier la navigation** - Mettre à jour les liens dans `layout_app.html` si nécessaire
2. **Redémarrer le serveur** - Pour prendre en compte les nouvelles routes
3. **Tester** :
   - `/impayes` → doit fonctionner normalement
   - `/impayes-payeur` → nouvelle URL
   - `/impayes-suspendus` → nouvelle URL
   - `/impayes/payeur` → doit rediriger vers `/impayes-payeur`
   - `/impayes/suspendus` → doit rediriger vers `/impayes-suspendus`

## Nettoyage futur

Une fois la migration validée, on pourra supprimer :
- `app/templates/impayes/payeur.html`
- `app/templates/impayes/suspendus.html`
- `app/templates/impayes/alpinejs-payeur.html`
- `app/templates/impayes/alpinejs-suspendus.html`

Et retirer les routes de redirection dans app.py.
