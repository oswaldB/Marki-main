# Objectifs
- Importer les factures et dossiers depuis la base de données SQLite externe vers Parse
- Créer les contacts avec les bonnes relations
- Traiter et sauvegarder les factures dans Parse
- Attribuer les séquences aux factures
- Déclencher la génération des relances pour les factures sans relance

# Start
## route
- Cloud Function: `Parse.Cloud.run("triggerImportInvoices")`
- CLI: `node 00-master.js`
- Programmatic: `require('./import-invoice/00-master')`

## entry data
- None (autonomous workflow)
- Requires: `masterKey` OR authenticated `user`

# Process

## node 0: Master Orchestrator (00-master.js)
### input
- `trigger`: string (default: "manual")

### operations
1. Load environment variables from .env
2. Initialize Parse SDK (if not already initialized)
3. If trigger !== "test": clearLogs()
4. Log workflow start with trigger type
5. Initialize stats object:
   ```javascript
   stats = { 
     errors: [], 
     total: { startedAt, finishedAt, durationMs },
     etape1: {}, etape2: {}, etape3: {}, etape4: {}, etape5: {}, etape6: {}, etape7: {}, etape8: {}
   }
   ```
6. Execute importInvoicesMaster() function
7. Register Cloud Function: `Parse.Cloud.define("triggerImportInvoices")`

### output
- `{ stats }`

## node 1: Fetch Invoices & Folders (01-fetchPiecesAndDossiers.js)
### input
- None

### operations
1. Open SQLite database at /home/arthur/adti/sync.db (or TEST_DB_PATH if NODE_ENV=test)
2. Query _GCO__GcoPiece table:
   ```sql
   SELECT * FROM _GCO__GcoPiece
   WHERE facturesoldee = 0 OR resteapayer > 0
   ```
3. Query _GCO__GcoDossier table:
   ```sql
   SELECT * FROM _GCO__GcoDossier
   ```
4. Map data: pieces array, dossiers array
5. Link invoices to folders

### output
- `{ pieces: [...], dossiers: [...] }`

## node 2: Fetch Statuses (02-fetchStatuts.js)
### input
- None

### operations
1. Query status table from SQLite:
   ```sql
   SELECT code, libelle FROM [status_table]
   ```
2. Create statutsMap: { code1: libelle1, code2: libelle2, ... }

### output
- `{ statutsMap: {...} }`

## node 3: Fetch Employees (03-fetchEmployes.js)
### input
- None

### operations
1. Query employee table from SQLite:
   ```sql
   SELECT id, nom, prenom, email, ... FROM [employee_table]
   ```
2. Create employesMap: { id1: {nom, prenom, email, ...}, ... }

### output
- `{ employesMap: {...} }`

## node 4: Fetch Interlocutors (04-fetchInterlocuteurs.js)
### input
- `{ pieces: [...] }` (from node 1)

### operations
1. Query interlocutor table from SQLite:
   ```sql
   SELECT * FROM [interlocutor_table]
   WHERE ndossier IN (dossier_ids_from_pieces)
   ```
2. Group interlocutors by dossier:
   ```javascript
   interlocuteursByDossier = {
     dossierId1: [{interlocutor1}, {interlocutor2}, ...],
     dossierId2: [{interlocutor1}, ...],
     ...
   }
   ```

### output
- `{ interlocuteursByDossier: {...} }`

## node 4.5: Create Contacts (04-createContactsWithRelations.js)
### input
- `{ interlocuteursByDossier: {...} }` (from node 4)

### operations
1. For each dossier and its interlocutors:
   a. For each interlocutor:
      - Query Parse: Contact where email = interlocutor.email
      - IF EXISTS: use existing contact
      - IF NOT EXISTS: create new Contact with: nom, prenom, email, telephone, etc.
      - Save to Parse
   b. Link contact to dossier
2. Link employees to companies (if applicable)

### output
- `{ contactsMap: {contactId: contactObject, ...}, stats: {...} }`

## node 5: Process & Save Invoices (05-processAndSaveImpayes.js)
### input
- `{ pieces: [...], statutsMap: {...}, employesMap: {...}, interlocuteursByDossier: {...}, contactsMap: {...} }`

### operations
1. For each invoice in pieces:
   a. Query Parse: Impaye where externe_id = invoice.nfacture
      - IF EXISTS: existingImpaye = result
      - IF NOT EXISTS: existingImpaye = null
   b. Transform SQLite data to Parse format:
      - Map fields: nfacture -> numero, ndossier -> dossier, etc.
      - Convert dates to Date objects
      - Convert amounts to numbers
      - Map status using statutsMap
      - Link to contact from contactsMap
      - Link to dossier
      - Link to employee from employesMap (if applicable)
   c. Set payment status:
      - facture_soldee = (invoice.facturesoldee === 1)
      - solde = (invoice.resteapayer === 0)
   d. IF existingImpaye:
      - Update fields if changed
      - Save to Parse: impaye.save()
      - Increment stats.impayes_updated
   e. ELSE:
      - Create new Impaye with transformed data
      - Save to Parse: impaye.save()
      - Increment stats.impayes_created
   f. Create Activite log:
      - type: "import" or "update"
      - operation: "invoice_imported" or "invoice_updated"
      - nfacture: invoice.nfacture
      - impaye_id: impaye.id
      - timestamp: new Date()
      - Save to Parse

### output
- `{ stats: { impayes_created, impayes_updated, impayes_skipped, errors } }`

