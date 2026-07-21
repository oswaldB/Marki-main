# Migration Impayes - Instructions

## Objectif
Séparer le dossier `templates/impayes/` (qui contient 3 pages) en 3 dossiers distincts :
- `templates/impayes/` - Page liste des impayés (factures)
- `templates/impayes-payeur/` - Page vue par payeur (groupement)
- `templates/impayes-suspendus/` - Page impayés suspendus (blacklist)

## Structure source actuelle
```
templates/impayes/
├── index.html              # Page liste (à garder ici)
├── payeur.html             # Page payeur (à déplacer)
├── suspendus.html          # Page suspendus (à déplacer)
├── reparer.html            # Page réparer (à déplacer vers impayes/)
├── alpinejs.html           # JS liste (à garder)
├── alpinejs-payeur.html    # JS payeur (à déplacer)
├── alpinejs-suspendus.html # JS suspendus (à déplacer)
└── workflows/
    ├── initial-load.html
    ├── sync-data.html
    ├── pagination-next.html
    ├── pagination-prev.html
    ├── sort-by-*.html
    ├── open-detail.html
    ├── save-note.html
    ├── edit-note.html
    ├── delete-note.html
    ├── update-sequence.html
    ├── suspend-facture.html
    └── unsuspend-facture.html
```

## Structure cible

### 1. templates/impayes/
```
impayes/
├── index.html              # Vue liste avec table + panel détail
├── alpinejs.html           # Data 'impayes' + workflows
└── workflows/
    ├── initial-load.html
    ├── sync-data.html
    ├── pagination-next.html
    ├── pagination-prev.html
    ├── sort-by-*.html
    ├── open-detail.html
    ├── save-note.html
    ├── edit-note.html
    ├── delete-note.html
    ├── update-sequence.html
    ├── suspend-facture.html
    └── unsuspend-facture.html
```

### 2. templates/impayes-payeur/
```
impayes-payeur/
├── index.html              # Vue par payeur (cartes rétractables)
├── alpinejs.html           # Data 'impayesPayeur'
└── workflows/
    ├── initial-load.html
    ├── sync-data.html
    ├── pagination-next.html
    ├── pagination-prev.html
    ├── open-detail.html
    ├── save-note.html
    └── toggle-card.html    # Pour expand/collapse
```

### 3. templates/impayes-suspendus/
```
impayes-suspendus/
├── index.html              # Liste impayés suspendus
├── alpinejs.html           # Data 'impayesSuspendus'
└── workflows/
    ├── initial-load.html
    ├── pagination-next.html
    ├── pagination-prev.html
    ├── reactivate-impaye.html
    └── filter-motif.html
```

## Routes à mettre à jour dans app.py

| Ancienne route | Nouvelle route | Template |
|----------------|----------------|----------|
| `/impayes` | `/impayes` | `impayes/index.html` |
| `/impayes/payeur` | `/impayes-payeur` | `impayes-payeur/index.html` |
| `/impayes/suspendus` | `/impayes-suspendus` | `impayes-suspendus/index.html` |
| `/impayes/reparer` | `/impayes/reparer` | `impayes/reparer.html` (garde dans impayes/) |

## Changements de noms de data Alpine

- `impayes` → garde `impayes` (liste)
- `impayesPayeur` → garde `impayesPayeur` (payeur)
- `impayesSuspendus` → garde `impayesSuspendus` (suspendus)

## Features à migrer

### Page impayes (liste)
- [ ] Table avec tri sur toutes les colonnes
- [ ] Panel détail coulissant à droite
- [ ] Filtres (recherche, statut, séquence)
- [ ] Notes (CRUD) dans le panel
- [ ] Suspendre/Désuspendre facture
- [ ] Pagination
- [ ] Synchronisation

### Page impayes-payeur
- [ ] Cartes rétractables par payeur
- [ ] Liste des factures dans chaque carte
- [ ] Total par payeur
- [ ] Filtre montant minimum
- [ ] Tri (montant, nom, nb factures)
- [ ] Boutons expand/collapse all
- [ ] Modal détail simplifié
- [ ] Pagination

### Page impayes-suspendus
- [ ] Liste factures suspendues
- [ ] Badge suspension source (facture vs contact)
- [ ] Filtre par motif
- [ ] Réactivation avec confirmation
- [ ] Toast notifications
- [ ] Pagination

## Points d'attention

1. **Liens de navigation** : Mettre à jour tous les liens `href` dans les templates
2. **API endpoints** : Les endpoints `/api/impayes/*` restent inchangés
3. **Active page** : Mettre à jour `active_page` dans chaque template
4. **Workflow includes** : Mettre à jour les chemins dans `{% include %}`
