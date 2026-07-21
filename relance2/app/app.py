"""Application Flask principale."""

from flask import Flask, render_template, g, redirect, url_for
import sys
import os

# Ajoute le dossier parent au path pour importer workflows
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import close_db
from routes.auth import auth_bp, require_auth
from routes.impayes import impayes_bp
from routes.events import events_bp
from routes.relances import relances_bp
from routes.contacts import contacts_bp, contacts_api_bp

app = Flask(__name__)

# Configuration base de données
app.config['DATABASE'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'marki.db')

# Enregistrement des blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(impayes_bp)
app.register_blueprint(events_bp)
app.register_blueprint(relances_bp)
app.register_blueprint(contacts_bp)
app.register_blueprint(contacts_api_bp)

# Fermeture auto de la connexion DB à la fin des requêtes
@app.teardown_appcontext
def teardown_db(exception):
    close_db()


@app.route('/')
def index():
    """Redirection vers login."""
    return redirect(url_for('login_page'))


@app.route('/login')
def login_page():
    """Page de connexion."""
    return render_template('login.html')


@app.route('/dashboard')
def dashboard_page():
    """Page tableau de bord."""
    return render_template('dashboard/index.html')


@app.route('/impayes')
def impayes_page():
    """Page impayés."""
    return render_template('impayes/index.html')


@app.route('/impayes/payeur')
def impayes_payeur_page_redirect():
    """Redirect ancienne URL vers nouvelle."""
    return redirect('/impayes-payeur')


@app.route('/impayes-payeur')
def impayes_payeur_page():
    """Page impayés par payeur."""
    return render_template('impayes-payeur/index.html')


@app.route('/impayes/suspendus')
def impayes_suspendus_page_redirect():
    """Redirect ancienne URL vers nouvelle."""
    return redirect('/impayes-suspendus')


@app.route('/impayes-suspendus')
def impayes_suspendus_page():
    """Page impayés suspendus."""
    return render_template('impayes-suspendus/index.html')


@app.route('/impayes/reparer')
def impayes_reparer_page():
    """Page impayés à réparer."""
    return render_template('impayes/reparer.html')


@app.route('/impayes-detail/<id>')
def impayes_detail_page(id):
    """Page détail impayé."""
    return render_template('impayes-detail/index.html', impaye_id=id)


@app.route('/contacts')
def contacts_page():
    """Page contacts."""
    return render_template('contacts/index.html')


@app.route('/contacts/blacklist')
def contacts_blacklist_page():
    """Page contacts blacklistés."""
    return render_template('contact-blacklist/index.html')


@app.route('/contacts/sans-email')
def contacts_sans_email_page():
    """Page contacts sans email."""
    return render_template('contacts-sans-email/index.html')


@app.route('/sequences')
def sequences_page():
    """Page séquences."""
    return "Page Séquences - À implémenter"


@app.route('/relances')
def relances_page():
    """Page relances."""
    return "Page Relances - À implémenter"


@app.route('/evenements')
def evenements_page():
    """Page événements."""
    return "Page Événements - À implémenter"


@app.route('/smart-marki')
def smart_marki_page():
    """Page Smart Marki."""
    return "Page Smart Marki - À implémenter"


@app.route('/settings')
def settings_page():
    """Page paramètres."""
    return "Page Paramètres - À implémenter"


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
