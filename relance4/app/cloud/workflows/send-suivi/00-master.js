// backend/cloud/workflows/send-suivi/00-master.js
// Workflow d'envoi des emails de suivi

// Charger les variables d'environnement depuis .env
require("dotenv").config({ path: "/home/ubuntu/prod/adti/.env" });

const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const Imap = require("imap");
const { info, warn, error } = require("../../utils/logger");

// Chemin du répertoire logs
const LOGS_DIR = path.join(__dirname, "logs");

/**
 * Vide le répertoire logs
 */
function clearLogs() {
    try {
        if (fs.existsSync(LOGS_DIR)) {
            const files = fs.readdirSync(LOGS_DIR);
            files.forEach((file) => {
                const filePath = path.join(LOGS_DIR, file);
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    warn(
                        `Impossible de supprimer ${filePath}: ${err.message}`,
                        "send-suivi",
                        "clearLogs",
                    );
                }
            });
            info(
                `Répertoire logs vidé: ${files.length} fichiers supprimés`,
                "send-suivi",
                "sendSuivisMaster",
            );
        }
    } catch (err) {
        warn(
            `Impossible de vider le répertoire logs: ${err.message}`,
            "send-suivi",
            "sendSuivisMaster",
        );
    }
}

// Initialiser Parse si nécessaire
if (typeof Parse === "undefined") {
    const Parse = require("parse/node");
    Parse.initialize(
        process.env.PARSE_APP_ID,
        process.env.PARSE_JAVASCRIPT_KEY,
        process.env.PARSE_MASTER_KEY,
    );
    Parse.serverURL = process.env.PARSE_SERVER_URL;
    Parse.Cloud.useMasterKey();
    global.Parse = Parse;
}

/**
 * Fonction principale pour l'envoi des emails de suivi
 * @param {Object} options - Options du workflow
 * @param {string} [options.trigger='manual'] - Type de déclenchement
 * @param {string[]} [options.suiviIds] - Liste spécifique d'IDs de suivi à envoyer
 * @returns {Promise<Object>} Statistiques du traitement
 */
