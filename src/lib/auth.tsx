"use client"

import React, { useEffect, useState, ReactNode, useCallback, useMemo } from "react"
import { supabase } from "./supabase"
import { AuthContext, AuthUser } from "./auth-context"
import { RefreshCw, X, AlertCircle, Mail, UserPlus, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// LOGO
import logo from "@/assets/logo.png"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalView, setModalView] = useState<"signin" | "signup">("signin")
  const [useMagicLink, setUseMagicLink] = useState(false)
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [formLoading, setFormSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Stabilisation de la récupération du profil
  const fetchProfile = useCallback(async (supabaseUser: any) => {
    if (!supabaseUser) { 
      setUser(null); 
      setIsLoading(false); 
      setFormSubmitting(false);
      return; 
    }
    
    try {
      const { data, error } = await supabase
        .from("User")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle()

      if (error) throw error;

      if (data) {
        const r = (data.role || "VOYAGEUR").toUpperCase()
        const roles: any = { 
          ADMIN: "Administrateur", 
          AGENT_AGENCE: "Agent", 
          AGENCE_EMBARQUEMENT: "Agent Embarquement", 
          SERVICE_COLIS: "Service Colis", 
          CAISSIER: "Caissier" 
        }
        setUser({
          id: data.id, 
          email: data.email || supabaseUser.email,
          firstName: data.firstName || "", 
          lastName: data.lastName || "",
          role: roles[r] || "Voyageur", 
          phone: data.phone || "", 
          companyId: data.agencyId || undefined
        })
        setIsModalOpen(false) 
      }
    } catch (e) {
      console.error("Erreur Sync Profil:", e)
    } finally {
      setIsLoading(false)
      setFormSubmitting(false)
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user)
      else setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsLoading(false)
        setFormSubmitting(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // STABILISATION DES FONCTIONS POUR ÉVITER LA BOUCLE
  const loginWithRedirect = useCallback((p?: any) => {
    if (p?.initialView) setModalView(p.initialView);
    setIsModalOpen(true);
  }, []);

  const logout = useCallback(() => supabase.auth.signOut(), []);

  // Handlers
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setFormSubmitting(true); 
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: password 
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ type: "error", text: "Identifiants incorrects." }); 
      setFormSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setFormSubmitting(true); 
    setMessage(null);
    try {
      const { error: authError } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password: password, 
          options: { 
            emailRedirectTo: window.location.origin,
            data: { first_name: firstName, last_name: lastName, phone: phone }
          } 
      })
      if (authError) throw authError;
      setMessage({ type: "success", text: "Vérifiez vos emails pour valider votre compte." })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message }); 
    } finally {
      setFormSubmitting(false);
    }
  }

  // Mémorisation de la valeur du contexte pour stopper les re-rendus inutiles
  const contextValue = useMemo(() => ({
    user, isLoading, isModalOpen, loginWithRedirect, logout
  }), [user, isLoading, isModalOpen, loginWithRedirect, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
          {/* Container du modal avec scroll interne pour mobile */}
          <div className="w-full max-w-sm rounded-[2.5rem] border border-border bg-slate-900 p-8 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="absolute right-6 top-6 p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 z-50"
            >
              <X size={20} />
            </button>
            
            <div className="text-center mb-8">
                <img src={logo} alt="Logo" className="h-16 w-auto mx-auto mb-4 object-contain filter brightness-110" />
                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white leading-none">
                    {modalView === "signin" ? "Connexion" : "Inscription"}
                </h3>
                <p className="text-[9px] text-primary font-black uppercase tracking-[0.3em] mt-2">TransGabon-Connect</p>
            </div>

            {message && (
              <div className={`p-4 rounded-2xl text-[10px] font-bold mb-6 flex gap-3 items-center border ${
                message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span className="flex-1 text-left">{message.text}</span>
              </div>
            )}

            {modalView === "signin" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 my-4">
                    <div className="h-px flex-1 bg-slate-800" />
                    <span className="text-[10px] font-black text-slate-600 uppercase italic">Identification</span>
                    <div className="h-px flex-1 bg-slate-800" />
                </div>

                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <Label htmlFor="login-email" className="text-[10px] font-black uppercase text-slate-500 ml-2">Email</Label>
                    <Input id="login-email" type="email" required placeholder="nom@exemple.ga" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" disabled={formLoading} />
                  </div>
                  
                  <div className="space-y-1 text-left">
                    <Label htmlFor="login-password" className="text-[10px] font-black uppercase text-slate-500 ml-2">Mot de passe</Label>
                    <Input id="login-password" type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" disabled={formLoading} />
                  </div>

                  <Button type="submit" className="w-full font-black h-14 rounded-2xl shadow-xl bg-primary text-white text-lg uppercase tracking-widest active:scale-95 transition-all border-none" disabled={formLoading}>
                    {formLoading ? <RefreshCw className="h-6 w-6 animate-spin" /> : "Se connecter"}
                  </Button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-3 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="space-y-1">
                    <Label htmlFor="reg-fname" className="text-[9px] font-black uppercase text-slate-500 ml-2">Prénom</Label>
                    <Input id="reg-fname" required value={firstName} onChange={e => setFirstName(e.target.value)} className="h-11 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reg-lname" className="text-[9px] font-black uppercase text-slate-500 ml-2">Nom</Label>
                    <Input id="reg-lname" required value={lastName} onChange={e => setLastName(e.target.value)} className="h-11 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" />
                  </div>
                </div>
                <div className="space-y-1 text-left">
                    <Label htmlFor="reg-phone" className="text-[9px] font-black uppercase text-slate-500 ml-2">Téléphone</Label>
                    <Input id="reg-phone" type="tel" required placeholder="066 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} className="h-11 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" />
                </div>
                <div className="space-y-1 text-left">
                    <Label htmlFor="reg-email" className="text-[9px] font-black uppercase text-slate-500 ml-2">Email</Label>
                    <Input id="reg-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" />
                </div>
                <div className="space-y-1 text-left">
                    <Label htmlFor="reg-password" className="text-[9px] font-black uppercase text-slate-500 ml-2">Mot de passe</Label>
                    <Input id="reg-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" />
                </div>
                <Button type="submit" className="w-full font-black h-14 rounded-2xl shadow-xl bg-primary text-white text-lg mt-4 uppercase active:scale-95 border-none transition-all" disabled={formLoading}>
                  {formLoading ? <RefreshCw className="h-6 w-6 animate-spin" /> : "Créer mon compte"}
                </Button>
              </form>
            )}

            <div className="mt-8 text-center border-t border-slate-800 pt-6">
              <button 
                type="button" 
                onClick={(e) => { 
                  e.preventDefault();
                  setModalView(modalView === "signin" ? "signup" : "signin"); 
                  setMessage(null); 
                }} 
                className="text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors cursor-pointer relative z-50"
              >
                {modalView === "signin" ? "Nouveau ? Créer un compte" : "Déjà membre ? Se connecter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}