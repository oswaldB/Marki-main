# Objectifs
- Appliquer automatiquement des règles d'attribution de séquences aux factures impayées (Impaye)
- Service utilitaire appelé par d'autres workflows (pas de déclenchement direct)

# Start
## route
- Programmatic: `require('./appliquer-regles-attribution/00-master')`
- Function: `appliquerReglesAttributionAutomatique(impaye, options)`

## entry data
- `impaye`: Parse.Object (required) - The unpaid invoice to evaluate
- `options`: object (optional) - { logActivity: boolean (default: true) }
- Requires: Parse SDK initialized

# Process

## node 0: Master Module (00-master.js)
### input
- None (initialization only)

### operations
1. Load environment variables from .env
2. Initialize Parse SDK (if not already initialized)
3. Clear logs directory (if not test)
4. Log workflow startup information
5. Import `appliquerReglesAttributionAutomatique` from 01-appliquerReglesAttributionAutomatique.js
6. Export the function for use by other workflows
7. Log: "Module appliquer-regles-attribution prêt à être utilisé"

### output
- Function `appliquerReglesAttributionAutomatique` exported and ready for use

## node 1: Rule Application Engine (01-appliquerReglesAttributionAutomatique.js)
### input
- `impaye`: Parse.Object (required) - The unpaid invoice to evaluate
- `options`: object (optional) - { logActivity: boolean (default: true) }

### operations
1. Pre-validation:
   - Check if Parse SDK is initialized
     - IF typeof Parse === "undefined": Throw: "Parse SDK not initialized"
   - Initialize timing: startedAt = new Date()
   - Log start: "Traitement impayé {impaye.id}"

2. Check if already assigned:
   - IF impaye.get("sequence") exists:
     - Log: "Impayé {impaye.id} a déjà une séquence"
     - Return: null (early exit)

3. Query active sequences from Parse:
   - Class: Sequence
   - where: `{ attribution_automatique: true, publiee: true }`
   - IF sequences.length === 0:
     - Log: "Aucune séquence avec attribution automatique trouvée"
     - Return: null

4. Process each sequence (Main Loop):
   a. Get rule groups: groupesRegles = sequence.get("groupes_regles") || []
   b. Initialize validation: tousGroupesValides = true
   c. Process each group in groupesRegles:
      - Get group logic: logiqueGroupe = groupe.logique || "ET"
        - Can be "ET" (AND) or "OU" (OR)
      - Get rules: regles = groupe.regles || []
      
      **Rule Evaluation:**
      - For each rule in regles:
        - Extract: champ (field), operateur (operator), valeur (value)
        - Get actual value from impaye: valeurImpaye = impaye.get(champ)
        
        **Operator Application:**
        | Operator | Logic | Example |
        |----------|-------|---------|
        | `egal` | Value is in array | `valeur.includes(valeurImpaye)` |
        | `different` | Value is NOT in array | `!valeur.includes(valeurImpaye)` |
        | `supérieur` | Greater than | `valeurImpaye > valeur[0]` |
        | `inférieur` | Less than | `valeurImpaye < valeur[0]` |
        
        **Group Validation Logic:**
        - **ET (AND)**: All rules must be valid
          - Starts with groupeValide = true
          - If any rule fails: groupeValide = false, break
        - **OU (OR)**: At least one rule must be valid
          - Starts with groupeValide = false
          - If any rule passes: groupeValide = true, break
      
      **Update Global Validation:**
      - If group logic is "ET" and group is invalid: tousGroupesValides = false, break
      - If group logic is "OU" and group is valid: tousGroupesValides = true, break
   
   d. After processing all groups:
      - IF tousGroupesValides === true: GOTO Sequence Assignment (Phase 5)
      - ELSE: Continue to next sequence

5. Assign sequence (if all groups valid):
   - Log: "Tous les groupes validés - attribution séquence {sequence.id}"
   - Assign sequence to impaye: impaye.set("sequence", sequence)
   - Save impaye to Parse: await impaye.save(null, { useMasterKey: true })
   - Log activity (if logActivity && NODE_ENV !== "test"):
     - Create AppliquerReglesAttributionAutomatiqueLog object
     - Set: startedAt, finishedAt, durationMs, impayeId, sequenceId, status: "success"
     - Save to Parse
   - Return: sequence

6. No matching sequence found (if loop completed without match):
   - Log: "Aucune règle ne correspond pour l'impayé {impaye.id}"
   - Log failure (if logActivity && NODE_ENV !== "test"):
     - Create AppliquerReglesAttributionAutomatiqueLog object
     - Set: startedAt, finishedAt, durationMs, impayeId, status: "failed", message: "Aucune règle correspondante"
     - Save to Parse
   - Return: null

