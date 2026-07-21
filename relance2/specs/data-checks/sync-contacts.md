# Data Check: sync-contacts.md

## Résumé
- Workflow analysé: sync-contacts.md
- Status: ✗ Problèmes trouvés
- Tables locales: 2 (contacts, events)
- Tables externes: 1 (_ADN_RG_Interlocuteur)

## Tables Locales (schema.sql)

### Table: `contacts`
| Colonne | Type | Usage | Existe |
|---------|------|-------|--------|
| id | TEXT | Clé primaire | ✓ |
| nom | TEXT | Mappé depuis `nom` + `prenom` | ✓ |
| prenom | TEXT | Mappé depuis `prenom` | ✓ |
| email | TEXT | Mappé depuis `email` | ✓ |
| telephone | TEXT | Mappé depuis `telephoneMobile` | ✓ |
| type | TEXT | - | ✓ |
| type_personne | TEXT | Mappé depuis `typePersonne` | ✓ |
| statut | TEXT | - | ✓ |
| is_blacklisted | INTEGER | - | ✓ |
| blacklist_date | TEXT | - | ✓ |
| blacklist_motif | TEXT | - | ✓ |
| civilite | TEXT | Mappé depuis `titre` | ✓ |
| code | TEXT | - | ✓ |
| activite_societe | TEXT | - | ✓ |
| adresse_rue | TEXT | Mappé depuis `adresse1` | ✓ |
| adresse_ville | TEXT | Mappé depuis `ville` | ✓ |
| adresse_code_postal | TEXT | Mappé depuis `codePostal` | ✓ |
| adresse_pays | TEXT | - | ✓ |
| notes | TEXT | - | ✓ |
| created_at | TEXT | - | ✓ |
| updated_at | TEXT | Mis à jour par le workflow | ✓ |
| externe_id | TEXT | Mappé depuis `idInterlocuteur` | ✓ |
| email_force | TEXT | - | ✓ |
| lastSyncAt | TEXT | Mis à jour par le workflow | ✓ |

### Table: `events`
| Colonne | Type | Usage | Existe |
|---------|------|-------|--------|
| id | TEXT | Clé primaire | ✓ |
| type | TEXT | Valeur 'sync' | ✓ |
| titre | TEXT | "Synchronisation contacts terminée" | ✓ |
| description | TEXT | Stats de la synchro | ✓ |
| entity_type | TEXT | - | ✓ |
| entity_id | TEXT | - | ✓ |
| read | INTEGER | - | ✓ |
| created_at | TEXT | - | ✓ |
| who_id | TEXT | FK vers contacts | ✓ |
| by_marki | INTEGER | Valeur 1 | ✓ |
| metadata | TEXT | JSON des stats | ✓ |
| icon | TEXT | 'fa-sync' | ✓ |

## Tables Externes (sync.db)

### Table: `_ADN_RG_Interlocuteur`
| Colonne | Type | Mapping local | Existe |
|---------|------|---------------|--------|
| idInterlocuteur | INTEGER | → contacts.externe_id | ✓ |
| typePersonne | TEXT | → contacts.type_personne | ✓ |
| nom | TEXT | → contacts.nom (combiné) | ✓ |
| prenom | TEXT | → contacts.prenom (combiné) | ✓ |
| email | TEXT | → contacts.email | ✓ |
| telephoneMobile | TEXT | → contacts.telephone | ✓ |
| titre | TEXT | → contacts.civilite | ✓ |
| adresse1 | TEXT | → contacts.adresse_rue | ✓ |
| codePostal | TEXT | → contacts.adresse_code_postal | ✓ |
| ville | TEXT | → contacts.adresse_ville | ✓ |
| dateMaj | TEXT | Utilisé pour filtre `since` | ✓ |

**Autres colonnes présentes mais non utilisées:**
- idSiteGestion, catInterlocuteur, code, codeICS, idQualite, adresse2, departement, idPays, telephoneFixe, telephoneIP, fax, siteWeb, txComDefaut, commentaire, origine, dateCre, dateSup, IdUserCre, idUserMaj, idUserSup, idOrigine, detailOrigine, idSdl, UpdateTime, InsertTime, idPub, datePub, statusPub, migratedData, idResponsable, isSync, isInactif, numAccreditation, heurePMDebut, heurePMFin, heureAMDebut, heureAMFin, discWebLabo, codExt, idSociete, isMailLabo, idGestionnaire, idDocumentAccreditation, codeExtDiag, infoBAN, isFactureHT, idExterne, idCompteWebA360, RPLS, siret, idCertifAdeme, codeCertifAdeme, nomCertifAdeme

## Mappings Identifiés

