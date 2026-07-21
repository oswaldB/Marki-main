# Guide : Créer une Fiche d'Implémentation

## Qu'est-ce qu'une fiche d'implémentation ?

Une fiche d'implémentation est un **script shell** (`*.sh`) qui contient une séquence de commandes `pi -p` pour générer automatiquement tous les fichiers d'une fonctionnalité.

C'est le lien entre les **spécifications** (dans `workflows/`) et le **code réel** (dans `_app/`).

---

## Structure d'une fiche d'implémentation

```bash
#!/bin/bash
# Fiche d'implémentation: [Nom de la feature]
# Description: [Description courte]
#
# SPECS DE RÉFÉRENCE:
# - Frontend: workflows/frontend/[ecran]/[workflow].md
# - Backend: workflows/backend/[workflow].md
# - Mockup: mockups/[ecran].html

# ==============================================================================
# ÉTAPE 1: [Description de l'étape]
# Spec: workflows/...
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier [chemin]. Ne fais rien d'autre. 
Pas de prise d'initiative. Juste ce fichier.

SPEC DE RÉFÉRENCE: [chemin vers la spec]

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans la spec/le mockup
- Respecter scrupuleusement [chemin spec/mockup]
- Implémenter EXACTEMENT ce qui est décrit

Le fichier doit:
- [Exigence 1]
- [Exigence 2]

Respecte les règles de dev-[frontend|backend] définies dans rules/dev-[frontend|backend].md:
- [Règle 1]
- [Règle 2]"

git add [fichier(s)]
git commit -m "[type]: [description]"

# ==============================================================================
# ÉTAPE 2: [Prochaine étape]
# ==============================================================================

# ...
```

---

## Règles fondamentales

### 0. Lister les variables et fichiers existants

**Chaque prompt doit commencer par lister les variables et noms de fichiers existants** pour éviter les conflits et les mauvaises utilisations.

**✅ Bon :**
```bash
pi -p "Crée UNIQUEMENT le fichier app/routes/auth.py. Ne fais rien d'autre.

VARIABLES ET FICHIERS EXISTANTS:
- Le blueprint 'hello_bp' est défini dans routes/hello.py
- Le blueprint 'login_bp' sera défini dans routes/login.py (ce fichier)
- La megafunction auth_login est dans workflows/auth_login.py avec execute(email, password)
- Le template login est dans templates/login/index.html

Le fichier doit:
- Définir un Blueprint 'login_bp'
- Importer et utiliser execute depuis workflows.auth_login
..."
```

**❌ Mauvais :**
```bash
pi -p "Crée le fichier routes/login.py avec les routes pour login."
```

**Pourquoi c'est important :**
- Évite de créer des noms de variables qui entrent en conflit (ex: `hello` vs `hello_bp`)
- Garantit la cohérence entre les fichiers (mêmes noms de fonctions/classes)
- Permet au modèle de connaître les dépendances existantes

---

### 1. Un prompt = un fichier

Chaque `pi -p` doit créer **un seul fichier** (ou un groupe de fichiers très liés comme `__init__.py`).

**✅ Bon :**
```bash
pi -p "Crée UNIQUEMENT le fichier app/routes/hello.py..."
```

**❌ Mauvais :**
```bash
pi -p "Crée les fichiers app.py, routes/hello.py, templates/index.html..."
```

---

### 2. Références obligatoires

Chaque étape doit référencer la spec/le mockup source :

```bash
# Dans un commentaire avant le pi -p
# Spec: workflows/frontend/hello/demander-prenom.md

# Dans le prompt lui-même
SPEC DE RÉFÉRENCE: workflows/frontend/hello/demander-prenom.md
```

---

### 3. Règles strictes

Toujours inclure ces règles dans les prompts :

```bash
RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans la spec
- Respecter scrupuleusement [chemin]
- Implémenter EXACTEMENT [ce qui est décrit]
```

Pour les templates : ajouter **"Pixel perfect"**
```bash
- Faire du PIXEL PERFECT sur le mockup (même structure, mêmes classes Tailwind)
```

---

### 4. Commits entre chaque étape

**Obligatoire** : un commit après chaque `pi -p`.

```bash
pi -p "..."

git add app/fichier.py
git commit -m "feat: ajoute fichier.py - description"
```

---

## Ordre des étapes recommandé

### Pour une page frontend simple :

1. **Structure de base** (`app.py`, `requirements.txt`)
2. **Route** (`routes/hello.py`)
3. **Template principal** (`templates/hello/index.html`)
4. **Initialisation Alpine.js** (`templates/hello/alpinejs.html`)
5. **Workflow init** (`templates/hello/workflows/workflow-init.html`)
6. **Workflows** (`templates/hello/workflows/*.html`)
7. **`__init__.py`** pour les packages

### Pour un workflow backend :

1. **Megafunction** (`workflows/hello_cron.py`)
2. **Route API** (si exposée via HTTP)
3. **Script d'appel** (si cronjob)
4. **Configuration cron** (`crontab.txt`)

---

## Checklist avant de valider une fiche

- [ ] Chaque étape a un **commentaire de séparation** (`# ====`)
- [ ] Chaque prompt commence par **lister les variables et fichiers existants**
- [ ] Chaque étape référence la **spec ou le mockup**
- [ ] Chaque prompt contient **"Ne fais rien d'autre"**
- [ ] Chaque prompt contient les **RÈGLES STRICTES**
- [ ] Chaque étape est suivie d'un **`git add` + `git commit`**
- [ ] Le fichier se termine par `.sh` (pas `.md`)
- [ ] Le fichier est **exécutable** (`chmod +x`)

---

## Exemple complet : boilerplate-start.sh

Voir `implementation/00-boilerplate-start.sh` pour un exemple complet.

```bash
#!/bin/bash
# Fiche d'implémentation: Boilerplate Flask Hello World
#
# SPECS DE RÉFÉRENCE:
# - Frontend: workflows/frontend/hello/demander-prenom.md
# - Backend: workflows/backend/hello-cron.md
# - Mockup: mockups/hello.html

# ==============================================================================
# ÉTAPE 1: Structure de base
# ==============================================================================

pi -p "Crée UNIQUEMENT..."

git add ...
git commit -m "..."

# etc.
```

---

## Anti-patterns à éviter

| ❌ Anti-pattern | ✅ Correct |
|-----------------|------------|
| Créer plusieurs fichiers dans un prompt | Un prompt = un fichier |
| Pas de références aux specs | Toujours référencer la source |
| Oublier les commits | Commit après chaque étape |
| Extension `.md` | Extension `.sh` obligatoire |
| Laisser de la latitude au modèle | "Ne fais rien d'autre, pas de prise d'initiative" |
