#!/usr/bin/env python3
"""
Récupère les logs console d'une page web via Playwright.

================================================================================
GUIDE D'UTILISATION
================================================================================

INSTALLATION:
    python3 -m venv venv
    source venv/bin/activate
    pip install playwright
    playwright install chromium

UTILISATION BASIQUE:
    python3 console_fetch.py https://example.com
    → Sauvegarde dans: example.com-2026-07-15-08-30-00.md

OPTIONS:
    --stdout              Afficher dans la console (pas de fichier)
    --json                Sortie au format JSON (.json au lieu de .md)
    --filter {error,warn,log,all}  Filtrer par type de message
    --wait MS             Temps d'attente après chargement (default: 10000ms)
    -o FICHIER            Nom de fichier personnalisé
    --no-timestamp        Enlever les métadonnées du fichier généré

AUTHENTIFICATION:
    --auth USER:PASS      Basic Auth (HTTP)
    --cookies FICHIER     Charger des cookies depuis un fichier JSON
    --storage FICHIER     Charger un storage state (cookies + local/session storage)
    --save-storage FICH   Sauvegarder le storage après connexion (pour réutilisation)
    --localstorage KEY:VAL  Injecter une valeur dans localStorage (par défaut: token préconfiguré)
    --no-default-token    Ne pas injecter le token JWT par défaut
    
    # Exemple avec token JWT
    python3 console_fetch.py https://app.example.com/dashboard \
        --localstorage "token:eyJhbGciOiJIUzI1NiIs..."
    
    # Login automatique (remplir formulaire)
    --login-url URL       URL de la page de login
    --login-user SELECT   Sélecteur CSS du champ username/email
    --login-pass SELECT   Sélecteur CSS du champ password
    --login-submit SELECT Sélecteur CSS du bouton submit
    --login-data USER:PASS Credentials "username:password"

EXEMPLES:
    # Par défaut: sauvegarde dans un fichier markdown (token JWT injecté automatiquement)
    python3 console_fetch.py https://dev.markidiags.com/dashboard

    # Désactiver le token par défaut
    python3 console_fetch.py https://example.com --no-default-token

    # Afficher dans la console
    python3 console_fetch.py https://example.com --stdout

    # Format JSON
    python3 console_fetch.py https://example.com --json

    # Filtrer uniquement les erreurs
    python3 console_fetch.py https://example.com --filter error

    # AVEC AUTHENTIFICATION
    
    # 1. Basic Auth (HTTP)
    python3 console_fetch.py https://example.com --auth admin:secret123
    
    # 2. Cookies existants (exportés depuis le navigateur)
    python3 console_fetch.py https://example.com --cookies cookies.json
    
    # 3. Storage state (recommandé - cookies + localStorage)
    python3 console_fetch.py https://example.com --storage auth.json
    
    # 4. Login automatique (formulaire)
    python3 console_fetch.py https://dashboard.example.com \
        --login-url https://example.com/login \
        --login-user "#email" \
        --login-pass "#password" \
        --login-submit "button[type=submit]" \
        --login-data "monemail@test.com:motdepasse123"
    
    # 5. Injecter un token JWT dans localStorage (auth par token)
    python3 console_fetch.py https://app.example.com/dashboard \
        --localstorage "token:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    
    # 6. Sauvegarder la session après login (pour réutilisation)
    python3 console_fetch.py https://example.com \
        --login-url https://example.com/login \
        --login-user "#email" --login-pass "#password" \
        --login-submit "button[type=submit]" \
        --login-data "user:pass" \
        --save-storage session.json
    
    # Puis réutiliser la session:
    python3 console_fetch.py https://example.com/dashboard --storage session.json

FORMAT DU FICHIER GÉNÉRÉ:
    example.com-2026-07-15-08-30-00.md
    ---
    # Console logs - https://example.com
    **Date:** 2026-07-15 08:30:00

    ---
    ❌ **[ERROR]** Failed to load resource: the server responded with a status of 401 ()
    ⚠️ **[WARNING]** [GPT] This ad request is subject to Google's EU User Consent Policy...

    ---
    📊 **Résumé:** 1 erreurs, 1 warnings, 0 logs
    ---

================================================================================
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright


# Token JWT par défaut pour dev.markidiags.com
DEFAULT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNzJkYmNhNjQtY2MyYS00YjkxLTkyZTktNTliYWFkYzA0ZTc4IiwiZXhwIjoxNzg0NzE2OTA2LCJpYXQiOjE3ODQxMTIxMDZ9.ekrhwvwQkKIGm2IuQXCM3M47ap8c0HyzHSta5efO3I8"


def generate_filename(url):
    """Génère un nom de fichier à partir de l'URL complète: host-path-params-date-heure.md"""
    parsed = urlparse(url)
    host = parsed.netloc or parsed.path
    # Nettoyer le host (enlever www., les ports, etc.)
    host = re.sub(r'^www\.', '', host)
    host = host.split(':')[0]
    host = re.sub(r'[^a-zA-Z0-9.-]', '_', host)
    
    # Ajouter le chemin (path)
    path = parsed.path
    if path and path != '/':
        # Nettoyer le chemin: enlever les slashes au début/fin et remplacer les / par -
        path = path.strip('/')
        path = re.sub(r'[^a-zA-Z0-9_-]', '_', path)
        host = f"{host}-{path}"
    
    # Ajouter les query params s'ils existent
    if parsed.query:
        query = re.sub(r'[^a-zA-Z0-9_=]', '_', parsed.query)
        host = f"{host}-{query}"
    
    # Tronquer si trop long (max 100 chars pour le nom de base)
    if len(host) > 100:
        host = host[:100]
    
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    
    return f"{host}-{date_str}-{time_str}.md"