async function sendSuivisMaster({
    trigger = "manual",
    suiviIds = null,
} = {}) {
    const startedAt = new Date();

    // Règle 1: Vider le répertoire logs au début (sauf en mode test)
    if (trigger !== "test") {
        clearLogs();
    }

    // Séparateur visuel
    info(
        "\n============================================================",
        "send-suivi",
        "sendSuivisMaster",
    );
    info(
        `🚀 DÉBUT: send-suivi (trigger: ${trigger})`,
        "send-suivi",
        "sendSuivisMaster",
        { trigger },
    );
    info(
        "============================================================",
        "send-suivi",
        "sendSuivisMaster",
    );

    // Initialiser les statistiques
    const stats = {
        result: null,
        errors: [],
        total: {
            startedAt: startedAt.toISOString(),
            finishedAt: null,
            durationMs: null,
        },
    };

    try {
        // Initialiser le résultat
        const result = {
            suivisEnvoyes: 0,
            suivisErreurs: 0,
            erreurs: [],
        };

        // Construire la requête pour les suivis
        const query = new Parse.Query("Suivi");

        // Filtrer par IDs spécifiques ou par statut et date
        if (suiviIds && suiviIds.length > 0) {
            query.containedIn("objectId", suiviIds);
            info(
                `Requête pour ${suiviIds.length} suivis spécifiques`,
                "send-suivi",
                "sendSuivisMaster",
                { suiviIds },
            );
        } else {
            // Filtrer par statut "pret pour envoi" et date d'envoi <= maintenant
            // Récupère les suivis en attente (y compris ceux des jours précédents)
            query.equalTo("statut", "pret pour envoi");
            query.lessThanOrEqualTo("dateEnvoi", new Date());
            info(
                'Requête pour tous les suivis avec statut "pret pour envoi" et date d\'envoi <= maintenant',
                "send-suivi",
                "sendSuivisMaster",
            );
        }

        // Inclure les relations nécessaires
        query.include(["contact", "sequence", "impayes", "smtpProfil"]);
        query.limit(9999);

        // Exécuter la requête
        info("Exécution de la requête...", "send-suivi", "sendSuivisMaster");
        const suivis = await query.find({ useMasterKey: true });
        info(
            `Trouvé ${suivis.length} suivis à traiter`,
            "send-suivi",
            "sendSuivisMaster",
            { count: suivis.length },
        );

        // Traiter chaque suivi
        let suiviIndex = 0;
        for (const suivi of suivis) {
            suiviIndex++;
            const suiviId = suivi.id;
            info(
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [${suiviIndex}/${suivis.length}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                "send-suivi",
                "sendSuivisMaster",
            );
            info(
                `🔄 Traitement suivi ${suiviId} (${suiviIndex}/${suivis.length})`,
                "send-suivi",
                "sendSuivisMaster",
            );

            let contactEmail = null;

            try {
                // Validation: Vérifier la présence du contact et de son email
                const contact = suivi.get("contact");
                contactEmail = contact?.get("email");
                const impayes = suivi.get("impayes") || [];

                if (!contact || !contactEmail) {
                    const errorMsg = `Suivi ${suiviId}: Contact ou email manquant`;
                    warn(errorMsg, "send-suivi", "sendSuivisMaster");
                    result.erreurs.push({
                        suiviId,
                        erreur: "Contact ou email manquant",
                    });
                    result.suivisErreurs++;

                    // Mettre à jour le suivi avec l'erreur
                    suivi.set("statut", "Erreur d'envoi");
                    suivi.set("lastError", "Contact ou email manquant");
                    await suivi.save(null, { useMasterKey: true });
                    continue;
                }

                if (impayes.length === 0) {
                    const errorMsg = `Suivi ${suiviId}: Aucun impayé associé`;
                    warn(errorMsg, "send-suivi", "sendSuivisMaster");
                    result.erreurs.push({
                        suiviId,
                        erreur: "Aucun impayé associé",
                    });
                    result.suivisErreurs++;

                    // Mettre à jour le suivi avec l'erreur
                    suivi.set("statut", "Erreur d'envoi");
                    suivi.set("lastError", "Aucun impayé associé");
                    await suivi.save(null, { useMasterKey: true });
                    continue;
                }

                // Vérification blacklist - Contact
                if (contact.get("isBlacklisted") === true) {
                    const errorMsg = `Suivi ${suiviId}: Contact blacklisté`;
                    warn(errorMsg, "send-suivi", "sendSuivisMaster");
                    result.erreurs.push({
                        suiviId,
                        erreur: "Contact blacklisté",
                    });
                    result.suivisErreurs++;

                    // Mettre à jour le suivi avec le statut blacklist
                    suivi.set("statut", "Contact blacklisté");
                    suivi.set("lastError", "Contact blacklisté");
                    await suivi.save(null, { useMasterKey: true });
                    continue;
                }

                // Vérification blacklist - Impayés
                let impayeBlacklisted = false;
                for (const impaye of impayes) {
                    if (impaye.get("isBlacklisted") === true) {
                        const errorMsg = `Suivi ${suiviId}: Impayé ${impaye.id} blacklisté`;
                        warn(errorMsg, "send-suivi", "sendSuivisMaster");
                        result.erreurs.push({
                            suiviId,
                            erreur: "Impayé blacklisté",
                        });
                        result.suivisErreurs++;

                        // Mettre à jour le suivi avec le statut blacklist
                        suivi.set("statut", "Impayé blacklisté");
                        suivi.set("lastError", `Impayé ${impaye.id} blacklisté`);
                        await suivi.save(null, { useMasterKey: true });
                        impayeBlacklisted = true;
                        break;
                    }
                }
                if (impayeBlacklisted) continue;

                // Récupérer le profil SMTP
                const smtpProfil = suivi.get("smtpProfil");
                if (!smtpProfil) {
                    const errorMsg = `Suivi ${suiviId}: Profil SMTP manquant`;
                    warn(errorMsg, "send-suivi", "sendSuivisMaster");
                    result.erreurs.push({
                        suiviId,
                        erreur: "Profil SMTP manquant",
                    });
                    result.suivisErreurs++;

                    // Mettre à jour le suivi avec l'erreur
                    suivi.set("statut", "Erreur d'envoi");
                    suivi.set("lastError", "Profil SMTP manquant");
                    await suivi.save(null, { useMasterKey: true });
                    continue;
                }

                // Préparer les données de l'email
                const from =
                    smtpProfil.get("email_from") || smtpProfil.get("username");
                const to = contactEmail;
                const subject = suivi.get("objet") || "Suivi de dossiers";
                const baseHtml = suivi.get("corps") || "<p>Contenu du suivi...</p>";
                const replyTo = smtpProfil.get("email_from") || null;

                // Récupérer le champ CC spécifique aux suivis
                const cc = suivi.get("cc");
                info(
                    `DEBUG Suivi: ${suiviId} - CC brut:`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { 
                        suiviId, 
                        ccRaw: cc,
                        ccType: typeof cc,
                    },
                );

                // DEBUG: Récupération de la signature
                const signatureRaw = smtpProfil.get("signature_html");
                info(
                    `DEBUG SMTP Profil: ${smtpProfil.id} - signature_html brut:`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { 
                        suiviId, 
                        smtpProfilId: smtpProfil.id,
                        signatureRaw: signatureRaw,
                        signatureType: typeof signatureRaw,
                        signatureLength: signatureRaw ? signatureRaw.length : 0
                    },
                );
                
                const signatureHtml = signatureRaw || null;

                // Construire le HTML final avec signature
                let html = baseHtml;
                if (signatureHtml && signatureHtml.trim()) {
                    const signaturePreview = signatureHtml.substring(0, 100).replace(/\n/g, '\\n');
                    html = baseHtml + "<br><br>" + signatureHtml;
                    info(
                        `✅ Signature trouvée et ajoutée (début: "${signaturePreview}...")`,
                        "send-suivi",
                        "sendSuivisMaster",
                        { suiviId, signatureLength: signatureHtml.length, signaturePreview },
                    );
                } else {
                    info(
                        `⚠️ Pas de signature trouvée`,
                        "send-suivi",
                        "sendSuivisMaster",
                        { suiviId },
                    );
                }

                info(
                    `Préparation de l'email pour ${to} - Sujet: ${subject}`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { suiviId, to, subject },
                );

                // Initialiser le transporteur Nodemailer
                const transporter = nodemailer.createTransport({
                    host: smtpProfil.get("host"),
                    port: smtpProfil.get("port"),
                    secure: smtpProfil.get("port") === 465,
                    auth: {
                        user: smtpProfil.get("username"),
                        pass: smtpProfil.get("password"),
                    },
                    tls: {
                        // Ignorer la validation du certificat si nécessaire (pour les environnements de test)
                        rejectUnauthorized:
                            process.env.NODE_ENV === "production",
                    },
                });

                // Construire les options de l'email
                const emailOptions = {
                    from: from,
                    to: to,
                    subject: subject,
                    html: html,
                    replyTo: replyTo,
                };

                // Ajouter le CC si présent (spécifique aux suivis)
                if (cc && cc.trim()) {
                    const ccList = cc.split(',').map(e => e.trim()).filter(Boolean);
                    emailOptions.cc = ccList;
                    info(
                        `📧 CC ajouté: ${ccList.join(', ')}`,
                        "send-suivi",
                        "sendSuivisMaster",
                        { suiviId, ccList },
                    );
                }

                // Envoyer l'email
                info(
                    `📤 [${suiviId}] Début sendMail vers ${to}...`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { suiviId, to },
                );

                let emailInfo;
                try {
                    emailInfo = await transporter.sendMail(emailOptions);
                    info(
                        `✅ [${suiviId}] Email envoyé avec succès - MessageID: ${emailInfo.messageId}`,
                        "send-suivi",
                        "sendSuivisMaster",
                        { suiviId, messageId: emailInfo.messageId, response: emailInfo.response },
                    );
                } catch (sendErr) {
                    error(
                        `❌ [${suiviId}] Échec sendMail: ${sendErr.message}`,
                        "send-suivi",
                        "sendSuivisMaster",
                        { suiviId, error: sendErr.message, code: sendErr.code },
                    );
                    throw sendErr;
                }

                // Copier l'email vers le dossier Sent via IMAP (obligatoire)
                try {
                    info(
                        `📋 [${suiviId}] Tentative copie vers Sent...`,
                        "send-suivi",
                        "sendSuivisMaster",
                        { suiviId },
                    );
                    await copyToSentFolder(
                        smtpProfil,
                        emailOptions,
                        emailInfo,
                    );
                    info(
                        `✅ [${suiviId}] Copie vers Sent réussie`,
                        "send-suivi",
                        "sendSuivisMaster",
                        { suiviId },
                    );
                } catch (imapError) {
                    error(
                        `❌ [${suiviId}] Copie vers Sent échouée: ${imapError.message}`,
                        "send-suivi",
                        "sendSuivisMaster",
                        { suiviId, error: imapError.message },
                    );
                    // Considérer comme une erreur bloquante pour les suivis
                    throw new Error(`IMAP Sent folder failed: ${imapError.message}`);
                }

                // Mettre à jour le suivi avec succès
                info(
                    `💾 [${suiviId}] Mise à jour statut -> "Envoyée"...`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { suiviId },
                );
                suivi.set("statut", "Envoyée");
                suivi.set("dateEnvoiReelle", new Date());
                suivi.set("emailSent", true);
                
                info(
                    `💾 [${suiviId}] Sauvegarde Parse...`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { suiviId },
                );
                await suivi.save(null, { useMasterKey: true });
                info(
                    `✅ [${suiviId}] Suivi sauvegardé avec succès`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { suiviId },
                );

                result.suivisEnvoyes++;
                info(
                    `✅ [${suiviId}] SUIVI TERMINÉ - Envoyé avec succès (${result.suivisEnvoyes} total)`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { suiviId },
                );

            } catch (emailError) {
                // Gestion des erreurs d'envoi
                const errorMsg = `❌ [${suiviId}] Erreur envoi email à ${contactEmail || "inconnu"}: ${emailError.message}`;
                error(errorMsg, "send-suivi", "sendSuivisMaster", {
                    suiviId: suivi.id,
                    error: emailError.message,
                    code: emailError.code,
                    stack: emailError.stack?.substring(0, 500),
                });

                // Mettre à jour le suivi avec l'erreur
                info(
                    `💾 [${suiviId}] Mise à jour statut -> "Erreur d'envoi"...`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { suiviId, errorMessage: emailError.message },
                );
                suivi.set("statut", "Erreur d'envoi");
                suivi.set("lastError", emailError.message);
                
                info(
                    `💾 [${suiviId}] Sauvegarde Parse (erreur)...`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { suiviId },
                );
                await suivi.save(null, { useMasterKey: true });
                info(
                    `✅ [${suiviId}] Suivi sauvegardé (statut erreur)`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { suiviId },
                );

                result.erreurs.push({
                    suiviId: suivi.id,
                    erreur: emailError.message,
                });
                result.suivisErreurs++;
                info(
                    `❌ [${suiviId}] SUIVI TERMINÉ - Erreur (${result.suivisErreurs} erreurs total)`,
                    "send-suivi",
                    "sendSuivisMaster",
                    { suiviId, error: emailError.message },
                );
            }
        }

        // Finaliser les statistiques
        result.totalSuivis = suivis.length;
        stats.result = result;
        
        info(
            `📊 RÉSUMÉ TRAITEMENT: ${result.suivisEnvoyes} envoyés, ${result.suivisErreurs} erreurs, ${suivis.length} total`,
            "send-suivi",
            "sendSuivisMaster",
            { 
                envoyes: result.suivisEnvoyes, 
                erreurs: result.suivisErreurs, 
                total: suivis.length 
            },
        );

    } catch (globalError) {
        // Erreur globale (ex: problème avec Parse)
        error(
            `Erreur globale dans sendSuivisMaster: ${globalError.message}`,
            "send-suivi",
            "sendSuivisMaster",
            {
                error: globalError.message,
                stack: globalError.stack,
            },
        );
        stats.errors.push({
            type: "global",
            message: globalError.message,
            stack: globalError.stack,
        });
        stats.result = {
            suivisEnvoyes: 0,
            suivisErreurs: 0,
            erreurs: [
                {
                    type: "global",
                    erreur: globalError.message,
                },
            ],
        };
    }

    // Finaliser les statistiques de temps
    const finishedAt = new Date();
    stats.total.finishedAt = finishedAt.toISOString();
    stats.total.durationMs = finishedAt - startedAt;

    // Log de fin
    info(
        "============================================================",
        "send-suivi",
        "sendSuivisMaster",
    );
    if (stats.result) {
        info(
            `✅ FIN: send-suivi - ${stats.result.suivisEnvoyes} envoyés, ${stats.result.suivisErreurs} erreurs`,
            "send-suivi",
            "sendSuivisMaster",
            {
                result: stats.result,
                durationMs: stats.total.durationMs,
            },
        );
    } else {
        info(
            "✅ FIN: send-suivi (aucun suivi traité)",
            "send-suivi",
            "sendSuivisMaster",
            {
                durationMs: stats.total.durationMs,
            },
        );
    }
    info(
        "============================================================\n",
        "send-suivi",
        "sendSuivisMaster",
    );

    return stats;
}

/**
 * Copie l'email envoyé vers le dossier Sent via IMAP
 * @param {Parse.Object} smtpProfil - Profil SMTP
 * @param {Object} emailOptions - Options de l'email
 * @param {Object} emailInfo - Informations de l'email envoyé
 * @returns {Promise<void>}
 */
async function copyToSentFolder(smtpProfil, emailOptions, emailInfo) {
    // Récupérer les informations IMAP du profil SMTP
    let imapHost = smtpProfil.get("imapHost");
    let imapPort = smtpProfil.get("imapPort");
    const imapUsername = smtpProfil.get("imapUsername") || smtpProfil.get("username");
    const imapPassword = smtpProfil.get("imapPassword") || smtpProfil.get("password");
    const imapSecure = smtpProfil.get("imapSecure") !== false;

    // Si pas de config IMAP explicite, essayer de deviner à partir du host SMTP
    if (!imapHost || !imapPort) {
        const smtpHost = smtpProfil.get("host") || "";

        // Règles de conversion SMTP -> IMAP courantes
        if (smtpHost.includes("smtp.")) {
            imapHost = smtpHost.replace("smtp.", "imap.");
            imapPort = 993;
        } else if (smtpHost.includes("ionos")) {
            imapHost = "imap.ionos.fr";
            imapPort = 993;
        } else if (smtpHost.includes("gmail")) {
            imapHost = "imap.gmail.com";
            imapPort = 993;
        } else if (smtpHost.includes("outlook") || smtpHost.includes("office365")) {
            imapHost = "outlook.office365.com";
            imapPort = 993;
        } else {
            info(
                `IMAP non configuré et impossible à deviner pour ${smtpProfil.id} (host: ${smtpHost}), copie Sent ignorée`,
                "send-suivi",
                "copyToSentFolder",
            );
            return;
        }

        info(
            `IMAP deviné à partir du SMTP: ${imapHost}:${imapPort}`,
            "send-suivi",
            "copyToSentFolder",
            { smtpHost, imapHost, imapPort },
        );
    }

    return new Promise((resolve, reject) => {
        const imap = new Imap({
            host: imapHost,
            port: imapPort,
            tls: imapSecure,
            user: imapUsername,
            password: imapPassword,
            tlsOptions: {
                rejectUnauthorized: process.env.NODE_ENV === "production",
            },
        });

        function openSentFolder(cb) {
            const sentFolders = ["Sent", "Sent Items", "Sent Messages", "Envoyés", "&BB4EQgQ,BEAEMAQyBDsENQQ9BD0-"];

            function tryNextFolder(index) {
                if (index >= sentFolders.length) {
                    return cb(new Error("Dossier Sent introuvable"));
                }

                const folderName = sentFolders[index];
                imap.openBox(folderName, false, (err, box) => {
                    if (err) {
                        info(
                            `Dossier '${folderName}' non trouvé, essai suivant...`,
                            "send-suivi",
                            "copyToSentFolder",
                        );
                        return tryNextFolder(index + 1);
                    }
                    info(
                        `Dossier Sent trouvé: '${folderName}'`,
                        "send-suivi",
                        "copyToSentFolder",
                    );
                    cb(null, box);
                });
            }

            tryNextFolder(0);
        }

        imap.once("ready", () => {
            openSentFolder((err, box) => {
                if (err) {
                    imap.end();
                    return reject(err);
                }

                const date = new Date().toUTCString();
                const messageId = emailInfo.messageId || `<${Date.now()}@adti.fr>`;

                const fullMessage = [
                    `Date: ${date}`,
                    `Message-Id: ${messageId}`,
                    `From: ${emailOptions.from}`,
                    `To: ${emailOptions.to}`,
                    emailOptions.cc ? `Cc: ${Array.isArray(emailOptions.cc) ? emailOptions.cc.join(", ") : emailOptions.cc}` : "",
                    `Subject: ${emailOptions.subject}`,
                    `Content-Type: text/html; charset=utf-8`,
                    `Mime-Version: 1.0`,
                    `\n`,
                    emailOptions.html,
                ].filter(Boolean).join("\r\n");

                imap.append(fullMessage, { mailbox: box.name, flags: ["\\Seen"] }, (appendErr) => {
                    imap.end();
                    if (appendErr) {
                        return reject(appendErr);
                    }
                    resolve();
                });
            });
        });

        imap.once("error", (err) => {
            reject(new Error(`Erreur IMAP: ${err.message}`));
        });

        imap.connect();
    });
}

/**
 * Fonction pour être appelée depuis la ligne de commande
 */
async function main() {
    try {
        // Parser les arguments de la ligne de commande
        const args = process.argv.slice(2);
        const options = {
            trigger: "manual",
            suiviIds: null,
        };

        // Analyser les arguments
        for (let i = 0; i < args.length; i++) {
            if (args[i] === "--trigger" && args[i + 1]) {
                options.trigger = args[i + 1];
                i++;
            } else if (args[i] === "--suiviIds" && args[i + 1]) {
                options.suiviIds = args[i + 1].split(",");
                i++;
            }
        }

        // Appeler la fonction principale
        const result = await sendSuivisMaster(options);

        // Afficher un résumé
        if (result.result) {
            console.log(
                `\nRésumé: ${result.result.suivisEnvoyes} emails envoyés, ${result.result.suivisErreurs} erreurs`,
            );
            if (result.result.erreurs.length > 0) {
                console.log("\nErreurs rencontrées:");
                result.result.erreurs.forEach((err, idx) => {
                    console.log(`  ${idx + 1}. ${err.suiviId}: ${err.erreur}`);
                });
            }
        }

        process.exit(0);
    } catch (err) {
        error(
            `Erreur fatale dans main: ${err.message}`,
            "send-suivi",
            "main",
            { error: err },
        );
        process.exit(1);
    }
}

// Exécuter si appelé directement depuis la ligne de commande
if (require.main === module) {
    main();
}

// Exporter la fonction principale pour utilisation programmatique
module.exports = { sendSuivisMaster };

/**
 * Cloud Function: sendSuivis
 * Endpoint HTTP pour déclencher l'envoi des emails de suivi
 * 
 * curl -X POST \
 *   -H "X-Parse-Application-Id: {APP_ID}" \
 *   -H "X-Parse-Master-Key: {MASTER_KEY}" \
 *   -H "Content-Type: application/json" \
 *   -d '{"suiviIds": ["id1", "id2"]}' \
 *   {PARSE_SERVER_URL}/functions/sendSuivis
 * 
 * Paramètres optionnels:
 * - suiviIds: string[] - IDs spécifiques de suivis à envoyer
 * - trigger: string - Type de déclenchement (défaut: "cloud")
 */
if (typeof Parse !== "undefined") {
    Parse.Cloud.define("sendSuivis", async (request) => {
        const { suiviIds = null, trigger = "cloud" } = request.params;
        
        info(
            `Cloud Function sendSuivis appelée (trigger: ${trigger})`,
            "send-suivi",
            "sendSuivis",
            { suiviIds },
        );

        try {
            const stats = await sendSuivisMaster({
                trigger,
                suiviIds,
            });

            return {
                success: true,
                stats: stats.result,
                errors: stats.errors,
                durationMs: stats.total.durationMs,
            };
        } catch (err) {
            error(
                `Erreur dans Cloud Function sendSuivis: ${err.message}`,
                "send-suivi",
                "sendSuivis",
                { error: err },
            );
            throw new Parse.Error(
                Parse.Error.SCRIPT_FAILED,
                `Erreur lors de l'envoi des suivis: ${err.message}`,
            );
        }
    });
}
