# Mise à jour du workflow import-invoice

## Ajout de la gestion des relations entre contacts (personne-entreprise)

### Changements apportés

#### 1. Étape 4 enrichie : Création des relations

La fonction `etape_4_creer_contacts()` a été mise à jour pour :
- Créer/mettre à jour les contacts (existant)
- **Créer les relations entre contacts** (nouveau)

**Source des relations :** Table `_ADN_RG_RelInterlocuteurContact` de sync.db

**Processus :**
```
1. Récupérer les interlocuteurs du dossier (existant)
2. Récupérer les relations depuis _ADN_RG_RelInterlocuteurContact (nouveau)
3. Pour chaque relation valide (dateFin IS NULL) :
   - Vérifier que les deux contacts existent dans marki.db
   - Créer le contact cible s'il n'existe pas
   - Créer l'entrée dans contact_relations
```

#### 2. Nouvelle fonction `mapper_fonction_to_type_relation()`

Mappe les fonctions de sync.db vers les types de relations Marki :
- `DG`, `Directeur Général` → `dg`
- `Comptable` → `responsable_comptable`
- `Gérant` → `gerant`
- `Président` → `president`
- `Employé`, `Salarié` → `employe`
- etc.

#### 3. Stats enrichies

Le résultat inclut maintenant :
```python
{
    'contacts_created': int,
    'contacts_updated': int,
    'relations_created': int,  # NOUVEAU
    'relations_updated': int,    # NOUVEAU
    'impayes_created': int,
    'impayes_updated': int
}
```

#### 4. Tables utilisées

| Table sync.db | Utilisation |
|---------------|-------------|
| `_ADN_RG_Interlocuteur` | Contacts source et cible |
| `_ADN_RG_RelInterlocuteurContact` | Liens personne-entreprise |
| `_ADN_DIAG__DossierInterlocuteur` | Interlocuteurs du dossier (existant) |

| Table marki.db | Utilisation |
|----------------|-------------|
| `contacts` | Création/mise à jour des contacts |
| `contact_relations` | Création/mise à jour des relations (NOUVEAU) |

### Exemple de workflow complet

Pour chaque facture importée :
1. Récupérer les pièces et dossiers
2. Récupérer les interlocuteurs du dossier
3. Créer/mettre à jour les contacts dans `contacts`
4. Récupérer les relations depuis `_ADN_RG_RelInterlocuteurContact`
5. Créer/mettre à jour les entrées dans `contact_relations`
6. Créer/mettre à jour les impayés
7. Logger les événements (contacts + relations + impayés)

### Mapping relation

```sql
-- Dans sync.db
SELECT idInterlocuteur, idContact, fonction 
FROM _ADN_RG_RelInterlocuteurContact
-- idInterlocuteur = personne physique (source)
-- idContact = entreprise (cible)

-- Crée dans marki.db
INSERT INTO contact_relations 
(contact_source_id, contact_cible_id, type_relation, est_actif)
VALUES 
('cont_{idInterlocuteur}', 'cont_{idContact}', 'dg', 1)
```
