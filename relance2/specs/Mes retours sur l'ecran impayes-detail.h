Mes retours sur l'ecran impayes-detail.html le mockup.

1-dans informations du bien supprime la surface surppirme le type.on veut l'adrese.

2 - missions et intervention nécessite de synchroniser les missions du dossier concernées depuis la base de données /home/arthur/adti/sync.db dans /app/data/marki.db. Il faut mettre à jour le data model de la base et crée ce commun/workflows. on veut le type de mission avant vente par exemple et le type de mission repérage amiante par exemple. Il faut donc aussi créer un workflow frontend qui permet de récupérer ces infos depuis la base. On va aussi rajouter un bouton demander de sync qui doit lancer une specs uniquement sur les missions de ce dossier via un backend/workflow spécifique.

Pour les historique de relances on va renommer en historique des évènements et on va afficher tous les évènements de cet impayé dans la table events.

Le bouton pdf doit ouvrir un drawer pdf qui est un iframe qui permet d'afficher les pdfs le lien est issue du workflow /home/ubuntu/marki/relance2/specs/workflows/backend/generate-pdf-links.md

Pour le bloc actions retire l'idée du dropdown des relances.Met un bouton changer de sequence qui ouvre une modale pour changer la sequence de relances. Suspendre doit ouvrir une modale. Précise que blacklister est pour blacklister un contact. Suspendre est pour suspenddre un dossier.

Dans les notes personnelles on a 2 notes personnelles : les notes sur l'impayés et les notes sur le contact. regarde le schema.sql pour voir les colonnes impactées. On doit voir l'utilisateur qui a écrit la note et si on est l'autheur on peut modifier la note.
