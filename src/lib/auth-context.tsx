"use client"
import { createContext, useContext } from "react"

/**
 * MappedRole : Définit les types d'utilisateurs autorisés sur la plateforme.
 * - Voyageur : Client final (B2C)
 * - Agent : Chef d'agence / Manager (Accès total agence)
 * - Administrateur : Super-Admin plateforme (Accès total système)
 * - Agent Embarquement : Personnel de quai (Scan & Manifeste)
 * - Service Colis : Personnel logistique (Fret & Tracking)
 * - Caissier : Personnel financier (Encaissement & Remboursement)
 */
export type MappedRole = 
  | "Voyageur" 
  | "Agent" 
  | "Administrateur" 
  | "Agent Embarquement" 
  | "Service Colis" 
  | "Caissier";

export interface AuthUser {
  id: string; 
  email: string; 
  firstName: string; 
  lastName: string; 
  role: MappedRole; 
  phone?: string; 
  companyId?: string; // ID de l'agence de rattachement (pour les rôles Agent/Caissier/etc.)
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isModalOpen: boolean; 
  /**
   * loginWithRedirect : Ouvre la modal d'authentification.
   * @param params.initialView Permet de choisir l'onglet par défaut (connexion ou inscription)
   */
  loginWithRedirect: (params?: { initialView?: "signin" | "signup" }) => void;
  /**
   * logout : Déconnecte l'utilisateur de la session Supabase
   */
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * useAuth : Hook personnalisé pour accéder aux données utilisateur et aux fonctions de connexion
 * partout dans l'application sans avoir à passer par les "props".
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider")
  }
  return context
}