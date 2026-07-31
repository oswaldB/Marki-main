#!/usr/bin/env node
// Script standalone pour compter les factures avec reste à payer > 0
// Usage: node count-invoices-with-reste.js

const Database = require("better-sqlite3");

// Chemin de la base de données
const DB_PATH = "/home/arthur/adti/sync.db";

// Requête SQL : compter les factures avec reste à payer > 0
const QUERY = `
  SELECT COUNT(*) as count
  FROM _GCO__GcoPiece
  WHERE resteapayer > 0
    AND valide = 1
    AND nfacture IS NOT NULL
`;

// Requête : détails des factures avec reste à payer
const QUERY_DETAILS = `
  SELECT 
    idpiece,
    nfacture,
    datepiece,
    dateecheance,
    resteapayer,
    totalttcnet
  FROM _GCO__GcoPiece
  WHERE resteapayer > 0
    AND valide = 1
    AND nfacture IS NOT NULL
  ORDER BY resteapayer DESC
`;

// Requête : factures en retard (date d'échéance dépassée)
const QUERY_EN_RETARD = `
  SELECT 
    idpiece,
    nfacture,
    datepiece,
    dateecheance,
    resteapayer,
    totalttcnet
  FROM _GCO__GcoPiece
  WHERE resteapayer > 0
    AND valide = 1
    AND nfacture IS NOT NULL
    AND dateecheance IS NOT NULL
    AND dateecheance < date('now')
  ORDER BY dateecheance ASC
`;

// Requête : compter les factures en retard
const QUERY_COUNT_EN_RETARD = `
  SELECT COUNT(*) as count, SUM(resteapayer) as totalReste
  FROM _GCO__GcoPiece
  WHERE resteapayer > 0
    AND valide = 1
    AND nfacture IS NOT NULL
    AND dateecheance IS NOT NULL
    AND dateecheance < date('now')
`;

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  // Gère les formats ISO et autres
  return dateStr.split(' ')[0].split('T')[0];
}

function main() {
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("📊  ANALYSE DES FACTURES AVEC RESTE À PAYER");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log(`🗄️   Base de données: ${DB_PATH}\n`);

  let db;
  try {
    // Ouvrir la base de données
    db = new Database(DB_PATH, { readonly: true });
    
    // ============================================================
    // TABLEAU 1 : Toutes les factures avec reste à payer > 0
    // ============================================================
    console.log("┌─────────────────────────────────────────────────────────────────────┐");
    console.log("│ 📋 TABLEAU 1 : TOUTES LES FACTURES AVEC RESTE À PAYER > 0           │");
    console.log("└─────────────────────────────────────────────────────────────────────┘\n");
    
    const result = db.prepare(QUERY).get();
    const count = result.count;
    let totalReste = 0;
    
    console.log(`🔢 Nombre total: ${count} factures`);
    
    if (count > 0) {
      const details = db.prepare(QUERY_DETAILS).all();
      
      // Calculer le montant total
      totalReste = details.reduce((sum, row) => sum + parseFloat(row.resteapayer || 0), 0);
      console.log(`💰 Montant total restant à payer: ${totalReste.toFixed(2)} €\n`);
      
      // Afficher toutes les factures
      console.log("─".repeat(85));
      console.log(`${"N° Facture".padEnd(12)} ${"Date Facture".padEnd(14)} ${"Date Échéance".padEnd(14)} ${"Reste à payer".padEnd(16)} ${"Total TTC"}`);
      console.log("─".repeat(85));
      
      details.forEach(row => {
        const datePiece = formatDate(row.datepiece);
        const dateEcheance = formatDate(row.dateecheance);
        const reste = parseFloat(row.resteapayer || 0).toFixed(2).padStart(12);
        const total = parseFloat(row.totalttcnet || 0).toFixed(2).padStart(10);
        console.log(`${String(row.nfacture).padEnd(12)} ${datePiece.padEnd(14)} ${dateEcheance.padEnd(14)} ${reste} € ${total} €`);
      });
      
      console.log("─".repeat(85));
      console.log(`Total: ${count} factures | Montant total: ${totalReste.toFixed(2)} €\n`);
    }
    
    // ============================================================
    // TABLEAU 2 : Factures en retard (échéance dépassée)
    // ============================================================
    console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
    console.log("│ ⚠️  TABLEAU 2 : FACTURES EN RETARD (ÉCHÉANCE DÉPASSÉE)              │");
    console.log("└─────────────────────────────────────────────────────────────────────┘\n");
    
    const retardResult = db.prepare(QUERY_COUNT_EN_RETARD).get();
    const countRetard = retardResult.count;
    let totalRetard = parseFloat(retardResult.totalReste || 0);
    
    console.log(`🔢 Nombre de factures en retard: ${countRetard}`);
    console.log(`💰 Montant total en retard: ${totalRetard.toFixed(2)} €\n`);
    
    if (countRetard > 0) {
      const detailsRetard = db.prepare(QUERY_EN_RETARD).all();
      
      console.log("─".repeat(90));
      console.log(`${"N° Facture".padEnd(12)} ${"Date Facture".padEnd(14)} ${"Date Échéance".padEnd(14)} ${"Jours de retard".padEnd(16)} ${"Reste à payer"}`);
      console.log("─".repeat(90));
      
      const today = new Date();
      
      detailsRetard.forEach(row => {
        const datePiece = formatDate(row.datepiece);
        const dateEcheance = formatDate(row.dateecheance);
        
        // Calculer les jours de retard
        const echeance = new Date(row.dateecheance);
        const diffTime = Math.abs(today - echeance);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const joursRetard = diffDays.toString().padStart(8);
        const reste = parseFloat(row.resteapayer || 0).toFixed(2).padStart(12);
        
        console.log(`${String(row.nfacture).padEnd(12)} ${datePiece.padEnd(14)} ${dateEcheance.padEnd(14)} ${joursRetard} jours    ${reste} €`);
      });
      
      console.log("─".repeat(90));
      console.log(`Total: ${countRetard} factures | Montant total en retard: ${totalRetard.toFixed(2)} €`);
    }
    
    // ============================================================
    // SYNTHÈSE
    // ============================================================
    console.log("\n═══════════════════════════════════════════════════════════════════════");
    console.log("│ 📊 SYNTHÈSE                                                         │");
    console.log("═══════════════════════════════════════════════════════════════════════");
    console.log(`  Total factures impayées:        ${count.toString().padStart(6)} factures`);
    console.log(`  Total factures en retard:       ${countRetard.toString().padStart(6)} factures`);
    if (count > 0) {
      const pctRetard = ((countRetard / count) * 100).toFixed(1);
      console.log(`  Pourcentage en retard:          ${pctRetard.padStart(6)} %`);
    }
    console.log(`  Montant total impayé:           ${totalReste.toFixed(2).padStart(12)} €`);
    console.log(`  Montant total en retard:        ${totalRetard.toFixed(2).padStart(12)} €`);
    console.log("═══════════════════════════════════════════════════════════════════════");
    
  } catch (err) {
    console.error("\n❌ Erreur:", err.message);
    if (err.message.includes("no such table")) {
      console.error("   La table _GCO__GcoPiece n'existe pas dans cette base de données.");
    }
    if (err.message.includes("database disk image is malformed")) {
      console.error("   La base de données semble corrompue.");
    }
    if (err.code === "ENOENT") {
      console.error(`   Le fichier ${DB_PATH} n'existe pas.`);
    }
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

main();
