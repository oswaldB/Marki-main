# Index des Features ADTI

**Projet** : ADTI - Analyse et Détection des Taux d'Impayés  
**Date** : 2026-06-30  
**Version** : 2.0

---

## Architecture

### Frontend
- **Type** : Static pure (HTML/CSS/JS)
- **Framework JS** : AlpineJS 3.x (CDN)
- **CSS** : Tailwind CSS (CDN)
- **Routing** : Fichier `_redirects` (Netlify-style)

### Backend
- **Type** : Node.js + Express
- **Stockage** : Flat Files Database (1 YAML = 1 entité)
- **Indexation** : LokiJS en mémoire (rebuild au démarrage)
- **Locking** : proper-lockfile pour accès concurrents

---

## Features fonctionnelles

| ID | Fichier | Titre | Personas |
|----|---------|-------|----------|
| F-001 | [F-001-import-donnees.md](F-001-import-donnees.md) | Import de données | Analyste financier |
| F-002 | [F-002-tableau-de-bord.md](F-002-tableau-de-bord.md) | Tableau de bord | Analyste financier, Responsable commercial |
| F-003 | [F-003-liste-factures.md](F-003-liste-factures.md) | Liste des factures | Analyste financier, Agent de recouvrement |
| F-004 | [F-004-fiche-client.md](F-004-fiche-client.md) | Fiche client | Analyste financier, Responsable commercial |
| F-005 | [F-005-detection-anomalies.md](F-005-detection-anomalies.md) | Détection anomalies | Analyste financier, Responsable commercial |
| F-006 | [F-006-export-rapports.md](F-006-export-rapports.md) | Export rapports | Analyste financier, Responsable commercial |

### Module Gestion des Relances

| ID | Fichier | Titre | Personas |
|----|---------|-------|----------|
| F-007 | [F-007-relances-email.md](F-007-relances-email.md) | Relances email | Agent de recouvrement |
| F-008 | [F-008-blacklist-impayes.md](F-008-blacklist-impayes.md) | Blacklist des impayés | Agent de recouvrement, Responsable commercial |
| F-009 | [F-009-bouton-enregistrer-validation-relance.md](F-009-bouton-enregistrer-validation-relance.md) | Bouton Enregistrer - Validation | Agent de recouvrement |
| F-010 | [F-010-generation-automatique-relances.md](F-010-generation-automatique-relances.md) | Génération automatique des relances | Agent de recouvrement, Responsable commercial |
| F-011 | [F-011-configuration-sequences-relances.md](F-011-configuration-sequences-relances.md) | Configuration des séquences de relances | Responsable commercial |
| F-012 | [F-012-historique-suivi-relances.md](F-012-historique-suivi-relances.md) | Historique et suivi des relances | Agent de recouvrement, Analyste financier |

## Features transverses

| ID | Fichier | Titre | Couverture |
|----|---------|-------|------------|
| F-T-LOG | [F-T-LOG.md](F-T-LOG.md) | Observabilité / Logging | Tous les workflows |
| F-T-ERROR | [F-T-ERROR.md](F-T-ERROR.md) | Gestion d'erreurs | Tous les workflows |
| F-T-NOTIF | [F-T-NOTIF.md](F-T-NOTIF.md) | Notifications | Toutes les actions |

---

## Structure des specs

```
specs/
├── brief.md                    # Vue d'ensemble projet
├── ARCHITECTURE.md             # Architecture complète
├── styleguide.md               # Guide Tailwind + AlpineJS + Routing
├── screens.md                  # Inventaire écrans avec routes
├── workflows.md                # Inventaire workflows (frontend + backend)
├── features/                   # Features métier
│   ├── F-001-*.md
│   ├── ...
│   └── F-T-*.md
└── _app/
    ├── backend/
    │   ├── server-spec.md      # Spec serveur Node.js
    │   ├── models/
    │   │   └── flat-files/     # Modèles YAML
    │   └── workflows/          # Specs workflows backend
    └── frontend/
        └── ...                 # Structure écrans (générée)
```

---

## Documentation connexe

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture complète
- [workflows.md](../workflows.md) - Inventaire des workflows
- [screens.md](../screens.md) - Inventaire des écrans
- [styleguide.md](../styleguide.md) - Guide de style
