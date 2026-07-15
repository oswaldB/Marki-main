# pages.py - Routes pages (Static-First)

**Fichier** : `app/routes/pages.py`  
**Blueprint** : `pages_bp` (préfixe `/`)

## Description

Sert les fichiers HTML statiques depuis `static/pages/`.
Utilise `send_from_directory` au lieu de `render_template`.

## Principe

- URLs propres : `/impayes/123` (pas `/impayes-detail.html?id=123`)
- Le HTML est statique, le JS extrait l'ID de `window.location.pathname`
- Une route Flask = un dossier dans `static/pages/`

## Routes simples

| Route | Dossier servi | Fichier |
|-------|---------------|---------|
| GET `/` | `static/pages/login/` | index.html |
| GET `/login` | `static/pages/login/` | index.html |
| GET `/dashboard` | `static/pages/dashboard/` | index.html |
| GET `/impayes` | `static/pages/impayes/` | index.html |
| GET `/relances` | `static/pages/relances/` | index.html |
| GET `/sequences` | `static/pages/sequences/` | index.html |
| GET `/contacts` | `static/pages/contacts/` | index.html |
| GET `/settings` | `static/pages/settings/` | index.html |
| GET `/portail` | `static/pages/portail/` | index.html |
| GET `/evenements` | `static/pages/evenements/` | index.html |
| GET `/smart-marki` | `static/pages/smart-marki/` | index.html |

## Routes dynamiques

| Route | Dossier servi | Paramètre JS |
|-------|---------------|--------------|
| GET `/impayes/<id>` | `static/pages/impayes-detail/` | `extractId('/impayes/:id')` |
| GET `/impayes/<id>/reparer` | `static/pages/impayes-reparer/` | `extractId('/impayes/:id/reparer')` |
| GET `/impayes/payeur` | `static/pages/impayes-payeur/` | - |
| GET `/impayes/suspendus` | `static/pages/impayes-suspendus/` | - |
| GET `/relances/<id>` | `static/pages/relances-detail/` | `extractId('/relances/:id')` |
| GET `/relances/calendrier` | `static/pages/relances-calendrier/` | - |
| GET `/relances/validation` | `static/pages/relances-validation/` | - |
| GET `/sequences/<id>/suivi` | `static/pages/sequences-suivi-detail/` | `extractId('/sequences/:id/suivi')` |
| GET `/settings/smtp/<id>` | `static/pages/settings-smtp-detail/` | `extractId('/settings/smtp/:id')` |
| GET `/portail/<token>` | `static/pages/portail-client/` | `extractToken('/portail/:token')` |

## Implémentation

```python
def serve_page(page_name):
    """Sert index.html d'un dossier de pages."""
    return send_from_directory(
        os.path.join(PAGES_DIR, page_name), 
        'index.html'
    )

@pages_bp.route('/impayes/<int:impaye_id>')
def impayes_detail(impaye_id):
    """URL /impayes/123 -> sert impayes-detail/index.html"""
    return serve_page('impayes-detail')
```

## Extraction côté client

Dans le HTML statique :

```javascript
// Extraire ID de /impayes/123
const id = extractUrlParam('/impayes/:id'); // "123"

// Appel API
fetch(`/api/impayes/${id}`)
```

@pages_bp.route('/settings/smtp')
def settings_smtp():
    """URL: /settings/smtp"""
    return serve_page('settings-smtp')

