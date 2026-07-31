// backend/cloud/workflows/cleanup-relances-contact-blackliste/index.js
// Workflow de nettoyage des relances non envoyées dont le contact est blacklisté
// UN SEUL "function" dans tout le fichier

const fs = require("fs");
const path = require("path");

// Parse.Cloud.define n'est disponible que dans parse-server, pas dans le SDK client
// On utilise le Parse global injecté par parse-server
if (
    typeof Parse !== "undefined" &&
    Parse.Cloud &&
    typeof Parse.Cloud.define === "function"
) {
    Parse.Cloud.define("cleanupRelancesBlacklist", async function (request) {
        const contactId = request.params.contactId || null;
        const trigger = request.user ? "manual" : "cron";

        // CHECKPOINT: cleanup-start
        const ts_start = new Date().toISOString();
        const line_start =
            ts_start +
            " [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [cleanup-start] Démarrage" +
            JSON.stringify({ contactId: contactId, trigger: trigger });
        console.log(line_start);
        try {
            const dir_start = path.join(__dirname, "logs");
            if (!fs.existsSync(dir_start))
                fs.mkdirSync(dir_start, { recursive: true });
            fs.appendFileSync(
                path.join(
                    dir_start,
                    "cleanup-relances-" + ts_start.split("T")[0] + ".log",
                ),
                line_start + "\n",
            );
        } catch (e) {}

        try {
            const Contact = Parse.Object.extend("Contact");
            const Relance = Parse.Object.extend("Relance");

            // CHECKPOINT: db-connected
            console.log(
                new Date().toISOString() +
                    " [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [db-connected] Classes Parse initialisées",
            );

            let blacklistedContacts = [];
            if (contactId) {
                const contact = await new Parse.Query(Contact).get(contactId, {
                    useMasterKey: true,
                });
                if (contact && contact.get("isBlacklisted") === true) {
                    blacklistedContacts = [contact];
                    console.log(
                        new Date().toISOString() +
                            " [CLEANUP-RELANCES-BLACKLIST][INFO] Contact blacklisté trouvé " +
                            JSON.stringify({ contactId: contactId }),
                    );
                } else {
                    console.log(
                        new Date().toISOString() +
                            " [CLEANUP-RELANCES-BLACKLIST][INFO] Contact non blacklisté " +
                            JSON.stringify({ contactId: contactId }),
                    );
                    console.log(
                        new Date().toISOString() +
                            ' [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [contacts-blacklist-fetched] Aucun {"count":0}',
                    );
                    return {
                        success: true,
                        deletedCount: 0,
                        message: "Contact non blacklisté",
                    };
                }
            } else {
                const query = new Parse.Query(Contact);
                query.equalTo("isBlacklisted", true);
                query.limit(1000);
                blacklistedContacts = await query.find({ useMasterKey: true });
                console.log(
                    new Date().toISOString() +
                        " [CLEANUP-RELANCES-BLACKLIST][INFO] Contacts blacklistés récupérés " +
                        JSON.stringify({ count: blacklistedContacts.length }),
                );
            }

            // CHECKPOINT: contacts-blacklist-fetched
            console.log(
                new Date().toISOString() +
                    " [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [contacts-blacklist-fetched] " +
                    blacklistedContacts.length +
                    " contact(s) " +
                    JSON.stringify({ count: blacklistedContacts.length }),
            );

            if (blacklistedContacts.length === 0) {
                console.log(
                    new Date().toISOString() +
                        ' [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [cleanup-completed] Aucun contact blacklisté {"deletedCount":0}',
                );
                return {
                    success: true,
                    deletedCount: 0,
                    message: "Aucun contact blacklisté",
                };
            }

            // Construction des pointeurs
            const contactPointers = [];
            for (let i = 0; i < blacklistedContacts.length; i++) {
                contactPointers.push({
                    __type: "Pointer",
                    className: "Contact",
                    objectId: blacklistedContacts[i].id,
                });
            }

            const relanceQuery = new Parse.Query(Relance);
            relanceQuery.containedIn("contact", contactPointers);
            relanceQuery.notEqualTo("envoyee", true);
            relanceQuery.doesNotExist("dateEnvoi");
            relanceQuery.limit(1000);

            const relancesToDelete = await relanceQuery.find({
                useMasterKey: true,
            });

            // CHECKPOINT: relances-fetched
            console.log(
                new Date().toISOString() +
                    " [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [relances-fetched] " +
                    relancesToDelete.length +
                    " relance(s) à supprimer " +
                    JSON.stringify({ count: relancesToDelete.length }),
            );

            if (relancesToDelete.length === 0) {
                console.log(
                    new Date().toISOString() +
                        ' [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [cleanup-completed] Aucune relance à supprimer {"deletedCount":0}',
                );
                return {
                    success: true,
                    deletedCount: 0,
                    message: "Aucune relance à supprimer",
                };
            }

            await Parse.Object.destroyAll(relancesToDelete, {
                useMasterKey: true,
            });

            // CHECKPOINT: relances-deleted
            console.log(
                new Date().toISOString() +
                    " [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [relances-deleted] " +
                    relancesToDelete.length +
                    " relance(s) supprimée(s) " +
                    JSON.stringify({ deletedCount: relancesToDelete.length }),
            );
            console.log(
                new Date().toISOString() +
                    " [CLEANUP-RELANCES-BLACKLIST][INFO] Relances supprimées " +
                    JSON.stringify({ count: relancesToDelete.length }),
            );

            // Extraction des IDs
            const relanceIds = [];
            for (let i = 0; i < relancesToDelete.length; i++) {
                relanceIds.push(relancesToDelete[i].id);
            }

            const contactIds = [];
            for (let i = 0; i < blacklistedContacts.length; i++) {
                contactIds.push(blacklistedContacts[i].id);
            }

            // Écriture du log Markdown
            try {
                const dir = path.join(__dirname, "logs");
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const ts = new Date().toISOString();
                const fileName =
                    "cleanup-report-" + ts.replace(/[:.]/g, "-") + ".md";

                let content = "# Nettoyage Relances Blacklist - " + ts + "\n\n";
                content += "## Résumé\n\n";
                content +=
                    "- **Contacts traités** : " +
                    blacklistedContacts.length +
                    "\n";
                content +=
                    "- **Relances supprimées** : " +
                    relancesToDelete.length +
                    "\n";
                content += "- **Mode** : " + trigger + "\n";
                content +=
                    "- **Contact spécifique** : " +
                    (contactId || "Non") +
                    "\n\n";
                content += "## Contacts\n\n";
                for (let i = 0; i < contactIds.length; i++) {
                    content += "- " + contactIds[i] + "\n";
                }
                content += "\n## Relances\n\n";
                for (let i = 0; i < relanceIds.length; i++) {
                    content += "- " + relanceIds[i] + "\n";
                }

                fs.writeFileSync(path.join(dir, fileName), content);

                // CHECKPOINT: log-written
                console.log(
                    new Date().toISOString() +
                        " [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [log-written] Log: " +
                        fileName,
                );
            } catch (e) {
                console.log(
                    new Date().toISOString() +
                        " [CLEANUP-RELANCES-BLACKLIST][WARN] Erreur écriture log fichier " +
                        JSON.stringify({ error: e.message }),
                );
            }

            // CHECKPOINT: cleanup-completed
            console.log(
                new Date().toISOString() +
                    " [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [cleanup-completed] Terminé " +
                    JSON.stringify({ deletedCount: relancesToDelete.length }),
            );
            console.log(
                new Date().toISOString() +
                    " [CLEANUP-RELANCES-BLACKLIST][INFO] === Terminé === " +
                    JSON.stringify({
                        deletedCount: relancesToDelete.length,
                        contactsCount: blacklistedContacts.length,
                    }),
            );

            return {
                success: true,
                deletedCount: relancesToDelete.length,
                contactsCount: blacklistedContacts.length,
                relanceIds: relanceIds,
                message:
                    relancesToDelete.length +
                    " relance(s) supprimée(s) pour " +
                    blacklistedContacts.length +
                    " contact(s)",
            };
        } catch (error) {
            console.log(
                new Date().toISOString() +
                    " [CLEANUP-RELANCES-BLACKLIST][CHECKPOINT] [cleanup-error] " +
                    error.message,
            );
            console.log(
                new Date().toISOString() +
                    " [CLEANUP-RELANCES-BLACKLIST][ERROR] Erreur: " +
                    error.message,
            );
            throw error;
        }
    });
}

console.log("✅ Mega-function cleanup-relances-contact-blackliste chargée");