### output
- Promise<Parse.Object|null>
  - Resolves to the assigned Sequence object if a match is found
  - Resolves to null if no match is found or if impaye already has a sequence

# end
## results
- Sequence successfully assigned to unpaid invoice (if rules match)
- Activity log created in Parse (if logActivity enabled)
- Return: assigned Sequence object or null

# Scenarios to test

## scenario1: Successful sequence assignment
### input data
- Parse with Impaye object without sequence
- Parse with Sequence objects with attribution_automatique=true and publiee=true
- Sequence with rule groups that match the impaye data

### expecting console log output in the log file
- "Traitement impayé [impayeId]"
- "Test séquence [sequenceId] ([groupesRegles.length] groupes)"
- "Groupe [logique] avec [regles.length] règles"
- "Règle: [champ] [operateur] [valeur] (valeur impayé: [valeurImpaye])"
- "Règle validée"
- "Tous les groupes validés - attribution séquence [sequenceId]"
- "Séquence [sequenceId] attribuée à l'impayé [impayeId]"

### todo to run the tests
1. Create test Impaye object in Parse without sequence
2. Create test Sequence with attribution_automatique=true and publiee=true
3. Add rule groups to sequence that match the impaye data
4. Call function:
   ```javascript
   const { appliquerReglesAttributionAutomatique } = require('./appliquer-regles-attribution/00-master');
   const sequence = await appliquerReglesAttributionAutomatique(impaye, { logActivity: true });
   ```
5. Verify sequence is assigned to impaye
6. Verify activity log is created

## scenario2: Impaye already has sequence
### input data
- Parse with Impaye object that already has a sequence assigned

### expecting console log output in the log file
- "Traitement impayé [impayeId]"
- "Impayé [impayeId] a déjà une séquence"

### todo to run the tests
1. Create test Impaye object with sequence already assigned
2. Call function with this impaye
3. Verify function returns null immediately
4. Verify no changes are made

## scenario3: No matching rules
### input data
- Parse with Impaye object without sequence
- Parse with Sequence objects with rule groups that do NOT match the impaye data

### expecting console log output in the log file
- "Traitement impayé [impayeId]"
- "Test séquence [sequenceId]"
- "Règle: [champ] [operateur] [valeur] (valeur impayé: [valeurImpaye])"
- "Règle non validée"
- "Aucune règle ne correspond pour l'impayé [impayeId]"

### todo to run the tests
1. Create test Impaye object without sequence
2. Create test Sequence with rule groups that don't match the impaye
3. Call function with this impaye
4. Verify function returns null
5. Verify no sequence is assigned

## scenario4: No active sequences
### input data
- Parse with Impaye object without sequence
- Parse with no Sequence objects with attribution_automatique=true and publiee=true

### expecting console log output in the log file
- "Traitement impayé [impayeId]"
- "Aucune séquence avec attribution automatique trouvée"

### todo to run the tests
1. Create test Impaye object without sequence
2. Ensure no active sequences exist in Parse
3. Call function with this impaye
4. Verify function returns null

## scenario5: ET (AND) logic validation
### input data
- Parse with Impaye object without sequence
- Parse with Sequence with rule group using ET (AND) logic
- Rule group with multiple rules where ALL must pass

### expecting console log output in the log file
- "Groupe ET avec [X] règles"
- For each rule: "Règle validée" or "Règle non validée"
- If all rules pass: "Tous les groupes validés"
- If any rule fails: "Groupe non valide"

### todo to run the tests
1. Create test Impaye with specific field values
2. Create test Sequence with ET rule group
3. Add rules that all match the impaye data
4. Call function and verify sequence is assigned
5. Change one impaye field to not match a rule
6. Call function and verify sequence is NOT assigned

## scenario6: OU (OR) logic validation
### input data
- Parse with Impaye object without sequence
- Parse with Sequence with rule group using OU (OR) logic
- Rule group with multiple rules where ANY can pass

### expecting console log output in the log file
- "Groupe OU avec [X] règles"
- For each rule: "Règle validée" or "Règle non validée"
- If any rule passes: "Groupe valide"

### todo to run the tests
1. Create test Impaye with specific field values
2. Create test Sequence with OU rule group
3. Add rules where at least one matches the impaye data
4. Call function and verify sequence is assigned
5. Change impaye fields to not match any rule
6. Call function and verify sequence is NOT assigned
