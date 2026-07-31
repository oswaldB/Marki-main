# Objectifs
- Gérer les options dynamiques du système
- Permettre la mise à jour des options sans modification de code
- Synchroniser les options entre différentes sources

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
6. Execute updateDynamicOptionsMaster() function
7. Register Cloud Function (if applicable)

### output
- `{ stats }`

## node 1: Option Fetcher (01-fetchOptions.js)
### input
- None (queries external source directly)

### operations
1. Fetch from External Source:
   - Query external database for dynamic options
   - Or read from configuration files
   - Or retrieve from API

2. Data Transformation:
   - Map external data to Parse format
   - Validate option values

3. Return: Dynamic options data

### output
- `{ options: {...} }`

## node 2: Option Updater (02-updateOptions.js)
### input
- `{ options: {...} }` (from node 1)

### operations
1. For each option:
   a. Check if option exists in Parse
   b. If exists:
      - Compare values
      - Update if changed
   c. If not exists:
      - Create new option

2. Cache Management:
   - Update application cache
   - Notify dependent systems

3. Activity Logging:
   - Log option changes
   - Track updated/created counts

### output
- `{ stats: { created, updated, skipped, errors } }`

# end
## results
- Dynamic options synchronized between external source and Parse
- Options created or updated as needed
- Cache updated with latest values
- Return: `{ stats: { optionsCount, created, updated, skipped, errors } }`

# Scenarios to test

## scenario1: Basic options update
### input data
- External source with dynamic options (e.g., invoice statuses, payment methods)
- Parse with existing options or empty

### expecting console log output in the log file
- "Étape 1: X options récupérées depuis la source externe"
- "Étape 2: Y options créées, Z options mises à jour"

### todo to run the tests
1. Set up external source with test options
2. Set up test Parse database
3. Implement workflow following pattern of other workflows
4. Run: `node 00-master.js`
5. Verify options are created/updated in Parse

## scenario2: No changes needed
### input data
- External source with options that match existing Parse options

### expecting console log output in the log file
- "Étape 1: X options récupérées"
- "Étape 2: 0 options créées, 0 options mises à jour, X options inchangées"

### todo to run the tests
1. Set up external source with options matching Parse
2. Implement workflow
3. Run: `node 00-master.js`
4. Verify no changes are made

## scenario3: New options to add
### input data
- External source with new options not in Parse

### expecting console log output in the log file
- "Étape 1: X options récupérées"
- "Étape 2: X options créées, 0 options mises à jour"

### todo to run the tests
1. Set up external source with new options
2. Set up Parse with no matching options
3. Implement workflow
4. Run: `node 00-master.js`
5. Verify new options are created

## scenario4: Cloud Function call
### input data
- Valid Parse Cloud Function call with masterKey

### expecting console log output in the log file
- "Début du processus update-dynamic-options"
- Same logs as CLI execution

### todo to run the tests
1. Implement Cloud Function registration in 00-master.js
2. Call from client-side JavaScript:
   ```javascript
   Parse.Cloud.run('updateDynamicOptions', {}, { useMasterKey: true })
     .then(result => console.log('Options updated:', result.stats))
     .catch(error => console.error('Update error:', error));
   ```
3. Verify Cloud Function executes successfully
