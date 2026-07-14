# Workflow Backend : Génération des Emails de Suivi

## Objectifs
- Générer automatiquement les emails de suivi pour les agences
- Envoyer des tableaux récapitulatifs des factures à payer par l'agence et par le propriétaire
- Gérer les fréquences d'envoi (quotidien, hebdomadaire, mensuel)

## Process (méga-fonction)

La méga-fonction `generateSuivis()` exécute les étapes suivantes :

### Étape 1 : Récupération des Séquences
- Query les séquences avec `type_sequence === 'suivi'` et `publiee === true`

### Étape 2 : Filtrage par Fréquence
- Pour chaque séquence, vérifier si au moins un email a une fréquence correspondant à aujourd'hui :
  - `quotidien` : tous les jours
  - `hebdomadaire` : tous les lundis (jour 1)
  - `mensuel` : le jour du mois spécifié (ex: "1", "15")
  - Jour de la semaine : "lundi", "mardi", etc.

### Étape 3 : Récupération des Impayés
- Pour chaque séquence avec fréquence valide, récupérer les impayés :
  - `facture_soldee === false`
  - `reste_a_payer > 0`
  - `sequence_id` correspondant

### Étape 4 : Regroupement par Contact
- Regrouper les impayés par `contact_relance` ou `payeur` 
- Exclure les contacts blacklistés ou sans email
- Exclure les impayés blacklistés

### Étape 5 : Détermination du Scénario
Pour chaque contact, déterminer le scénario :
- `single` : 1 impayé
- `multiple` : 2+ impayés
- `broker` : contact est apporteur d'affaires uniquement
- `both` : mix (impayés où contact est payeur + impayés où contact est apporteur)

### Étape 6 : Récupération Données Broker (si besoin)
- Si scénario `broker` ou `both` : récupérer les impayés où le contact est `apporteur_id` mais pas `payeur_id`

### Étape 7 : Vérification Existence
- Vérifier si un suivi existe déjà pour ce contact/séquence/email_index aujourd'hui
- Si oui, ignorer (pas de doublon)

### Étape 8 : Génération Contenu (Ollama)
- Lire le prompt depuis `/config/prompts/suivi-{scenarioType}-prompt.txt`
- Construire le prompt avec :
  - Templates (objet et corps)
  - Données des impayés (JSON)
  - Données des impayés broker (si applicable)
  - Données du contact (JSON)
  - Historique des suivis
  - Date du jour
- Appeler l'API Ollama
- Parser la réponse YAML

### Étape 9 : Post-traitement
- Remplacer `[[lien_pdf]]` et `[[lien_espace]]`

### Étape 10 : Création du Suivi
- Créer le document `suivi` avec :
  - `contact_id`, `sequence_id`, `email_index`
  - `objet`, `corps` générés
  - `scenario`, `frequence`
  - `statut: 'pret pour envoi'` ou `'brouillon'` selon `validation_obligatoire`
  - `manuelle: false`

## Data Model

### Collection: `sequences`
**Stockage:** `/backend/data/sequences/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `nom` | string | Nom de la séquence |
| `type_sequence` | SequenceType | `"suivi"` |
| `publiee` | boolean | **Filtre**: doit être `true` |
| `validation_obligatoire` | boolean | Si `true`, création en statut `brouillon` |
| `emails` | EmailConfig[] | Emails de la séquence |
| `emails[].email_index` | number | Position |
| `emails[].delai` | number | Délai (non utilisé pour suivi) |
| `emails[].objet` | string | Template objet |
| `emails[].corps` | string | Template corps avec tableaux |
| `emails[].frequence` | string\|object | `"quotidien"`, `"hebdomadaire"`, `"mensuel"`, `"1"`, `"15"`, `"lundi"`... |
| `emails[].scenarios` | ScenarioConfig[] | Scénarios |

### Collection: `impayes`
**Stockage:** `/backend/data/impayes/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `sequence_id` | string | ID de la séquence de suivi |
| `facture_soldee` | boolean | **Filtre**: `false` |
| `reste_a_payer` | number | **Filtre**: `> 0` |
| `is_blacklisted` | boolean | **Exclu si true** |
| `nfacture` | string | Numéro de facture |
| `reference` | string | Référence |
| `date_piece` | ISO date | Date pièce |
| `date_echeance` | ISO date | Date échéance |
| `total_ht` | number | Total HT |
| `total_ttc` | number | Total TTC |
| `montant_total` | number | Montant total |
| `adresse_bien` | string | Adresse |
| `ville` | string | Ville |
| `code_postal` | string | Code postal |
| `contact_relance_id` | string\|null | Contact pour relance |
| `payeur_id` | string\|null | Payeur |
| `apporteur_id` | string\|null | Apporteur (pour scénario broker) |