## node 6: Assign Sequences (06-assignSequences.js)
### input
- None (queries Parse directly)

### operations
1. Query Impaye from Parse:
   - where: `{ sequence: null OR undefined }`
   - where: `{ facture_soldee: false, solde: false }`
   - limit: high (all unassigned unpaid invoices)

2. For each unassigned impaye:
   a. Call appliquerReglesAttributionAutomatique(impaye) from appliquer-regles-attribution workflow
   b. IF returns sequence:
      - Set impaye.sequence = sequence
      - Save to Parse: impaye.save()
      - Increment stats.sequencesAttribuees
   c. ELSE:
      - Increment stats.impayesTraites (but no sequence)

### output
- `{ stats: { impayesTraites, sequencesAttribuees, erreurs } }`

## node 7: Fetch Invoices with Sequence (07-fetchImpayesWithSequence.js)
### input
- None (queries Parse directly)

### operations
1. Query Impaye from Parse:
   - where: `{ sequence: exists (not null) }`
   - where: `{ facture_soldee: false, solde: false }`
   - include: `["sequence"]`
   - limit: high

2. For each impaye with sequence:
   a. Query Relance for this impaye:
      - where: `{ impayes: contains impaye.id }`
      - IF EXISTS: hasRelance = true
      - IF NOT EXISTS: hasRelance = false
   b. Categorize:
      - IF hasRelance: add to avecRelance array
      - ELSE: add to sansRelance array

### output
- `{ stats: { sansRelance: number, avecRelance: number }, sansRelance: [impaye1, impaye2, ...], avecRelance: [{ impaye: impayeObject, relance: relanceObject }, ...] }`

## node 8: Generate Reminders (External Call)
### input
- `{ sansRelance: [impaye1, impaye2, ...], avecRelance: [{ impaye: impayeObject, relance: relanceObject }, ...] }`

### operations
1. Call Parse.Cloud.run("generateRelances", params, {useMasterKey: true})
   - params = {
       sansRelanceIds: sansRelance.map(i => i.id),
       avecRelance: avecRelance.map(r => ({
         impayeId: r.impaye?.id || r.impaye,
         relanceId: r.relance?.id
       }))
     }
2. Handle result:
   - IF SUCCESS: stats.generateRelances = result.stats
   - IF ERROR: catch error and add to stats.errors

### output
- `stats.generateRelances = { ... }`

# end
## results
- All invoices imported from SQLite to Parse
- Contacts created/updated
- Sequences assigned
- Reminders generated for invoices without them
- Return: `{ stats: { errors, total, etape1, etape2, etape3, etape4, etape5, etape6, etape7, generateRelances } }`

# Scenarios to test

## scenario1: Complete import with new invoices
### input data
- SQLite DB with unpaid invoices (facturesoldee=0 OR resteapayer>0)
- SQLite DB with corresponding folders, statuses, employees, interlocutors
- Parse with no matching Impaye objects

### expecting console log output in the log file
- "Étape 1: X pièces et Y dossiers récupérés"
- "Étape 2: Z statuts récupérés"
- "Étape 3: A employés récupérés"
- "Étape 4: B interlocuteurs récupérés"
- "Étape 4.5: C contacts créés"
- "Étape 5: D factures créées"
- "Étape 6: E séquences attribuées"
- "Étape 7: F factures sans relance, G avec relance"
- "Étape 8: H relances générées"

### todo to run the tests
1. Set up test SQLite database with complete test data
2. Set up empty test Parse database
3. Set NODE_ENV=test and TEST_DB_PATH
4. Run: `node 00-master.js`
5. Verify all data is imported correctly
6. Verify contacts, invoices, sequences, and relances are created

## scenario2: Update existing invoices
### input data
- SQLite DB with invoices matching existing Parse Impaye objects
- Some invoices have changed data (amounts, dates, etc.)

### expecting console log output in the log file
- "Étape 5: X factures mises à jour, Y factures inchangées"

### todo to run the tests
1. Set up test SQLite database with invoices matching existing Parse data
2. Modify some invoice data in SQLite
3. Run: `node 00-master.js`
4. Verify existing Impaye objects are updated
5. Verify new Impaye objects are created for new invoices

## scenario3: No new invoices to import
### input data
- SQLite DB with no new or changed invoices
- All invoices already imported and up-to-date in Parse

### expecting console log output in the log file
- "Étape 1: 0 pièces à importer"
- "Étape 5: 0 factures créées, 0 factures mises à jour"

### todo to run the tests
1. Set up test SQLite database with invoices matching Parse
2. Run: `node 00-master.js`
3. Verify no changes are made to Parse

## scenario4: Database connection failure
### input data
- SQLite DB path is invalid or database is corrupted

### expecting console log output in the log file
- "Erreur de connexion à la base de données SQLite"

### todo to run the tests
1. Set TEST_DB_PATH to an invalid path
2. Run: `node 00-master.js`
3. Verify error handling

## scenario5: Cloud Function call
### input data
- Valid Parse Cloud Function call with masterKey

### expecting console log output in the log file
- "Début du processus d'import des factures"
- Same logs as CLI execution

### todo to run the tests
1. Call from client-side JavaScript:
   ```javascript
   Parse.Cloud.run('triggerImportInvoices', {}, { useMasterKey: true })
     .then(result => console.log('Import completed:', result.stats))
     .catch(error => console.error('Import error:', error));
   ```
2. Verify Cloud Function executes successfully
