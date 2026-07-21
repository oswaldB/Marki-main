# Migration Impayes - Terminée ✅

## Résumé de la migration

Le dossier `templates/impayes/` qui contenait 3 pages distinctes a été refactorisé en 3 dossiers séparés.

## Structure finale

```
app/templates/
├── impayes/                    # Page liste des factures
│   ├── index.html
│   ├── alpinejs.html
│   ├── reparer.html           # Page "à réparer" (conservée ici)
│   └── workflows/
├── impayes-payeur/            # Page vue par payeur (NOUVEAU)
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
└── impayes-suspendus/         # Page impayés suspendus (NOUVEAU)
    ├── index.html
    ├── alpinejs.html
    └── workflows/
```

## URLs accessibles

| URL | Description |
|-----|-------------|
| `/impayes` | Liste des factures impayées |
| `/impayes-payeur` | Vue par payeur (cartes rétractables) |
| `/impayes-suspendus` | Impayés suspendus (blacklist) |
| `/impayes/reparer` | Factures à réparer |
| `/impayes/payeur` | → Redirige vers `/impayes-payeur` |
| `/impayes/suspendus` | → Redirige vers `/impayes-suspendus` |

## Modifications effectuées

### 1. Nouveaux fichiers créés
- `app/templates/impayes-payeur/index.html`
- `app/templates/impayes-payeur/alpinejs.html`
- `app/templates/impayes-suspendus/index.html`
- `app/templates/impayes-suspendus/alpinejs.html`

### 2. Routes mises à jour (app.py)
```python
# Nouvelles routes principales
@app.route('/impayes-payeur')
def impayes_payeur_page():
    return render_template('impayes-payeur/index.html')

@app.route('/impayes-suspendus')
def impayes_suspendus_page():
    return render_template('impayes-suspendus/index.html')

# Redirections pour compatibilité
@app.route('/impayes/payeur')
def impayes_payeur_page_redirect():
    return redirect('/impayes-payeur')

@app.route('/impayes/suspendus')
def impayes_suspendus_page_redirect():
    return redirect('/impayes-suspendus')
```

### 3. Navigation déjà à jour
Les liens dans `layout_app.html` pointent déjà vers les bonnes URLs:
- `/impayes-payeur`
- `/impayes-suspendus`

## Prochaines étapes

1. **Redémarrer le serveur Flask**
   ```bash
   pkill -f gunicorn
   cd /home/ubuntu/marki/relance2 && gunicorn -w 2 -b 127.0.0.1:5001 "app.app:create_app()"
   ```

2. **Tester les URLs**
   - [ ] `/impayes` - Liste des factures
   - [ ] `/impayes-payeur` - Vue par payeur
   - [ ] `/impayes-suspendus` - Impayés suspendus
   - [ ] `/impayes/payeur` → Redirection vers `/impayes-payeur`
   - [ ] `/impayes/suspendus` → Redirection vers `/impayes-suspendus`

3. **Nettoyage** (après validation)
   Une fois la migration validée, exécuter le script de nettoyage:
   ```bash
   bash /home/ubuntu/marki/relance2/migration/impayes-refactor/cleanup.sh
   ```

   Ce script supprimera les fichiers obsolètes:
   - `app/templates/impayes/payeur.html`
   - `app/templates/impayes/suspendus.html`
   - `app/templates/impayes/alpinejs-payeur.html`
   - `app/templates/impayes/alpinejs-suspendus.html`

## Notes

- Les anciennes URLs `/impayes/payeur` et `/impayes/suspendus` redirigent automatiquement vers les nouvelles
- Les fichiers Alpine.js ont été copiés (pas déplacés) pour éviter les régressions
- Toutes les features ont été conservées (tri, filtres, pagination, modals, etc.)
