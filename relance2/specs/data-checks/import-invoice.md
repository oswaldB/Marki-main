# Data Check: import-invoice.md

## Résumé
- Workflow analysé: import-invoice.md
- Status: ✗ Problèmes trouvés
- Tables locales: 3 (contacts, impayes, sequences)
- Tables externes: 8 (_GCO__GcoPiece, _GCO__GcoPieceMetier, _ADN_DIAG__Dossier, _ADN_DIAG__StatutDossier, _ADN_RG_Employe, _ADN_RG_Interlocuteur, _ADN_DIAG__DossierInterlocuteur, _ADN_DIAG__RoleInterlocuteurDossier, _ADN_DIAG__Mission)
- **⚠️ Base externe corrompue**: sync.db est "malformed" - extraction partielle via strings

---

## Tables Locales (schema.sql)

| Table | Colonnes | Usage | Existe |
|-------|----------|-------|--------|
| contacts | 28+ | Stockage contacts importés | ✓ |
| impayes | 60+ | Stockage impayés créés/mis à jour | ✓ |
| sequences | 10+ | Séquences de relance pour attribution | ✓ |

### Colonnes utilisées dans contacts
- `id` (TEXT PRIMARY KEY) - Généré localement
- `nom`, `prenom`, `email`, `telephone` - Mapping depuis _ADN_RG_Interlocuteur
- `type_personne` - Mapping depuis typePersonne
- `statut` - Valeur fixe 'actif'
- `created_at`, `updated_at` - Générés localement
- `externe_id` - Stockage idInterlocuteur externe
- `lastSyncAt` - Timestamp de synchronisation

