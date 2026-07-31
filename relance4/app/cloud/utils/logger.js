// backend/cloud/utils/logger.js
// Logger amélioré pour écrire dans des fichiers de log par workflow
// Supporte les niveaux de log, le nom de la fonction, et un format structuré

const fs = require("fs");
const path = require("path");

const LOG_LEVELS = {
    DEBUG: "DEBUG",
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
};

const LOG_COLORS = {
    DEBUG: "\x1b[35m", // Magenta
    INFO: "\x1b[36m", // Cyan
    WARN: "\x1b[33m", // Yellow
    ERROR: "\x1b[31m", // Red
    RESET: "\x1b[0m", // Reset
};

/**
 * Extrait le nom du workflow à partir du chemin du caller
 * @returns {string} Nom du workflow
 */
function getWorkflowName() {
    const stack = new Error().stack;
    const callerLine = stack.split("\n")[2];
    const callerPath = callerLine.match(/\s+(.*?):/)?.[1] || "";
    const parts = callerPath.replace(/\\/g, "/").split("/");
    const workflowIndex = parts.findIndex((p) => p === "workflows");
    if (workflowIndex !== -1 && parts.length > workflowIndex + 1) {
        return parts[workflowIndex + 1];
    }
    return "unknown-workflow";
}

/**
 * Extrait le nom de la fonction à partir de la stack
 * @returns {string} Nom de la fonction
 */
function getFunctionName() {
    const stack = new Error().stack;
    const callerLine = stack.split("\n")[2];
    const match = callerLine.match(/at\s+(\.?[A-Za-z_][A-Za-z0-9_]*)/);
    if (match) {
        return match[1];
    }
    return "anonymous";
}

/**
 * Formate un message de log en format lisible
 * @param {string} timestamp - Timestamp ISO
 * @param {string} level - Niveau de log
 * @param {string} workflow - Nom du workflow
 * @param {string} functionName - Nom de la fonction
 * @param {string} message - Message à logger
 * @param {Object} [metadata] - Métadonnées supplémentaires
 * @returns {string} Ligne de log formatée
 */
function formatLogLine(
    timestamp,
    level,
    workflow,
    functionName,
    message,
    metadata = {},
) {
    // Format lisible: [timestamp] [LEVEL] [workflow/function] message
    const datePart = timestamp.split("T")[0];
    const timePart = timestamp.split("T")[1].split(".")[0];
    const shortTimestamp = `${datePart} ${timePart}`;

    // Ajouter les métadonnées si présentes
    const metadataStr =
        Object.keys(metadata).length > 0
            ? ` | ${JSON.stringify(metadata)}`
            : "";

    return `[${shortTimestamp}] [${level}] [${workflow}/${functionName}] ${message}${metadataStr}`;
}

/**
 * Formate un message de log pour la console (avec couleurs)
 * @param {string} level - Niveau de log
 * @param {string} workflow - Nom du workflow
 * @param {string} functionName - Nom de la fonction
 * @param {string} message - Message à logger
 * @returns {string} Ligne formatée pour la console
 */
function formatConsoleLine(level, workflow, functionName, message) {
    const color = LOG_COLORS[level] || LOG_COLORS.INFO;
    const reset = LOG_COLORS.RESET;
    const timestamp = new Date().toISOString();
    return `${color}[${timestamp}] [${level}] [${workflow}/${functionName}]${reset} ${message}`;
}

/**
 * Assure que le répertoire de log existe
 * @param {string} logDir - Chemin du répertoire
 */
function ensureLogDir(logDir) {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
}

/**
 * Écrit un message de log
 * @param {string} message - Message à logger
 * @param {string} [level='INFO'] - Niveau de log (DEBUG, INFO, WARN, ERROR)
 * @param {string} [workflowName] - Nom du workflow (déduit automatiquement si non fourni)
 * @param {string} [functionName] - Nom de la fonction (déduit automatiquement si non fourni)
 * @param {Object} [metadata] - Métadonnées supplémentaires à inclure
 */
function log(
    message,
    level = "INFO",
    workflowName = null,
    functionName = null,
    metadata = {},
) {
    // Valider le niveau de log
    if (!LOG_LEVELS[level]) {
        level = "INFO";
    }

    // Déduire le workflow et la fonction si non fournis
    if (!workflowName) {
        workflowName = getWorkflowName();
    }
    if (!functionName) {
        functionName = getFunctionName();
    }

    const timestamp = new Date().toISOString();

    // Formater la ligne de log
    const logLine = formatLogLine(
        timestamp,
        level,
        workflowName,
        functionName,
        message,
        metadata,
    );
    const consoleLine = formatConsoleLine(
        level,
        workflowName,
        functionName,
        message,
    );

    // Écrire dans le répertoire du workflow
    const workflowLogDir = path.join(
        __dirname,
        "..",
        "workflows",
        workflowName,
        "logs",
    );
    ensureLogDir(workflowLogDir);

    // Écrire dans le fichier principal du workflow
    const mainLogFile = path.join(workflowLogDir, `${workflowName}.log`);
    // Fichier errors séparement
    let errorsLogFile = null;

    try {
        // Ajouter au fichier principal (tous niveaux)
        fs.appendFileSync(mainLogFile, logLine + "\n", "utf8");

        // Ajouter au fichier errors.log si c'est une erreur
        if (level === "ERROR") {
            errorsLogFile = path.join(
                workflowLogDir,
                `${workflowName}-errors.log`,
            );
            fs.appendFileSync(errorsLogFile, logLine + "\n", "utf8");
        }
    } catch (err) {
        console.error(
            `${LOG_COLORS.ERROR}[logger] Impossible d'écrire dans le fichier de log:${LOG_COLORS.RESET}`,
            err.message,
        );
    }

    // Afficher sur la console selon le niveau
    const envLogLevel = process.env.LOG_LEVEL || "INFO";
    const levelPriority = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    const envPriority = levelPriority[envLogLevel] || 1;
    const messagePriority = levelPriority[level] || 1;

    if (messagePriority >= envPriority) {
        console.log(consoleLine);
    }
}

// Fonctions de convenience pour chaque niveau
function debug(
    message,
    workflowName = null,
    functionName = null,
    metadata = {},
) {
    log(message, "DEBUG", workflowName, functionName, metadata);
}

function info(
    message,
    workflowName = null,
    functionName = null,
    metadata = {},
) {
    log(message, "INFO", workflowName, functionName, metadata);
}

function warn(
    message,
    workflowName = null,
    functionName = null,
    metadata = {},
) {
    log(message, "WARN", workflowName, functionName, metadata);
}

function error(
    message,
    workflowName = null,
    functionName = null,
    metadata = {},
) {
    log(message, "ERROR", workflowName, functionName, metadata);
}

// Fonction originale writeLog pour la compatibilité
function writeLog(message, workflowName = null) {
    info(message, workflowName);
}

module.exports = {
    log,
    debug,
    info,
    warn,
    error,
    writeLog, // Compatibilité avec l'ancien code
    LOG_LEVELS,
};
