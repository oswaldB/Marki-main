const Parse = require("parse/node");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

Parse.initialize(
    process.env.PARSE_APP_ID || "adti-marki",
    process.env.PARSE_JAVASCRIPT_KEY || "",
    process.env.PARSE_MASTER_KEY || "e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9"
);
Parse.serverURL = process.env.PARSE_SERVER_URL || "https://dev.markidiags.com/parse";

const BATCH_SIZE = 100;
const SLEEP_MS = 50;

async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function saveBatch(objects) {
    if (objects.length === 0) return;
    const chunks = [];
    for (let i = 0; i < objects.length; i += BATCH_SIZE) {
        chunks.push(objects.slice(i, i + BATCH_SIZE));
    }
    for (const chunk of chunks) {
        await Parse.Object.saveAll(chunk, { useMasterKey: true });
        await sleep(SLEEP_MS);
    }
}

async function fetchAll(query, label) {
    const all = [];
    let skip = 0;
    while (true) {
        const q = query.clone();
        q.limit(1000);
        q.skip(skip);
        const batch = await q.find({ useMasterKey: true });
        if (batch.length === 0) break;
        all.push(...batch);
        skip += batch.length;
        if (batch.length < 1000) break;
    }
    console.log(`   ${label} trouvés : ${all.length}`);
    return all;
}

async function migrateClass() {
    console.log("🚀 Démarrage migration Impaye → Facture");

    const Impaye = Parse.Object.extend("Impaye");
    const Facture = Parse.Object.extend("Facture");

    let totalMigrated = 0;
    let skip = 0;
    const idMap = {}; // Impaye.objectId → Facture.objectId

    // 1. Migrer les objets Impaye → Facture
    while (true) {
        const query = new Parse.Query(Impaye);
        query.limit(BATCH_SIZE);
        query.skip(skip);
        query.ascending("objectId");

        const results = await query.find({ useMasterKey: true });
        if (results.length === 0) break;

        const batch = [];
        for (const impaye of results) {
            const facture = new Facture();
            const attrs = impaye.attributes;
            for (const [key, value] of Object.entries(attrs)) {
                if (key === "createdAt" || key === "updatedAt") continue;
                facture.set(key, value);
            }
            batch.push(facture);
        }

        const saved = await Parse.Object.saveAll(batch, { useMasterKey: true });
        for (let i = 0; i < saved.length; i++) {
            idMap[results[i].id] = saved[i].id;
        }

        totalMigrated += results.length;
        skip += BATCH_SIZE;
        console.log(`   Migré ${totalMigrated}/${skip}...`);
        await sleep(SLEEP_MS);
    }

    console.log(`✅ ${totalMigrated} objets migrés Impaye → Facture`);

    // 2. Mettre à jour Activite.impaye (Pointer)
    console.log("🔄 Activite.impaye...");
    const Activite = Parse.Object.extend("Activite");
    const activites = await fetchAll(
        new Parse.Query(Activite).exists("impaye"),
        "Activite"
    );
    const actToSave = [];
    for (const act of activites) {
        const oldId = act.get("impaye")?.id;
        if (oldId && idMap[oldId]) {
            const newFacture = new Facture();
            newFacture.id = idMap[oldId];
            act.set("impaye", newFacture);
            actToSave.push(act);
        }
    }
    await saveBatch(actToSave);
    console.log(`✅ Activite mis à jour : ${actToSave.length}`);

    // 3. Mettre à jour Suivi.impaye (Pointer)
    console.log("🔄 Suivi.impaye...");
    const Suivi = Parse.Object.extend("Suivi");
    const suivisPointer = await fetchAll(
        new Parse.Query(Suivi).exists("impaye"),
        "Suivi (Pointer)"
    );
    const suiToSave = [];
    for (const sui of suivisPointer) {
        const oldId = sui.get("impaye")?.id;
        if (oldId && idMap[oldId]) {
            const newFacture = new Facture();
            newFacture.id = idMap[oldId];
            sui.set("impaye", newFacture);
            suiToSave.push(sui);
        }
    }
    await saveBatch(suiToSave);
    console.log(`✅ Suivi (Pointer) mis à jour : ${suiToSave.length}`);

    // 4. Mettre à jour Relance.impayes (Array de Pointers)
    console.log("🔄 Relance.impayes (Array)...");
    const Relance = Parse.Object.extend("Relance");
    const relances = await fetchAll(
        new Parse.Query(Relance).exists("impayes"),
        "Relance"
    );
    const relToSave = [];
    for (const rel of relances) {
        const oldArray = rel.get("impayes") || [];
        let changed = false;
        const newArray = oldArray.map((item) => {
            if (item.__type === "Pointer" && item.className === "Impaye" && idMap[item.objectId]) {
                changed = true;
                return {
                    __type: "Pointer",
                    className: "Facture",
                    objectId: idMap[item.objectId],
                };
            }
            return item;
        });
        if (changed) {
            rel.set("impayes", newArray);
            relToSave.push(rel);
        }
    }
    await saveBatch(relToSave);
    console.log(`✅ Relance.impayes mis à jour : ${relToSave.length}`);

    // 5. Mettre à jour Suivi.impayes (Array de Pointers)
    console.log("🔄 Suivi.impayes (Array)...");
    const suivisArray = await fetchAll(
        new Parse.Query(Suivi).exists("impayes"),
        "Suivi (Array)"
    );
    const suiArrToSave = [];
    for (const sui of suivisArray) {
        const oldArray = sui.get("impayes") || [];
        let changed = false;
        const newArray = oldArray.map((item) => {
            if (item.__type === "Pointer" && item.className === "Impaye" && idMap[item.objectId]) {
                changed = true;
                return {
                    __type: "Pointer",
                    className: "Facture",
                    objectId: idMap[item.objectId],
                };
            }
            return item;
        });
        if (changed) {
            sui.set("impayes", newArray);
            suiArrToSave.push(sui);
        }
    }
    await saveBatch(suiArrToSave);
    console.log(`✅ Suivi.impayes mis à jour : ${suiArrToSave.length}`);

    // Sauvegarder le mapping
    const fs = require("fs");
    fs.writeFileSync("/tmp/migration-id-map.json", JSON.stringify(idMap, null, 2));
    console.log("📝 Mapping ID sauvegardé dans /tmp/migration-id-map.json");

    return {
        totalMigrated,
        actUpdated: actToSave.length,
        suiPointerUpdated: suiToSave.length,
        relArrayUpdated: relToSave.length,
        suiArrayUpdated: suiArrToSave.length,
        idMap,
    };
}

migrateClass()
    .then((r) => {
        console.log("\n📊 Résumé :");
        console.log(`   Objets migrés : ${r.totalMigrated}`);
        console.log(`   Activite.impaye : ${r.actUpdated}`);
        console.log(`   Suivi.impaye (Pointer) : ${r.suiPointerUpdated}`);
        console.log(`   Relance.impayes (Array) : ${r.relArrayUpdated}`);
        console.log(`   Suivi.impayes (Array) : ${r.suiArrayUpdated}`);
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Erreur migration :", err.message);
        console.error(err.stack);
        process.exit(1);
    });
