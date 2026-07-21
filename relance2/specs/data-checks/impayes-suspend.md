# Data Check: impayes-suspend.md

## Résumé
- **Workflow analysé**: `impayes-suspend.md`
- **Status**: ✓ Cohérent (avec réserves sur les mappings)
- **Tables locales**: 2 tables principales (`impayes`, `relances`)
- **Tables externes**: 3 tables pertinentes (`_ADN_RG_Contact`, `_GCO__GcoPiece`, `_GCO__GcoPieceRelance`)

---

## Tables Locales (schema.sql)

| Table | Colonnes Utilisées | Usage | Existe |
|-------|-------------------|-------|--------|
| `impayes` | `id`, `is_blacklisted`, `blacklist_date`, `blacklist_motif`, `contact_relance_id` | Lecture/Modification suspension | ✓ |
| `relances` | `statut`, `updated_at`, `contact_id` | Mise à jour statut relances | ✓ |
| `contacts` | `id` (référencé par FK) | Clé étrangère pour `contact_relance_id` | ✓ |

### Détail Table `impayes` (schema.sql)

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (imp_xxx) |
| `is_blacklisted` | INTEGER | DEFAULT 0 | Flag de suspension |
| `blacklist_date` | TEXT | - | Date ISO de suspension |
| `blacklist_motif` | TEXT | - | Motif textuel |
| `contact_relance_id` | TEXT | FK → contacts(id) | Contact à relancer |
| `nfacture` | TEXT | NOT NULL | N° facture liée |

### Détail Table `relances` (schema.sql)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | PRIMARY KEY |
| `contact_id` | TEXT | FK → contacts(id) |
| `statut` | TEXT | 'brouillon', 'pret pour envoi', 'planifiee', 'annulee' |
| `updated_at` | TEXT | Timestamp modification |

### Détail Table `contacts` (schema.sql)

| Colonne | Type | Notes Sync |
|---------|------|------------|
| `id` | TEXT | PRIMARY KEY local |
| `externe_id` | TEXT | **Champ de mapping vers sync.db** |
| `lastSyncAt` | TEXT | **Champ de synchronisation** |
| `is_blacklisted` | INTEGER | Sync bidirectionnel possible |

---

## Tables Externes (sync.db)

| Table | Colonnes Clés | Mapping Local | Existe |
|-------|---------------|---------------|--------|
| `_ADN_RG_Contact` | `idInterlocuteur`, `code`, `nom`, `prenom`, `email`, `UpdateTime`, `InsertTime`, `isSync` | `contacts.externe_id` | ✓ |
| `_GCO__GcoPiece` | `idpiece`, `nfacture`, `resteapayer`, `facturesoldee`, `dateecheance` | `impayes.nfacture` | ✓ |
| `_GCO__GcoPieceRelance` | `idrelance`, `idpiece`, `daterelance`, `niveau` | Pas de table locale équivalente directe | ✓ |

### Détail Table `_ADN_RG_Contact` (sync.db)

| Colonne | Type | Mapping Proposé |
|---------|------|-----------------|
| `idInterlocuteur` | INTEGER | `contacts.externe_id` |
| `code` | TEXT | `contacts.code` |
| `nom` | TEXT | `contacts.nom` |
| `prenom` | TEXT | `contacts.prenom` |
| `email` | TEXT | `contacts.email` |
| `isSync` | INTEGER | Flag de synchronisation |
| `UpdateTime` | TEXT | Contrôle de fraîcheur |
| `InsertTime` | TEXT | Date création externe |

### Détail Table `_GCO__GcoPiece` (sync.db)

| Colonne | Type | Mapping Proposé |
|---------|------|-----------------|
| `idpiece` | INTEGER | Clé primaire externe |
| `nfacture` | INTEGER | `impayes.nfacture` (TEXT vs INTEGER ⚠️) |
| `resteapayer` | REAL | `impayes.reste_a_payer` |
| `facturesoldee` | INTEGER | `impayes.facture_soldee` |
| `dateecheance` | TEXT | `impayes.date_echeance` |

### Détail Table `_GCO__GcoPieceRelance` (sync.db)

| Colonne | Type | Notes |
|---------|------|-------|
| `idrelance` | INTEGER | Clé primaire |
| `idpiece` | INTEGER | FK → _GCO__GcoPiece |
| `daterelance` | TEXT | Date de relance |
| `niveau` | INTEGER | Niveau de relance (1, 2, 3...) |
| `validation` | INTEGER | État de validation |

