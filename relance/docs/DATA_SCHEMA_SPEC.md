# Spécification des Fichiers YAML - Backend Data

Ce document décrit la structure attendue des fichiers YAML pour chaque entité du dossier `backend/data/`.

---

## users/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string        # Identifiant unique Parse
username: string        # Nom d'utilisateur
email: string|null      # Email de l'utilisateur
password: string        # Mot de passe hashé bcrypt (obligatoire: "coucou")
role: string          # Rôle de l'utilisateur ("admin" ou "user")
emailVerified: boolean
authData: object|null
createdAt: ISO8601      # Date de création
updatedAt: ISO8601      # Date de modification
```

### Exemple

```yaml
objectId: ZnSnI80cHP
username: m.wegener
email: null
password: $2b$12$bQiaGuMIXSrBKXy3umILW.nv9byU/MsHR6Qt5VkakncgbVqf2Q3va
role: admin
emailVerified: false
authData: null
createdAt: "2026-03-16T13:51:33.637Z"
updatedAt: "2026-03-16T13:51:33.637Z"
```

---

## sessions/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
user:
  __type: Pointer
  className: _User
  objectId: string      # Référence vers un user
installationId: string|null
sessionToken: string
expiresAt: ISO8601|null
createdWith: object|null
createdAt: ISO8601
updatedAt: ISO8601
```

---

## contacts/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
type_personne: string|null  # "particulier" | "entreprise" | null
externe_id: string|null
source: string|null
nom: string|null
email: string|null
telephone: string|null
prenom: string|null
civilite: string|null       # "M.", "Mme", "Melle", null
isBlacklisted: boolean
blacklistedAt: ISO8601|null
nb_impayes: number|null
entreprise:
  __type: Pointer|null
  className: Contact
  objectId: string|null
employes:
  __type: Relation
  className: Contact
lastSyncAt: ISO8601|null
createdAt: ISO8601
updatedAt: ISO8601
```

---

## impayes/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
date_debut_mission: ISO8601|null
source: string|null
nfacture: number|null
date_piece: ISO8601|null
total_ht: number|null
externe_id: number|null
date_echeance: ISO8601|null
id_dossier: string|null
reference: string|null
url_pdf: string|null
ref_piece: string|null
numero_dossier: number|null
statut_dossier: string|null
adresse_bien: string|null
employe_intervention: string|null
commentaire_dossier: string|null
ville: string|null
etage: string|null
numero_lot: string|null
code_postal: string|null
porte: string|null
escalier: string|null
entree: string|null

# Informations sur les parties
apporteur:
  __type: Pointer|null
  className: Contact
  objectId: string|null
apporteur_nom: string|null
apporteur_prenom: string|null
apporteur_email: string|null
apporteur_telephone: string|null
apporteur_civilite: string|null

payeur:
  __type: Pointer|null
  className: Contact
  objectId: string|null
payeur_nom: string|null
payeur_prenom: string|null
payeur_email: string|null
payeur_telephone: string|null
payeur_civilite: string|null
payeur_type: string|null
payeur_type_personne: string|null

donneur_ordre_nom: string|null
donneur_ordre_prenom: string|null
donneur_ordre_email: string|null
donneur_ordre_telephone: string|null
donneur_ordre_civilite: string|null

proprietaire_nom: string|null
proprietaire_prenom: string|null
proprietaire_email: string|null
proprietaire_telephone: string|null
proprietaire_civilite: string|null
proprietaire_type_personne: string|null

syndic_nom: string|null
syndic_email: string|null
syndic_telephone: string|null
syndic_civilite: string|null

notaire_nom: string|null
notaire_prenom: string|null
notaire_email: string|null
notaire_telephone: string|null
notaire_civilite: string|null

locataire_entrant_nom: string|null
locataire_entrant_prenom: string|null
locataire_entrant_email: string|null
locataire_entrant_telephone: string|null
locataire_entrant_civilite: string|null

locataire_sortant_nom: string|null
locataire_sortant_prenom: string|null
locataire_sortant_email: string|null
locataire_sortant_telephone: string|null
locataire_sortant_civilite: string|null

acquereur_nom: string|null
acquereur_prenom: string|null
acquereur_email: string|null
acquereur_telephone: string|null
acquereur_civilite: string|null

contact_relance:
  __type: Pointer|null
  className: Contact
  objectId: string|null

reste_a_payer: number|null
total_ttc: number|null
facture_soldee: boolean

sequence:
  __type: Pointer|null
  className: Sequence
  objectId: string|null

reference_externe: string|null

# Blacklist
isBlacklisted: boolean
blacklistedAt: ISO8601|null
blacklistMotifType: string|null
blacklistMotif: string|null

# Mission
cadre_mission: string|null
missions: array|null

solde: boolean
solde_le: ISO8601|null

createdAt: ISO8601
updatedAt: ISO8601
```

