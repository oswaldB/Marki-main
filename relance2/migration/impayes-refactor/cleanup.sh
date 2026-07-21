#!/bin/bash
# Script de nettoyage - À exécuter APRÈS validation de la migration

echo "Nettoyage des fichiers obsolètes après migration impayes..."
echo ""

# Fichiers à supprimer (doublons dans l'ancien dossier)
FILES_TO_REMOVE=(
    "app/templates/impayes/payeur.html"
    "app/templates/impayes/suspendus.html"
    "app/templates/impayes/alpinejs-payeur.html"
    "app/templates/impayes/alpinejs-suspendus.html"
)

echo "Fichiers à supprimer :"
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "/home/ubuntu/marki/relance2/$file" ]; then
        echo "  - $file"
    fi
done

echo ""
read -p "Confirmer la suppression ? (yes/no) " confirm

if [ "$confirm" = "yes" ]; then
    for file in "${FILES_TO_REMOVE[@]}"; do
        fullpath="/home/ubuntu/marki/relance2/$file"
        if [ -f "$fullpath" ]; then
            rm "$fullpath"
            echo "✓ Supprimé: $file"
        else
            echo "⚠ Non trouvé: $file"
        fi
    done
    echo ""
    echo "Nettoyage terminé."
else
    echo "Annulé."
fi
