"use client"
import { createContext, useContext } from "react"

export type MappedRole = "Voyageur" | "Agent" | "Administrateur" | "Agent Embarquement" | "Service Colis" | "Caissier"

export interface AuthUser {
  id: string; email: string; firstName: string; lastName: string; role: MappedRole; phone?: string; companyId?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isModalOpen: boolean; // Ajouté pour que la page sache si le modal est déjà ouvert
  loginWithRedirect: (params?: { initialView?: "signin" | "signup" }) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth doit être utilisé dans AuthProvider")
  return context
}