| Champ Local | Table Locale | Champ Externe | Table Externe | Validité |
|-------------|--------------|---------------|---------------|----------|
| externe_id | contacts | idInterlocuteur | _ADN_RG_Interlocuteur | ✓ OK |
| type_personne | contacts | typePersonne | _ADN_RG_Interlocuteur | ✓ OK |
| nom | contacts | nom + prenom | _ADN_RG_Interlocuteur | ✓ OK (concaténation) |
| prenom | contacts | prenom | _ADN_RG_Interlocuteur | ✓ OK |
| email | contacts | email | _ADN_RG_Interlocuteur | ✓ OK |
| telephone | contacts | telephoneMobile | _ADN_RG_Interlocuteur | ✓ OK |
| civilite | contacts | titre | _ADN_RG_Interlocuteur | ✓ OK |
| adresse_rue | contacts | adresse1 | _ADN_RG_Interlocuteur | ✓ OK |
| adresse_code_postal | contacts | codePostal | _ADN_RG_Interlocuteur | ✓ OK |
| adresse_ville | contacts | ville | _ADN_RG_Interlocuteur | ✓ OK |
| lastSyncAt | contacts | dateMaj (filtre) | _ADN_RG_Interlocuteur | ⚠️ Partiel (utilisé pour filtre, pas mappé) |
| source | contacts | N/A | N/A | ✗ N'EXISTE PAS |

## Vérifications Sync

- [✓] Mappings corrects - Tous les champs mappés existent dans les deux schémas
- [✓] Champs de sync présents - `externe_id` et `lastSyncAt` existent
- [✓] Types de données compatibles - TEXT ↔ TEXT, INTEGER ↔ TEXT (SQLite flexible)
- [✓] Gestion des conflits définie - Utilisation de COALESCE pour préserver les valeurs non-null
- [✗] Colonne `source` manquante - Le workflow tente de mettre à jour `source = 'sync_db'` mais cette colonne n'existe pas

## Problèmes Identifiés

### 1. CRITIQUE: Colonne `source` inexistante
**Description:** Le workflow exécute la requête SQL :
```sql
UPDATE contacts SET
    ...
    source = 'sync_db',
    ...
```

Mais la colonne `source` n'existe pas dans la table `contacts` du fichier `schema.sql`.

**Impact:** Erreur SQLite "no such column: source" lors de l'exécution du workflow.

**Solution recommandée:**
```sql
ALTER TABLE contacts ADD COLUMN source TEXT;
```

### 2. MOYEN: Champ `type` vs `type_personne`
**Description:** Le schéma contient deux champs : `type` et `type_personne`. Le workflow utilise uniquement `type_personne` ce qui est correct. Cependant, la présence de deux champs similaires peut prêter à confusion.

**Impact:** Faible - pas d'erreur mais risque de confusion.

### 3. FAIBLE: Date de sync vs dateMaj
**Description:** Le workflow met à jour `lastSyncAt` avec la date UTC actuelle (`datetime.utcnow().isoformat()`), mais ne stocke pas la valeur de `dateMaj` de la source externe. Cela pourrait empêcher une vérification de cohérence en cas de conflit.

**Impact:** Faible - le workflow fonctionne mais perd l'information de la date de modification source.

### 4. FAIBLE: Gestion des valeurs 'None'
**Description:** Le workflow nettoie les valeurs 'None' pour `email` et `telephone`, mais pas pour les autres champs (civilite, adresse, etc.).

**Impact:** Faible - risque de stocker des chaînes 'None' dans la base.

## Recommandations

1. **IMMÉDIAT:** Ajouter la colonne `source` à la table `contacts` dans `schema.sql`:
   ```sql
   ALTER TABLE contacts ADD COLUMN source TEXT;
   ```

2. **OPTIONNEL:** Standardiser le nettoyage des valeurs 'None' pour tous les champs:
   ```python
   def clean_none(value):
       return None if value == 'None' or value == '' else value
   ```

3. **OPTIONNEL:** Ajouter un index sur `externe_id` pour améliorer les performances:
   ```sql
   CREATE INDEX idx_contacts_externe_id ON contacts(externe_id);
   ```

4. **OPTIONNEL:** Stocker `dateMaj` externe dans un champ dédié (ex: `source_updated_at`) pour permettre une synchronisation incrémentale fiable.

## Synthèse des Conformités

| Aspect | Status |
|--------|--------|
| Structure tables locales | ✓ Conforme |
| Structure tables externes | ✓ Conforme |
| Mapping champs | ✓ Conforme |
| Champs sync (externe_id, lastSyncAt) | ✓ Conforme |
| Colonne `source` | ✗ Manquante |
| Requêtes SQL | ⚠️ Nécessite correction |
| Gestion erreurs | ✓ Conforme |

**Verdict global:** Le workflow nécessite une correction (ajout colonne `source`) avant de pouvoir fonctionner.
