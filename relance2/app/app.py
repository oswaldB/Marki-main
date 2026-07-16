from flask import Flask, render_template, send_from_directory
import os
from .db import init_app as init_db
from .routes import register_blueprints
from .middleware_logger import init_logging

def create_app():
    app = Flask(__name__, template_folder='templates', static_folder='static')
    app.config['SECRET_KEY'] = 'votre-secret-jwt-tres-long-pour-marki-2026'
    
    # Initialize database
    init_db(app)
    
    # Initialize logging middleware
    init_logging(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Routes pages
    @app.route('/')
    def index():
        return render_template('layouts/layout_app.html')
    
    @app.route('/login')
    def login_page():
        return render_template('login/index.html')
    
    @app.route('/dashboard')
    def dashboard_page():
        return render_template('layouts/layout_app.html', page_title='Dashboard', active_page='dashboard')
    
    @app.route('/impayes')
    def impayes_page():
        return render_template('layouts/layout_app.html', page_title='Impayés', active_page='impayes')
    
    @app.route('/impayes-payeur')
    def impayes_payeur_page():
        return render_template('impayes_payeur/index.html', page_title='Impayés par Payeur', active_page='impayes-payeur')
    
    @app.route('/impayes-suspendus')
    def impayes_suspendus_page():
        return render_template('impayes_suspendus/index.html', page_title='Impayés Suspendus', active_page='impayes-suspendus')
    
    @app.route('/contacts')
    def contacts_page():
        return render_template('layouts/layout_app.html', page_title='Contacts', active_page='contacts')
    
    @app.route('/relances')
    def relances_page():
        return render_template('layouts/layout_app.html', page_title='Relances', active_page='relances-liste')
    
    @app.route('/sequences')
    def sequences_page():
        return render_template('layouts/layout_app.html', page_title='Séquences', active_page='sequences')
    
    @app.route('/sequences/<id>')
    def sequences_detail_page(id):
        return render_template('sequences_relance_detail/index.html', page_title='Détail Séquence', active_page='sequences', sequence_id=id)
    
    @app.route('/sequences/suivi/<id>')
    def sequences_suivi_detail_page(id):
        return render_template('sequences_suivi_detail/index.html', page_title='Détail Séquence Suivi', active_page='sequences', sequence_id=id)
    
    @app.route('/evenements')
    def evenements_page():
        return render_template('layouts/layout_app.html', page_title='Événements', active_page='evenements')
    
    @app.route('/smart-marki')
    def smart_marki_page():
        return render_template('layouts/layout_app.html', page_title='Smart Marki', active_page='smart-marki')
    
    @app.route('/settings')
    def settings_page():
        return render_template('settings/index.html', page_title='Paramètres', active_page='settings')
    
    @app.route('/settings-smtp')
    def settings_smtp_page():
        return render_template('settings_smtp/index.html', page_title='Configuration SMTP', active_page='settings-smtp')
    
    @app.route('/settings-utilisateurs')
    def settings_users_page():
        return render_template('settings_utilisateurs/index.html', page_title='Utilisateurs', active_page='settings-utilisateurs')
    
    @app.route('/relances-calendrier')
    def relances_calendrier_page():
        return render_template('relances_calendrier/index.html', page_title='Calendrier', active_page='relances-calendrier')
    
    @app.route('/relances-validation')
    def relances_validation_page():
        return render_template('relances_validation/index.html', page_title='Validation', active_page='relances-validation')
    
    @app.route('/settings-smtp/new')
    def settings_smtp_new_page():
        return render_template('settings_smtp_detail/index.html', page_title='Nouveau Profil SMTP', active_page='settings-smtp')
    
    @app.route('/settings-smtp/<id>')
    def settings_smtp_detail_page(id):
        return render_template('settings_smtp_detail/index.html', page_title='Configuration SMTP', active_page='settings-smtp')
    
    @app.route('/impayes/<id>')
    def impayes_detail_page(id):
        return render_template('impayes_detail/index.html', page_title='Détail Impayé', active_page='impayes')
    
    # Favicon
    @app.route('/favicon.ico')
    def favicon():
        return '', 204
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
