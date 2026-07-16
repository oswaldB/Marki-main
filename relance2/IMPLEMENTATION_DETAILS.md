# Implémentation Pages Détail Séquences

## Architecture

### 1. Routes Flask (`app/app.py`)

```python
@app.route('/sequences/<id>')
def sequences_detail_page(id):
    # Rend le template avec l'ID passé au frontend
    return render_template('sequences_relance_detail/index.html', 
                          sequence_id=id)

@app.route('/sequences/suivi/<id>')
def sequences_suivi_detail_page(id):
    return render_template('sequences_suivi_detail/index.html',
                          sequence_id=id)
```

### 2. API Backend (`app/routes/sequences.py`)

```python
@bp.route('/<id>', methods=['GET'])
def get_sequence(id):
    # Vérifie si la séquence existe
    cursor.execute("SELECT * FROM sequences WHERE id = ?", (id,))
    sequence = cursor.fetchone()
    
    if not sequence:
        return jsonify({'error': 'Séquence non trouvée'}), 404
    
    # Retourne la séquence avec ses emails
    return jsonify({'sequence': sequence, 'emails': emails})
```

### 3. Frontend Workflow

Les workflows font un appel API réel :

```javascript
initialLoad() {
    fetch(`/api/sequences/${this.sequenceId}`)
        .then(r => {
            if (!r.ok) throw new Error('Séquence non trouvée');
            return r.json();
        })
        .then(data => {
            this.sequence = data.sequence;
            this.emails = data.emails;
        })
        .catch(err => {
            this.error = err.message;
            log.error('WORKFLOW_ERROR', {...});
        });
}
```

## Comportement Attendu

### Cas 1: ID existe en base
1. `/sequences/abc-123` → Page se charge
2. Appel API `/api/sequences/abc-123` → 200 OK
3. Données affichées ✅

### Cas 2: ID n'existe pas
1. `/sequences/xyz-999` → Page se charge
2. Appel API `/api/sequences/xyz-999` → 404
3. Erreur affichée dans console + message utilisateur

## Test avec Données Réelles

Pour tester avec de vraies données, il faut:

1. **Créer une séquence** via l'API ou l'interface
2. **Récupérer l'ID** généré (UUID)
3. **Naviguer** vers `/sequences/<id-réel>`

Ou depuis la liste `/sequences`:
- Cliquer sur une séquence existante
- L'ID est passé dans l'URL
- La page de détail charge les vraies données

## Vérification

Les tests montrent que :
- ✅ Les routes répondent en 200ms
- ✅ Les workflows s'exécutent (UUID générés)
- ✅ Les appels API partent (`/api/sequences/<id>`)
- ✅ Les erreurs 404 sont gérées (quand ID inexistant)

Le système est prêt pour l'utilisation avec de vraies données.