### Collection: `contacts`
**Stockage:** `/backend/data/contacts/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `nom` | string | Nom |
| `prenom` | string | Prénom |
| `email` | string\|null | **Exclu si null/vide** |
| `civilite` | string\|null | Civilité |
| `type_personne` | ContactTypePersonne | Type |
| `is_blacklisted` | boolean | **Exclu si true** |

### Collection: `suivis` (créés par ce workflow)
**Stockage:** `/backend/data/suivis/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (préfixe `suiv_`) |
| `type` | string | `"suivi"` |
| `contact_id` | string | ID du contact destinataire |
| `sequence_id` | string | ID de la séquence |
| `impaye_ids` | string[] | IDs des impayés concernés |
| `email_index` | number | Index de l'email dans la séquence |
| `scenario` | SuiviScenario | `single`, `multiple`, `broker`, `both` |
| `frequence` | string | Fréquence déclenchée |
| `objet` | string | Objet généré |
| `corps` | string | Corps HTML généré |
| `statut` | SuiviStatut | `brouillon`, `pret pour envoi`, `Envoyée`, `annulee` |
| `manuelle` | boolean | `false` (automatique) |
| `valide` | boolean | Validation utilisateur |
| `planifiee_le` | ISO date\|null | Date d'envoi planifiée |
| `dateEnvoi` | ISO date\|null | Date d'envoi effective |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |

---

## Organisation des fichiers

```
/backend/
├── generate-suivi/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens (JSON Lines)
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/generate-suivi/`

---

## Start

### Route
```bash
POST /api/suivis/generate

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "https://dev.markidiags.com/api/suivis/generate"
```

### Cron
```javascript
cron.schedule("0 9 * * *", () => {
  generateSuivis();
}, { timezone: "Europe/Paris" });
```

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'generate-suivi');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'generate-suivi'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

**Process**
```javascript
await log('info', '=== Démarrage génération des suivis ===');

// 1. Récupérer les séquences de suivi publiées
const sequences = db.query('sequences')
  .where('type_sequence').eq('suivi')
  .where('publiee').eq(true)
  .data();

await log('info', `${sequences.length} séquences de suivi publiées trouvées`);

// 2. Filtrer par fréquence valide pour aujourd'hui
const sequencesAvecFrequenceValide = [];
const aujourdhui = new Date();
const jourDuMois = aujourdhui.getDate();
const jourSemaine = aujourdhui.getDay();
const JOURS_SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

for (const sequence of sequences) {
  const emails = sequence.emails || [];
  for (const email of emails) {
    const frequence = email.frequence;
    let frequenceValide = false;
    
    if (!frequence) continue;
    
    // Format objet structuré
    if (typeof frequence === 'object' && frequence.type) {
      const heureActuelle = aujourdhui.getHours();
      if (heureActuelle < (frequence.hour || 0)) continue;
      
      switch (frequence.type) {
        case 'quotidien': frequenceValide = true; break;
        case 'hebdomadaire': frequenceValide = (jourSemaine === (frequence.dayOfWeek || 1)); break;
        case 'mensuel': frequenceValide = (jourDuMois === (frequence.dayOfMonth || 1)); break;
      }
    }
    // Format string (legacy)
    else {
      const freqStr = String(frequence).toLowerCase();
      if (freqStr === 'quotidien') frequenceValide = true;
      else if (freqStr === 'hebdomadaire') frequenceValide = (jourSemaine === 1);
      else if (/^\d+$/.test(freqStr)) frequenceValide = (jourDuMois === parseInt(freqStr));
      else if (JOURS_SEMAINE.includes(freqStr)) frequenceValide = (JOURS_SEMAINE[jourSemaine] === freqStr);
    }
    
    if (frequenceValide) {
      sequencesAvecFrequenceValide.push({ sequence, email });
      break;
    }
  }
}

await log('info', `${sequencesAvecFrequenceValide.length} séquences avec fréquence valide pour aujourd'hui`);