@pages_bp.route('/settings/users')
def settings_users():
    """URL: /settings/users"""
    return serve_page('settings-users')

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `GET /` | 1 | `print(f"[API.PAGES.SERVE] START: Route racine '/'")` | Début |
| `GET /` | 2 | `print(f"[API.PAGES.SERVE] STEP: Servir login/index.html")` | Sert login |
| `GET /` | 3 | `print(f"[API.PAGES.SERVE] ERROR: Dossier login/ introuvable")` | Dossier manquant |
| `GET /` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page racine servie")` | Succès |
| `GET /login` | 1 | `print(f"[API.PAGES.SERVE] START: page=login")` | Début |
| `GET /login` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(login/, index.html)")` | Sert fichier |
| `GET /login` | 3 | `print(f"[API.PAGES.SERVE] ERROR: login/index.html absent")` | 404 fichier |
| `GET /login` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page login servie")` | Succès |
| `GET /dashboard` | 1 | `print(f"[API.PAGES.SERVE] START: page=dashboard")` | Début |
| `GET /dashboard` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(dashboard/, index.html)")` | Sert fichier |
| `GET /dashboard` | 3 | `print(f"[API.PAGES.SERVE] ERROR: dashboard/index.html absent")` | 404 fichier |
| `GET /dashboard` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page dashboard servie")` | Succès |
| `GET /impayes` | 1 | `print(f"[API.PAGES.SERVE] START: page=impayes")` | Début |
| `GET /impayes` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(impayes/, index.html)")` | Sert fichier |
| `GET /impayes` | 3 | `print(f"[API.PAGES.SERVE] ERROR: impayes/index.html absent")` | 404 fichier |
| `GET /impayes` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page impayes servie")` | Succès |
| `GET /relances` | 1 | `print(f"[API.PAGES.SERVE] START: page=relances")` | Début |
| `GET /relances` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(relances/, index.html)")` | Sert fichier |
| `GET /relances` | 3 | `print(f"[API.PAGES.SERVE] ERROR: relances/index.html absent")` | 404 fichier |
| `GET /relances` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page relances servie")` | Succès |
| `GET /sequences` | 1 | `print(f"[API.PAGES.SERVE] START: page=sequences")` | Début |
| `GET /sequences` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(sequences/, index.html)")` | Sert fichier |
| `GET /sequences` | 3 | `print(f"[API.PAGES.SERVE] ERROR: sequences/index.html absent")` | 404 fichier |
| `GET /sequences` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page sequences servie")` | Succès |
| `GET /contacts` | 1 | `print(f"[API.PAGES.SERVE] START: page=contacts")` | Début |
| `GET /contacts` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(contacts/, index.html)")` | Sert fichier |
| `GET /contacts` | 3 | `print(f"[API.PAGES.SERVE] ERROR: contacts/index.html absent")` | 404 fichier |
| `GET /contacts` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page contacts servie")` | Succès |
| `GET /settings` | 1 | `print(f"[API.PAGES.SERVE] START: page=settings")` | Début |
| `GET /settings` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(settings/, index.html)")` | Sert fichier |
| `GET /settings` | 3 | `print(f"[API.PAGES.SERVE] ERROR: settings/index.html absent")` | 404 fichier |
| `GET /settings` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page settings servie")` | Succès |
| `GET /portail` | 1 | `print(f"[API.PAGES.SERVE] START: page=portail (back-office)")` | Début back-office |
| `GET /portail` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(portail/, index.html)")` | Sert fichier |
| `GET /portail` | 3 | `print(f"[API.PAGES.SERVE] ERROR: portail/index.html absent")` | 404 fichier |
| `GET /portail` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page portail BO servie")` | Succès |
| `GET /evenements` | 1 | `print(f"[API.PAGES.SERVE] START: page=evenements")` | Début |
| `GET /evenements` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(evenements/, index.html)")` | Sert fichier |
| `GET /evenements` | 3 | `print(f"[API.PAGES.SERVE] ERROR: evenements/index.html absent")` | 404 fichier |
| `GET /evenements` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page evenements servie")` | Succès |
| `GET /smart-marki` | 1 | `print(f"[API.PAGES.SERVE] START: page=smart-marki")` | Début |
| `GET /smart-marki` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(smart-marki/, index.html)")` | Sert fichier |
| `GET /smart-marki` | 3 | `print(f"[API.PAGES.SERVE] ERROR: smart-marki/index.html absent")` | 404 fichier |
| `GET /smart-marki` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page smart-marki servie")` | Succès |
| `GET /impayes/<int:impaye_id>` | 1 | `print(f"[API.PAGES.SERVE] START: page=impayes-detail impaye_id={impaye_id}")` | Début détail |
| `GET /impayes/<int:impaye_id>` | 2 | `print(f"[API.PAGES.SERVE] STEP: Extraction ID depuis path={impaye_id}")` | Lecture param |
| `GET /impayes/<int:impaye_id>` | 3 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(impayes-detail/, index.html)")` | Sert fichier |
| `GET /impayes/<int:impaye_id>` | 4 | `print(f"[API.PAGES.SERVE] ERROR: Dossier impayes-detail/ introuvable")` | Dossier absent |
| `GET /impayes/<int:impaye_id>` | 5 | `print(f"[API.PAGES.SERVE] ERROR: impaye_id invalide (non numérique)")` | Cast échoué |
| `GET /impayes/<int:impaye_id>` | 6 | `print(f"[API.PAGES.SERVE] SUCCESS: Page détail impaye_id={impaye_id} servie")` | Succès |
| `GET /impayes/<int:impaye_id>/reparer` | 1 | `print(f"[API.PAGES.SERVE] START: page=impayes-reparer impaye_id={impaye_id}")` | Début reparer |
| `GET /impayes/<int:impaye_id>/reparer` | 2 | `print(f"[API.PAGES.SERVE] STEP: Extraction ID impaye_id={impaye_id}")` | Lecture param |
| `GET /impayes/<int:impaye_id>/reparer` | 3 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(impayes-reparer/, index.html)")` | Sert fichier |
| `GET /impayes/<int:impaye_id>/reparer` | 4 | `print(f"[API.PAGES.SERVE] ERROR: Dossier impayes-reparer/ introuvable")` | Dossier absent |
| `GET /impayes/<int:impaye_id>/reparer` | 5 | `print(f"[API.PAGES.SERVE] SUCCESS: Page reparer impaye_id={impaye_id} servie")` | Succès |
| `GET /impayes/payeur` | 1 | `print(f"[API.PAGES.SERVE] START: page=impayes-payeur")` | Début |
| `GET /impayes/payeur` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(impayes-payeur/, index.html)")` | Sert fichier |
| `GET /impayes/payeur` | 3 | `print(f"[API.PAGES.SERVE] ERROR: impayes-payeur/index.html absent")` | 404 fichier |
| `GET /impayes/payeur` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page payeur servie")` | Succès |
| `GET /impayes/suspendus` | 1 | `print(f"[API.PAGES.SERVE] START: page=impayes-suspendus")` | Début |
| `GET /impayes/suspendus` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(impayes-suspendus/, index.html)")` | Sert fichier |
| `GET /impayes/suspendus` | 3 | `print(f"[API.PAGES.SERVE] ERROR: impayes-suspendus/index.html absent")` | 404 fichier |
| `GET /impayes/suspendus` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page suspendus servie")` | Succès |
| `GET /relances/<int:relance_id>` | 1 | `print(f"[API.PAGES.SERVE] START: page=relances-detail relance_id={relance_id}")` | Début détail |
| `GET /relances/<int:relance_id>` | 2 | `print(f"[API.PAGES.SERVE] STEP: Extraction ID relance_id={relance_id}")` | Lecture param |
| `GET /relances/<int:relance_id>` | 3 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(relances-detail/, index.html)")` | Sert fichier |
| `GET /relances/<int:relance_id>` | 4 | `print(f"[API.PAGES.SERVE] ERROR: Dossier relances-detail/ introuvable")` | Dossier absent |
| `GET /relances/<int:relance_id>` | 5 | `print(f"[API.PAGES.SERVE] SUCCESS: Page détail relance_id={relance_id} servie")` | Succès |
| `GET /relances/calendrier` | 1 | `print(f"[API.PAGES.SERVE] START: page=relances-calendrier")` | Début |
| `GET /relances/calendrier` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(relances-calendrier/, index.html)")` | Sert fichier |
| `GET /relances/calendrier` | 3 | `print(f"[API.PAGES.SERVE] ERROR: relances-calendrier/index.html absent")` | 404 fichier |
| `GET /relances/calendrier` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page calendrier servie")` | Succès |
| `GET /relances/validation` | 1 | `print(f"[API.PAGES.SERVE] START: page=relances-validation")` | Début |
| `GET /relances/validation` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(relances-validation/, index.html)")` | Sert fichier |
| `GET /relances/validation` | 3 | `print(f"[API.PAGES.SERVE] ERROR: relances-validation/index.html absent")` | 404 fichier |
| `GET /relances/validation` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page validation servie")` | Succès |
| `GET /sequences/<int:sequence_id>/suivi` | 1 | `print(f"[API.PAGES.SERVE] START: page=sequences-suivi-detail sequence_id={sequence_id}")` | Début |
| `GET /sequences/<int:sequence_id>/suivi` | 2 | `print(f"[API.PAGES.SERVE] STEP: Extraction ID sequence_id={sequence_id}")` | Lecture param |
| `GET /sequences/<int:sequence_id>/suivi` | 3 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(sequences-suivi-detail/, index.html)")` | Sert fichier |
| `GET /sequences/<int:sequence_id>/suivi` | 4 | `print(f"[API.PAGES.SERVE] ERROR: Dossier sequences-suivi-detail/ introuvable")` | Dossier absent |
| `GET /sequences/<int:sequence_id>/suivi` | 5 | `print(f"[API.PAGES.SERVE] SUCCESS: Page suivi sequence_id={sequence_id} servie")` | Succès |
| `GET /settings/smtp/<int:smtp_id>` | 1 | `print(f"[API.PAGES.SERVE] START: page=settings-smtp-detail smtp_id={smtp_id}")` | Début |
| `GET /settings/smtp/<int:smtp_id>` | 2 | `print(f"[API.PAGES.SERVE] STEP: Extraction ID smtp_id={smtp_id}")` | Lecture param |
| `GET /settings/smtp/<int:smtp_id>` | 3 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(settings-smtp-detail/, index.html)")` | Sert fichier |
| `GET /settings/smtp/<int:smtp_id>` | 4 | `print(f"[API.PAGES.SERVE] ERROR: Dossier settings-smtp-detail/ introuvable")` | Dossier absent |
| `GET /settings/smtp/<int:smtp_id>` | 5 | `print(f"[API.PAGES.SERVE] SUCCESS: Page détail smtp_id={smtp_id} servie")` | Succès |
| `GET /portail/<string:token>` | 1 | `print(f"[API.PAGES.SERVE] START: page=portail-client token=***")` | Début (token masqué) |
| `GET /portail/<string:token>` | 2 | `print(f"[API.PAGES.SERVE] STEP: Extraction token depuis path len={len(token)}")` | Lecture param (masqué) |
| `GET /portail/<string:token>` | 3 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(portail-client/, index.html)")` | Sert fichier |
| `GET /portail/<string:token>` | 4 | `print(f"[API.PAGES.SERVE] ERROR: Token absent ou vide")` | Token manquant |
| `GET /portail/<string:token>` | 5 | `print(f"[API.PAGES.SERVE] ERROR: Dossier portail-client/ introuvable")` | Dossier absent |
| `GET /portail/<string:token>` | 6 | `print(f"[API.PAGES.SERVE] SUCCESS: Page portail client servie token_len={len(token)}")` | Succès (masqué) |
| `GET /settings/smtp` | 1 | `print(f"[API.PAGES.SERVE] START: page=settings-smtp")` | Début |
| `GET /settings/smtp` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(settings-smtp/, index.html)")` | Sert fichier |
| `GET /settings/smtp` | 3 | `print(f"[API.PAGES.SERVE] ERROR: settings-smtp/index.html absent")` | 404 fichier |
| `GET /settings/smtp` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page smtp servie")` | Succès |
| `GET /settings/users` | 1 | `print(f"[API.PAGES.SERVE] START: page=settings-users")` | Début |
| `GET /settings/users` | 2 | `print(f"[API.PAGES.SERVE] STEP: send_from_directory(settings-users/, index.html)")` | Sert fichier |
| `GET /settings/users` | 3 | `print(f"[API.PAGES.SERVE] ERROR: settings-users/index.html absent")` | 404 fichier |
| `GET /settings/users` | 4 | `print(f"[API.PAGES.SERVE] SUCCESS: Page users servie")` | Succès |
| `serve_page` | 1 | `print(f"[API.PAGES.SERVE] HELPER: serve_page(page_name={page_name})")` | Entrée helper |
| `serve_page` | 2 | `print(f"[API.PAGES.SERVE] HELPER: STEP: Construction chemin PAGES_DIR/{page_name}")` | Construction path |
| `serve_page` | 3 | `print(f"[API.PAGES.SERVE] HELPER: ERROR: Dossier {page_name}/ introuvable")` | NotFound 404 |
| `serve_page` | 4 | `print(f"[API.PAGES.SERVE] HELPER: SUCCESS: {page_name}/index.html servi")` | Fichier envoyé |
