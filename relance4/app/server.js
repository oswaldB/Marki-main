// backend/server.js
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const ParseServer = require("parse-server").ParseServer;
const ParseDashboard = require("parse-dashboard");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const crypto = require("crypto");

const cron = require("node-cron");

// 🚨 Gestion globale des erreurs non capturées (ssh2, etc.)
process.on("uncaughtException", (err, origin) => {
    console.error(`\n❌ UNCAUGHT EXCEPTION: ${err.message}`);
    console.error(`   Origin: ${origin}`);
    console.error(`   Stack: ${err.stack}\n`);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error(`\n⚠️  UNHANDLED REJECTION:`);
    console.error(`   Reason: ${reason?.message || reason}`);
    if (reason?.stack) console.error(`   Stack: ${reason.stack}\n`);
});

const app = express();
const PORT = process.env.PORT || 1555;

// ─── Conformité SQLite ────────────────────────────────────────────────────────
// Endpoint pour récupérer les statistiques de conformité depuis SQLite
app.get("/api/conformite/sqlite", async (req, res) => {
    const dbPath = "/home/arthur/adti/sync.db";

    try {
        // Vérifier que le fichier existe
        if (!fs.existsSync(dbPath)) {
            return res.status(404).json({
                success: false,
                error: "Base SQLite introuvable",
                path: dbPath,
            });
        }

        const Database = require("better-sqlite3");
        console.log("[DEBUG] better-sqlite3 loaded:", typeof Database);
        const db = new Database(dbPath);

        try {
            // Requête 1: Compter les factures uniques (nfacture)
            const totalFactures =
                db
                    .prepare(
                        `
                SELECT COUNT(DISTINCT nfacture) as count
                FROM _GCO__GcoPiece
                WHERE nfacture IS NOT NULL
            `,
                    )
                    .get().count || 0;

            // Requête 2: Compter les factures avec resteapayer > 0
            const resteApayerGt0 =
                db
                    .prepare(
                        `
                SELECT COUNT(DISTINCT nfacture) as count
                FROM _GCO__GcoPiece
                WHERE nfacture IS NOT NULL AND resteapayer > 0
            `,
                    )
                    .get().count || 0;

            // Requête 3: Compter les factures avec resteapayer > 0 ET nfacture > 44432
            const resteApayerGt0NfactureGt44432 =
                db
                    .prepare(
                        `
                SELECT COUNT(DISTINCT nfacture) as count
                FROM _GCO__GcoPiece
                WHERE nfacture IS NOT NULL AND resteapayer > 0 AND nfacture > 44432
            `,
                    )
                    .get().count || 0;

            db.close();

            res.json({
                success: true,
                data: {
                    total_factures: totalFactures,
                    resteapayer_gt_0: resteApayerGt0,
                    resteapayer_gt_0_nfacture_gt_44432:
                        resteApayerGt0NfactureGt44432,
                },
            });
        } catch (dbError) {
            db.close();
            throw dbError;
        }
    } catch (error) {
        console.error("[API] Erreur conformité SQLite:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// Activer CORS pour toutes les routes
app.use(cors());

// Configuration Parse Server
console.log("🔍 MONGODB_URI from env:", process.env.MONGODB_URI);

// Configuration du mail adapter pour Parse Server
let emailAdapter;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Créer un transporter nodemailer
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true", // true pour 465, false pour les autres ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    // Créer un adapter personnalisé pour Parse Server
    emailAdapter = {
        sendMail: ({ to, from, subject, text, html }) => {
            return transporter.sendMail({
                from: from || process.env.SMTP_FROM || "noreply@markidiags.com",
                to: to,
                subject: subject,
                text: text,
                html: html,
            });
        },
    };

    console.log("✉ Mail adapter configuré avec SMTP:", process.env.SMTP_HOST);
    console.log("   Utilisateur:", process.env.SMTP_USER);
} else {
    console.log(
        "⚠ Mail adapter non configuré - les emails ne seront pas envoyés",
    );
    console.log(
        "   Veuillez configurer SMTP_HOST, SMTP_USER et SMTP_PASS dans .env",
    );
}

const parseServer = new ParseServer({
    databaseURI:
        process.env.MONGODB_URI ||
        "mongodb://dev.api.markidiags.com:27017/marki15",
    appId: process.env.PARSE_APP_ID || "marki15-app-id",
    masterKey: process.env.PARSE_MASTER_KEY || "marki15-master-key",
    javascriptKey: process.env.PARSE_JAVASCRIPT_KEY || "",
    serverURL:
        process.env.PARSE_SERVER_URL || "https://dev.markidiags.com/parse",
    cloud: path.resolve(__dirname, "cloud/main.js"),
    ...(emailAdapter ? { emailAdapter } : {}),
    // Configuration CORS pour Parse Server
    allowClientClassCreation: false,
    enableAnonymousUsers: false,
    // Activer les requêtes cross-origin
    publicServerURL:
        process.env.PARSE_PUBLIC_URL ||
        process.env.PARSE_SERVER_URL ||
        "https://dev.markidiags.com/parse",
});

// Configuration Parse Dashboard
const dashboardConfig = {
    apps: [
        {
            serverURL:
                process.env.PARSE_SERVER_URL ||
                "https://dev.markidiags.com/parse",
            appId: process.env.PARSE_APP_ID || "marki15-app-id",
            masterKey: process.env.PARSE_MASTER_KEY || "marki15-master-key",
            appName: "Marki16 Parse Dashboard",
            production: false,
        },
    ],
    users: [
        {
            user: process.env.PARSE_DASHBOARD_USER || "admin",
            pass: process.env.PARSE_DASHBOARD_PASSWORD || "admin",
        },
    ],
    useEncryptedPasswords: false,
};

const parseDashboard = new ParseDashboard(dashboardConfig, {
    allowInsecureHTTP: true,
});

// Middleware pour Parse Dashboard
app.use("/parse-dashboard", parseDashboard);

// Endpoint health personnalisé
app.get("/api/healthy", (req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        parseServer: "running",
    });
});

// Endpoint pour déclencher manuellement la création des relances avec templates
// NOTE: Fichier manquant - à implémenter si nécessaire
// app.get('/trigger-create-relances', async (req, res) => {
//   try {
//     console.log('[API] Déclenchement manuel de createRelancesWithTemplates...');
//     const createRelancesWithTemplates = require('./cloud/workflows/import-invoice/04-createRelances');
//     const result = await createRelancesWithTemplates();
//     console.log('[API] Création des relances terminée:', result);
//     res.json({ success: true, result });
//   } catch (error) {
//     console.error('[API] Erreur création des relances:', error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// Endpoint pour déclencher manuellement l'attribution des séquences
app.get("/trigger-assign-sequences", async (req, res) => {
    try {
        console.log(
            "[API] Déclenchement manuel de assignSequencesAutomatically...",
        );
        const assignSequences = require("./cloud/workflows/import-invoice/02-assignSequencesAutomatically");
        const result = await assignSequences();
        console.log("[API] Attribution des séquences terminée:", result);
        res.json({ success: true, result });
    } catch (error) {
        console.error("[API] Erreur attribution des séquences:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route de base
app.get("/", (req, res) => {
    res.send("Marki Backend - Hello World");
});

// Endpoint temporaire pour déclencher la mise à jour des options dynamiques
// À supprimer après la première exécution
app.get("/trigger-update-dynamic-options", async (req, res) => {
    try {
        console.log("[API] Déclenchement manuel de updateDynamicOptions...");
        const updateDynamicOptionsMaster = require("./cloud/workflows/update-dynamic-options/00-master");
        await updateDynamicOptionsMaster({ trigger: "manual" });
        console.log("[API] Options dynamiques mises à jour avec succès");
        res.json({ success: true, message: "Options dynamiques mises à jour" });
    } catch (error) {
        console.error("[API] Erreur mise à jour options dynamiques:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint pour déclencher manuellement l'importation des factures
app.get("/trigger-import-invoices", async (req, res) => {
    try {
        console.log("[API] Déclenchement manuel de importInvoicesMaster...");
        const importInvoicesMaster = require("./cloud/workflows/import-invoice/00-master");
        const result = await importInvoicesMaster({ trigger: "manual" });
        console.log("[API] Importation des factures terminée:", result);
        res.json({ success: true, result });
    } catch (error) {
        console.error("[API] Erreur importation des factures:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Proxy endpoint for testing cloud functions
app.get("/api/test-cloud-hello", async (req, res) => {
    try {
        const response = await fetch(
            "http://localhost:1555/parse/functions/hello",
            {
                method: "POST",
                headers: {
                    "X-Parse-Application-Id":
                        process.env.PARSE_APP_ID || "marki15-app",
                    "X-Parse-Master-Key":
                        process.env.PARSE_MASTER_KEY ||
                        "e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9",
                    "Content-Type": "application/json",
                },
            },
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error calling cloud function:", error);
        res.status(500).json({ error: "Failed to call cloud function" });
    }
});

// ─── Import PDF routes ───────────────────────────────────────────────────────

const UPLOAD_PATH =
    process.env.UPLOAD_STORAGE_PATH ||
    path.join(__dirname, "../storage/uploads");
if (!fs.existsSync(UPLOAD_PATH)) fs.mkdirSync(UPLOAD_PATH, { recursive: true });

const multerStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_PATH),
    filename: (_req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + "-" + file.originalname);
    },
});
const upload = multer({
    storage: multerStorage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === "application/pdf") cb(null, true);
        else cb(new Error("Seuls les fichiers PDF sont acceptés"));
    },
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB par fichier
});

// Étape 1 : upload + extraction texte
app.post("/api/import/upload", upload.array("files", 50), async (req, res) => {
    try {
        const results = await Promise.all(
            (req.files || []).map(async (file) => {
                const buffer = fs.readFileSync(file.path);
                let text = "";
                let pages = 0;
                try {
                    const data = await pdfParse(buffer);
                    text = data.text;
                    pages = data.numpages;
                } catch {
                    text = "";
                }
                return {
                    id: file.filename,
                    originalName: file.originalname,
                    storedPath: file.path,
                    pages,
                    text,
                };
            }),
        );
        res.json({ files: results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Étape 2 : parsing Ollama/Mistral
app.post(
    "/api/import/parse",
    express.json({ limit: "10mb" }),
    async (req, res) => {
        const { files } = req.body;
        if (!Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: "Aucun fichier" });
        }

        const ollamaUrl = (
            process.env.OLLAMA_API_URL || "https://dev.api.markidiags.com:11434"
        ).replace(/\/$/, "");
        const model = process.env.OLLAMA_MODEL || "mistral";

        const results = await Promise.all(
            files.map(async (file) => {
                try {
                    const prompt = buildParsePrompt(file.text);
                    const ollamaHeaders = {
                        "Content-Type": "application/json",
                    };
                    if (process.env.OLLAMA_API_KEY)
                        ollamaHeaders["Authorization"] =
                            `Bearer ${process.env.OLLAMA_API_KEY}`;
                    const response = await fetch(`${ollamaUrl}/api/generate`, {
                        method: "POST",
                        headers: ollamaHeaders,
                        body: JSON.stringify({
                            model,
                            prompt,
                            stream: false,
                            format: "json",
                        }),
                        signal: AbortSignal.timeout(120_000),
                    });
                    if (!response.ok)
                        throw new Error(`Ollama HTTP ${response.status}`);
                    const data = await response.json();
                    let parsed = {};
                    try {
                        parsed = JSON.parse(data.response);
                    } catch {
                        parsed = {};
                    }
                    return {
                        id: file.id,
                        originalName: file.originalName,
                        storedPath: file.storedPath,
                        parsed,
                    };
                } catch (err) {
                    return {
                        id: file.id,
                        originalName: file.originalName,
                        storedPath: file.storedPath,
                        parsed: {},
                        parseError: err.message,
                    };
                }
            }),
        );

        res.json({ results });
    },
);

function buildParsePrompt(text) {
    const excerpt = (text || "").substring(0, 4000);
    return `Tu es un assistant spécialisé dans l'extraction de données de factures immobilières françaises.
Extrait les informations suivantes du texte ci-dessous et retourne UNIQUEMENT un objet JSON valide.

Champs attendus :
- nfacture : numéro de facture (string)
- ndossier : numéro de dossier (string)
- ref_piece : référence complète de la pièce, ex "FA260121 50319" — utilisée pour construire l'URL du PDF (string)
- montant_ht : montant HT en euros sans symbole (number)
- montant_ttc : montant TTC en euros sans symbole (number)
- reste_a_payer : reste à payer en euros sans symbole (number)
- date_piece : date pièce au format YYYY-MM-DD (string)
- date_intervention : date intervention au format YYYY-MM-DD (string)
- adresse : adresse complète du bien (string)
- lot : numéro de lot (string)
- etage : étage (string)
- porte : numéro de porte (string)
- payeur_nom : nom complet du payeur (string)
- payeur_email : email du payeur (string)
- payeur_telephone : téléphone du payeur (string)
- payeur_type : type de contact parmi Propriétaire, Locataire sortant, Locataire entrant, Apporteur (string)
- employe : nom du gestionnaire/employé (string)
- commentaire : commentaire éventuel (string)

Si une information est absente, utilise null.

Texte de la facture :
${excerpt}`;
}

// ─── Fin import routes ────────────────────────────────────────────────────────

// ─── Proxy PDF via SFTP ───────────────────────────────────────────────────────

const SftpClient = require("ssh2-sftp-client");

// Clé secrète pour signer les URLs PDF (à mettre dans .env)
const PDF_SIGNING_SECRET =
    process.env.PDF_SIGNING_SECRET || "marki16-default-pdf-secret-change-me";

// Endpoint pour accéder au PDF (vérifie la signature)
app.get("/api/pdf/:impayelId", async (req, res) => {
    const { impayelId } = req.params;
    const { sig, expires } = req.query;

    // Vérifier la signature et l'expiration
    if (!sig || !expires) {
        return res.status(403).json({
            error: "Lien invalide ou expiré. Veuillez réutiliser le lien envoyé par email.",
        });
    }

    const now = Math.floor(Date.now() / 1000);
    if (parseInt(expires) < now) {
        return res.status(403).json({
            error: "Ce lien a expiré. Veuillez réutiliser le lien envoyé par email.",
        });
    }

    // Vérifier la signature
    const dataToSign = `${impayelId}:${expires}:${PDF_SIGNING_SECRET}`;
    const expectedSig = crypto
        .createHmac("sha256", PDF_SIGNING_SECRET)
        .update(dataToSign)
        .digest("hex");

    if (sig !== expectedSig) {
        return res.status(403).json({
            error: "Lien invalide. Veuillez réutiliser le lien envoyé par email.",
        });
    }

    // Récupérer l'impayé depuis Parse
    let impaye;
    try {
        const Impaye = Parse.Object.extend("Impaye");
        const q = new Parse.Query(Impaye);
        impaye = await q.get(impayelId, { useMasterKey: true });
    } catch {
        return res.status(404).json({ error: "Impayé introuvable" });
    }

    const source = impaye.get("source");

    // ── PDF local (upload manuel) ──────────────────────────────────────────────
    if (source === "upload") {
        const localPath = impaye.get("pdf_local_path");
        if (!localPath)
            return res
                .status(404)
                .json({ error: "Chemin PDF local non renseigné" });

        // Sécurité : vérifier que le fichier est bien dans UPLOAD_PATH
        if (!localPath.startsWith(UPLOAD_PATH)) {
            return res.status(403).json({ error: "Accès refusé" });
        }
        if (!fs.existsSync(localPath)) {
            return res
                .status(404)
                .json({ error: "Fichier PDF introuvable sur le serveur" });
        }

        const filename = path.basename(localPath);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(filename)}"`,
        );
        return res.sendFile(localPath);
    }

    // ── PDF SFTP (sync db_externe) ─────────────────────────────────────────────
    const urlPdf = impaye.get("url_pdf");
    if (!urlPdf)
        return res
            .status(404)
            .json({ error: "Aucun PDF associé à cet impayé" });

    const sftp = new SftpClient();
    try {
        await sftp.connect({
            host: process.env.FTP_HOST,
            port: parseInt(process.env.FTP_PORT || "2222", 10),
            username: process.env.FTP_USERNAME,
            password: process.env.FTP_PASSWORD,
        });

        try {
            const stream = await sftp.createReadStream(urlPdf);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `inline; filename="${encodeURIComponent(urlPdf.split("/").pop())}"`,
            );
            stream.pipe(res);
            stream.on("end", () => sftp.end());
            stream.on("error", (err) => {
                console.error("[pdf-proxy] Stream error:", err.message);
                sftp.end();
                if (!res.headersSent)
                    res.status(500).json({ error: "Erreur lecture PDF" });
            });
        } catch (err) {
            console.error("[pdf-proxy] File not found:", err.message);
            sftp.end().catch(() => {});
            if (!res.headersSent)
                res.status(404).json({
                    error: "Fichier PDF introuvable sur le serveur",
                });
        }
    } catch (err) {
        console.error("[pdf-proxy] SFTP connection error:", err.message);
        sftp.end().catch(() => {});
        res.status(500).json({ error: "Erreur connexion SFTP" });
    }
});

// ─── Fin proxy PDF ────────────────────────────────────────────────────────────

// ─── Téléchargement public des invoices (pour les gros fichiers) ────────────
const TEMP_DIR = "/tmp/adti-invoices";

app.get("/download/invoices/:token", async (req, res) => {
    const { token } = req.params;

    // Sécurité: vérifier que le token est valide (format hex 64 chars)
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        return res.status(400).json({ error: "Token invalide" });
    }

    const filePath = path.join(TEMP_DIR, token);
    const zipPath = path.join(TEMP_DIR, token + ".zip");
    const pdfPath = path.join(TEMP_DIR, token + ".pdf");

    // Essayer les différentes extensions
    let finalPath = null;
    if (fs.existsSync(zipPath)) {
        finalPath = zipPath;
    } else if (fs.existsSync(pdfPath)) {
        finalPath = pdfPath;
    } else if (fs.existsSync(filePath)) {
        finalPath = filePath;
    }

    if (!finalPath || !fs.existsSync(finalPath)) {
        return res.status(404).json({ error: "Fichier introuvable ou expiré" });
    }

    try {
        // Vérifier la taille du fichier (limite à 100Mo pour éviter les abus)
        const stats = fs.statSync(finalPath);
        if (stats.size > 100 * 1024 * 1024) {
            return res.status(400).json({ error: "Fichier trop volumineux" });
        }

        const filename = path.basename(finalPath);
        res.setHeader(
            "Content-Type",
            filename.endsWith(".pdf") ? "application/pdf" : "application/zip",
        );
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(filename)}"`,
        );

        // Stream le fichier pour éviter de tout charger en mémoire
        const fileStream = fs.createReadStream(finalPath);
        fileStream.pipe(res);

        fileStream.on("error", (err) => {
            console.error(
                "[download/invoices] Erreur lecture fichier:",
                err.message,
            );
            if (!res.headersSent) {
                res.status(500).json({ error: "Erreur lecture fichier" });
            }
        });

        res.on("finish", () => {
            fileStream.close();
        });
    } catch (err) {
        console.error("[download/invoices] Erreur:", err.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ─── Test SMTP ────────────────────────────────────────────────────────────────

app.post("/api/smtp/test", express.json(), async (req, res) => {
    const { host, port, username, password } = req.body;
    if (!host || !username || !password) {
        return res.status(400).json({
            ok: false,
            error: "Champs manquants (host, username, password requis)",
        });
    }
    try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port) || 587,
            secure: parseInt(port) === 465,
            auth: { user: username, pass: password },
        });
        await transporter.verify();
        res.json({ ok: true });
    } catch (err) {
        res.json({ ok: false, error: err.message });
    }
});

// ─── Démarrage async : Parse Server v7+ requiert start() avant montage
(async () => {
    await parseServer.start();
    app.use("/parse", parseServer.app);
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
        console.log(
            `Parse Server available at https://dev.markidiags.com/parse`,
        );
        console.log(
            `Parse Dashboard available at https://dev.markidiags.com/parse-dashboard`,
        );
        console.log(
            `Health check available at https://dev.markidiags.com/healthy.html`,
        );

        // Configuration des tâches cron
        const { setupCronJobs } = require("./cron");
        setupCronJobs();
    });
})();
