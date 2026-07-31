---
title: ADTI - Analyse et Détection des Taux d'Impayés
status: draft
created: 2026-06-25
updated: 2026-06-30
---

# ADTI - Analyse et Détection des Taux d'Impayés

## Architecture technique

### Frontend
- **Type** : Static pure (HTML/CSS/JS)
- **Framework JS** : AlpineJS 3.x uniquement
- **CSS** : Tailwind CSS via CDN
- **Routing** : Fichier `_redirects` (Netlify-style)
- **Hébergement** : Netlify / Vercel / Cloudflare Pages

### Backend
- **Type** : Node.js avec flat-files database
- **Stockage** : Fichiers YAML (1 fichier = 1 entité)
- **Indexation** : LokiJS en mémoire avec rebuild au démarrage
- **Locking** : proper-lockfile pour accès concurrents
- **API** : REST JSON via Express

### Structure des données

```
backend/
├── data/
│   ├── payers/              # 1 YAML = 1 payeur
│   ├── factures/            # 1 YAML = 1 facture
│   ├── impayes/             # 1 YAML = 1 impayé
│   ├── relances/            # 1 YAML = 1 relance
│   ├── sequences/           # 1 YAML = 1 séquence
│   └── contacts/            # 1 YAML = 1 contact
├── db.json                  # LokiJS (index uniquement)
├── server.js                # API Express
└── _redirects               # Routing frontend
```

## Problème métier

Les entreprises ont besoin d'analyser leurs taux d'impayés clients pour identifier les mauvais payeurs et optimiser leurs relances. Actuellement, les données sont dispersées et difficiles à analyser.

## Personas

- **Analyste financier** : Veut visualiser les tendances d'impayés et exporter des rapports
- **Responsable commercial** : Veut identifier les clients à risque et planifier des actions
- **Agent de recouvrement** : Veut relancer les mauvais payeurs avec des emails personnalisés

## Besoins fonctionnels

1. **Import de données** : Charger des fichiers de factures (CSV, Excel) pour analyse
2. **Tableau de bord** : Visualiser les KPIs clés (taux d'impayé, DSO, montants)
3. **Liste des factures** : Voir toutes les factures avec filtres et tri
4. **Fiche client** : Voir le détail d'un client et son historique d'impayés
5. **Détection anomalies** : Identifier automatiquement les clients à risque
6. **Export rapports** : Générer des rapports PDF/Excel des analyses
7. **Relances** : Envoyer des emails de relance personnalisés
8. **Blacklist** : Gérer les impayés exclus des relances

## Principes techniques

- Frontend 100% statique, pas de build step
- Communication via fetch() vers API REST
- Données persistantes en YAML avec locking
- Pas de base de données SQL/NoSQL externe
- Déploiement simple sur hosting static
