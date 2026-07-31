#!/bin/bash

# Script pour vérifier les modifications dans Parse Server
# Utilise curl pour effectuer des tests sur localhost:1555/parse avec la masterKey

echo "Vérification des modifications dans Parse Server"
echo "----------------------------------------------"

# Exemple de commande curl pour vérifier une classe Parse
# Remplacez TMRapport par le nom de la classe que vous souhaitez vérifier
CLASS_NAME="TMRapport"

# Appel curl pour récupérer les données de la classe spécifiée
curl -X GET \
  -H "X-Parse-Application-Id: adti-marki" \
  -H "X-Parse-Master-Key: e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9" \
  "http://localhost:1555/parse/classes/$CLASS_NAME"

echo ""
echo "Vérification terminée."
