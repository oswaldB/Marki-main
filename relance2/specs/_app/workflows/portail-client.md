# portail-client.py - Portail client

**Fichier** : `app/workflows/portail-client.py`

## Description

Actions disponibles dans le portail client.

## Actions

- `get_impayes`: Lister impayés du contact
- `get_relances`: Voir historique relances
- `download_pdf`: Télécharger facture PDF
- `marquer_paye`: Signaler un paiement

## Entrée

```json
{
  "action": "get_impayes",
  "token": "..."
}
```

## Sortie

```json
{
  "impayes": [...],
  "total": 1500.00
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.portail-client] START: action={action} token={token[:10]}...")` | Début portail, action demandée |
| 2 | `print(f"[WORKFLOW.portail-client] STEP: Vérification présence du token")` | Validation input |
| 3 | `print(f"[WORKFLOW.portail-client] ERROR: Token manquant")` | Token absent |
| 4 | `print(f"[WORKFLOW.portail-client] STEP: Décodage et validation du JWT")` | Vérif validité token |
| 5 | `print(f"[WORKFLOW.portail-client] ERROR: Token invalide ou expiré")` | JWT invalide/expiré |
| 6 | `print(f"[WORKFLOW.portail-client] STEP: Extraction user_id={user_id} du token")` | Identité client |
| 7 | `print(f"[WORKFLOW.portail-client] STEP: Routing vers action '{action}'")` | Dispatch action |
| 8 | `print(f"[WORKFLOW.portail-client] STEP: Listing impayés du contact_id={contact_id}")` | get_impayes |
| 9 | `print(f"[WORKFLOW.portail-client] DATA: {nb_impayes} impayés trouvés, total={total}€")` | Données retournées |
| 10 | `print(f"[WORKFLOW.portail-client] STEP: Téléchargement PDF facture_id={facture_id}")` | download_pdf |
| 11 | `print(f"[WORKFLOW.portail-client] STEP: Marquage paiement facture_id={facture_id}")` | marquer_paye |
| 12 | `print(f"[WORKFLOW.portail-client] DATA: Stats portail - {nb_visites} visites, {nb_telechargements} téléchargements")` | Stats d'usage |
| 13 | `print(f"[WORKFLOW.portail-client] SUCCESS: Action '{action}' exécutée pour user_id={user_id}")` | Succès |
| 14 | `print(f"[WORKFLOW.portail-client] END: Durée={duree}ms")` | Fin workflow |
