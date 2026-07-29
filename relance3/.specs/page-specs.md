# Spécifications Page Login

## Vue d'ensemble
Page d'authentification utilisateur avec formulaire email/mot de passe.

## Composants

### Formulaire de Login
- Champ email (type="email", requis, placeholder="votre@email.com")
- Champ password (type="password", requis, placeholder="••••••••")
- Bouton "Se connecter" (id="btn-submit")
- Lien "Mot de passe oublié ?" (id="btn-forgot-password")
- Lien "Créer un compte" (id="btn-register")

### États
- Loading: Spinner sur le bouton, champs désactivés
- Erreur: Message d'erreur rouge au-dessus du formulaire
- Succès: Redirection (gérée par workflow)

### Design
- Centré verticalement et horizontalement
- Card blanche avec ombre
- Largeur max: 400px
- Fond: gris clair (bg-gray-100)
- Header: titre "Connexion" + sous-titre
