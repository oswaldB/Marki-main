# Document `sequence`

Configuration des séquences de relances automatiques. Une séquence définit un scénario d'envoi d'emails (délai, contenu, destinataire) en fonction de la situation (facture seule, multiples, etc.).

## Structure JSON complète

```json
{
  "_id": "sequence:{id}",
  "_rev": "1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "type": "sequence",
  "nom": "string",
  "type_sequence": "string",
  "niveau": "number",
  "actif": "boolean",
  "validation_obligatoire": "boolean",
  "attribution_automatique": "boolean",
  "scenario": "string",
  "emails": [
    {
      "email_index": "number",
      "delai": "number",
      "smtp": "string",
      "to": "string",
      "cc": "string",
      "frequence": "string",
      "scenarios": [
        {
          "format": "string",
          "active": "boolean",
          "smtp": "string",
          "cc": "string",
          "objet": "string",
          "corps": "string"
        }
      ]
    }
  ],
  "regles": "object",
  "groupes_regles": "array",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## Description des champs

### Identification

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | `string` | Format: `sequence:{id}` (ex: `sequence:zgPKAlVH65`) |
| `type` | `string` | Toujours `"sequence"` |
| `nom` | `string` | Nom descriptif de la séquence (affiché dans l'UI) |

### Configuration générale

| Champ | Type | Description |
|-------|------|-------------|
| `type_sequence` | `string` | Type: `"relances"` (autres types possibles) |
| `niveau` | `number` | Niveau hiérarchique (1, 2, 3...) |
| `actif` | `boolean` | La séquence est-elle active ? |
| `validation_obligatoire` | `boolean` | Nécessite une validation manuelle avant envoi ? |
| `attribution_automatique` | `boolean` | Attribuée automatiquement aux nouvelles demandes ? |
| `scenario` | `string` | Scénario associé (optionnel) |

### Emails de la séquence

Chaque objet dans `emails` représente un email dans la séquence (email n°1, n°2, etc.).

| Champ | Type | Description |
|-------|------|-------------|
| `emails[].email_index` | `number` | Ordre dans la séquence (1, 2, 3...) |
| `emails[].delai` | `number` | Jours relatifs (négatif = avant échéance, positif = après) |
| `emails[].smtp` | `string` | ID du profil SMTP à utiliser (ex: `YPsNANpWhC`) |
| `emails[].to` | `string` | Destinataire avec variables (`[[payeur_email]]`) |
| `emails[].cc` | `string` | Copie avec variables |
| `emails[].frequence` | `string` | `"hebdomadaire"`, `"mensuel"`, etc. |

#### Scénarios d'email

Dans chaque email, plusieurs scénarios sont définis selon la situation :

| Champ | Type | Description |
|-------|------|-------------|
| `scenarios[].format` | `string` | `"single"`, `"multiple"`, `"both"`, `"broker"` |
| `scenarios[].active` | `boolean` | Ce scénario est-il actif ? |
| `scenarios[].smtp` | `string` | Surcharge du SMTP (optionnel) |
| `scenarios[].cc` | `string` | Surcharge du CC (optionnel) |
| `scenarios[].objet` | `string` | Sujet de l'email avec variables `[[...]]` |
| `scenarios[].corps` | `string` | Corps HTML avec variables `[[...]]` |

#### Types de format

| Format | Description |
|--------|-------------|
| `"single"` | Une seule facture impayée |
| `"multiple"` | Plusieurs factures impayées (même destinataire) |
| `"both"` | Multiple + information apporteur |
| `"broker"` | Facture liée à un apporteur (immobilier) |

### Règles avancées (optionnel)

| Champ | Type | Description |
|-------|------|-------------|
| `regles` | `object` | Configuration JSON des règles métier |
| `groupes_regles` | `array` | Groupes de règles conditionnelles |

### Métadonnées

| Champ | Type | Description |
|-------|------|-------------|
| `created_at` | `ISO8601` | Date de création |
| `updated_at` | `ISO8601` | Date de dernière modification |

## Variables disponibles dans les templates

Les templates d'email utilisent des variables entourées de `[[...]]` :

### Informations client

| Variable | Description |
|----------|-------------|
| `[[payeur_nom]]` | Nom du client |
| `[[payeur_prenom]]` | Prénom du client |
| `[[payeur_email]]` | Email du client |
| `[[payeur_telephone]]` | Téléphone du client |
| `[[payeur_civilite]]` | Civilité (M., Mme, etc.) |

### Informations dossier et bien

| Variable | Description |
|----------|-------------|
| `[[numero_dossier]]` | Numéro de dossier |
| `[[adresse_bien]]` | Adresse du bien |
| `[[code_postal]]` | Code postal |
| `[[ville]]` | Ville |

### Informations facture

| Variable | Description |
|----------|-------------|
| `[[nfacture]]` | Numéro de facture |
| `[[date_echeance]]` | Date d'échéance (peut avoir format: `"DD/MM/YYYY"`) |
| `[[montant_total]]` | Montant TTC |
| `[[reste_a_payer]]` | Reste dû |
| `[[lien_pdf]]` | Lien vers le PDF de la facture |

### Informations apporteur

| Variable | Description |
|----------|-------------|
| `[[apporteur_nom]]` | Nom de l'apporteur |
| `[[apporteur_societe]]` | Société de l'apporteur |

### Boucles

| Variable | Description |
|----------|-------------|
| `[[loop impayes]]` | Début de boucle sur les factures impayées |
| `[[endloop]]` | Fin de boucle |
| `[[facture.nfacture]]` | Dans une boucle : numéro de facture |
| `[[facture.date_echeance]]` | Dans une boucle : date d'échéance |

## Exemple concret

```json
{
  "_id": "sequence:zgPKAlVH65",
  "type": "sequence",
  "nom": "Relances impayés particuliers payeur",
  "type_sequence": "relances",
  "niveau": 1,
  "actif": true,
  "validation_obligatoire": true,
  "attribution_automatique": true,
  "scenario": "",
  "emails": [
    {
      "email_index": 1,
      "delai": -4,
      "smtp": "YPsNANpWhC",
      "to": "[[payeur_email]]",
      "cc": "",
      "frequence": "hebdomadaire",
      "scenarios": [
        {
          "format": "single",
          "active": true,
          "smtp": "YPsNANpWhC",
          "cc": "",
          "objet": "EX'IM - Dossier [[numero_dossier]] - Rappel de règlement",
          "corps": "<p>Bonjour [[payeur_civilite]] [[payeur_prenom]]...</p>"
        },
        {
          "format": "multiple",
          "active": true,
          "smtp": "YPsNANpWhC",
          "cc": "",
          "objet": "EX'IM - Plusieurs factures en attente",
          "corps": "<p>Bonjour...</p>"
        }
      ]
    },
    {
      "email_index": 2,
      "delai": 1,
      "smtp": "YPsNANpWhC",
      "to": "[[payeur_email]]",
      "cc": "",
      "frequence": "hebdomadaire",
      "scenarios": [
        {
          "format": "single",
          "active": true,
          "smtp": "YPsNANpWhC",
          "cc": "",
          "objet": "EX'IM - Facture arrivée à échéance",
          "corps": "<p>...</p>"
        }
      ]
    }
  ],
  "regles": {},
  "groupes_regles": [],
  "created_at": "2026-03-16T20:13:28.346Z",
  "updated_at": "2026-05-26T20:27:06.710Z"
}
```

## Champs obligatoires

- `_id` : Format `sequence:{id}`
- `type` : `"sequence"`
- `nom` : Nom descriptif
- `emails` : Tableau d'emails configurés

## Notes importantes

1. **Ordre des emails** : Les emails sont triés par `email_index` croissant.

2. **Délai négatif** : Un délai de -4 signifie "envoyer 4 jours avant la date d'échéance".

3. **Sélection du scénario** : Le système choisit automatiquement le scénario approprié (`single`, `multiple`, etc.) selon le nombre de factures impayées et la présence d'un apporteur.

4. **Fréquence** : `"hebdomadaire"` signifie que l'email est envoyé une fois par semaine si la condition persiste (facture toujours impayée).

5. **SMTP** : L'ID référence un document `smtp_profile` (ex: `smtp:YPsNANpWhC`).

---

*Document généré pour marki2*
