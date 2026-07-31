#!/usr/bin/env node
// Script pour nettoyer les relances des factures déjà payées
// Supprime les relances non envoyées liées à des impayés soldés

require("dotenv").config({
    path: require("path").join(__dirname, "..", "..", "..", ".env"),
});

const STATUTS_A_CONSERVER = [
    "Envoyée"
];

async function parseApi(method, endpoint, body = null) {
    const url = `${process.env.PARSE_SERVER_URL}${endpoint}`;
    const headers = {
        "X-Parse-Application-Id": process.env.PARSE_APP_ID,
        "X-Parse-Master-Key": process.env.PARSE_MASTER_KEY,
        "Content-Type": "application/json"
    };
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(url, options);
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Parse API error: ${response.status} - ${error}`);
    }
    return response.json();
}

async function getAllRelancesWithPagination() {
    const relances = [];
    let skip = 0;
    const limit = 1000;
    let hasMore = true;
    
    console.log("🔍 Récupération de toutes les relances...");
    
    while (hasMore) {
        const query = {
            include: "impayes",
            limit: limit,
            skip: skip
        };
        
        const queryString = Object.entries(query)
            .map(([k, v]) => `${k}=${encodeURIComponent(JSON.stringify(v))}`)
            .join("&");
        
        const response = await parseApi("GET", `/classes/Relance?${queryString}`);
        const results = response.results || [];
        
        relances.push(...results);
        
        if (results.length < limit) {
            hasMore = false;
        } else {
            skip += limit;
        }
        
        console.log(`  Récupéré ${results.length} relances (total: ${relances.length})`);
    }
    
    return relances;
}

async function getImpayeById(objectId) {
    try {
        const response = await parseApi("GET", `/classes/Impaye/${objectId}`);
        return response;
    } catch (err) {
        console.error(`  ❌ Erreur récupération Impaye ${objectId}: ${err.message}`);
        return null;
    }
}

async function deleteRelance(objectId) {
    try {
        await parseApi("DELETE", `/classes/Relance/${objectId}`);
        return true;
    } catch (err) {
        console.error(`  ❌ Erreur suppression relance ${objectId}: ${err.message}`);
        return false;
    }
}

function isImpayeSolde(impaye) {
    return impaye && 
           impaye.solde === true && 
           impaye.facture_soldee === true && 
           impaye.reste_a_payer === 0;
}

function isRelanceASupprimer(relance) {
    const statut = relance.statut;
    // Supprimer tous les statuts SAUF "Envoyée"
    return !STATUTS_A_CONSERVER.includes(statut);
}

async function main() {
    console.log("=".repeat(60));
    console.log("🧹 Nettoyage des relances - Factures payées");
    console.log("=".repeat(60));
    console.log();
    
    const stats = {
        totalRelances: 0,
        relancesSansImpaye: 0,
        relancesAvecImpayeSolde: 0,
        relancesNonEnvoyeesASupprimer: 0,
        relancesSupprimees: 0,
        relancesGardees: 0,
        erreurs: 0
    };
    
    // Récupérer toutes les relances
    const relances = await getAllRelancesWithPagination();
    stats.totalRelances = relances.length;
    
    console.log();
    console.log(`📊 Analyse de ${relances.length} relances...`);
    console.log();
    
    // Cache pour les impayés déjà récupérés
    const impayeCache = new Map();
    
    // Liste des relances à supprimer
    const relancesASupprimer = [];
    
    for (const relance of relances) {
        const impayesArray = relance.impayes;
        
        if (!impayesArray || !Array.isArray(impayesArray) || impayesArray.length === 0) {
            console.log(`⚠️  Relance ${relance.objectId}: Lien impayes manquant`);
            stats.relancesSansImpaye++;
            continue;
        }
        
        // Prendre le premier impaye du tableau (normalement une seule facture par relance)
        const impayePointer = impayesArray[0];
        if (!impayePointer || !impayePointer.objectId) {
            console.log(`⚠️  Relance ${relance.objectId}: Lien impaye invalide dans le tableau`);
            stats.relancesSansImpaye++;
            continue;
        }
        
        const impayeId = impayePointer.objectId;
        
        // Récupérer l'impaye (depuis le cache ou l'API)
        let impaye = impayeCache.get(impayeId);
        if (!impaye) {
            impaye = await getImpayeById(impayeId);
            if (impaye) {
                impayeCache.set(impayeId, impaye);
            }
        }
        
        if (!impaye) {
            console.log(`⚠️  Relance ${relance.objectId}: Impaye ${impayeId} introuvable`);
            stats.relancesSansImpaye++;
            continue;
        }
        
        // Vérifier si l'impaye est soldé
        if (isImpayeSolde(impaye)) {
            stats.relancesAvecImpayeSolde++;
            
            const statut = relance.statut || "sans statut";
            const nfacture = impaye.nfacture || "N/A";
            
            if (isRelanceASupprimer(relance)) {
                console.log(`🗑️  Relance ${relance.objectId} (statut: "${statut}") → IMPAYÉ SOLDÉ nfacture:${nfacture} - À SUPPRIMER`);
                relancesASupprimer.push({
                    relanceId: relance.objectId,
                    statut: statut,
                    nfacture: nfacture,
                    impayeId: impayeId,
                    soldeLe: impaye.solde_le
                });
                stats.relancesNonEnvoyeesASupprimer++;
            } else {
                console.log(`📌 Relance ${relance.objectId} (statut: "${statut}") → IMPAYÉ SOLDÉ nfacture:${nfacture} - CONSERVÉE (déjà envoyée)`);
                stats.relancesGardees++;
            }
        }
    }
    
    console.log();
    console.log("-".repeat(60));
    console.log("📋 RÉSUMÉ AVANT SUPPRESSION");
    console.log("-".repeat(60));
    console.log(`Total relances analysées: ${stats.totalRelances}`);
    console.log(`Relances sans impaye valide: ${stats.relancesSansImpaye}`);
    console.log(`Relances liées à un impayé soldé: ${stats.relancesAvecImpayeSolde}`);
    console.log(`Relances non envoyées à supprimer: ${stats.relancesNonEnvoyeesASupprimer}`);
    console.log(`Relances déjà envoyées (conservées): ${stats.relancesGardees}`);
    console.log();
    
    if (relancesASupprimer.length === 0) {
        console.log("✅ Aucune relance à supprimer.");
        return;
    }
    
    console.log("🔎 Détails des relances à supprimer:");
    for (const item of relancesASupprimer) {
        console.log(`   - ${item.relanceId} | nfacture:${item.nfacture} | statut:"${item.statut}" | soldé le:${item.soldeLe || 'N/A'}`);
    }
    
    console.log();
    console.log("=".repeat(60));
    
    // Mode dry-run par défaut, demander confirmation pour suppression réelle
    const dryRun = process.argv.includes("--execute") === false;
    
    if (dryRun) {
        console.log("🏃 MODE DRY-RUN (simulation)");
        console.log("   Ajoutez --execute pour réellement supprimer les relances");
        console.log("   Exemple: node cleanup-relances-paid-invoices.js --execute");
        console.log("=".repeat(60));
        return;
    }
    
    // Mode exécution réelle
    console.log("⚠️  MODE EXÉCUTION RÉELLE - Suppression des relances...");
    console.log("=".repeat(60));
    console.log();
    
    for (const item of relancesASupprimer) {
        const success = await deleteRelance(item.relanceId);
        if (success) {
            console.log(`✅ Relance ${item.relanceId} supprimée`);
            stats.relancesSupprimees++;
        } else {
            stats.erreurs++;
        }
    }
    
    console.log();
    console.log("=".repeat(60));
    console.log("📊 RÉSULTAT FINAL");
    console.log("=".repeat(60));
    console.log(`Relances supprimées: ${stats.relancesSupprimees}`);
    console.log(`Erreurs: ${stats.erreurs}`);
    console.log("=".repeat(60));
}

main().catch(err => {
    console.error("❌ Erreur fatale:", err.message);
    process.exit(1);
});
