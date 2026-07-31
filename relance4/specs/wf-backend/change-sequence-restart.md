# Workflow Backend : Change Sequence - Restart Mode

## Endpoint
`POST /api/impayes/:id/change-sequence`

## Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `sequence_id` | string | Oui | ID de la nouvelle séquence |
| `mode` | string | Oui | Valeur : `"restart"` |

## Description

Change la séquence d'un impayé et **recommence à zéro** :
1. Supprime toutes les relances **non envoyées** liées à cet impayé
2. Met à jour `sequence_id` dans la table `impayes`
3. Génère toutes les relances de la nouvelle séquence depuis le début (email_index 1 à N)

## Flow

### 1. Validation
```python
# Vérifier que l'impayé existe
impaye = db.execute("SELECT * FROM impayes WHERE id = ?", (impaye_id,)).fetchone()
if not impaye:
    return jsonify({'error': 'Impayé non trouvé'}), 404

# Vérifier que la séquence existe et est active
sequence = db.execute(
    "SELECT * FROM sequences WHERE id = ? AND actif = 1", 
    (sequence_id,)
).fetchone()
if not sequence:
    return jsonify({'error': 'Séquence invalide ou inactive'}), 400

# Vérifier que la séquence a des emails
emails_json = json.loads(sequence['emails_json'] or '[]')
if not emails_json:
    return jsonify({'error': 'Séquence sans emails configurés'}), 400
```

### 2. Suppression des relances non envoyées
```python
# Récupérer les IDs des relances liées à cet impayé et non envoyées
relances_to_delete = db.execute("""
    SELECT r.id 
    FROM relances r
    JOIN relance_impayes ri ON r.id = ri.relance_id
    WHERE ri.impaye_id = ?
      AND r.statut NOT IN ('Envoyée', 'annulee')
""", (impaye_id,)).fetchall()

deleted_count = len(relances_to_delete)

# Supprimer de relance_impayes puis de relances
for rel in relances_to_delete:
    db.execute("DELETE FROM relance_impayes WHERE relance_id = ?", (rel['id'],))
    db.execute("DELETE FROM relances WHERE id = ?", (rel['id'],))
```

### 3. Mise à jour de l'impayé
```python
db.execute("""
    UPDATE impayes 
    SET sequence_id = ?,
        updated_at = ?
    WHERE id = ?
""", (sequence_id, datetime.utcnow().isoformat(), impaye_id))
```

### 4. Génération des nouvelles relances

Pour chaque email dans `sequence.emails_json` :

```python
relances_created = 0
for email_config in emails_json:
    email_index = email_config['email_index']  # 1, 2, 3...
    delai = email_config['delai']  # jours après échéance
    
    # Récupérer le scénario actif (single, multiple, etc.)
    scenarios = email_config.get('scenarios', [])
    scenario_actif = next((s for s in scenarios if s.get('active')), scenarios[0] if scenarios else None)
    
    if not scenario_actif:
        continue
    
    # Calculer la date de programmation
    date_programmation = calculate_programmation_date(
        impaye['date_echeance'], 
        delai
    )
    
    # Créer la relance
    relance_id = f"rel_{uuid.uuid4()}"
    db.execute("""
        INSERT INTO relances (
            id, contact_id, sequence_id, statut, 
            date_programmation, sujet, corps,
            scenario, email_index, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        relance_id,
        impaye['payer_id'],  # contact_id = payeur
        sequence_id,
        'brouillon',
        date_programmation.isoformat() if date_programmation else None,
        scenario_actif['objet'],
        scenario_actif['corps'],
        scenario_actif['format'],  # 'single', 'multiple', etc.
        email_index,
        datetime.utcnow().isoformat(),
        datetime.utcnow().isoformat()
    ))
    
    # Lier à l'impayé
    db.execute("""
        INSERT INTO relance_impayes (relance_id, impaye_id)
        VALUES (?, ?)
    """, (relance_id, impaye_id))
    
    relances_created += 1
```

### 5. Création d'un événement
```python
event_id = f"evt_{datetime.utcnow().timestamp()}_sequence"
db.execute("""
    INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", (
    event_id,
    'sequence',
    f"Changement de séquence : {sequence['nom']}",
    f"Séquence changée en mode 'restart'. {relances_created} relance(s) créée(s). {deleted_count} ancienne(s) supprimée(s).",
    'impaye',
    impaye_id,
    datetime.utcnow().isoformat(),
    'fa-exchange-alt'
))
```

### 6. Commit et réponse
```python
db.commit()

return jsonify({
    'success': True,
    'message': 'Séquence mise à jour avec succès',
    'mode': 'restart',
    'relances_created': relances_created,
    'relances_deleted': deleted_count,
    'sequence': {
        'id': sequence_id,
        'nom': sequence['nom']
    }
}), 200
```

## Fonction utilitaire : calculate_programmation_date

```python
def calculate_programmation_date(date_echeance_str, delai_jours):
    """Calcule la date de programmation à partir de la date d'échéance et du délai."""
    if not date_echeance_str:
        return None
    
    try:
        date_echeance = datetime.fromisoformat(date_echeance_str.replace('Z', '+00:00'))
        date_prog = date_echeance + timedelta(days=delai_jours)
        return date_prog
    except:
        return None
```

## Tables concernées

| Table | Opération | Description |
|-------|-----------|-------------|
| `impayes` | UPDATE | Modification `sequence_id` |
| `relances` | DELETE | Suppression relances non envoyées |
| `relances` | INSERT | Création nouvelles relances |
| `relance_impayes` | DELETE | Suppression liaisons anciennes |
| `relance_impayes` | INSERT | Création liaisons nouvelles |
| `events` | INSERT | Log du changement |

## Response

### Succès (200)
```json
{
  "success": true,
  "message": "Séquence mise à jour avec succès",
  "mode": "restart",
  "relances_created": 9,
  "relances_deleted": 2,
  "sequence": {
    "id": "seq_abc123",
    "nom": "Séquence Standard"
  }
}
```

### Erreurs

| Code | Cas | Response |
|------|-----|----------|
| 400 | Séquence invalide | `{"error": "Séquence invalide ou inactive"}` |
| 400 | Séquence sans emails | `{"error": "Séquence sans emails configurés"}` |
| 404 | Impayé non trouvé | `{"error": "Impayé non trouvé"}` |
| 401 | Token invalide | `{"error": "Non autorisé"}` |
| 500 | Erreur serveur | `{"error": "Erreur interne"}` |

## Checkpoints

- @checkpoint impaye-verified : Impayé trouvé en base
- @checkpoint sequence-verified : Séquence valide et active
- @checkpoint old-relances-deleted : Anciennes relances non envoyées supprimées
- @checkpoint impaye-updated : Table impayes mise à jour avec nouvelle séquence
- @checkpoint relances-created : Nouvelles relances créées pour tous les emails
- @checkpoint event-logged : Événement de changement créé
- @checkpoint transaction-committed : Commit réussi

## Notes

- Les relances avec statut `Envoyée` ne sont jamais supprimées (historique conservé)
- Les relances `annulee` ne sont pas supprimées non plus
- Toutes les nouvelles relances sont créées en statut `brouillon`
- Le `email_index` stocké permet de retrouver quel email de la séquence correspond à la relance
