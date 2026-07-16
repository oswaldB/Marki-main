#!/bin/bash
# Script pour valider une page avec console_fetch.py
# Usage: ./validate-page.sh /login

URL="http://localhost:5000$1"
echo "🔍 Validation de $URL..."
/home/ubuntu/marki/relance2/app/venv/bin/python /home/ubuntu/marki/relance2/console_fetch.py "$URL" --stdout
