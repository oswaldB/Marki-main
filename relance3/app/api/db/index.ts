// Types générés depuis marki.db

import { Database } from 'bun:sqlite';

let db: Database | null = null;

export function getDB(): Database {
  if (!db) { db = new Database('app/api/db/marki.db'); }
  return db;
}

export interface User {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  username: string;
  password: string;
  email?: string;
  emailVerified?: number;
  authData?: string;
  role?: string;
}

export interface Session {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  installationId?: string;
  sessionToken: string;
  expiresAt?: string;
  createdWith?: string;
}

export interface Smtpprofile {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  nom?: string;
  nomAffiche?: string;
  port?: number;
  username?: string;
  host?: string;
  signatureHtml?: string;
  emailFrom?: string;
  password?: string;
}

export interface Sequence {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  nom: string;
  type?: string;
  lienPaiement?: string;
  publiee?: number;
  validationObligatoire?: number;
  attributionAutomatique?: number;
  reglesType?: string;
  emails?: string;
  groupesRegles?: string;
}

export interface Sequencemessage {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  sequenceId: string;
  ordre: number;
  nom?: string;
  delaiJours?: number;
  typeAction?: string;
  sujet?: string;
  contenuHtml?: string;
  contenuText?: string;
  modeleId?: string;
  genererTask?: number;
  taskAssignee?: string;
  taskDescription?: string;
}

export interface Sequencegrouperegles {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  sequenceId: string;
  nom?: string;
  ordre?: number;
  regles: string;
}

export interface Contact {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  typePersonne?: string;
  externeId?: string;
  source?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  isBlacklisted?: number;
  blacklistedAt?: string;
  nbImpayes?: number;
  prenom?: string;
  civilite?: string;
  entrepriseId?: string;
  lastSyncAt?: string;
}

export interface ContactEmployes {
  entrepriseId: string;
  employeId: string;
}

export interface Lienpaiement {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  nom?: string;
  url?: string;
}

export interface Impaye {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  dateDebutMission?: string;
  source?: string;
  nfacture?: number;
  datePiece?: string;
  totalHt?: number;
  externeId?: number;
  dateEcheance?: string;
  idDossier?: string;
  reference?: string;
  urlPdf?: string;
  refPiece?: string;
  numeroDossier?: number;
  statutDossier?: string;
  adresseBien?: string;
  employeIntervention?: string;
  commentaireDossier?: string;
  ville?: string;
  etage?: string;
  numeroLot?: string;
  codePostal?: string;
  porte?: string;
  apporteurNom?: string;
  payeurTypePersonne?: string;
  payeurEmail?: string;
  payeurPrenom?: string;
  donneurOrdreEmail?: string;
  donneurOrdrePrenom?: string;
  donneurOrdreNom?: string;
  proprietaireNom?: string;
  proprietaireEmail?: string;
  proprietairePrenom?: string;
  proprietaireTypePersonne?: string;
  apporteurId?: string;
  payeurId?: string;
  contactRelanceId?: string;
  resteAPayer?: number;
  totalTtc?: number;
  payeurType?: string;
  payeurNom?: string;
  factureSoldee?: number;
  apporteurEmail?: string;
  commentairePiece?: string;
  entree?: string;
  apporteurPrenom?: string;
  syndicEmail?: string;
  syndicNom?: string;
  apporteurTelephone?: string;
  payeurTelephone?: string;
  sequenceId?: string;
  escalier?: string;
  donneurOrdreTelephone?: string;
  proprietaireTelephone?: string;
  referenceExterne?: string;
  notaireNom?: string;
  notairePrenom?: string;
  notaireEmail?: string;
  notaireTelephone?: string;
  locataireEntrantPrenom?: string;
  locataireEntrantEmail?: string;
  locataireEntrantNom?: string;
  locataireSortantNom?: string;
  locataireSortantEmail?: string;
  locataireSortantPrenom?: string;
  locataireEntrantTelephone?: string;
  locataireSortantTelephone?: string;
  syndicTelephone?: string;
  acquereurEmail?: string;
  acquereurTelephone?: string;
  acquereurPrenom?: string;
  acquereurNom?: string;
  soldeLe?: string;
  solde?: number;
  proprietaireCivilite?: string;
  donneurOrdreCivilite?: string;
  payeurCivilite?: string;
  apporteurCivilite?: string;
  notaireCivilite?: string;
  locataireEntrantCivilite?: string;
  syndicCivilite?: string;
  locataireSortantCivilite?: string;
  acquereurCivilite?: string;
  blacklistedAt?: string;
  isBlacklisted?: number;
  blacklistMotifType?: string;
  blacklistMotif?: string;
  cadreMission?: string;
  missions?: string;
  proprietaireId?: string;
}

export interface Relance {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  statut?: string;
  manuelle?: number;
  dateEnvoi?: string;
  corps?: string;
  objet?: string;
  emailIndex?: number;
  smtpProfilId?: string;
  cc?: string;
  sequenceId?: string;
  valide?: number;
  contactId?: string;
  impayes?: string;
  scenario?: string;
  erreurCount?: number;
  lastError?: string;
  emailSent?: number;
  contenu?: string;
  dateEnvoiPrevue?: string;
  sujet?: string;
}

export interface Suivi {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  scenario?: string;
  impayes?: string;
  sequenceId?: string;
  emailIndex?: number;
  format?: string;
  contactId?: string;
  statut?: string;
  dateEnvoiPrevue?: string;
  impayeId?: string;
  corps?: string;
  objet?: string;
  dateEnvoi?: string;
  frequence?: string;
  erreurCount?: number;
  valide?: number;
  manuelle?: number;
  smtpProfilId?: string;
  count?: number;
  whereClause?: string;
  emailSent?: number;
  dateEnvoiReelle?: string;
}

export interface Optionsdynamiques {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  type?: string;
  valeurs?: string;
}

export interface Event {
  objectId: string;
  createdAt?: string;
  updatedAt?: string;
  userId: string;
  type: string;
  title: string;
  description?: string;
  icon?: string;
  metadata?: string;
  read?: number;
}

