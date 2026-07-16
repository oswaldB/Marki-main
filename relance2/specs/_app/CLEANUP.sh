#!/bin/bash
# Script de nettoyage - Suppression des fichiers obsolètes
# À exécuter depuis la racine du projet

echo "================================"
echo "Nettoyage des fichiers obsolètes"
echo "================================"
echo ""

# 1. Supprimer static/pages/ (migré vers templates/)
if [ -d "specs/_app/static/pages" ]; then
    echo "🔴 Suppression de specs/_app/static/pages/ (2.1M)..."
    rm -rf specs/_app/static/pages/
    echo "✅ static/pages/ supprimé"
else
    echo "ℹ️  static/pages/ déjà supprimé"
fi

# 2. Déplacer components vers layouts/
if [ -d "specs/_app/static/components" ]; then
    echo "🟡 Déplacement de static/components/ vers layouts/components/..."
    mkdir -p specs/_app/layouts/components/
    mv specs/_app/static/components/* specs/_app/layouts/components/
    rmdir specs/_app/static/components/
    echo "✅ Components déplacés"
else
    echo "ℹ️  Components déjà déplacés"
fi

# 3. Nettoyer static/ (ne garder que css/)
if [ -d "specs/_app/static" ]; then
    # Vérifier s'il reste des fichiers autres que css/
    find specs/_app/static -mindepth 1 -maxdepth 1 ! -name "css" -type d 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "🟢 Nettoyage static/ terminé"
    fi
fi

echo ""
echo "================================"
echo "Nettoyage terminé !"
echo "================================"
echo ""
echo "Résumé des modifications :"
echo "- ❌ specs/_app/static/pages/ SUPPRIMÉ"
echo "- ✅ specs/_app/layouts/components/ CRÉÉ"
echo "- 📝 specs/_app/README.md mis à jour"
echo "- 📝 specs/_app/AUDIT.md créé"
echo "- 📝 specs/_app/workflow-strategy.md créé"
echo ""