---

## Mappings Identifiés

| Champ Local | Table Locale | Champ Externe | Table Externe | Validité |
|-------------|--------------|---------------|---------------|----------|
| `externe_id` | `contacts` | `idInterlocuteur` | `_ADN_RG_Contact` | ✓ Type compatible (TEXT/INTEGER) |
| `nfacture` | `impayes` | `nfacture` | `_GCO__GcoPiece` | ⚠️ Type diffère (TEXT vs INTEGER) |
| `reste_a_payer` | `impayes` | `resteapayer` | `_GCO__GcoPiece` | ✓ Types REAL compatibles |
| `facture_soldee` | `impayes` | `facturesoldee` | `_GCO__GcoPiece` | ✓ INTEGER = INTEGER |
| `date_echeance` | `impayes` | `dateecheance` | `_GCO__GcoPiece` | ✓ TEXT ISO compatible |
| `lastSyncAt` | `contacts` | `UpdateTime` | `_ADN_RG_Contact` | ✓ Format TEXT ISO |

---

## Vérifications Sync

- [x] **Mappings corrects** - Les champs de mapping existent (`externe_id`, `lastSyncAt`)
- [x] **Champs de sync présents** - `lastSyncAt` sur `contacts`, `UpdateTime`/`InsertTime`/`isSync` externes
- [⚠️] **Types de données compatibles** - `nfacture` (TEXT local vs INTEGER externe) nécessite conversion
- [?] **Gestion des conflits définie** - Non documentée dans le workflow

---

## Problèmes Identifiés

### 1. Type de données `nfacture` ⚠️
- **Local**: `impayes.nfacture` → `TEXT` (défini comme `TEXT NOT NULL`)
- **Externe**: `_GCO__GcoPiece.nfacture` → `INTEGER`
- **Impact**: Risque de mismatch lors des jointures/filtres
- **Recommandation**: Convertir en TEXT côté externe ou ajouter cast explicite

### 2. Absence de table `relances` externe directe ⚠️
- La table locale `relances` semble être une table applicative pure
- `_GCO__GcoPieceRelance` existe mais structure différente (niveau, validation)
- **Impact**: Les relances locales ne sont pas synchronisées vers l'externe

### 3. Workflow SQLite uniquement ⚠️
- Le code workflow ne montre aucune interaction avec `sync.db`
- Toutes les opérations sont en local (`backend/data/marki.db`)
- **Question**: La sync est-elle gérée par un processus externe (cron, trigger) ?

### 4. Champ `contact_relance_id` - Mapping incertain ❓
- Référence `contacts.id` localement
- Pas de mapping explicite vers `_ADN_RG_Contact.idInterlocuteur` dans le workflow
- Doit passer par `contacts.externe_id`

---

## Recommandations

1. **Standardiser `nfacture`**: Uniformiser en TEXT des deux côtés pour éviter les erreurs de jointure

2. **Documenter la stratégie de sync**: Ajouter dans le workflow la mention du processus de synchronisation (synchrone/asynchrone)

3. **Ajouter logs de sync**: Pour tracer les modifications `is_blacklisted` vers l'externe

4. **Vérifier la cohérence après suspension**: 
   ```sql
   -- Requête de vérification post-sync
   SELECT i.id, i.is_blacklisted, i.contact_relance_id, 
          c.externe_id, rc.idInterlocuteur
   FROM impayes i
   JOIN contacts c ON i.contact_relance_id = c.id
   LEFT JOIN sync._ADN_RG_Contact rc ON c.externe_id = rc.idInterlocuteur
   WHERE i.is_blacklisted = 1;
   ```

5. **Considérer un flag `sync_status`** sur la table `impayes` pour tracker l'état de synchronisation

---

## Conclusion

Le workflow `impayes-suspend.md` est **fonctionnellement cohérent** avec le schéma local. Cependant, l'intégration avec `sync.db` n'est pas explicite dans le code du workflow (opérations SQLite uniquement sur `marki.db`).

La synchronisation semble être gérée par un mécanisme externe (non documenté dans ce workflow). Les structures de données sont globalement compatibles, avec seulement un avertissement sur le type `nfacture`.

**Niveau de risque**: 🟡 Moyen (types incompatibles, sync implicite)
