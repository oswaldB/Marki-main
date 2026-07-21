#!/usr/bin/env python3
"""
Script de migration Parse Server → SQLite pour l'application Marki.

Ce script migre toutes les données de la base Parse vers la base SQLite locale.
Usage:
    python migrate_parse_to_sqlite.py [--setup] [--table TABLE] [--dry-run] [--verbose]
"""

import argparse
import json
import logging
import sqlite3
import sys
import uuid
from datetime import datetime
from typing import Any, Optional
from urllib import request, error
from urllib.parse import urlencode


# Configuration
PARSE_CONFIG = {
    "server_url": "http://localhost:1556/api/parse",
    "application_id": "adti-marki",
    "master_key": "e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9",
}

SQLITE_PATH = "app/data/marki.db"
BATCH_SIZE = 1000

# Classes Parse à migrer (ordre important pour les FK)
MIGRATION_ORDER = [
    "_User",
    "Contact",
    "Sequence",
    "SmtpProfile",
    "Impaye",
    "Relance",
    "Activite",
    "LienPaiement",
    "OptionsDynamiques",
    "Suivi",
]


class ParseClient:
    """Client pour l'API Parse Server."""

    def __init__(self, server_url: str, application_id: str, master_key: str):
        self.server_url = server_url.rstrip("/")
        self.application_id = application_id
        self.master_key = master_key

    def _make_request(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """Effectue une requête GET vers l'API Parse."""
        url = f"{self.server_url}/{endpoint}"
        if params:
            url += "?" + urlencode(params)

        req = request.Request(
            url,
            headers={
                "X-Parse-Application-Id": self.application_id,
                "X-Parse-Master-Key": self.master_key,
                "Content-Type": "application/json",
            },
        )

        try:
            with request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as e:
            logging.error(f"HTTP Error {e.code}: {e.reason}")
            raise
        except error.URLError as e:
            logging.error(f"URL Error: {e.reason}")
            raise

    def fetch_all_objects(self, class_name: str, limit: int = BATCH_SIZE) -> list[dict]:
        """Récupère tous les objets d'une classe Parse avec pagination."""
        all_objects = []
        skip = 0

        while True:
            params = {"limit": limit, "skip": skip, "order": "createdAt"}
            endpoint = f"classes/{class_name}"

            logging.debug(f"Fetching {class_name} skip={skip} limit={limit}")
            response = self._make_request(endpoint, params)

            results = response.get("results", [])
            if not results:
                break

            all_objects.extend(results)
            skip += limit

            logging.info(f"Fetched {len(results)} {class_name} (total: {len(all_objects)})")

            if len(results) < limit:
                break

        return all_objects


class MigrationRunner:
    """Orchestrateur de la migration."""

    def __init__(self, parse_client: ParseClient, db_path: str, dry_run: bool = False):
        self.parse_client = parse_client
        self.db_path = db_path
        self.dry_run = dry_run
        self.conn: Optional[sqlite3.Connection] = None
        self.stats = {}

    def connect(self) -> None:
        """Connexion à la base SQLite."""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        logging.info(f"Connected to SQLite: {self.db_path}")

    def close(self) -> None:
        """Ferme la connexion SQLite."""
        if self.conn:
            self.conn.close()
            logging.info("SQLite connection closed")

    def setup_schema(self) -> None:
        """Crée les tables et colonnes manquantes pour la migration."""
        if self.dry_run:
            logging.info("[DRY RUN] Would setup schema")
            return

        logging.info("Setting up schema...")

        # Colonnes à ajouter aux tables existantes
        schema_updates = [
            # Events
            ("events", "who_id", "TEXT REFERENCES contacts(id)"),
            ("events", "by_marki", "INTEGER DEFAULT 0"),
            ("events", "metadata", "TEXT"),
            # Relances
            ("relances", "smtp_profile_id", "TEXT REFERENCES smtp_profiles(id)"),
            ("relances", "cc", "TEXT"),
            ("relances", "scenario", "TEXT"),
            ("relances", "email_index", "INTEGER"),
            ("relances", "email_sent", "INTEGER DEFAULT 0"),
            ("relances", "erreur_count", "INTEGER DEFAULT 0"),
            ("relances", "last_error", "TEXT"),
            # Sequences
            ("sequences", "scenario", "TEXT"),
            ("sequences", "emails_json", "TEXT"),
            ("sequences", "regles_json", "TEXT"),
            ("sequences", "groupes_regles_json", "TEXT"),
            ("sequences", "attribution_automatique", "INTEGER DEFAULT 0"),
            ("sequences", "lien_paiement", "TEXT"),
            # Impayes - nouvelles FK
            ("impayes", "proprietaire_id", "TEXT REFERENCES contacts(id)"),
            ("impayes", "donneur_ordre_id", "TEXT REFERENCES contacts(id)"),
            ("impayes", "locataire_entrant_id", "TEXT REFERENCES contacts(id)"),
            ("impayes", "locataire_sortant_id", "TEXT REFERENCES contacts(id)"),
            ("impayes", "notaire_id", "TEXT REFERENCES contacts(id)"),
            ("impayes", "syndic_id", "TEXT REFERENCES contacts(id)"),
            ("impayes", "acquereur_id", "TEXT REFERENCES contacts(id)"),
            # Impayes - nouveaux champs
            ("impayes", "total_ht", "REAL DEFAULT 0"),
            ("impayes", "reference", "TEXT"),
            ("impayes", "reference_externe", "TEXT"),
            ("impayes", "statut_dossier", "TEXT"),
            ("impayes", "etage", "TEXT"),
            ("impayes", "entree", "TEXT"),
            ("impayes", "escalier", "TEXT"),
            ("impayes", "porte", "TEXT"),
            ("impayes", "numero_lot", "TEXT"),
            ("impayes", "payeur_civilite", "TEXT"),
            ("impayes", "payeur_type", "TEXT"),
            ("impayes", "payeur_type_personne", "TEXT"),
            ("impayes", "apporteur_nom", "TEXT"),
            ("impayes", "apporteur_prenom", "TEXT"),
            ("impayes", "apporteur_email", "TEXT"),
            ("impayes", "apporteur_telephone", "TEXT"),
            ("impayes", "apporteur_civilite", "TEXT"),
            ("impayes", "proprietaire_nom", "TEXT"),
            ("impayes", "proprietaire_prenom", "TEXT"),
            ("impayes", "proprietaire_email", "TEXT"),
            ("impayes", "proprietaire_telephone", "TEXT"),
            ("impayes", "proprietaire_civilite", "TEXT"),
            ("impayes", "proprietaire_type_personne", "TEXT"),
            ("impayes", "apporteur_prenom", "TEXT"),
            ("impayes", "apporteur_civilite", "TEXT"),
            ("impayes", "donneur_ordre_nom", "TEXT"),
            ("impayes", "donneur_ordre_prenom", "TEXT"),
            ("impayes", "donneur_ordre_email", "TEXT"),
            ("impayes", "donneur_ordre_telephone", "TEXT"),
            ("impayes", "donneur_ordre_civilite", "TEXT"),
            ("impayes", "syndic_nom", "TEXT"),
            ("impayes", "syndic_prenom", "TEXT"),
            ("impayes", "syndic_email", "TEXT"),
            ("impayes", "syndic_telephone", "TEXT"),
            ("impayes", "syndic_civilite", "TEXT"),
            ("impayes", "notaire_nom", "TEXT"),
            ("impayes", "notaire_prenom", "TEXT"),
            ("impayes", "notaire_email", "TEXT"),
            ("impayes", "notaire_telephone", "TEXT"),
            ("impayes", "notaire_civilite", "TEXT"),
            ("impayes", "locataire_entrant_nom", "TEXT"),
            ("impayes", "locataire_entrant_prenom", "TEXT"),
            ("impayes", "locataire_entrant_email", "TEXT"),
            ("impayes", "locataire_entrant_telephone", "TEXT"),
            ("impayes", "locataire_entrant_civilite", "TEXT"),
            ("impayes", "locataire_sortant_nom", "TEXT"),
            ("impayes", "locataire_sortant_prenom", "TEXT"),
            ("impayes", "locataire_sortant_email", "TEXT"),
            ("impayes", "locataire_sortant_telephone", "TEXT"),
            ("impayes", "locataire_sortant_civilite", "TEXT"),
            ("impayes", "acquereur_nom", "TEXT"),
            ("impayes", "acquereur_prenom", "TEXT"),
            ("impayes", "acquereur_email", "TEXT"),
            ("impayes", "acquereur_telephone", "TEXT"),
            ("impayes", "acquereur_civilite", "TEXT"),
            ("impayes", "employe_intervention", "TEXT"),
            ("impayes", "commentaire_dossier", "TEXT"),
            ("impayes", "commentaire_piece", "TEXT"),
            ("impayes", "cadre_mission", "TEXT"),
            ("impayes", "solde", "INTEGER DEFAULT 0"),
            ("impayes", "solde_le", "TEXT"),
            # Suivis (mêmes champs que relances)
            ("suivis", "contact_id", "TEXT REFERENCES contacts(id)"),
            ("suivis", "sequence_id", "TEXT REFERENCES sequences(id)"),
            ("suivis", "smtp_profile_id", "TEXT REFERENCES smtp_profiles(id)"),
            ("suivis", "statut", "TEXT"),
            ("suivis", "date_envoi", "TEXT"),
            ("suivis", "date_programmation", "TEXT"),
            ("suivis", "sujet", "TEXT"),
            ("suivis", "corps", "TEXT"),
            ("suivis", "cc", "TEXT"),
            ("suivis", "scenario", "TEXT"),
            ("suivis", "format", "TEXT"),
            ("suivis", "email_index", "INTEGER"),
            ("suivis", "email_sent", "INTEGER DEFAULT 0"),
            ("suivis", "erreur_count", "INTEGER DEFAULT 0"),
            ("suivis", "last_error", "TEXT"),
            ("suivis", "valide", "INTEGER"),
            ("suivis", "manuelle", "INTEGER"),
        ]

        for table, column, col_type in schema_updates:
            try:
                self.conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
                logging.debug(f"Added column {table}.{column}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    logging.debug(f"Column {table}.{column} already exists")
                else:
                    logging.warning(f"Could not add {table}.{column}: {e}")

        # Création des tables de liaison
        tables_to_create = [
            """
            CREATE TABLE IF NOT EXISTS relance_impayes (
                relance_id TEXT REFERENCES relances(id) ON DELETE CASCADE,
                impaye_id TEXT REFERENCES impayes(id) ON DELETE CASCADE,
                PRIMARY KEY (relance_id, impaye_id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS suivi_impayes (
                suivi_id TEXT REFERENCES suivis(id) ON DELETE CASCADE,
                impaye_id TEXT REFERENCES impayes(id) ON DELETE CASCADE,
                PRIMARY KEY (suivi_id, impaye_id)
            )
            """,
        ]

        for sql in tables_to_create:
            try:
                self.conn.execute(sql)
                logging.debug(f"Created table: {sql.split('(')[0].strip()}")
            except sqlite3.OperationalError as e:
                logging.debug(f"Table may already exist: {e}")

        self.conn.commit()
        logging.info("Schema setup complete")

    def run_migration(self, table_filter: Optional[str] = None) -> dict:
        """Exécute la migration complète ou d'une table spécifique."""
        self.stats = {"started_at": datetime.now().isoformat(), "tables": {}}

        if table_filter:
            classes_to_migrate = [table_filter]
        else:
            classes_to_migrate = MIGRATION_ORDER

        for class_name in classes_to_migrate:
            logging.info(f"\n{'='*50}")
            logging.info(f"Migrating class: {class_name}")
            logging.info(f"{'='*50}")

            try:
                count = self._migrate_class(class_name)
                self.stats["tables"][class_name] = {"migrated": count, "status": "success"}
            except Exception as e:
                logging.error(f"Failed to migrate {class_name}: {e}")
                self.stats["tables"][class_name] = {"migrated": 0, "status": "error", "error": str(e)}

        self.stats["finished_at"] = datetime.now().isoformat()
        return self.stats

    def _migrate_class(self, class_name: str) -> int:
        """Migre une classe Parse spécifique."""
        objects = self.parse_client.fetch_all_objects(class_name)

        if not objects:
            logging.info(f"No objects found for {class_name}")
            return 0

        if self.dry_run:
            logging.info(f"[DRY RUN] Would migrate {len(objects)} {class_name}")
            return len(objects)

        # Dispatcher vers le mapper approprié
        mapper_method = getattr(self, f"_migrate_{class_name.lstrip('_').lower()}", None)

        if mapper_method:
            return mapper_method(objects)
        else:
            logging.warning(f"No specific mapper for {class_name}, using generic migration")
            return self._generic_migration(class_name, objects)

    def _clean_value(self, value: Any) -> Any:
        """Nettoie une valeur pour SQLite (convertit les dict/list en JSON, dates Parse en ISO)."""
        if value is None:
            return None
        # Gestion des dates Parse
        if isinstance(value, dict):
            if value.get("__type") == "Date":
                return value.get("iso")
            if value.get("__type") == "Pointer":
                return value.get("objectId")
            return json.dumps(value, ensure_ascii=False)
        if isinstance(value, list):
            return json.dumps(value, ensure_ascii=False)
        return value

    def _extract_pointer_id(self, obj: dict, field: str) -> Optional[str]:
        """Extrait l'objectId d'un Pointer Parse."""
        ptr = obj.get(field)
        if ptr and isinstance(ptr, dict) and ptr.get("__type") == "Pointer":
            return ptr.get("objectId")
        return None

    def _extract_date(self, obj: dict, field: str) -> Optional[str]:
        """Extrait la date ISO d'un objet Date Parse."""
        val = obj.get(field)
        if val and isinstance(val, dict) and val.get("__type") == "Date":
            return val.get("iso")
        if val and isinstance(val, str):
            return val  # Déjà au format ISO
        return None

    def _insert_records(self, table: str, records: list[dict]) -> int:
        """Insère des enregistrements en batch."""
        if not records:
            return 0

        if self.dry_run:
            return len(records)

        columns = list(records[0].keys())
        placeholders = ",".join(["?"] * len(columns))
        col_names = ",".join(columns)

        sql = f"INSERT OR REPLACE INTO {table} ({col_names}) VALUES ({placeholders})"

        # Nettoyer les valeurs
        values = []
        for r in records:
            row_values = [self._clean_value(r.get(c)) for c in columns]
            values.append(tuple(row_values))

        try:
            self.conn.executemany(sql, values)
            self.conn.commit()
            logging.info(f"Inserted/updated {len(values)} records in {table}")
            return len(values)
        except sqlite3.Error as e:
            logging.error(f"SQLite error inserting into {table}: {e}")
            self.conn.rollback()
            raise

    # ============== MAPPERS SPÉCIFIQUES ==============

    def _migrate_user(self, objects: list[dict]) -> int:
        """Migre la classe _User vers la table users."""
        records = []
        for obj in objects:
            record = {
                "id": obj.get("objectId"),
                "username": obj.get("username"),
                "email": obj.get("email") or obj.get("username"),
                "password_hash": obj.get("password", ""),
                "role": "user",
                "is_active": 1,
                "last_login": None,
                "login_count": 0,
                "created_at": self._extract_date(obj, "createdAt"),
                "updated_at": self._extract_date(obj, "updatedAt"),
            }
            records.append(record)
        return self._insert_records("users", records)

    def _migrate_contact(self, objects: list[dict]) -> int:
        """Migre la classe Contact vers la table contacts."""
        records = []
        for obj in objects:
            record = {
                "id": obj.get("objectId"),
                "nom": obj.get("nom") or "Inconnu",
                "prenom": obj.get("prenom"),
                "email": obj.get("email"),
                "telephone": obj.get("telephone"),
                "type": obj.get("type"),
                "type_personne": obj.get("type_personne", "P"),
                "statut": "actif",
                "is_blacklisted": 1 if obj.get("isBlacklisted") else 0,
                "blacklist_date": self._extract_date(obj, "blacklistedAt"),
                "blacklist_motif": obj.get("blacklistMotif"),
                "civilite": obj.get("civilite"),
                "code": obj.get("externe_id"),
                "societe": self._extract_pointer_id(obj, "entreprise"),
                "activite_societe": None,
                "adresse_rue": obj.get("adresse_rue"),
                "adresse_ville": obj.get("adresse_ville"),
                "adresse_code_postal": obj.get("adresse_code_postal"),
                "adresse_pays": obj.get("adresse_pays", "France"),
                "notes": obj.get("notes"),
                "created_at": self._extract_date(obj, "createdAt"),
                "updated_at": self._extract_date(obj, "updatedAt"),
            }
            records.append(record)
        return self._insert_records("contacts", records)

    def _migrate_sequence(self, objects: list[dict]) -> int:
        """Migre la classe Sequence vers sequences (avec JSON pour les tableaux complexes)."""
        sequences = []

        for obj in objects:
            seq_id = obj.get("objectId")
            
            # Récupérer les tableaux JSON pour stockage
            emails_data = obj.get("emails", [])
            regles_data = obj.get("regles", [])
            groupes_regles_data = obj.get("groupes_regles", [])
            
            sequence = {
                "id": seq_id,
                "nom": obj.get("nom", ""),
                "type_sequence": obj.get("type", "relances"),
                "niveau": 0,
                "actif": 1 if obj.get("publiee") else 0,
                "validation_obligatoire": 1 if obj.get("validation_obligatoire") else 0,
                "attribution_automatique": 1 if obj.get("attribution_automatique") else 0,
                "lien_paiement": obj.get("lien_paiement"),
                "scenario": obj.get("scenario"),
                "emails_json": json.dumps(emails_data, ensure_ascii=False) if emails_data else None,
                "regles_json": json.dumps(regles_data, ensure_ascii=False) if regles_data else None,
                "groupes_regles_json": json.dumps(groupes_regles_data, ensure_ascii=False) if groupes_regles_data else None,
                "created_at": self._extract_date(obj, "createdAt"),
                "updated_at": self._extract_date(obj, "updatedAt"),
            }
            sequences.append(sequence)

        return self._insert_records("sequences", sequences)

    def _migrate_smtpprofile(self, objects: list[dict]) -> int:
        """Migre la classe SmtpProfile vers smtp_profiles."""
        records = []
        for obj in objects:
            port = obj.get("port", 587)
            record = {
                "id": obj.get("objectId"),
                "nom": obj.get("nom", ""),
                "host": obj.get("host", ""),
                "port": port,
                "secure": 1 if port == 465 else 0,
                "username": obj.get("username", ""),
                "password": obj.get("password", ""),
                "from_email": obj.get("email_from", ""),
                "from_name": obj.get("nom_affiche", ""),
                "signature_html": obj.get("signature_html"),
                "actif": 1,
                "is_default": 0,
                "created_at": self._extract_date(obj, "createdAt"),
                "updated_at": self._extract_date(obj, "updatedAt"),
            }
            records.append(record)
        return self._insert_records("smtp_profiles", records)

    def _migrate_impaye(self, objects: list[dict]) -> int:
        """Migre la classe Impaye vers impayes."""
        records = []
        for obj in objects:
            record = {
                "id": obj.get("objectId"),
                "payer_id": self._extract_pointer_id(obj, "payeur"),
                "contact_relance_id": self._extract_pointer_id(obj, "contact_relance"),
                "apporteur_id": self._extract_pointer_id(obj, "apporteur"),
                "proprietaire_id": self._extract_pointer_id(obj, "proprietaire"),
                "donneur_ordre_id": self._extract_pointer_id(obj, "donneur_ordre"),
                "sequence_id": self._extract_pointer_id(obj, "sequence"),
                "nfacture": str(obj.get("nfacture", "")) if obj.get("nfacture") else None,
                "date_facture": self._extract_date(obj, "date_piece"),
                "date_echeance": self._extract_date(obj, "date_echeance"),
                "date_piece": self._extract_date(obj, "date_piece"),
                "montant_ttc": obj.get("total_ttc", 0),
                "total_ht": obj.get("total_ht", 0),
                "solde_du": obj.get("reste_a_payer", 0),
                "reste_a_payer": obj.get("reste_a_payer", 0),
                "statut": "solde" if obj.get("facture_soldee") or obj.get("solde") else "impaye",
                "is_blacklisted": 1 if obj.get("isBlacklisted") else 0,
                "blacklist_date": self._extract_date(obj, "blacklistedAt"),
                "blacklist_motif": obj.get("blacklistMotif"),
                "facture_soldee": 1 if obj.get("facture_soldee") else 0,
                "solde": 1 if obj.get("solde") else 0,
                "solde_le": self._extract_date(obj, "solde_le"),
                "id_dossier": obj.get("id_dossier"),
                "numero_dossier": str(obj.get("numero_dossier", "")) if obj.get("numero_dossier") else None,
                "reference": obj.get("reference"),
                "reference_externe": obj.get("reference_externe"),
                "statut_dossier": obj.get("statut_dossier"),
                "adresse_bien": obj.get("adresse_bien"),
                "code_postal": obj.get("code_postal"),
                "ville": obj.get("ville"),
                "etage": obj.get("etage"),
                "entree": obj.get("entree"),
                "escalier": obj.get("escalier"),
                "porte": obj.get("porte"),
                "numero_lot": obj.get("numero_lot"),
                "payeur_nom": obj.get("payeur_nom"),
                "payeur_prenom": obj.get("payeur_prenom"),
                "payeur_email": obj.get("payeur_email"),
                "payeur_telephone": obj.get("payeur_telephone"),
                "payeur_civilite": obj.get("payeur_civilite"),
                "payeur_type": obj.get("payeur_type"),
                "payeur_type_personne": obj.get("payeur_type_personne"),
                "proprietaire_nom": obj.get("proprietaire_nom"),
                "proprietaire_prenom": obj.get("proprietaire_prenom"),
                "proprietaire_email": obj.get("proprietaire_email"),
                "proprietaire_telephone": obj.get("proprietaire_telephone"),
                "proprietaire_civilite": obj.get("proprietaire_civilite"),
                "proprietaire_type_personne": obj.get("proprietaire_type_personne"),
                "apporteur_nom": obj.get("apporteur_nom"),
                "apporteur_prenom": obj.get("apporteur_prenom"),
                "apporteur_email": obj.get("apporteur_email"),
                "apporteur_telephone": obj.get("apporteur_telephone"),
                "apporteur_civilite": obj.get("apporteur_civilite"),
                "donneur_ordre_nom": obj.get("donneur_ordre_nom"),
                "donneur_ordre_prenom": obj.get("donneur_ordre_prenom"),
                "donneur_ordre_email": obj.get("donneur_ordre_email"),
                "donneur_ordre_telephone": obj.get("donneur_ordre_telephone"),
                "donneur_ordre_civilite": obj.get("donneur_ordre_civilite"),
                "syndic_nom": obj.get("syndic_nom"),
                "syndic_prenom": obj.get("syndic_prenom"),
                "syndic_email": obj.get("syndic_email"),
                "syndic_telephone": obj.get("syndic_telephone"),
                "syndic_civilite": obj.get("syndic_civilite"),
                "notaire_nom": obj.get("notaire_nom"),
                "notaire_prenom": obj.get("notaire_prenom"),
                "notaire_email": obj.get("notaire_email"),
                "notaire_telephone": obj.get("notaire_telephone"),
                "notaire_civilite": obj.get("notaire_civilite"),
                "locataire_entrant_nom": obj.get("locataire_entrant_nom"),
                "locataire_entrant_prenom": obj.get("locataire_entrant_prenom"),
                "locataire_entrant_email": obj.get("locataire_entrant_email"),
                "locataire_entrant_telephone": obj.get("locataire_entrant_telephone"),
                "locataire_entrant_civilite": obj.get("locataire_entrant_civilite"),
                "locataire_sortant_nom": obj.get("locataire_sortant_nom"),
                "locataire_sortant_prenom": obj.get("locataire_sortant_prenom"),
                "locataire_sortant_email": obj.get("locataire_sortant_email"),
                "locataire_sortant_telephone": obj.get("locataire_sortant_telephone"),
                "locataire_sortant_civilite": obj.get("locataire_sortant_civilite"),
                "acquereur_nom": obj.get("acquereur_nom"),
                "acquereur_prenom": obj.get("acquereur_prenom"),
                "acquereur_email": obj.get("acquereur_email"),
                "acquereur_telephone": obj.get("acquereur_telephone"),
                "acquereur_civilite": obj.get("acquereur_civilite"),
                "employe_intervention": obj.get("employe_intervention"),
                "commentaire_dossier": obj.get("commentaire_dossier"),
                "commentaire_piece": obj.get("commentaire_piece"),
                "cadre_mission": obj.get("cadre_mission"),
                "url_pdf": obj.get("url_pdf"),
                "email_index": obj.get("email_index", 0),
                "created_at": self._extract_date(obj, "createdAt"),
                "updated_at": self._extract_date(obj, "updatedAt"),
            }
            records.append(record)
        return self._insert_records("impayes", records)

    def _migrate_relance(self, objects: list[dict]) -> int:
        """Migre la classe Relance vers relances et relance_impayes."""
        relances = []
        relance_impayes = []
        skipped = 0

        for obj in objects:
            contact_id = self._extract_pointer_id(obj, "contact")
            
            # Skip les relances sans contact_id (contrainte NOT NULL)
            if not contact_id:
                skipped += 1
                continue

            # Déterminer le sujet (champ peut être 'sujet' ou 'objet')
            sujet = obj.get("sujet") or obj.get("objet", "")
            corps = obj.get("corps") or obj.get("contenu", "")

            relance_id = obj.get("objectId")
            relance = {
                "id": relance_id,
                "contact_id": contact_id,
                "sequence_id": self._extract_pointer_id(obj, "sequence"),
                "smtp_profile_id": self._extract_pointer_id(obj, "smtpProfil"),
                "statut": obj.get("statut", "brouillon"),
                "date_envoi": self._extract_date(obj, "dateEnvoi"),
                "date_programmation": self._extract_date(obj, "date_envoi_prevue"),
                "sujet": sujet,
                "corps": corps,
                "cc": obj.get("cc"),
                "scenario": obj.get("scenario"),
                "email_index": obj.get("email_index"),
                "email_sent": 1 if obj.get("emailSent") else 0,
                "erreur_count": obj.get("erreur_count", 0),
                "last_error": obj.get("lastError"),
                "valide": 1 if obj.get("valide") else 0,
                "manuelle": 1 if obj.get("manuelle") else 0,
                "created_at": self._extract_date(obj, "createdAt"),
                "updated_at": self._extract_date(obj, "updatedAt"),
            }
            relances.append(relance)

            # Gestion de la relation many-to-many impayes
            impayes_refs = obj.get("impayes", [])
            for imp_ref in impayes_refs:
                if isinstance(imp_ref, dict) and imp_ref.get("__type") == "Pointer":
                    relance_impayes.append({
                        "relance_id": relance_id,
                        "impaye_id": imp_ref.get("objectId")
                    })

        if skipped > 0:
            logging.warning(f"Skipped {skipped} relances without contact_id")

        count = self._insert_records("relances", relances)
        if relance_impayes:
            self._insert_records("relance_impayes", relance_impayes)
        return count

    def _migrate_activite(self, objects: list[dict]) -> int:
        """Migre la classe Activite vers events."""
        records = []
        for obj in objects:
            # Déterminer l'entité liée
            entity_type = None
            entity_id = None
            
            impaye_ptr = self._extract_pointer_id(obj, "impaye")
            if impaye_ptr:
                entity_type = "Impaye"
                entity_id = impaye_ptr
            else:
                relance_ptr = self._extract_pointer_id(obj, "relance")
                if relance_ptr:
                    entity_type = "Relance"
                    entity_id = relance_ptr
            
            # Fallback sur impaye_id si pas de Pointer
            if not entity_id and obj.get("impaye_id"):
                entity_type = "Impaye"
                entity_id = obj.get("impaye_id")

            # Construction du titre
            titre_parts = []
            if obj.get("operation"):
                titre_parts.append(obj["operation"])
            if obj.get("type"):
                titre_parts.append(f"[{obj['type']}]")
            titre = " ".join(titre_parts) if titre_parts else "Activité"

            record = {
                "id": obj.get("objectId"),
                "type": obj.get("type", "info"),
                "titre": titre,
                "description": obj.get("description") or obj.get("details"),
                "entity_type": entity_type,
                "entity_id": entity_id,
                "who_id": self._extract_pointer_id(obj, "who"),
                "by_marki": 1 if obj.get("isSystem") else 0,
                "metadata": json.dumps(obj.get("metadata"), ensure_ascii=False) if obj.get("metadata") else None,
                "read": 0,
                "created_at": self._extract_date(obj, "timestamp") or self._extract_date(obj, "createdAt"),
            }
            records.append(record)
        return self._insert_records("events", records)

    def _migrate_lienpaiement(self, objects: list[dict]) -> int:
        """Migre la classe LienPaiement."""
        records = []
        for obj in objects:
            record = {
                "id": obj.get("objectId"),
                "nom": obj.get("nom"),
                "url": obj.get("url"),
                "created_at": self._extract_date(obj, "createdAt"),
                "updated_at": self._extract_date(obj, "updatedAt"),
            }
            records.append(record)
        
        # Créer la table si elle n'existe pas
        try:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS lien_paiements (
                    id TEXT PRIMARY KEY,
                    nom TEXT,
                    url TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
        except sqlite3.OperationalError:
            pass
        
        return self._insert_records("lien_paiements", records) if records else 0

    def _migrate_optionsdynamiques(self, objects: list[dict]) -> int:
        """Migre la classe OptionsDynamiques."""
        records = []
        for obj in objects:
            record = {
                "id": obj.get("objectId"),
                "type": obj.get("type"),
                "valeurs": json.dumps(obj.get("valeurs"), ensure_ascii=False) if obj.get("valeurs") else None,
                "created_at": self._extract_date(obj, "createdAt"),
                "updated_at": self._extract_date(obj, "updatedAt"),
            }
            records.append(record)
        
        # Créer la table si elle n'existe pas
        try:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS options_dynamiques (
                    id TEXT PRIMARY KEY,
                    type TEXT,
                    valeurs TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
        except sqlite3.OperationalError:
            pass
        
        return self._insert_records("options_dynamiques", records) if records else 0

    def _migrate_suivi(self, objects: list[dict]) -> int:
        """Migre la classe Suivi vers suivis (mêmes champs que Relance)."""
        records = []
        suivi_impayes = []
        skipped = 0
        
        for obj in objects:
            contact_id = self._extract_pointer_id(obj, "contact")
            
            # Skip les suivis sans contact_id
            if not contact_id:
                skipped += 1
                continue
            
            # Déterminer le sujet (champ peut être 'sujet' ou 'objet')
            sujet = obj.get("sujet") or obj.get("objet", "")
            corps = obj.get("corps") or obj.get("contenu", "")
            
            suivi_id = obj.get("objectId")
            suivi = {
                "id": suivi_id,
                "contact_id": contact_id,
                "sequence_id": self._extract_pointer_id(obj, "sequence"),
                "smtp_profile_id": self._extract_pointer_id(obj, "smtpProfil"),
                "statut": obj.get("statut", "brouillon"),
                "date_envoi": self._extract_date(obj, "dateEnvoi"),
                "date_programmation": self._extract_date(obj, "date_envoi_prevue"),
                "sujet": sujet,
                "corps": corps,
                "cc": obj.get("cc"),
                "scenario": obj.get("scenario"),
                "format": obj.get("format"),
                "email_index": obj.get("email_index"),
                "email_sent": 1 if obj.get("emailSent") else 0,
                "erreur_count": obj.get("erreur_count", 0),
                "last_error": obj.get("lastError"),
                "valide": 1 if obj.get("valide") else 0,
                "manuelle": 1 if obj.get("manuelle") else 0,
                "created_at": self._extract_date(obj, "createdAt"),
                "updated_at": self._extract_date(obj, "updatedAt"),
            }
            records.append(suivi)
            
            # Gestion de la relation many-to-many impayes (si présente)
            impayes_refs = obj.get("impayes", [])
            for imp_ref in impayes_refs:
                if isinstance(imp_ref, dict) and imp_ref.get("__type") == "Pointer":
                    suivi_impayes.append({
                        "suivi_id": suivi_id,
                        "impaye_id": imp_ref.get("objectId")
                    })
        
        if skipped > 0:
            logging.warning(f"Skipped {skipped} suivis without contact_id")
        
        count = self._insert_records("suivis", records)
        if suivi_impayes:
            self._create_suivi_impayes_table()
            self._insert_records("suivi_impayes", suivi_impayes)
        return count
    
    def _create_suivi_impayes_table(self):
        """Crée la table de liaison suivi_impayes si elle n'existe pas."""
        try:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS suivi_impayes (
                    suivi_id TEXT REFERENCES suivis(id) ON DELETE CASCADE,
                    impaye_id TEXT REFERENCES impayes(id) ON DELETE CASCADE,
                    PRIMARY KEY (suivi_id, impaye_id)
                )
            """)
        except sqlite3.OperationalError:
            pass

    def show_tables_preview(self, tables: list[str], output_file: str = "migration_preview.html") -> None:
        """Génère un fichier HTML avec l'aperçu des tables migrées."""
        try:
            import pandas as pd
            HAS_PANDAS = True
        except ImportError:
            HAS_PANDAS = False
            logging.warning("pandas non disponible, preview HTML non généré")
            return
        
        html_parts = []
        html_parts.append("""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Migration Preview - Marki DB</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        h1 { color: #333; }
        h2 { color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; background: white; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #4CAF50; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        .table-info { color: #666; font-size: 14px; margin-bottom: 10px; }
        .json-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    </style>
</head>
<body>
    <h1>📊 Migration Preview - Marki Database</h1>
    <p>Généré le: """ + pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S") + "</p>\n")
        
        for table in tables:
            try:
                # Vérifier si la table existe et a des données
                cursor = self.conn.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                
                if count == 0:
                    html_parts.append(f"<h2>📋 {table}</h2><p class='table-info'>Table vide</p>\n")
                    continue
                
                # Lire les données
                df = pd.read_sql_query(f"SELECT * FROM {table} LIMIT 5", self.conn)
                
                html_parts.append(f"<h2>📋 {table} ({count:,} lignes) - Aperçu des 5 premières</h2>\n")
                html_parts.append(f"<p class='table-info'>{len(df.columns)} colonnes</p>\n")
                
                # Convertir en HTML avec style
                html_table = df.to_html(
                    index=False, 
                    classes='data-table',
                    escape=False,
                    max_rows=5
                )
                html_parts.append(html_table + "\n")
                
            except sqlite3.Error as e:
                html_parts.append(f"<h2>❌ {table}</h2><p>Erreur: {e}</p>\n")
        
        html_parts.append("</body>\n</html>")
        
        # Écrire le fichier
        full_html = "".join(html_parts)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(full_html)
        
        logging.info(f"\n📄 Preview HTML généré: {output_file}")
        logging.info(f"   Ouvrez ce fichier dans votre navigateur pour voir les tables.")

    def _generic_migration(self, class_name: str, objects: list[dict]) -> int:
        """Migration générique pour les classes sans mapper spécifique."""
        table_name = class_name.lower()
        if table_name.startswith("_"):
            table_name = table_name[1:]

        records = []
        for obj in objects:
            record = {"id": obj.get("objectId")}
            for key, value in obj.items():
                if key not in ["objectId", "createdAt", "updatedAt", "ACL"]:
                    record[key] = self._clean_value(value)
            record["created_at"] = self._extract_date(obj, "createdAt")
            record["updated_at"] = self._extract_date(obj, "updatedAt")
            records.append(record)

        try:
            return self._insert_records(table_name, records)
        except sqlite3.OperationalError as e:
            logging.error(f"Table {table_name} does not exist: {e}")
            return 0
        """Migration générique pour les classes sans mapper spécifique."""
        table_name = class_name.lower()
        if table_name.startswith("_"):
            table_name = table_name[1:]

        records = []
        for obj in objects:
            record = {"id": obj.get("objectId")}
            for key, value in obj.items():
                if key not in ["objectId", "createdAt", "updatedAt", "ACL"]:
                    record[key] = self._clean_value(value)
            record["created_at"] = self._extract_date(obj, "createdAt")
            record["updated_at"] = self._extract_date(obj, "updatedAt")
            records.append(record)

        try:
            return self._insert_records(table_name, records)
        except sqlite3.OperationalError as e:
            logging.error(f"Table {table_name} does not exist: {e}")
            return 0


def main():
    parser = argparse.ArgumentParser(
        description="Migration Parse Server → SQLite pour Marki"
    )
    parser.add_argument(
        "--setup",
        action="store_true",
        help="Créer les tables et colonnes manquantes avant migration",
    )
    parser.add_argument(
        "--table",
        help="Migrer uniquement une table spécifique",
        choices=MIGRATION_ORDER,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simuler la migration sans écrire en base",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Mode verbeux",
    )
    parser.add_argument(
        "--db-path",
        default=SQLITE_PATH,
        help=f"Chemin vers la base SQLite (défaut: {SQLITE_PATH})",
    )
    parser.add_argument(
        "--parse-url",
        default=PARSE_CONFIG["server_url"],
        help="URL du serveur Parse",
    )
    parser.add_argument(
        "--output-html",
        default="migration_preview.html",
        help="Chemin du fichier HTML de preview (d\u00e9faut: migration_preview.html)",
    )

    args = parser.parse_args()

    # Configuration logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # Initialisation
    parse_client = ParseClient(
        args.parse_url,
        PARSE_CONFIG["application_id"],
        PARSE_CONFIG["master_key"],
    )

    runner = MigrationRunner(parse_client, args.db_path, args.dry_run)

    try:
        runner.connect()
        
        # Setup schema si demandé
        if args.setup:
            runner.setup_schema()
        
        stats = runner.run_migration(args.table)

        # Rapport final
        logging.info("\n" + "=" * 50)
        logging.info("MIGRATION REPORT")
        logging.info("=" * 50)
        for table, info in stats["tables"].items():
            status = info.get("status", "unknown")
            count = info.get("migrated", 0)
            error = info.get("error", "")
            if status == "success":
                logging.info(f"✓ {table}: {count} records migrated")
            elif status == "error":
                logging.error(f"✗ {table}: {error}")
            else:
                logging.warning(f"⚠ {table}: {status}")

        logging.info(f"\nStarted:  {stats['started_at']}")
        logging.info(f"Finished: {stats['finished_at']}")

        # Afficher l'aperçu des tables (si pas en dry-run)
        if not args.dry_run:
            tables_to_preview = [
                "users", "contacts", "sequences", "smtp_profiles",
                "impayes", "relances", "relance_impayes", "suivis", "suivi_impayes", "events",
                "lien_paiements", "options_dynamiques"
            ]
            output_html = args.output_html
            runner.show_tables_preview(tables_to_preview, output_html)

    except Exception as e:
        logging.error(f"Migration failed: {e}")
        sys.exit(1)
    finally:
        runner.close()


if __name__ == "__main__":
    main()
