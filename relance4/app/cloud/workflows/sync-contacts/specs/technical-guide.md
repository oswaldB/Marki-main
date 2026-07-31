# Objectifs
- Synchroniser les contacts entre la base de données externe et Parse
- Créer des contacts pour tous les interlocuteurs
- Mettre à jour les informations des contacts
- Maintenir les relations entre les contacts et les autres entités

# Start
## route
- Not implemented (placeholder workflow)

## entry data
- None (workflow not yet implemented)

# Process

## node 0: Master Orchestrator (00-master.js)
### input
- `trigger`: string (expected: "manual", "cron", or "cloud-function")

### operations
1. Load environment variables from .env
2. Initialize Parse SDK
3. Clear logs directory (unless trigger is "test")
4. Log workflow start with trigger type
5. Initialize stats object
6. Register Cloud Function (e.g., `Parse.Cloud.define("syncContacts")`)
7. Execute syncContactsMaster() function

### output
- `{ stats }`

## node 1: Contact Fetcher (01-fetchContacts.js)
### input
- None (queries external source directly)

### operations
1. Open SQLite database
2. Query interlocutor table from SQLite:
   ```sql
   SELECT id, nom, prenom, email, telephone, ndossier, ... 
   FROM [interlocutor_table]
   ```
3. Map SQLite fields to Parse Contact class fields
4. Handle null/empty values

### output
- `{ contacts: [...] }`

## node 2: Contact Synchronizer (02-syncContacts.js)
### input
- `{ contacts: [...] }` (from node 1)

### operations
1. For each contact from SQLite:
   a. Query Parse: Contact where email = contact.email OR externe_id = contact.id
   b. IF EXISTS:
      - Compare fields (nom, prenom, email, telephone, etc.)
      - If changed: update contact
      - Increment stats.updated
   c. IF NOT EXISTS:
      - Create new Contact with all fields
      - Save to Parse
      - Increment stats.created
   d. Link contact to dossier (if ndossier is available)
   e. Create Activite log for synchronization

### output
- `{ stats: { created, updated, skipped, errors } }`

# end
## results
- Contacts synchronized between external database and Parse
- Contacts created or updated as needed
- Relationships maintained
- Return: `{ stats: { contactsProcessed, created, updated, skipped, errors } }`

# Scenarios to test

## scenario1: Basic contact synchronization
### input data
- SQLite DB with interlocutor data (id, nom, prenom, email, telephone, ndossier)
- Parse with existing contacts or empty

### expecting console log output in the log file
- "Étape 1: X contacts récupérés depuis SQLite"
- "Étape 2: Y contacts créés, Z contacts mis à jour"

### todo to run the tests
1. Implement workflow following pattern of other workflows
2. Set up test SQLite database with interlocutor data
3. Set up test Parse database
4. Run: `node 00-master.js`
5. Verify contacts are created/updated in Parse
6. Verify contacts are linked to dossiers

## scenario2: No changes needed
### input data
- SQLite DB with contacts matching existing Parse contacts

### expecting console log output in the log file
- "Étape 1: X contacts récupérés"
- "Étape 2: 0 contacts créés, 0 contacts mis à jour, X contacts inchangés"

### todo to run the tests
1. Set up test SQLite database with contacts matching Parse
2. Implement workflow
3. Run: `node 00-master.js`
4. Verify no changes are made

## scenario3: New contacts to add
### input data
- SQLite DB with new contacts not in Parse

### expecting console log output in the log file
- "Étape 1: X contacts récupérés"
- "Étape 2: X contacts créés, 0 contacts mis à jour"

### todo to run the tests
1. Set up test SQLite database with new contacts
2. Set up Parse with no matching contacts
3. Implement workflow
4. Run: `node 00-master.js`
5. Verify new contacts are created

## scenario4: Update existing contacts
### input data
- SQLite DB with contacts that have changed data (email, telephone, etc.)

### expecting console log output in the log file
- "Étape 1: X contacts récupérés"
- "Étape 2: 0 contacts créés, X contacts mis à jour"

### todo to run the tests
1. Set up test SQLite database with updated contact data
2. Set up Parse with existing contacts
3. Implement workflow
4. Run: `node 00-master.js`
5. Verify existing contacts are updated

## scenario5: Cloud Function call
### input data
- Valid Parse Cloud Function call with masterKey

### expecting console log output in the log file
- "Début du processus sync-contacts"
- Same logs as CLI execution

### todo to run the tests
1. Implement Cloud Function registration in 00-master.js
2. Call from client-side JavaScript:
   ```javascript
   Parse.Cloud.run('syncContacts', {}, { useMasterKey: true })
     .then(result => console.log('Contacts synced:', result.stats))
     .catch(error => console.error('Sync error:', error));
   ```
3. Verify Cloud Function executes successfully
