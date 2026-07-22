
## Mise à jour du workflow sync-contacts

### Nouvelle Étape 4 : Synchronisation des Relations (personne-entreprise)

**Table source sync.db:** `_ADN_RG_RelInterlocuteurContact`

Cette table lie les interlocuteurs (personnes physiques) aux contacts (entreprises).

**Mapping:**
- `idInterlocuteur` → `contact_source_id` (personne physique)
- `idContact` → `contact_cible_id` (entreprise)
- `fonction` → `type_relation` (via mapping)

**Types de relations mappés:**
- `fonction` contient "DG" → `type_relation = 'dg'`
- `fonction` contient "Comptable" → `type_relation = 'responsable_comptable'`
- `fonction` contient "Gérant" → `type_relation = 'gerant'`
- `fonction` contient "Président" → `type_relation = 'president'`
- etc.

**Process:**
1. Récupérer toutes les relations depuis `_ADN_RG_RelInterlocuteurContact` où `dateFin IS NULL`
2. Pour chaque relation, vérifier que les deux contacts existent dans marki.db (via `externe_id`)
3. Créer ou mettre à jour l'entrée dans `contact_relations`

**Tables utilisées:**
| Table | Description |
|-------|-------------|
| `_ADN_RG_Interlocuteur` | Contacts source (personnes physiques) |
| `_ADN_RG_RelInterlocuteurContact` | Liens personne-entreprise |
| `contact_relations` | Table Marki des relations |
