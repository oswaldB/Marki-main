# Workflow Backend : Change Sequence - Continue Mode

## Endpoint
`POST /api/impayes/:id/change-sequence`

## Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `sequence_id` | string | Oui | ID de la nouvelle séquence |
| `mode` | string | Oui | Valeur : `"continue"` |

## Description

Change la séquence d'un impayé en **continuant depuis la dernière relance envoyée** :
1. Supprime toutes les relances **non envoyées** liées à cet impayé
2. Met à jour `sequence_id` dans la table `impayes`
3. Trouve le **dernier email envoyé** (plus grand `email_index` envoyé)
4. Génère uniquement les relances pour les emails avec **index > dernier envoyé**
5. Ces nouvelles relances ont le statut **`refaire`** (pour indiquer qu'elles remplacent des relances manquées)

## Flow

### 1. Validation (identique à restart)
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

### 3. Détection du dernier email envoyé
```python
# Trouver le dernier email envoyé (max email_index avec statut 'Envoyée')
last_sent = db.execute("""
    SELECT MAX(r.email_index) as last_index
    FROM relances r
    JOIN relance_impayes ri ON r.id = ri.relance_id
    WHERE ri.impaye_id = ?
      AND r.statut = 'Envoyée'
      AND r.email_index IS NOT NULL
""", (impaye_id,)).fetchone()

last_sent_index = last_sent['last_index'] if last_sent and last_sent['last_index'] else 0

# Si aucun email n'a été envoyé, on commence depuis le début
# Mais on marque quand même les relances comme 'refaire' car c'est un changement de séquence
```

### 4. Mise à jour de l'impayé
```python
db.execute("""
    UPDATE impayes 
    SET sequence_id = ?,
        updated_at = ?
    WHERE id = ?
""", (sequence_id, datetime.utcnow().isoformat(), impaye_id))
```

### 5. Génération des relances manquantes (mode continue)

Pour chaque email dans `sequence.emails_json` **avec email_index > last_sent_index** :

```python
relances_created = 0
for email_config in emails_json:
    email_index = email_config['email_index']  # 1, 2, 3...
    
    # Ne créer que les relances APRÈS le dernier email envoyé
    if email_index <= last_sent_index:
        continue
    
    delai = email_config['delai']  # jours après échéance
    
    # Récupérer le scénario actif
    scenarios = email_config.get('scenarios', [])
    scenario_actif = next((s for s in scenarios if s.get('active')), scenarios[0] if scenarios else None)
    
    if not scenario_actif:
        continue
    
    # Calculer la date de programmation
    date_programmation = calculate_programmation_date(
        impaye['date_echeance'], 
        delai
    )
    
    # Créer la relance avec statut 'brouillon' (même en mode continue)
    relance_id = f"rel_{uuid.uuid4()}"
    db.execute("""
        INSERT INTO relances (
            id, contact_id, sequence_id, statut, 
            date_programmation, sujet, corps,
            scenario, email_index, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        relance_id,
        impaye['payer_id'],
        sequence_id,
        'brouillon',  # <-- STATUT brouillon pour les 2 modes
        date_programmation.isoformat() if date_programmation else None,
        scenario_actif['objet'],
        scenario_actif['corps'],
        scenario_actif['format'],
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

### 6. Création d'un événement
```python
event_id = f"evt_{datetime.utcnow().timestamp()}_sequence_continue"
description = f"Séquence changée en mode 'continue'. "
if last_sent_index > 0:
    description += f"Reprise après l'email {last_sent_index}. "
description += f"{relances_created} relance(s) créée(s). {deleted_count} ancienne(s) supprimée(s)."

db.execute("""
    INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", (
    event_id,
    'sequence',
    f"Changement de séquence : {sequence['nom']}",
    description,
    'impaye',
    impaye_id,
    datetime.utcnow().isoformat(),
    'fa-exchange-alt'
))
```

### 7. Commit et réponse
```python
db.commit()

return jsonify({
    'success': True,
    'message': 'Séquence mise à jour avec succès',
    'mode': 'continue',
    'last_sent_index': last_sent_index,
    'relances_created': relances_created,
    'relances_deleted': deleted_count,
    'sequence': {
        'id': sequence_id,
        'nom': sequence['nom']
    }
}), 200
```

## Cas particuliers

### Cas 1 : Aucun email encore envoyé
```python
last_sent_index = 0
# Tous les emails de la nouvelle séquence seront créés en statut 'refaire'
# Car c'est un changement de séquence, même si on recommence "à peu près" depuis le début
```

### Cas 2 : Tous les emails déjà envoyés
```python
last_sent_index = 9  # Si la séquence avait 9 emails par exemple
# La nouvelle séquence a aussi 9 emails (indices 1-9)
# Aucune relance ne sera créée car 1-9 <= 9
# relances_created = 0
```

### Cas 3 : Séquence précédente plus longue que la nouvelle
```python
# Ancienne séquence : 9 emails (1-9 envoyés)
# Nouvelle séquence : 5 emails (1-5)
# last_sent_index = 9
# Aucune relance créée car tous les indices (1-5) <= 9
# => Pas de relances futures pour cette séquence
```

### Cas 4 : Séquence précédente plus courte que la nouvelle
```python
# Ancienne séquence : 3 emails (1-3 envoyés)
# Nouvelle séquence : 9 emails (1-9)
# last_sent_index = 3
# Création des relances pour indices 4, 5, 6, 7, 8, 9
# => 6 relances créées en statut 'refaire'
```

## Tables concernées

| Table | Opération | Description |
|-------|-----------|-------------|
| `impayes` | UPDATE | Modification `sequence_id` |
| `relances` | DELETE | Suppression relances non envoyées |
| `relances` | INSERT | Création nouvelles relances avec statut `refaire` |
| `relance_impayes` | DELETE | Suppression liaisons anciennes |
| `relance_impayes` | INSERT | Création liaisons nouvelles |
| `events` | INSERT | Log du changement |

## Response

### Succès avec relances créées (200)
```json
{
  "success": true,
  "message": "Séquence mise à jour avec succès",
  "mode": "continue",
  "last_sent_index": 3,
  "relances_created": 6,
  "relances_deleted": 2,
  "sequence": {
    "id": "seq_abc123",
    "nom": "Séquence Contentieux"
  }
}
```

### Succès sans nouvelles relances (tous emails déjà envoyés) (200)
```json
{
  "success": true,
  "message": "Séquence mise à jour avec succès",
  "mode": "continue",
  "last_sent_index": 9,
  "relances_created": 0,
  "relances_deleted": 2,
  "sequence": {
    "id": "seq_abc123",
    "nom": "Séquence Standard"
  }
}
```

### Erreurs

Identiques au mode `restart` :

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
- @checkpoint last-sent-detected : Dernier email envoyé identifié (index={last_sent_index})
- @checkpoint old-relances-deleted : Anciennes relances non envoyées supprimées
- @checkpoint impaye-updated : Table impayes mise à jour avec nouvelle séquence
- @checkpoint missing-relances-created : Relances manquantes créées avec statut 'brouillon'
- @checkpoint event-logged : Événement de changement créé avec détails du mode
- @checkpoint transaction-committed : Commit réussi

## Différences avec le mode Restart

| Aspect | Restart | Continue |
|--------|---------|----------|
| Relances créées | Tous les emails (1 à N) | Emails > last_sent_index |
| Statut des relances | `brouillon` | `brouillon` |
| Cas "aucun email envoyé" | Crée tous les emails | Crée tous les emails |
| Événement | "N relances créées" | "Reprise après X, N relances créées" |
| Usage | Nouvelle stratégie | Reprise après interruption |

## Notes

- Les relances créées en mode "continue" ont le même statut `brouillon` que celles créées en mode "restart"
- La différence se fait uniquement sur le **nombre** de relances créées (pas sur le statut)
- Si `last_sent_index` = nombre total d'emails dans la nouvelle séquence, aucune relance n'est créée