if (sequencesAvecFrequenceValide.length === 0) {
  return { status: 200, data: { suivisCrees: 0, message: "Aucune fréquence ne correspond à aujourd'hui" } };
}

// 3. Traiter chaque séquence
let suivisCrees = 0;
let suivisIgnores = 0;
let erreurs = 0;

for (const { sequence, email } of sequencesAvecFrequenceValide) {
  const emailIndex = email.email_index;
  
  // Récupérer les impayés pour cette séquence
  const impayes = db.query('impayes')
    .where('sequence_id').eq(sequence.id)
    .where('facture_soldee').eq(false)
    .where('reste_a_payer').gt(0)
    .data();
  
  if (impayes.length === 0) {
    await log('info', `Aucun impayé pour séquence ${sequence.nom}`);
    continue;
  }
  
  // 4. Regrouper par contact
  const groupedByContact = new Map();
  
  for (const impaye of impayes) {
    if (impaye.is_blacklisted) continue;
    
    const contactId = impaye.contact_relance_id || impaye.payeur_id;
    if (!contactId) continue;
    
    const contact = await db.read('contacts', contactId).catch(() => null);
    if (!contact || contact.is_blacklisted || !contact.email) continue;
    
    if (!groupedByContact.has(contactId)) {
      groupedByContact.set(contactId, { contact, impayes: [] });
    }
    groupedByContact.get(contactId).impayes.push(impaye);
  }
  
  await log('info', `${groupedByContact.size} groupes de contacts pour séquence ${sequence.nom}`);
  
  // 5. Traiter chaque contact
  for (const [contactId, { contact, impayes: contactImpayes }] of groupedByContact) {
    try {
      // Vérifier si suivi existe déjà pour aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const existingSuivi = db.query('suivis')
        .where('contact_id').eq(contactId)
        .where('sequence_id').eq(sequence.id)
        .where('email_index').eq(emailIndex)
        .where('manuelle').eq(false)
        .where('created_at').gte(today.toISOString())
        .where('created_at').lt(tomorrow.toISOString())
        .data()[0];
      
      if (existingSuivi) {
        await log('info', 'Suivi existant pour aujourd\'hui', { contactId, emailIndex });
        suivisIgnores++;
        continue;
      }
      
      // 5. Déterminer scénario
      const nombreImpayes = contactImpayes.length;
      const isBroker = ['Apporteur d\'affaire', 'Apporteur', 'apporteur'].includes(contact.type_personne);
      
      // Récupérer impayés broker
      let brokerImpayes = [];
      if (isBroker) {
        brokerImpayes = db.query('impayes')
          .where('apporteur_id').eq(contactId)
          .where('payeur_id').ne(contactId)
          .where('facture_soldee').eq(false)
          .data();
      }
      
      let scenarioType = 'single';
      if (isBroker && brokerImpayes.length > 0) scenarioType = 'both';
      else if (isBroker) scenarioType = 'broker';
      else if (nombreImpayes > 1) scenarioType = 'multiple';
      
      await log('info', `Scénario: ${scenarioType}`, { contactId, impayes: nombreImpayes, brokerImpayes: brokerImpayes.length });
      
      // Trouver scénario actif
      const scenarios = email.scenarios || [];
      const scenarioActif = scenarios.find(s => s.format === scenarioType && s.active);
      
      if (!scenarioActif) {
        await log('info', `Aucun scénario actif pour ${scenarioType}`, { contactId });
        suivisIgnores++;
        continue;
      }
      
      // 6. Générer contenu via Ollama
      const promptPath = path.join(__dirname, 'config', 'prompts', `suivi-${scenarioType}-prompt.txt`);
      const basePrompt = await fs.readFile(promptPath, 'utf-8').catch(() => 
        fs.readFile(path.join(__dirname, 'config', 'prompts', 'suivi-email-prompt.txt'), 'utf-8')
      );
      
      const impayesData = contactImpayes.map(i => ({
        id: i.id,
        nfacture: i.nfacture,
        date_piece: i.date_piece,
        date_echeance: i.date_echeance,
        total_ttc: i.total_ttc,
        reste_a_payer: i.reste_a_payer,
        adresse_bien: i.adresse_bien,
        ville: i.ville
      }));
      
      const contactData = {
        id: contact.id,
        nom: contact.nom,
        prenom: contact.prenom,
        email: contact.email,
        civilite: contact.civilite
      };
      
      const dateJour = new Date().toLocaleDateString('fr-FR');
      
      let prompt = basePrompt
        .replace(/{{objetTemplate}}/g, scenarioActif.objet || email.objet)
        .replace(/{{corpsTemplate}}/g, scenarioActif.corps || email.corps)
        .replace(/{{impayesJson}}/g, JSON.stringify(impayesData))
        .replace(/{{contactJson}}/g, JSON.stringify(contactData))
        .replace(/{{emailIndex}}/g, String(emailIndex))
        .replace(/{{scenarioType}}/g, scenarioType)
        .replace(/{{dateJour}}/g, dateJour)
        .replace(/{{nombreImpayes}}/g, String(nombreImpayes));
      
      if (scenarioType === 'broker' || scenarioType === 'both') {
        const brokerData = brokerImpayes.map(i => ({
          id: i.id,
          nfacture: i.nfacture,
          payeur_nom: i.payeur_nom,
          payeur_prenom: i.payeur_prenom,
          reste_a_payer: i.reste_a_payer
        }));
        prompt = prompt.replace(/{{brokerImpayesJson}}/g, JSON.stringify(brokerData));
      }
      
      // Appel Ollama
      const generated = await callOllama(prompt, contactId, emailIndex);
      let { objet, corps } = generated;
      
      // 7. Post-traitement
      const frontendUrl = process.env.FRONTEND_URL || "https://adti.markidiags.com";
      if (contactImpayes.length > 0) {
        const lienPdf = `${frontendUrl}/redirect-pdf/${contactImpayes[0].id}`;
        objet = objet.replace(/\[\[lien_pdf\]\]/g, lienPdf);
        corps = corps.replace(/\[\[lien_pdf\]\]/g, lienPdf);
      }
      const lienEspace = `${frontendUrl}/redirect-espace/${contactId}`;
      objet = objet.replace(/\[\[lien_espace\]\]/g, lienEspace);
      corps = corps.replace(/\[\[lien_espace\]\]/g, lienEspace);
      
      // 8. Créer le suivi
      const suiviId = `suiv_${Date.now()}_${contactId}`;
      await db.create('suivis', {
        id: suiviId,
        type: 'suivi',
        contact_id: contactId,
        sequence_id: sequence.id,
        impaye_ids: contactImpayes.map(i => i.id),
        email_index: emailIndex,
        scenario: scenarioType,
        frequence: email.frequence,
        objet,
        corps,
        statut: sequence.validation_obligatoire ? 'brouillon' : 'pret pour envoi',
        manuelle: false,
        valide: !sequence.validation_obligatoire,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await log('info', 'Suivi créé', { suiviId, contactId, scenario: scenarioType });
      suivisCrees++;
      
    } catch (err) {
      await log('error', `Erreur traitement contact ${contactId}`, { error: err.message });
      erreurs++;
    }
  }
}

await log('info', '=== Génération des suivis terminée ===', { suivisCrees, suivisIgnores, erreurs });
```

#### Output
```javascript
{
  "status": 200,
  "data": {
    "suivisCrees": Number,
    "suivisIgnores": Number,
    "erreurs": Number,
    "message": "Génération terminée"
  }
}
```

## Error Handling

| Code | Description |
|------|-------------|
| 500 | Erreur Ollama ou base de données |

### Gestion des erreurs Ollama
- 3 tentatives avec backoff exponentiel
- Fallback sur prompt legacy si prompt spécifique introuvable
- En cas d'échec final : le contact est ignoré (`suivisIgnores++`)

## Fonctions Helpers

### isFrequencyValid(frequence)
Vérifie si la fréquence correspond à aujourd'hui.

### determineScenarioType(contact, impayes, brokerImpayes)
Détermine le scénario selon le type de contact et les impayés.

### callOllama(prompt, contactId, emailIndex)
Appelle l'API Ollama avec retry et logging détaillé.
