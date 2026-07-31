-- Schéma généré depuis marki.db

CREATE TABLE IF NOT EXISTS _User (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    emailVerified INTEGER,
    authData TEXT,
    role TEXT
);

CREATE TABLE IF NOT EXISTS _Session (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    userId TEXT,
    installationId TEXT,
    sessionToken TEXT NOT NULL,
    expiresAt DATETIME,
    createdWith TEXT
);

CREATE TABLE IF NOT EXISTS SmtpProfile (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    nom TEXT,
    nomAffiche TEXT,
    port REAL,
    username TEXT,
    host TEXT,
    signatureHtml TEXT,
    emailFrom TEXT,
    password TEXT
);

CREATE TABLE IF NOT EXISTS Sequence (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    nom TEXT NOT NULL,
    type TEXT,
    lienPaiement TEXT,
    publiee INTEGER,
    validationObligatoire INTEGER,
    attributionAutomatique INTEGER,
    reglesType TEXT,
    emails TEXT,
    groupesRegles TEXT
);

CREATE TABLE IF NOT EXISTS SequenceMessage (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    sequenceId TEXT NOT NULL,
    ordre INTEGER NOT NULL,
    nom TEXT,
    delaiJours INTEGER,
    typeAction TEXT,
    sujet TEXT,
    contenuHtml TEXT,
    contenuText TEXT,
    modeleId TEXT,
    genererTask INTEGER,
    taskAssignee TEXT,
    taskDescription TEXT
);

CREATE TABLE IF NOT EXISTS SequenceGroupeRegles (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    sequenceId TEXT NOT NULL,
    nom TEXT,
    ordre INTEGER,
    regles TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Contact (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    typePersonne TEXT,
    externeId TEXT,
    source TEXT,
    nom TEXT,
    email TEXT,
    telephone TEXT,
    isBlacklisted INTEGER,
    blacklistedAt DATETIME,
    nbImpayes REAL,
    prenom TEXT,
    civilite TEXT,
    entrepriseId TEXT,
    lastSyncAt DATETIME
);

CREATE TABLE IF NOT EXISTS Contact_Employes (
    entrepriseId TEXT PRIMARY KEY NOT NULL,
    employeId TEXT PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS LienPaiement (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    nom TEXT,
    url TEXT
);

CREATE TABLE IF NOT EXISTS Impaye (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    dateDebutMission DATETIME,
    source TEXT,
    nfacture REAL,
    datePiece DATETIME,
    totalHt REAL,
    externeId REAL,
    dateEcheance DATETIME,
    idDossier TEXT,
    reference TEXT,
    urlPdf TEXT,
    refPiece TEXT,
    numeroDossier REAL,
    statutDossier TEXT,
    adresseBien TEXT,
    employeIntervention TEXT,
    commentaireDossier TEXT,
    ville TEXT,
    etage TEXT,
    numeroLot TEXT,
    codePostal TEXT,
    porte TEXT,
    apporteurNom TEXT,
    payeurTypePersonne TEXT,
    payeurEmail TEXT,
    payeurPrenom TEXT,
    donneurOrdreEmail TEXT,
    donneurOrdrePrenom TEXT,
    donneurOrdreNom TEXT,
    proprietaireNom TEXT,
    proprietaireEmail TEXT,
    proprietairePrenom TEXT,
    proprietaireTypePersonne TEXT,
    apporteurId TEXT,
    payeurId TEXT,
    contactRelanceId TEXT,
    resteAPayer REAL,
    totalTtc REAL,
    payeurType TEXT,
    payeurNom TEXT,
    factureSoldee INTEGER,
    apporteurEmail TEXT,
    commentairePiece TEXT,
    entree TEXT,
    apporteurPrenom TEXT,
    syndicEmail TEXT,
    syndicNom TEXT,
    apporteurTelephone TEXT,
    payeurTelephone TEXT,
    sequenceId TEXT,
    escalier TEXT,
    donneurOrdreTelephone TEXT,
    proprietaireTelephone TEXT,
    referenceExterne TEXT,
    notaireNom TEXT,
    notairePrenom TEXT,
    notaireEmail TEXT,
    notaireTelephone TEXT,
    locataireEntrantPrenom TEXT,
    locataireEntrantEmail TEXT,
    locataireEntrantNom TEXT,
    locataireSortantNom TEXT,
    locataireSortantEmail TEXT,
    locataireSortantPrenom TEXT,
    locataireEntrantTelephone TEXT,
    locataireSortantTelephone TEXT,
    syndicTelephone TEXT,
    acquereurEmail TEXT,
    acquereurTelephone TEXT,
    acquereurPrenom TEXT,
    acquereurNom TEXT,
    soldeLe DATETIME,
    solde INTEGER,
    proprietaireCivilite TEXT,
    donneurOrdreCivilite TEXT,
    payeurCivilite TEXT,
    apporteurCivilite TEXT,
    notaireCivilite TEXT,
    locataireEntrantCivilite TEXT,
    syndicCivilite TEXT,
    locataireSortantCivilite TEXT,
    acquereurCivilite TEXT,
    blacklistedAt DATETIME,
    isBlacklisted INTEGER,
    blacklistMotifType TEXT,
    blacklistMotif TEXT,
    cadreMission TEXT,
    missions TEXT,
    proprietaireId TEXT
);

CREATE TABLE IF NOT EXISTS Relance (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    statut TEXT,
    manuelle INTEGER,
    dateEnvoi DATETIME,
    corps TEXT,
    objet TEXT,
    emailIndex REAL,
    smtpProfilId TEXT,
    cc TEXT,
    sequenceId TEXT,
    valide INTEGER,
    contactId TEXT,
    impayes TEXT,
    scenario TEXT,
    erreurCount REAL,
    lastError TEXT,
    emailSent INTEGER,
    contenu TEXT,
    dateEnvoiPrevue DATETIME,
    sujet TEXT
);

CREATE TABLE IF NOT EXISTS Suivi (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    scenario TEXT,
    impayes TEXT,
    sequenceId TEXT,
    emailIndex REAL,
    format TEXT,
    contactId TEXT,
    statut TEXT,
    dateEnvoiPrevue DATETIME,
    impayeId TEXT,
    corps TEXT,
    objet TEXT,
    dateEnvoi DATETIME,
    frequence TEXT,
    erreurCount REAL,
    valide INTEGER,
    manuelle INTEGER,
    smtpProfilId TEXT,
    count INTEGER,
    whereClause TEXT,
    emailSent INTEGER,
    dateEnvoiReelle DATETIME
);

CREATE TABLE IF NOT EXISTS OptionsDynamiques (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    type TEXT,
    valeurs TEXT
);

CREATE TABLE IF NOT EXISTS Event (
    objectId TEXT PRIMARY KEY,
    createdAt DATETIME,
    updatedAt DATETIME,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    metadata TEXT,
    read INTEGER
);

