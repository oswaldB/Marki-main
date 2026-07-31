"""Blueprint healthy pour les tests de santé."""
from flask import Blueprint, jsonify, render_template
from pathlib import Path
import sqlite3

bp = Blueprint('healthy', __name__, template_folder='templates')


def check_database():
    """Vérifie la connexion à la base de données SQLite."""
    try:
        project_root = Path(__file__).parent.parent.parent.parent
        db_path = project_root / 'instance' / 'marki.db'
        db_path_str = str(db_path.resolve())
        
        if not db_path.exists():
            return {"ok": False, "error": "Database not found"}
        
        conn = sqlite3.connect(db_path_str, timeout=5)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
        return {"ok": True, "type": "sqlite"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@bp.route('/')
def healthy_check():
    """Page HTML de santé."""
    db_result = check_database()
    return render_template('healthy/index.html', db_status=db_result)


@bp.route('/healthy')
def api_healthy():
    """Endpoint JSON de santé pour /api/healthy."""
    db_status = check_database()
    response = {
        "status": "ok" if db_status["ok"] else "error",
        "checks": {
            "database": db_status
        }
    }
    status_code = 200 if db_status["ok"] else 503
    return jsonify(response), status_code
