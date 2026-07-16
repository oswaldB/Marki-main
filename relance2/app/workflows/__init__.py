"""
Workflows Backend - Marki

Ce module contient les workflows métier complexes qui ne sont pas
de simples opérations CRUD.
"""

from .generate_relances import generate_relances
from .send_emails import send_emails
from .cleanup_relances import cleanup_relances
from .import_invoices import import_invoices
from .verify_paid import verify_paid_invoices
from .generate_suivi import generate_suivi
from .appliquer_regles_attribution import appliquer_regles_attribution
from .send_suivi import send_suivi
from .sync_contacts import sync_contacts
from .regenerate_relances import regenerate_relances_contact, regenerate_relances_with_status
from .test_email import test_smtp_profile, test_single_email, test_single_suivi
from .generate_contact_token import generate_contact_token
from .generate_pdf_links import generate_pdf_links
from .get_contact_impayes import get_contact_impayes
from .contacts_blacklist import blacklist_contact, unblacklist_contact
from .users_management import create_user, update_user, delete_user
from .portail_client import get_portail_data, initiate_payment
from .impayes_suspend import suspend_impaye, unsuspend_impaye

__all__ = [
    'generate_relances',
    'send_emails',
    'cleanup_relances',
    'import_invoices',
    'verify_paid_invoices',
    'generate_suivi',
    'appliquer_regles_attribution',
    'send_suivi',
    'sync_contacts',
    'regenerate_relances_contact',
    'regenerate_relances_with_status',
    'test_smtp_profile',
    'test_single_email',
    'test_single_suivi',
    'generate_contact_token',
    'generate_pdf_links',
    'get_contact_impayes',
    'blacklist_contact',
    'unblacklist_contact',
    'create_user',
    'update_user',
    'delete_user',
    'get_portail_data',
    'initiate_payment',
    'suspend_impaye',
    'unsuspend_impaye'
]
