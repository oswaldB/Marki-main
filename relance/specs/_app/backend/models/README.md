# Modèles Backend ADTI

## Architecture

Les modèles sont désormais stockés en **Flat Files** (YAML) avec **LokiJS** pour l'indexation.

---

## Structure des données

```
backend/data/
├── payers/              # payer_{id}.yml
├── contacts/            # contact_{id}.yml
├── factures/            # facture_{id}.yml
├── impayes/             # impaye_{id}.yml
├── relances/            # relance_{id}.yml
├── sequences/           # sequence_{id}.yml
└── logs/                # log_{timestamp}.yml
```

---

## Modèles YAML (Flat Files)

| Modèle | Fichier | Description |
|--------|---------|-------------|
| [Payer](flat-files/README.md#payer) | `payer_{id}.yml` | Payeur/client |
| [Contact](flat-files/Contact.md) | `contact_{id}.yml` | Contact (email de relance) |
| [Facture](flat-files/README.md#facture) | `facture_{id}.yml` | Facture émise |
| [Impaye](flat-files/Impaye.md) | `impaye_{id}.yml` | Facture impayée |
| [Relance](flat-files/Relance.md) | `relance_{id}.yml` | Email de relance |
| [Sequence](flat-files/SequenceRelance.md) | `sequence_{id}.yml` | Séquence de relances |

Voir le dossier [flat-files/](flat-files/) pour la documentation complète.

---

## Anciens modèles (dépréciés)

Les modèles suivants utilisent l'ancienne architecture Parse et sont conservés pour référence :

- ~~Contact.md~~ → [flat-files/Contact.md](flat-files/Contact.md)
- ~~Impaye.md~~ → [flat-files/Impaye.md](flat-files/Impaye.md)
- ~~Relance.md~~ → [flat-files/Relance.md](flat-files/Relance.md)
- ~~SequenceRelance.md~~ → [flat-files/SequenceRelance.md](flat-files/SequenceRelance.md)

---

## Principes clés

1. **Un fichier = une entité** : Chaque entité a son propre fichier YAML
2. **ID numérique** : Les IDs sont des entiers auto-incrémentés
3. **Relations par ID** : Les références entre entités utilisent les ID (pas de pointers)
4. **Locking par fichier** : proper-lockfile gère les accès concurrents
5. **Index LokiJS** : Rebuild des indexes au démarrage du serveur

---

## Format YAML

Tous les fichiers suivent le même pattern :

```yaml
id: 1                          # ID numérique unique
type: "payer"                 # Type d'entité

# Champs métier...

# Métadonnées obligatoires
created_at: "2026-06-30T10:00:00Z"
updated_at: "2026-06-30T10:00:00Z"
```
