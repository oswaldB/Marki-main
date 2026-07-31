# Spécification Technique - Workflow Génération des Suivis

## Sommaire
1. [Vue d'ensemble](#vue-densemble)
2. [Modèles de Données](#modèles-de-données)
3. [Architecture Mega Fonction](#architecture-mega-fonction)
4. [Flux de Travail](#flux-de-travail)
5. [Logique de Fréquence](#logique-de-fréquence)
6. [Prompt Ollama](#prompt-ollama)
7. [Cloud Function](#cloud-function)

---

## Vue d'ensemble

Ce workflow génère des **emails de suivi périodiques** pour les impayés. Contrairement aux relances qui sont déclenchées par les échéances, les suivis sont planifiés selon des **fréquences récurrentes** (quotidien, hebdomadaire, mensuel).

### Différences clés avec les relances

| Aspect | Relances | Suivis |
|--------|----------|--------|
| Déclencheur | Date d'échéance + délai | Fréquence planifiée |
| Timing | Une fois par impayé | Répété selon la fréquence |
| Génération | Création + envoi séparés | Génération le jour J par Ollama |
| Objectif | Recouvrement amiable | Suivi périodique d'avancement |

---

## Modèles de Données

### Classes Parse utilisées

#### 1. Impaye
Identique aux relances. Représente une facture impayée.

```javascript
{
  "objectId": String,
  "nfacture": Number,
  "reference": String,
  "date_piece": Date,
  "date_echeance": Date,
  "total_ht": Number,
  "total_ttc": Number,
  "montant_total": Number,
  "reste_a_payer": Number,
  "facture_soldee": Boolean,
  "payeur": Pointer(Contact),
  "contact_relance": Pointer(Contact),
  "sequence": Pointer(Sequence),
  // ... autres champs
}
```

#### 2. Sequence (type = "suivi")
Séquence de suivis avec fréquences planifiées.

```javascript
{
  "objectId": String,
  "nom": String,
  "type": "suivi",              // Type fixe "suivi"
  "publiee": Boolean,
  "validation_obligatoire": Boolean,
  "attribution_automatique": Boolean,
  "emails": [
    {
      "email_index": Number,    // Index unique dans la séquence
      "frequence": String,      // Voir logique de fréquence ci-dessous
      "objet": String,          // Template objet
      "corps": String,          // Template corps HTML
      "scenarios": [
        {
          "format": String,     // "single", "multiple", "broker" ou "both"
          "active": Boolean,    // Seuls les actifs sont traités
          "objet": String,      // Template spécifique au scénario
          "corps": String,      // Template spécifique au scénario
          "smtp": String        // ID du profil SMTP
        }
      ]
    }
  ]
}
```

#### 3. Suivi
Représente un suivi généré (équivalent de Relance).

```javascript
{
  "objectId": String,
  "statut": String,             // "pret pour envoi", "envoyee", "erreur"
  "manuelle": Boolean,          // false pour les suivis auto
  "valide": Boolean,            // Selon validation_obligatoire
  "objet": String,              // Objet final généré
  "corps": String,              // Corps final généré
  "dateEnvoi": Date,            // Date de création/planification
  "envoye_le": Date,            // Date réelle d'envoi
  "contact": Pointer(Contact),  // Destinataire
  "sequence": Pointer(Sequence),
  "impayes": Array,             // Liste des impayés concernés
  "email_index": Number,        // Index de l'email dans la séquence
  "scenario": String,           // "single", "multiple", "broker" ou "both"
  "smtpProfil": Pointer(SmtpProfile),
  "cc": String,
  "erreur_count": Number,
  "erreur_message": String,
  "frequence": String           // Fréquence appliquée (pour traçabilité)
}
```

#### 4. Contact
Identique aux relances.

```javascript
{
  "objectId": String,
  "nom": String,
  "prenom": String,
  "email": String,
  "telephone": String,
  "civilite": String,
  "type_personne": String,
  "isBlacklisted": Boolean
}
```

#### 5. SmtpProfile
Identique aux relances.

```javascript
{
  "objectId": String,
  "nom": String,
  "host": String,
  "port": Number,
  "username": String,
  "password": String,
  "email_from": String,
  "signature_html": String
}
```

---

## Architecture Mega Fonction

Le workflow est une **seule fonction** qui intègre toutes les étapes séquentiellement.

```
┌─────────────────────────────────────────────────────────────────┐
│                    generateSuivis (Mega Function)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Étape 1: Vérification des fréquences                           │
│  └── Query séquences de type "suivi" + publiées                 │
│      Vérifier si aujourd'hui correspond à la fréquence            │
│                                                                 │
│  Étape 2: Récupération des impayés                                │
│  └── Pour chaque séquence avec fréquence valide aujourd'hui     │
│      Récupérer les impayés non soldés associés                  │
│                                                                 │
│  Étape 3: Regroupement par contact                             │
│  └── Grouper les impayés par contact_relance/payeur             │
│                                                                 │
│  Étape 4: Génération via Ollama                                  │
│  └── Pour chaque groupe: générer objet + corps en temps réel     │
│      (PAS de pré-génération, génération le jour J)             │
│                                                                 │
│  Étape 5: Remplacement des liens                                 │
│  └── Remplacer [[lien_pdf]] et [[lien_espace]]                  │
│                                                                 │
│  Étape 6: Création/Sauvegarde                                   │
│  └── Créer l'objet Suivi avec statut="pret pour envoi"         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flux de Travail

### Étape 1: Vérification des fréquences

```javascript
// 1. Récupérer les séquences de type "suivi" publiées
const Sequence = Parse.Object.extend("Sequence");
const sequenceQuery = new Parse.Query(Sequence);
sequenceQuery.equalTo("publiee", true);
sequenceQuery.equalTo("type", "suivi");
sequenceQuery.limit(999999);
const sequences = await sequenceQuery.find({ useMasterKey: true });

// 2. Filtrer les séquences dont au moins un email a une fréquence valide aujourd'hui
const sequencesAvecFrequenceValide = [];
for (const sequence of sequences) {
    const emails = sequence.get("emails") || [];
    for (const email of emails) {
        if (isFrequencyValid(email.frequence)) {
            sequencesAvecFrequenceValide.push({ sequence, email });
            break; // Au moins un email avec fréquence valide
        }
    }
}
```

### Étape 2: Récupération des impayés

Pour chaque séquence avec fréquence valide, récupérer les impayés:

```javascript
const Impaye = Parse.Object.extend("Impaye");

for (const { sequence, email } of sequencesAvecFrequenceValide) {
    const impayeQuery = new Parse.Query(Impaye);
    impayeQuery.equalTo("facture_soldee", false);
    impayeQuery.greaterThan("reste_a_payer", 0);
    impayeQuery.equalTo("sequence", sequence);
    impayeQuery.include(["sequence", "contact_relance", "payeur"]);
    impayeQuery.limit(999999);
    const impayes = await impayeQuery.find({ useMasterKey: true });
    // ... traitement des impayés
}
```

```javascript
function isFrequencyValid(frequence) {
    const aujourdhui = new Date();
    const jourDuMois = aujourdhui.getDate();
    const jourSemaine = aujourdhui.getDay(); // 0=dimanche, 1=lundi...
    
    const JOURS_SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    
    // Quotidien
    if (frequence === "quotidien") return true;
    
    // Jour du mois (ex: "1", "15", "28")
    if (/^\d+$/.test(frequence)) {
        return jourDuMois == parseInt(frequence);
    }
    
    // Jour de la semaine (ex: "lundi", "mardi")
    // "hebdomadaire" = tous les lundis
    let jourCible = frequence;
    if (frequence === "hebdomadaire") {
        jourCible = "lundi";
    }
    return JOURS_SEMAINE[jourSemaine] === jourCible;
}

// Si la fréquence ne correspond pas à aujourd'hui, on skip cet email
if (!isFrequencyValid(emailConfig.frequence)) {
    continue; // Passer au prochain email
}
```

### Étape 3: Regroupement par contact

```javascript
const groupedByContact = new Map();

for (const impaye of impayes) {
    let contact = impaye.get("contact_relance") || impaye.get("payeur");
    if (!contact) continue;
    
    // Filtrer les contacts blacklistés ou sans email
    const email = contact.get("email");
    const isBlacklisted = contact.get("isBlacklisted") || false;
    if (!email || email.trim() === "" || isBlacklisted) continue;
    
    const key = contact.id;
    if (!groupedByContact.has(key)) {
        groupedByContact.set(key, { contact, impayes: [] });
    }
    groupedByContact.get(key).impayes.push(impaye);
}
```

### Étape 4: Génération du contenu via Ollama

Pour chaque groupe (contact + impayés), générer le contenu en temps réel:

```javascript
const prompt = buildPrompt(scenario, impayes, history, contact);
const { objet, corps } = await generateWithOllama(prompt);
```

### Étape 5: Remplacement des liens

```javascript
const frontendUrl = process.env.FRONTEND_URL || "https://adti.markidiags.com";

// Remplacer [[lien_pdf]]
if (impayes.length > 0) {
    const lienPdf = `${frontendUrl}/redirect-pdf/${impayes[0].id}`;
    objetFinal = objetFinal.split("[[lien_pdf]]").join(lienPdf);
    corpsFinal = corpsFinal.split("[[lien_pdf]]").join(lienPdf);
}

// Remplacer [[lien_espace]]
const lienEspace = `${frontendUrl}/redirect-espace/${contact.id}`;
objetFinal = objetFinal.split("[[lien_espace]]").join(lienEspace);
corpsFinal = corpsFinal.split("[[lien_espace]]").join(lienEspace);
```

### Étape 6: Création du Suivi

```javascript
const Suivi = Parse.Object.extend("Suivi");
const suivi = new Suivi();

suivi.set("contact", contact);
suivi.set("sequence", sequence);
suivi.set("email_index", emailIndex);
suivi.set("impayes", impayes);
suivi.set("scenario", scenarioType);
suivi.set("frequence", frequence);  // Pour traçabilité
suivi.set("valide", !validationObligatoire);
suivi.set("manuelle", false);
suivi.set("statut", "pret pour envoi");
suivi.set("objet", objetFinal);
suivi.set("corps", corpsFinal);

// smtpProfil depuis scenario.smtp
if (activeScenario.smtp) {
    const smtpProfileObj = SmtpProfile.createWithoutData(activeScenario.smtp);
    suivi.set("smtpProfil", smtpProfileObj);
}

await suivi.save(null, { useMasterKey: true });
```

---

## Logique de Fréquence

### Types de fréquences supportées

| Valeur `frequence` | Description | Exemple |
|-------------------|-------------|---------|
| `"quotidien"` | Tous les jours | Exécuté chaque jour |
| `"1"`, `"15"`, etc. | Jour spécifique du mois | `"1"` = 1er de chaque mois |
| `"lundi"`, `"mardi"`, etc. | Jour de la semaine | `"lundi"` = chaque lundi |
| `"hebdomadaire"` | Tous les lundis | Équivalent à `"lundi"` |

### Algorithme de vérification

```javascript
function shouldGenerateToday(frequence) {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const dayOfWeek = today.getDay(); // 0 = dimanche
    
    const weekDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    
    switch(frequence) {
        case "quotidien":
            return true;
            
        case "hebdomadaire":
            return dayOfWeek === 1; // Lundi
            
        default:
            // Si c'est un nombre → jour du mois
            if (/^\d+$/.test(frequence)) {
                return dayOfMonth === parseInt(frequence);
            }
            // Si c'est un jour de la semaine
            if (weekDays.includes(frequence.toLowerCase())) {
                return weekDays[dayOfWeek] === frequence.toLowerCase();
            }
            return false;
    }
}
```

---

## Détermination des Scénarios

La détermination du scénario est automatique et basée sur :
1. Le nombre d'impayés du contact
2. Le type de personne (apporteur d'affaires ou non)
3. La présence d'impayés où le contact est également apporteur

```javascript
// Déterminer si le contact est un apporteur d'affaires
const isBroker = contact.get("type_personne") === "Apporteur d'affaire" || 
                 contact.get("type_personne") === "Apporteur";

// Récupérer les impayés où ce contact est apporteur (mais pas payeur)
const brokerImpayes = await getBrokerImpayes(contact, impayes);
const hasBrokerImpayes = brokerImpayes.length > 0;

// Détermination automatique du scénario
const nombreImpayes = impayes.length;
let scenarioType;

if (isBroker && hasBrokerImpayes) {
    scenarioType = "both";
} else if (isBroker) {
    scenarioType = "broker";
} else if (nombreImpayes === 1) {
    scenarioType = "single";
} else {
    scenarioType = "multiple";
}
```

**Règles de détermination** :

| Condition | Scénario | Description |
|-----------|----------|-------------|
| Contact = apporteur ET a des impayés où il est apporteur | `both` | Suivi combinant ses propres impayés + ceux où il est apporteur |
| Contact = apporteur (sans impayés où il est apporteur) | `broker` | Suivi spécifique apporteur |
| 1 impayé uniquement | `single` | Suivi pour une facture unique |
| 2+ impayés | `multiple` | Suivi pour plusieurs factures |

---

## Prompt Ollama

### Configuration

```javascript
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "https://ollama.com/api";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_MODEL = "mistral-large-3:675b-cloud";
```

### Prompts par scénario

Chaque scénario dispose d'un prompt spécifique pour adapter le ton et le contenu du suivi :

| Scénario | Fichier de prompt | Description |
|----------|-------------------|-------------|
| `single` | `configuration/prompts/scenarios/suivi-single-prompt.txt` | 1 facture - ton informatif |
| `multiple` | `configuration/prompts/scenarios/suivi-multiple-prompt.txt` | Plusieurs factures - ton informatif |
| `broker` | `configuration/prompts/scenarios/suivi-broker-prompt.txt` | Apporteur d'affaires |
| `both` | `configuration/prompts/scenarios/suivi-both-prompt.txt` | Impayés + rôle d'apporteur |

### Construction du prompt

```javascript
const PROMPT_BASE_PATH = "/home/ubuntu/prod/adti/configuration/prompts/scenarios";
const promptFile = path.join(PROMPT_BASE_PATH, `suivi-${scenarioType}-prompt.txt`);
const promptTemplate = fs.readFileSync(promptFile, "utf-8");

// Date du jour au format JJ/MM/AAAA
const aujourdhui = new Date();
const dateJour = aujourdhui.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});

// Construction du prompt avec toutes les variables
const prompt = promptTemplate
    .replace(/{{objetTemplate}}/g, scenarioActif.objet || email.objet)
    .replace(/{{corpsTemplate}}/g, scenarioActif.corps || email.corps)
    .replace(/{{impayesJson}}/g, JSON.stringify(impayesData))
    .replace(/{{brokerImpayesJson}}/g, JSON.stringify(brokerImpayesData))
    .replace(/{{historyJson}}/g, JSON.stringify(history))
    .replace(/{{emailIndex}}/g, String(emailIndex))
    .replace(/{{contactJson}}/g, JSON.stringify(contactData))
    .replace(/{{scenarioType}}/g, scenarioType)
    .replace(/{{dateJour}}/g, dateJour)
    .replace(/{{nombreImpayes}}/g, String(contactImpayes.length));
```

**Variables disponibles** :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{objetTemplate}}` | Template de l'objet depuis la séquence | `"Suivi de vos dossiers"` |
| `{{corpsTemplate}}` | Template du corps depuis la séquence | `"<p>Bonjour...</p>"` |
| `{{impayesJson}}` | JSON des impayés du contact (ses factures) | `[{id: "...", nfacture: 123...}]` |
| `{{brokerImpayesJson}}` | JSON des impayés où il est apporteur (broker/both uniquement) | `[{id: "...", payeur_nom: "..."}]` |
| `{{historyJson}}` | Historique des suivis précédents | `[{statut: "...", dateEnvoi: "..."}]` |
| `{{emailIndex}}` | Index de l'email dans la séquence | `1`, `2`, etc. |
| `{{contactJson}}` | Données du contact destinataire | `{nom: "...", prenom: "..."}` |
| `{{scenarioType}}` | Type de scénario déterminé | `"single"`, `"multiple"`, `"broker"`, `"both"` |
| `{{dateJour}}` | **Date du jour au format JJ/MM/AAAA** | `"04/07/2025"` |
| `{{nombreImpayes}}` | Nombre d'impayés du contact | `1`, `3`, etc. |

> **Note** : Les prompts sont externalisés dans `/home/ubuntu/prod/adti/configuration/prompts/scenarios/`. Voir ces fichiers pour le contenu complet des règles de génération par scénario.

### Génération avec retry

**Format de sortie YAML** :

Le LLM génère sa réponse au format YAML (plus permissif avec les caractères de contrôle et les sauts de ligne), qui est ensuite converti en objet JavaScript pour le traitement interne.

Dépendance requise : `js-yaml` (déjà présent dans le projet)

```javascript
const yaml = require('js-yaml');

async function generateWithOllama(prompt, retries = 0) {
    const MAX_RETRIES = 3;
    
    try {
        const response = await fetch(`${OLLAMA_API_URL}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OLLAMA_API_KEY}`,
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                temperature: 0.1,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const content = data.response.trim();
        
        // Extraire le bloc YAML de la réponse
        const yamlMatch = content.match(/---\n([\s\S]*?)\n---/) || 
                          content.match(/```yaml\n([\s\S]*?)```/) ||
                          content.match(/^(objet:|corps:)/m) ? [null, content] : null;
        
        if (!yamlMatch) {
            throw new Error("Format YAML non trouvé dans la réponse");
        }
        
        const yamlContent = yamlMatch[1] || content;
        
        // Parser le YAML en objet JavaScript
        const parsed = yaml.load(yamlContent);
        
        // Vérifier la structure attendue
        if (!parsed.objet || !parsed.corps) {
            throw new Error("La réponse doit contenir les champs 'objet' et 'corps'");
        }
        
        return {
            objet: parsed.objet,
            corps: parsed.corps
        };
        
    } catch (err) {
        if (retries < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000));
            return generateWithOllama(prompt, retries + 1);
        }
        throw err;
    }
}
```

**Avantages du YAML** :
- Support natif des sauts de ligne multilignes (pipe `|` ou littéral `>`)
- Pas besoin d'échapper les guillemets dans le contenu HTML
- Tolérant aux caractères de contrôle
- Plus lisible pour les réponses du LLM

**Exemple de réponse attendue** :

```yaml
objet: Suivi de vos factures en attente
corps: |
  <p>Bonjour,</p>
  
  <p>Dans le cadre de notre suivi, nous vous informons que <strong>3 factures</strong>
  sont actuellement en attente de réglement pour un montant total de <strong>4 250,00 €</strong>.</p>
  
  <p><a href="[[lien_espace]]">Accéder à votre espace client</a></p>
```

---

## Cloud Function

### Définition

```javascript
Parse.Cloud.define("generateSuivis", async (request) => {
    if (!request.master && !request.user) {
        throw new Error("Authentification requise");
    }
    
    return await generateSuivisMaster({ trigger: "cloud-function" });
});
```

### Appel API

```bash
curl -X POST https://adti.api.markidiags.com:8445/parse/functions/generateSuivis \
  -H "Content-Type: application/json" \
  -H "X-Parse-Application-Id: adti-marki" \
  -H "X-Parse-Master-Key: ${MASTER_KEY}" \
  -d '{}'
```

### Cron

Le cron est défini dans `/backend/cloud/cron.js` :

```javascript
// À ajouter dans cron.js
schedule.scheduleJob('generate-suivis-quotidien', '0 8 * * *', async () => {
    await callWorkflow('generate-suivi');
});
```


## Structure du Fichier

```
backend/cloud/workflows/generate-suivi/
├── index.js                    # Mega fonction unique
├── specs/
│   └── technical-specification.md  # Ce fichier
└── logs/                       # Logs d'exécution (auto-créé)
```
