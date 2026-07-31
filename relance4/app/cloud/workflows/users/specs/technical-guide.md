# Objectifs
- Gérer les opérations liées aux utilisateurs
- Synchroniser les utilisateurs depuis des sources externes
- Gérer les rôles et permissions des utilisateurs
- Suivre l'activité des utilisateurs

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
6. Register Cloud Functions for user operations
7. Execute usersMaster() function

### output
- `{ stats }`

## node 1: User Synchronizer (01-syncUsers.js)
### input
- None (queries external source directly)

### operations
1. Fetch Users:
   - Query external database for users
   - Or query Parse for existing users

2. Synchronize:
   - Create missing users
   - Update changed users
   - Deactivate removed users

3. Role Management:
   - Assign appropriate roles
   - Set permissions

### output
- `{ stats: { created, updated, deactivated, errors } }`

## node 2: Role Manager (02-manageRoles.js)
### input
- `{ userId: string, role: string }` (for role assignment)

### operations
1. Validate user exists
2. Validate role exists
3. Assign role to user
4. Update permissions
5. Log role change

### output
- `{ success: boolean, message: string, userId: string, role: string }`

# end
## results
- Users synchronized between external source and Parse
- Roles and permissions assigned
- User activity tracked
- Return: `{ stats: { usersProcessed, created, updated, deactivated, errors } }`

# Scenarios to test

## scenario1: Basic user synchronization
### input data
- External source with user data (id, username, email, role)
- Parse with existing users or empty

### expecting console log output in the log file
- "Étape 1: X utilisateurs récupérés depuis la source externe"
- "Étape 2: Y utilisateurs créés, Z utilisateurs mis à jour"

### todo to run the tests
1. Implement workflow following pattern of other workflows
2. Set up external user source with test data
3. Set up test Parse database
4. Run: `node 00-master.js`
5. Verify users are created/updated in Parse

## scenario2: Role assignment
### input data
- Valid userId and role

### expecting console log output in the log file
- "Rôle [role] attribué à l'utilisateur [userId]"

### todo to run the tests
1. Implement role management functionality
2. Create test user in Parse
3. Call role assignment function
4. Verify role is assigned correctly

## scenario3: No changes needed
### input data
- External source with users matching existing Parse users

### expecting console log output in the log file
- "Étape 1: X utilisateurs récupérés"
- "Étape 2: 0 utilisateurs créés, 0 utilisateurs mis à jour, X utilisateurs inchangés"

### todo to run the tests
1. Set up external source with users matching Parse
2. Implement workflow
3. Run: `node 00-master.js`
4. Verify no changes are made

## scenario4: New users to add
### input data
- External source with new users not in Parse

### expecting console log output in the log file
- "Étape 1: X utilisateurs récupérés"
- "Étape 2: X utilisateurs créés, 0 utilisateurs mis à jour"

### todo to run the tests
1. Set up external source with new users
2. Set up Parse with no matching users
3. Implement workflow
4. Run: `node 00-master.js`
5. Verify new users are created

## scenario5: Cloud Function call
### input data
- Valid Parse Cloud Function call with masterKey

### expecting console log output in the log file
- "Début du processus users"
- Same logs as CLI execution

### todo to run the tests
1. Implement Cloud Function registration in 00-master.js
2. Call from client-side JavaScript:
   ```javascript
   Parse.Cloud.run('syncUsers', {}, { useMasterKey: true })
     .then(result => console.log('Users synced:', result.stats))
     .catch(error => console.error('Sync error:', error));
   ```
3. Verify Cloud Function executes successfully