def parse_auth(auth_string):
    """Parse user:password string"""
    if ':' not in auth_string:
        raise ValueError("Format auth invalide. Utilisez: user:password")
    user, password = auth_string.split(':', 1)
    return {"username": user, "password": password}


def perform_login(page, args):
    """Effectue le login automatique sur la page"""
    if not all([args.login_url, args.login_user, args.login_pass, args.login_submit, args.login_data]):
        return False
    
    try:
        # Parser les credentials
        credentials = parse_auth(args.login_data)
        
        if args.stdout:
            print(f"🔐 Connexion à {args.login_url}...")
        
        # Aller sur la page de login
        page.goto(args.login_url, wait_until="networkidle")
        
        # Remplir le formulaire
        page.fill(args.login_user, credentials["username"])
        page.fill(args.login_pass, credentials["password"])
        
        # Cliquer sur submit
        page.click(args.login_submit)
        
        # Attendre la navigation
        page.wait_for_load_state("networkidle")
        
        if args.stdout:
            print("✅ Connecté avec succès")
        
        return True
        
    except Exception as e:
        if args.stdout:
            print(f"❌ Erreur de connexion: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Récupère les logs console d'une page web",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples d'utilisation:

  # Par défaut: sauvegarde dans un fichier markdown (token JWT injecté automatiquement)
  %(prog)s https://dev.markidiags.com/dashboard

  # Désactiver le token par défaut
  %(prog)s https://example.com --no-default-token

  # Afficher dans la console
  %(prog)s https://example.com --stdout

  # Format JSON
  %(prog)s https://example.com --json

  # Filtrer uniquement les erreurs
  %(prog)s https://example.com --filter error

  # Basic Auth
  %(prog)s https://example.com --auth user:pass

  # Avec cookies
  %(prog)s https://example.com --cookies cookies.json

  # Avec localStorage (token JWT personnalisé)
  %(prog)s https://example.com --localstorage "token:eyJhbGci..."

  # Login automatique
  %(prog)s https://example.com --login-url https://example.com/login \
      --login-user "#email" --login-pass "#password" \
      --login-submit "button[type=submit]" --login-data "user:pass"
        """
    )
    parser.add_argument("url", help="URL à inspecter")
    parser.add_argument("--filter", choices=["error", "warn", "log", "all"], default="all",
                        help="Filtrer par type de message (default: all)")
    parser.add_argument("--wait", type=int, default=10000,
                        help="Temps d'attente après chargement en ms (default: 10000 = 10s). Augmentez pour capturer les erreurs async.")
    parser.add_argument("--json", action="store_true",
                        help="Sortie au format JSON (extension .json au lieu de .md)")
    parser.add_argument("-o", "--output", type=str,
                        help="Fichier de sortie personnalisé (sinon auto-généré)")
    parser.add_argument("--stdout", action="store_true",
                        help="Afficher dans la console au lieu de sauvegarder")
    parser.add_argument("--no-timestamp", action="store_true",
                        help="Ne pas ajouter la date/heure dans le contenu du fichier")
    
    # Options d'authentification
    parser.add_argument("--auth", type=str,
                        help="Basic Auth au format 'user:password'")
    parser.add_argument("--cookies", type=str,
                        help="Fichier JSON contenant les cookies")
    parser.add_argument("--storage", type=str,
                        help="Fichier storage state (cookies + local/session storage)")
    parser.add_argument("--save-storage", type=str,
                        help="Sauvegarder le storage state après connexion")
    parser.add_argument("--localstorage", action="append", type=str,
                        help="Injecter dans localStorage au format KEY:VALUE (répétable)")
    parser.add_argument("--no-default-token", action="store_true",
                        help="Ne pas injecter le token JWT par défaut")
    
    # Options de login automatique
    parser.add_argument("--login-url", type=str,
                        help="URL de la page de login")
    parser.add_argument("--login-user", type=str,
                        help="Sélecteur CSS du champ username/email")
    parser.add_argument("--login-pass", type=str,
                        help="Sélecteur CSS du champ password")
    parser.add_argument("--login-submit", type=str,
                        help="Sélecteur CSS du bouton de connexion")
    parser.add_argument("--login-data", type=str,
                        help="Credentials au format 'user:password'")
    
    args = parser.parse_args()
    
    # Injecter le token par défaut si --no-default-token n'est pas utilisé
    # et si aucun localstorage avec clé "token" n'est déjà fourni
    if not args.no_default_token:
        has_token = False
        if args.localstorage:
            for item in args.localstorage:
                if item.startswith("token:"):
                    has_token = True
                    break
        if not has_token:
            if args.localstorage is None:
                args.localstorage = []
            args.localstorage.append(f"token:{DEFAULT_TOKEN}")
    
    console_logs = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Préparer le contexte avec auth si nécessaire
        context_options = {}
        
        # Basic Auth
        if args.auth:
            auth = parse_auth(args.auth)
            context_options["http_credentials"] = auth
        
        # Storage state (cookies + local/session storage)
        if args.storage:
            if Path(args.storage).exists():
                context_options["storage_state"] = args.storage
            else:
                print(f"⚠️ Fichier storage non trouvé: {args.storage}", file=sys.stderr)
        
        # Cookies JSON
        if args.cookies and not args.storage:
            if Path(args.cookies).exists():
                with open(args.cookies, 'r') as f:
                    cookies = json.load(f)
                    context_options["cookies"] = cookies
            else:
                print(f"⚠️ Fichier cookies non trouvé: {args.cookies}", file=sys.stderr)
        
        context = browser.new_context(**context_options)
        page = context.new_page()
        
        # Capturer tous les messages console
        def handle_console(msg):
            entry = {
                "type": msg.type,
                "text": msg.text,
                "location": msg.location if hasattr(msg, "location") else {}
            }
            console_logs.append(entry)
            
            # Affichage en temps réel si mode stdout
            if args.stdout and not args.json:
                if args.filter == "all" or msg.type == args.filter:
                    icon = "❌" if msg.type == "error" else "⚠️" if msg.type == "warning" else "ℹ️"
                    print(f"{icon} [{msg.type.upper()}] {msg.text}")
        
        page.on("console", handle_console)
        
        # Capturer aussi les erreurs de page
        def handle_page_error(error):
            entry = {
                "type": "page_error",
                "text": str(error),
            }
            console_logs.append(entry)
            if args.stdout and not args.json:
                print(f"💥 [PAGE ERROR] {error}")
        
        page.on("pageerror", handle_page_error)
        
        # Capturer TOUTES les réponses réseau (succès et erreurs)
        def handle_response(response):
            entry = {
                "type": "network" if response.status < 400 else "network_error",
                "text": f"HTTP {response.status} {response.status_text} - {response.url}",
                "status": response.status,
                "url": response.url
            }
            console_logs.append(entry)
            if args.stdout and not args.json:
                icon = "✅" if response.status < 400 else "🌐"
                print(f"{icon} [NETWORK] HTTP {response.status} {response.status_text} - {response.url}")
        
        page.on("response", handle_response)
        
        # Capturer les requêtes échouées
        def handle_request_failed(request):
            try:
                failure = request.failure
                if isinstance(failure, dict):
                    error_text = failure.get('errorText', 'Unknown error')
                else:
                    error_text = str(failure) if failure else 'Unknown error'
            except:
                error_text = 'Unknown error'
            entry = {
                "type": "network_failed",
                "text": f"Request failed: {request.url} - {error_text}",
                "url": request.url
            }
            console_logs.append(entry)
            if args.stdout and not args.json:
                print(f"🌐 [REQUEST FAILED] {request.url} - {error_text}")
        
        page.on("requestfailed", handle_request_failed)
        
        # Capturer les requêtes pour voir tout ce qui est envoyé
        def handle_request(request):
            if args.stdout and not args.json:
                # Afficher seulement les requêtes API pour debug
                if '/api/' in request.url:
                    print(f"📤 [REQUEST] {request.method} {request.url}")
        
        page.on("request", handle_request)
        
        # Injecter les valeurs dans localStorage APRÈS être sur le bon domaine
        if args.localstorage:
            if args.stdout:
                print(f"🌐 Chargement initial pour injecter le localStorage...")
            # Aller d'abord sur la page pour être sur le bon domaine
            try:
                page.goto(args.url, wait_until="domcontentloaded", timeout=10000)
            except:
                pass
            # Injecter les valeurs
            for ls_item in args.localstorage:
                if ':' not in ls_item:
                    print(f"⚠️ Format localStorage invalide: {ls_item} (attendu: KEY:VALUE)", file=sys.stderr)
                    continue
                key, value = ls_item.split(':', 1)
                page.evaluate(f"localStorage.setItem({json.dumps(key)}, {json.dumps(value)});")
                if args.stdout:
                    print(f"💾 localStorage set: {key} = {value[:30]}...")
            if args.stdout:
                print(f"✅ localStorage injecté: {len(args.localstorage)} valeur(s)")
        
        # Login automatique si demandé
        if args.login_url:
            perform_login(page, args)
        
        try:
            # Naviguer vers la page cible (recharger si localStorage injecté)
            if args.stdout:
                print(f"🌐 Chargement de {args.url}...")
            page.goto(args.url, wait_until="networkidle")
            
            # Attendre pour capturer les erreurs async (XHR/fetch)
            if args.stdout:
                print(f"⏳ Attente de {args.wait}ms pour les logs async...")
            page.wait_for_timeout(args.wait)
            
            if args.stdout:
                print(f"✅ Capture terminée ({len(console_logs)} logs capturés)")
                
        except Exception as e:
            if args.stdout:
                print(f"❌ Erreur de chargement: {e}", file=sys.stderr)
        
        # Sauvegarder le storage state si demandé
        if args.save_storage:
            context.storage_state(path=args.save_storage)
            if args.stdout:
                print(f"💾 Session sauvegardée: {args.save_storage}")
        
        context.close()
        browser.close()
    
    # Préparer les résultats
    now = datetime.now()
    
    if args.json:
        filtered = console_logs if args.filter == "all" else [log for log in console_logs if log["type"] == args.filter]
        output_text = json.dumps(filtered, indent=2, ensure_ascii=False)
    else:
        lines = []
        
        if not args.no_timestamp:
            lines.append(f"# Console logs - {args.url}")
            lines.append(f"**Date:** {now.strftime('%Y-%m-%d %H:%M:%S')}")
            lines.append("")
            lines.append("---")
            lines.append("")
        
        # Logs filtrés
        filtered_logs = [log for log in console_logs if args.filter == "all" or log["type"] == args.filter]
        
        if filtered_logs:
            for log in filtered_logs:
                if not args.no_timestamp:
                    # Choisir l'icône selon le type
                    if log["type"] == "error" or log["type"] == "page_error":
                        icon = "❌"
                    elif log["type"] == "warning":
                        icon = "⚠️"
                    elif log["type"] == "network":
                        icon = "✅"
                    elif log["type"] in ["network_error", "network_failed"]:
                        icon = "🌐"
                    else:
                        icon = "ℹ️"
                    lines.append(f"{icon} **[{log['type'].upper()}]** {log['text']}")
                else:
                    lines.append(f"[{log['type'].upper()}] {log['text']}")
        else:
            lines.append("*Aucun log correspondant aux critères.*")
        
        # Résumé
        errors = len([l for l in console_logs if l["type"] == "error"])
        warns = len([l for l in console_logs if l["type"] == "warning"])
        logs = len([l for l in console_logs if l["type"] == "log"])
        network_ok = len([l for l in console_logs if l["type"] == "network"])
        network_errors = len([l for l in console_logs if l["type"] in ["network_error", "network_failed"]])
        
        if not args.no_timestamp:
            lines.append("")
            lines.append("---")
            lines.append("")
            lines.append(f"📊 **Résumé:** {errors} erreurs, {warns} warnings, {logs} logs | Réseau: {network_ok} OK, {network_errors} erreurs")
        
        output_text = "\n".join(lines)
    
    # Déterminer la sortie
    if args.stdout:
        print(output_text)
    else:
        # Générer le nom de fichier
        if args.output:
            filepath = Path(args.output)
        else:
            filename = generate_filename(args.url)
            if args.json:
                filename = filename.replace('.md', '.json')
            filepath = Path(filename)
        
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(output_text)
                if not args.json:
                    f.write("\n")
            print(f"💾 Sauvegardé: {filepath.absolute()}")
        except IOError as e:
            print(f"❌ Erreur de sauvegarde: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