---

## relances/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
statut: string              # "brouillon", "programmee", "envoyee", "erreur"
manuelle: boolean
dateEnvoi: ISO8601|null
date_envoi_prevue: ISO8601|null
corps: string|null          # Contenu HTML de l'email
objet: string|null          # Objet de l'email
sujet: string|null          # Alternative pour objet
contenu: string|null         # Alternative pour corps
email_index: number|null     # Index dans la séquence d'emails
cc: string|null              # Destinataires en copie
scenario: string|null        # "relance_auto", "relance_manuelle"
valide: boolean
emailSent: boolean

# Relations
contact:
  __type: Pointer
  className: Contact
  objectId: string

sequence:
  __type: Pointer|null
  className: Sequence
  objectId: string|null

smtpProfil:
  __type: Pointer|null
  className: SmtpProfile
  objectId: string|null

impayes: array             # Tableau d'IDs d'impayés

# Erreurs
erreur_count: number
lastError: string|null

createdAt: ISO8601
updatedAt: ISO8601
```

---

## sequences/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
nom: string
emails: array              # Tableau d'emails de la séquence
lien_paiement: string|null
regles_type: string|null   # Type de règles d'attribution
publiee: boolean
validation_obligatoire: boolean
attribution_automatique: boolean
type: string               # "relances" par défaut
regles: array|null         # Règles d'attribution
groupes_regles: array|null # Groupes de règles
createdAt: ISO8601
updatedAt: ISO8601
```

---

## smtp_profiles/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
nom: string
nom_affiche: string
email_from: string
host: string
port: number
username: string
password: string
signature_html: string|null
createdAt: ISO8601
updatedAt: ISO8601
```

---

## payment_links/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
nom: string
url: string
createdAt: ISO8601
updatedAt: ISO8601
```

---

## activities/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
type: string               # "email", "appel", "note", "paiement", etc.
operation: string|null     # Type d'opération spécifique
trigger: string|null       # Déclencheur de l'activité
description: string|null
details: string|null

# Relations
impaye:
  __type: Pointer|null
  className: Impaye
  objectId: string|null

relance:
  __type: Pointer|null
  className: Relance
  objectId: string|null

impaye_id: string|null     # Référence externe

# Données financières
montant: number|null
nfacture: number|null
date_piece: ISO8601|null
date_paiement: ISO8601|null
payeur_nom: string|null

# Impact
optimizeImpact: boolean
impactDetails: object|null

# Métadonnées
metadata: object|null
isSystem: boolean
error_message: string|null

timestamp: ISO8601
createdAt: ISO8601
updatedAt: ISO8601
```

---

## options/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
type: string               # Type d'options (ex: "motifs_blacklist")
valeurs: array             # Tableau des valeurs possibles
createdAt: ISO8601
updatedAt: ISO8601
```

---

## suivis/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
statut: string
format: string|null
corps: string|null
objet: string|null
scenario: object|null
frequence: object|null
email_index: number
valide: boolean
manuelle: boolean
emailSent: boolean
count: boolean
where: object|null

# Relations
contact:
  __type: Pointer|null
  className: Contact
  objectId: string|null

sequence:
  __type: Pointer|null
  className: Sequence
  objectId: string|null

impaye:
  __type: Pointer|null
  className: Impaye
  objectId: string|null

smtpProfil:
  __type: Pointer|null
  className: SmtpProfile
  objectId: string|null

impayes: array
dateEnvoi: ISO8601|null
dateEnvoiPrevue: ISO8601|null
dateEnvoiReelle: ISO8601|null

createdAt: ISO8601
updatedAt: ISO8601
```

---

## attribution_logs/

Fichier: `{objectId}.yml`

### Structure attendue

```yaml
objectId: string
impayeId: string
sequenceId: string
startedAt: ISO8601
finishedAt: ISO8601|null
durationMs: number|null
status: string             # "success", "error", "running"
message: string|null
createdAt: ISO8601
updatedAt: ISO8601
```

---

## Conventions Communes

### Types de Pointeurs Parse

```yaml
__type: Pointer
className: NomDeLaClasse
objectId: identifiant_unique
```

### Types de Relations Parse

```yaml
__type: Relation
className: NomDeLaClasse
```

### Dates ISO8601

Toutes les dates sont au format ISO8601 avec timezone:
- `2026-03-16T13:51:33.637Z`

### Champs Système

Tous les fichiers contiennent ces champs système:
- `objectId`: Identifiant unique (généré par Parse)
- `createdAt`: Date de création
- `updatedAt`: Date de dernière modification

### Valeurs Null

Les champs peuvent être `null` si non définis dans Parse.
