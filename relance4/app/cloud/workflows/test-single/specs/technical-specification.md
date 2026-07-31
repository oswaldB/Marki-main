# Spécification Technique - Workflow Test Single Email

## Sommaire
1. [Vue d'ensemble](#vue-densemble)
2. [Modèles de Données](#modèles-de-données)
3. [Étapes du Workflow](#étapes-du-workflow)

---

## Vue d'ensemble

**Objectif** : Envoyer un email de test unique avec traitement de template en 2 passes et correction orthographique optionnelle via LLM.

**Différenciation** : Contrairement à `send-sequence-test`, ce workflow :
- Teste un seul email (via `emailIndex`)
- Récupère les données du payeur via `payeurId` (recherche Contact + Impayes non soldés)
- N'a pas de pièces jointes

**Entrée** : `sequenceId`, `testEmail`, `payeurId`, `emailIndex`, `userId` (opt), `userEmail` (opt), `userName` (opt)

**Sortie** : Objet JSON avec statut, aperçu et métadonnées

---

## Modèles de Données

### Commandes cURL de référence

```bash
# Récupération des schémas
curl -X GET "https://dev.markidiags.com/api/parse/schemas" \
  -H "X-Parse-Application-Id: adti-marki" \
  -H "X-Parse-Master-Key: ${PARSE_MASTER_KEY}"

# Vérifier une séquence avec ses emails
curl -X GET "https://dev.markidiags.com/api/parse/classes/Sequence/${SEQUENCE_ID}" \
  -H "X-Parse-Application-Id: adti-marki" \
  -H "X-Parse-Master-Key: ${PARSE_MASTER_KEY}"
```

### 1. Classe `Sequence`

```javascript
{
  "objectId": String,
  "nom": String,
  "type": String,
  "publiee": Boolean,
  "emails": [
    {
      "email_index": Number,
      "delai": Number,
      "objet": String,
      "corps": String,
      "smtp": String,
      "activeScenario": String,
      "scenarios": [
        {
          "format": String,
          "active": Boolean,
          "objet": String,
          "corps": String,
          "smtp": String
        }
      ]
    }
  ]
}
```

### 2. Classe `SmtpProfile`

Profil SMTP utilisé pour l'envoi des emails.

```javascript
{
  "objectId": String,
  "nom": String,           // Nom du profil (ex: "Profil Principal")
  "host": String,          // Serveur SMTP (ex: "smtp.gmail.com")
  "port": Number,          // Port SMTP (ex: 587, 465)
  "secure": Boolean,       // true pour SSL/TLS
  "username": String,      // Nom d'utilisateur SMTP
  "password": String,      // Mot de passe SMTP
  "email_from": String,    // Email de l'expéditeur
  "reply_to": String,      // Email de réponse (optionnel)
  "signature_html": String  // Signature HTML (optionnelle) ajoutée automatiquement aux emails
}
```

**Note sur la signature** : Si le champ `signature_html` est renseigné et non vide, il est automatiquement concaténé au corps de l'email avec `<br><br>` comme séparateur avant l'envoi.

### 3. Structure `payeurData` (Récupération Backend)

**Note** : Cette structure est construite par le backend à partir du `payeurId` fourni.

Le backend effectue les opérations suivantes :
1. **Récupération du Contact** : Requête Parse sur la classe `Contact` avec `objectId = payeurId`
2. **Récupération des Impayés** : Requête Parse sur la classe `Impaye` avec :
   - `payeur` = pointeur vers le Contact
   - `facture_soldee = false`
   - `reste_a_payer > 0`
   - Tri par `date_piece` décroissant

```javascript
{
  "objectId": String,        // ID du payeur (contact)
  "nom": String,
  "prenom": String,
  "email": String,
  "telephone": String,
  "civilite": String,
  "type_personne": String,
  "adresse": String,
  "impayesCount": Number,    // Nombre d'impayés récupérés
  "impayesAmount": Number,   // Montant total des impayés
  "impayes": [               // Liste des objets Impaye complets (tous les champs)
    // Objet Impaye Parse complet avec tous ses attributs :
    // objectId, payeur, nfacture, reference, date_piece, date_echeance,
    // total_ht, total_ttc, montant_total, reste_a_payer, url_pdf,
    // facture_soldee, createdAt, updatedAt, etc.
  ]
}
```

---

## Étapes du Workflow

### Noeud 1 : Validation et Récupération
- Valider les paramètres requis (`sequenceId`, `testEmail`, `payeurId`, `emailIndex`)
- Récupérer la séquence par `sequenceId`
- Extraire l'email à tester par `emailIndex`
- Récupérer le Contact par `payeurId` (classe `Contact`)
- Récupérer les impayés non soldés du payeur (classe `Impaye`, `facture_soldee = false`, `reste_a_payer > 0`)
- Construire l'objet `payeurData` avec les données du Contact et les impayés récupérés

### Noeud 2 : Traitement du Template
- Générer le contenu via Ollama avec le prompt de generate-relances
- Logger le prompt complet envoyé à Ollama (pour debug)

**Format de sortie YAML** :

Le LLM génère sa réponse au format YAML (plus permissif avec les caractères de contrôle et les sauts de ligne), qui est ensuite converti en JSON pour le traitement interne.

Dépendance requise : `js-yaml` (déjà présent dans le projet)

```javascript
const yaml = require('js-yaml');

function parseLLMResponse(content) {
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
}
```

**Avantages du YAML** :
- Support natif des sauts de ligne multilignes (pipe `|` ou littéral `>`)
- Pas besoin d'échapper les guillemets dans le contenu HTML
- Tolérant aux caractères de contrôle
- Plus lisible pour les réponses du LLM

**Exemple de réponse attendue** :

```yaml
objet: Votre relance de facture - Action requise
corps: |
  <p>Bonjour,</p>
  
  <p>Nous vous rappelons que la facture n°1234 d'un montant de <strong>1 500,00 €</strong>
  est en attente de réglement depuis le 15/06/2024.</p>
  
  <p><a href="[[lien_pdf]]">Télécharger la facture PDF</a></p>
```

**Prompt** (voir `/home/ubuntu/prod/adti/configuration/prompts/relance-email-prompt.txt`) :

```javascript
const PROMPT_FILE = "/home/ubuntu/prod/adti/configuration/prompts/relance-email-prompt.txt";
const promptTemplate = fs.readFileSync(PROMPT_FILE, "utf-8");

const prompt = promptTemplate
    .replace(/{{objetTemplate}}/g, objetTemplate)
    .replace(/{{corpsTemplate}}/g, corpsTemplate)
    .replace(/{{impayesJson}}/g, impayesJson)
    .replace(/{{historyJson}}/g, historyJson)
    .replace(/{{emailIndex}}/g, emailIndex)
    .replace(/{{contactJson}}/g, contactJson)
    .replace(/{{scenarioType}}/g, scenarioType);
```

> **Note** : Le prompt est maintenant externalisé dans `/home/ubuntu/prod/adti/configuration/prompts/relance-email-prompt.txt`  
> **Chemin absolu** : `/home/ubuntu/prod/adti/configuration/prompts/relance-email-prompt.txt`  
> Voir ce fichier pour le contenu complet des règles de génération.

- Les seules variables traitées manuellement sont `[[lien_pdf]]` et `[[lien_espace]]`

**Remplacement des variables `[[lien_pdf]]` et `[[lien_espace]]`** :

```javascript
const frontendUrl = process.env.FRONTEND_URL || "https://adti.markidiags.com";

// Remplacer [[lien_pdf]] par l'URL de l'écran de redirection PDF
// Structure: /redirect-pdf/{impayeId}
// Le premier impayé du groupe est utilisé pour le lien PDF
if (payeurData.impayes && payeurData.impayes.length > 0) {
    const lienPdf = `${frontendUrl}/redirect-pdf/${payeurData.impayes[0].objectId}`;
    objetFinal = objetFinal.split("[[lien_pdf]]").join(lienPdf);
    corpsFinal = corpsFinal.split("[[lien_pdf]]").join(lienPdf);
}

// Remplacer [[lien_espace]] par l'URL de l'écran de redirection espace client
// Structure: /redirect-espace/{contactId}
const lienEspace = `${frontendUrl}/redirect-espace/${payeurId}`;
objetFinal = objetFinal.split("[[lien_espace]]").join(lienEspace);
corpsFinal = corpsFinal.split("[[lien_espace]]").join(lienEspace);
```

**Notes** :
- Les URLs pointent vers les pages de redirection intermédiaires (sans token)
- Ces pages appellent les Cloud Functions `generatePdfLink` et `generateContactToken` pour générer les tokens sécurisés
- Les pages de redirection redirigent ensuite automatiquement vers les URLs signées

### Noeud 3 : Envoi de l'Email
- Récupérer le profil SMTP depuis `sequence.emails[emailIndex].smtp` (ou du scénario actif si défini)
- Charger les informations depuis la classe Parse `SmtpProfile` (host, port, username, password, email_from, **signature_html**)
- **Si le profil SMTP contient un champ `signature_html` non vide** : concaténer la signature au corps de l'email avec `<br><br>` comme séparateur
- Configurer Nodemailer avec ces paramètres
- Construire l'email avec objet et corps traités (corps incluant la signature si présente)
- Envoyer à `testEmail`
- Retourner OK