### Colonnes utilisées dans impayes
- `id` (TEXT PRIMARY KEY) - Généré localement
- `payer_id` (TEXT) - Référence contacts.id (non mappé dans le workflow)
- `contact_relance_id` (TEXT) - Référence contacts.id (non mappé)
- `nfacture` (TEXT) - Mapping depuis _GCO__GcoPiece.nfacture
- `date_echeance` (TEXT) - Mapping depuis _GCO__GcoPiece.dateecheance
- `montant_ttc` (REAL) - Mapping depuis _GCO__GcoPiece.totalttcnet
- `reste_a_payer` (REAL) - Mapping depuis _GCO__GcoPiece.resteapayer
- `statut` (TEXT) - Dérivé de _GCO__GcoPiece.facturesoldee
- `facture_soldee` (INTEGER) - Mapping depuis _GCO__GcoPiece.facturesoldee
- `numero_dossier` (TEXT) - Mapping depuis _ADN_DIAG__Dossier.numero
- `adresse_bien` (TEXT) - Concaténation adresse depuis _ADN_DIAG__Dossier
- `url_pdf` (TEXT) - Construit depuis refpiece + datecre
- `sequence_id` (TEXT) - Référence sequences.id (attribué à l'étape 6)
- `created_at`, `updated_at` - Générés localement

### Colonnes utilisées dans sequences
- `id` (TEXT PRIMARY KEY) - Référencé par impayes.sequence_id
- `nom`, `type_sequence`, `niveau` - Pour déterminer la séquence à attribuer
- `actif` - Pour filtrer séquences actives

---

## Tables Externes (sync.db)

| Table | Colonnes | Mapping local | Existe |
|-------|----------|---------------|--------|
| _GCO__GcoPiece | ~70 | impayes (données facture) | ✓ (extrait partiellement) |
| _GCO__GcoPieceMetier | 2 (idpiece, idmetier) | JOIN vers _ADN_DIAG__Dossier | ✓ |
| _ADN_DIAG__Dossier | ~100 | impayes (données dossier) | ✓ |
| _ADN_DIAG__StatutDossier | 6 | Mapping statut | ✓ |
| _ADN_RG_Employe | ~50 | Employé intervention | ✓ |
| _ADN_RG_Interlocuteur | ~40 | contacts (création) | ✓ |
| _ADN_DIAG__DossierInterlocuteur | ~20 | JOIN contacts-dossiers | ✓ |
| _ADN_DIAG__RoleInterlocuteurDossier | ~9 | Rôle des contacts | ✓ |
| _ADN_DIAG__Mission | ~50 | Missions JSON | ✓ |

---

## Mappings Identifiés

| Champ Local | Table Locale | Champ Externe | Table Externe | Validité |
|-------------|--------------|---------------|---------------|----------|
| contacts.nom | contacts | nom | _ADN_RG_Interlocuteur | ✓ |
| contacts.prenom | contacts | prenom | _ADN_RG_Interlocuteur | ✓ |
| contacts.email | contacts | email | _ADN_RG_Interlocuteur | ✓ |
| contacts.telephone | contacts | telephoneMobile | _ADN_RG_Interlocuteur | ✓ |
| contacts.type_personne | contacts | typePersonne | _ADN_RG_Interlocuteur | ✓ |
| contacts.externe_id | contacts | idInterlocuteur | _ADN_RG_Interlocuteur | ✓ |
| impayes.nfacture | impayes | nfacture | _GCO__GcoPiece | ✓ |
| impayes.date_echeance | impayes | dateecheance | _GCO__GcoPiece | ✓ |
| impayes.montant_ttc | impayes | totalttcnet | _GCO__GcoPiece | ✓ |
| impayes.reste_a_payer | impayes | resteapayer | _GCO__GcoPiece | ✓ |
| impayes.facture_soldee | impayes | facturesoldee | _GCO__GcoPiece | ✓ |
| impayes.statut | impayes | facturesoldee | _GCO__GcoPiece | ✓ (dérivé) |
| impayes.numero_dossier | impayes | numero | _ADN_DIAG__Dossier | ✓ |
| impayes.id_dossier | impayes | idDossier | _ADN_DIAG__Dossier | ✓ |
| impayes.adresse_bien | impayes | adresse, codePostal, ville | _ADN_DIAG__Dossier | ✓ (concaténation) |
| impayes.url_pdf | impayes | refpiece, datecre | _GCO__GcoPiece | ✓ (construction) |
| impayes.employe_intervention | impayes | idEmployeIntervention | _ADN_DIAG__Dossier | ✓ |
| impayes.commentaire_dossier | impayes | commentaire | _ADN_DIAG__Dossier | ✓ |
| impayes.commentaire_piece | impayes | commentaire | _GCO__GcoPiece | ✓ |
| impayes.reference | impayes | reference | _ADN_DIAG__Dossier | ✓ |
| impayes.reference_externe | impayes | referenceExterne | _ADN_DIAG__Dossier | ✓ |
| impayes.etage | impayes | etage | _ADN_DIAG__Dossier | ✓ |
| impayes.entree | impayes | entree | _ADN_DIAG__Dossier | ✓ |
| impayes.escalier | impayes | escalier | _ADN_DIAG__Dossier | ✓ |
| impayes.porte | impayes | porte | _ADN_DIAG__Dossier | ✓ |
| impayes.numero_lot | impayes | numeroLot | _ADN_DIAG__Dossier | ✓ |
| impayes.statut_dossier | impayes | intitule (via idStatut) | _ADN_DIAG__StatutDossier | ✓ (JOIN requis) |
| impayes.cadre_mission | impayes | idCadreMission | _ADN_DIAG__Dossier | ✓ |
| impayes.date_piece | impayes | datepiece | _GCO__GcoPiece | ✓ |
| impayes.total_ht | impayes | totalhtnet | _GCO__GcoPiece | ✓ |

---

## Vérifications Sync

### ⚠️ Mappings corrects
- [ ] **PROBLÈME**: Le mapping `interloc.idInterlocuteur` est utilisé comme clé mais `existingMap.get(interloc.idInterlocuteur)` recherche sur `id` alors que `existingMap` est construit avec `[c.id, c]`
- [ ] Le workflow ne définit pas comment `payer_id` est déterminé (commenté "à mapper depuis interlocuteurs")
- [ ] Le workflow ne définit pas comment `contact_relance_id` est déterminé

### ⚠️ Champs de sync présents
- [x] `impayes.nfacture` + `impayes.numero_dossier` comme clé composite pour dédoublonnage
- [x] `contacts.externe_id` pour stocker l'ID externe
- [x] `impayes.updated_at` pour tracking des modifications
- [ ] **MANQUANT**: Champ `last_sync_at` sur impayes pour tracking synchro
- [ ] **MANQUANT**: Champ `source` pour identifier l'origine des données

### ⚠️ Types de données compatibles
- [x] INTEGER externes → TEXT locales (idpiece, idDossier)
- [x] TEXT dates externes → TEXT locales (ISO 8601)
- [x] REAL montants → REAL locales
- [x] INTEGER booléens → INTEGER locales (0/1)
- [ ] **ATTENTION**: `nfacture` est INTEGER externe mais utilisé comme TEXT local (conversion implicite)

### ⚠️ Gestion des conflits définie
- [ ] **NON DÉFINI**: Stratégie de résolution si même facture modifiée localement et externement
- [ ] **NON DÉFINI**: Gestion des suppressions logiques (datesup externe)
- [x] Upsert basé sur nfacture + numero_dossier

---

## Problèmes Identifiés

### 🔴 CRITIQUE: Base de données externe corrompue
```
Error: database disk image is malformed
```
- La base sync.db ne peut pas être ouverte normalement
- Les schémas sont extraits partiellement via `strings`
- Le workflow risque d'échouer à l'exécution

### 🟠 MAJEUR: Clé de synchronisation manquante
Dans le code workflow:
```javascript
const existingMap = new Map(existingContacts.data.map(c => [c.id, c]));
//...
const existing = existingMap.get(interloc.idInterlocuteur); // ❌ Cherche idInterlocuteur dans Map d'IDs internes
```
**Problème**: La Map utilise `c.id` (ID interne Marki) mais on recherche `interloc.idInterlocuteur` (ID externe)

**Correction suggérée**:
```javascript
const existingMap = new Map(existingContacts.data.map(c => [c.externe_id, c]));
//...
const existing = existingMap.get(String(interloc.idInterlocuteur));
```

### 🟠 MAJEUR: Références non résolues
- `impayeData.payer_id` est mis à `null` sans explication
- `impayeData.contact_relance_id` est mis à `null` sans explication
- Le workflow mentionne "mapping depuis interlocuteurs" mais ne l'implémente pas

### 🟡 MINEUR: Inconsistance nommage
- Champ externe: `numeroLot` → Champ local: `numero_lot` (OK)
- Champ externe: `idCadreMission` → Champ local: `cadre_mission` (perte du préfixe id)
- Champ externe: `codePostal` → Champ local non défini (adresse_bien concaténée)

### 🟡 MINEUR: URL PDF fragile
```javascript
return `/ADN/Reporting/Gco/Piece/${year}/${month}/${refClean}/standard/${refPiece} (GCO PI FA).pdf`;
```
- Chemin hardcodé
- Espace dans le nom de fichier non-échappé
- Aucune vérification d'existence du fichier

---

## Recommandations

### Immédiates (bloquantes)
1. **Réparer ou recréer sync.db** - La corruption empêchera toute exécution
2. **Corriger le mapping des contacts** - Utiliser `externe_id` comme clé de recherche
3. **Définir la logique payer_id/contact_relance_id** - Qui est le payeur ? Qui relance ?

### Court terme
4. **Ajouter des champs de traçabilité**:
   - `impayes.source` = 'sync_db'
   - `impayes.external_id` = idpiece externe
   - `impayes.last_sync_at`
   - `contacts.lastSyncAt` existe mais n'est pas mis à jour dans le workflow

5. **Gérer les suppressions** - Vérifier `datesup` dans _GCO__GcoPiece pour ignorer/supprimer

6. **Valider les données**:
   - Vérifier `resteapayer >= 0` avant import
   - Vérifier `valide = 1` (déjà fait)
   - Vérifier `nfacture IS NOT NULL` (déjà fait)

### Long terme
7. **Implémenter une table de mapping** pour tracer les relations externe↔interne
8. **Ajouter un mécanisme de soft-delete** plutôt que hard delete
9. **Créer une table sync_log** pour tracer les imports (succès/échecs)
10. **Tests unitaires** sur les fonctions de mapping de données

---

## Annexes

### Tables externes détaillées

#### _GCO__GcoPiece (colonnes clés identifiées)
- `idpiece` INTEGER (PK)
- `datecre`, `datemaj` TEXT
- `datepiece`, `dateecheance` TEXT
- `refpiece`, `nfacture` INTEGER/TEXT
- `totalhtnet`, `totalttcnet`, `resteapayer` REAL
- `facturesoldee`, `valide` INTEGER
- `commentaire` TEXT

#### _ADN_DIAG__Dossier (colonnes clés identifiées)
- `idDossier` INTEGER (PK)
- `numero` INTEGER/TEXT
- `reference`, `referenceExterne` TEXT
- `idStatut` INTEGER → FK _ADN_DIAG__StatutDossier
- `contactPlace`, `commentaire` TEXT
- `adresse`, `codePostal`, `ville` TEXT
- `numeroLot`, `etage`, `entree`, `escalier`, `porte` TEXT
- `idEmployeIntervention` INTEGER
- `idCadreMission` TEXT
- `dateDebutMission` TEXT

#### _ADN_RG_Interlocuteur (colonnes clés identifiées)
- `idInterlocuteur` INTEGER (PK)
- `typePersonne`, `nom`, `prenom` TEXT
- `email`, `telephoneMobile` TEXT

#### _ADN_DIAG__DossierInterlocuteur (colonnes clés identifiées)
- `idInterlocuteur` INTEGER → FK _ADN_RG_Interlocuteur
- `idDossier` INTEGER → FK _ADN_DIAG__Dossier
- `idRole` INTEGER → FK _ADN_DIAG__RoleInterlocuteurDossier
- `typePersonne`, `nom`, `prenom`, `email`, `telephoneMobile` TEXT

---

*Rapport généré le: 2025-01-21*
*Source: Analyse du workflow import-invoice.md et extraction partielle de sync.db*
