"use client"

import React, { useEffect, useState, ReactNode } from "react"
import { supabase } from "./supabase"
import { AuthContext, AuthUser } from "./auth-context"
import { RefreshCw, X, AlertCircle, Lock, Mail, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// IMPORTATION DU LOGO
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

  // CETTE FONCTION NE FAIT PLUS QUE DE LA LECTURE
  const fetchProfile = async (supabaseUser: any) => {
    if (!supabaseUser) { setUser(null); setIsLoading(false); return; }
    
    try {
      const { data } = await supabase
        .from("User")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle()

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
      } else {
        // Si la ligne n'existe pas encore (attente du trigger), on ne fait rien
        // L'utilisateur sera chargé au prochain rafraîchissement ou après confirmation mail
        setUser(null);
      }
    } catch (e) {
      console.error("Erreur Sync Profil:", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user)
      else setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user)
        setIsModalOpen(false) 
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setFormSubmitting(true); setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { 
      setMessage({ type: "error", text: "Identifiants invalides ou erreur de connexion." }); 
      setFormSubmitting(false); 
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ type: "error", text: "Veuillez saisir votre e-mail d'abord." });
      return;
    }
    setFormSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setMessage({ type: "error", text: error.message });
    else setMessage({ type: "success", text: "Lien de réinitialisation envoyé par e-mail !" });
    setFormSubmitting(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault(); setFormSubmitting(true); setMessage(null)
    const { error } = await supabase.auth.signInWithOtp({ 
      email, options: { emailRedirectTo: window.location.href } 
    })
    if (error) setMessage({ type: "error", text: error.message })
    else setMessage({ type: "success", text: "Lien magique envoyé ! Vérifiez vos emails." })
    setFormSubmitting(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setFormSubmitting(true); setMessage(null)

    // 1. INSCRIPTION AUTH UNIQUEMENT
    const { error: authError } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          emailRedirectTo: window.location.origin,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone
          }
        } 
    })

    if (authError) { 
      setMessage({ type: "error", text: authError.message }); 
      setFormSubmitting(false); 
      return; 
    }
    
    // PLUS D'INSERTION MANUELLE ICI. LE TRIGGER S'EN OCCUPE.
    setMessage({ 
      type: "success", 
      text: "Compte créé ! Vérifiez vos emails pour valider votre inscription." 
    })
    
    setFormSubmitting(false)
  }

  return (
    <AuthContext.Provider value={{ 
      user, isLoading, isModalOpen, 
      loginWithRedirect: (p:any) => { setModalView(p?.initialView || "signin"); setIsModalOpen(true); }, 
      logout: () => supabase.auth.signOut() 
    }}>
      {children}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl relative text-left">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 p-1 hover:bg-muted rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center mb-6">
                <img src={logo} alt="Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
                <h3 className="text-xl font-extrabold">{modalView === "signin" ? "Connexion" : "Créer un compte"}</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">TransGabon-Connect</p>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-xs mb-4 flex gap-2 ${message.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                {message.text}
              </div>
            )}

            {modalView === "signin" ? (
              <div className="space-y-4">
                <form onSubmit={useMagicLink ? handleMagicLink : handlePasswordSignIn} className="space-y-4">
                  <div className="space-y-1">
                    <Label>E-mail</Label>
                    <Input type="email" required placeholder="votre@email.ga" value={email} onChange={e => setEmail(e.target.value)} disabled={formLoading} />
                  </div>
                  
                  {!useMagicLink && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-end">
                        <Label>Mot de passe</Label>
                        <button type="button" onClick={handleForgotPassword} className="text-[11px] text-primary hover:underline font-semibold mb-0.5">
                          Oublié ?
                        </button>
                      </div>
                      <Input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={formLoading} />
                    </div>
                  )}

                  <Button type="submit" className="w-full font-bold h-11" disabled={formLoading}>
                    {formLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : (useMagicLink ? <Mail className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />)}
                    {useMagicLink ? "Recevoir mon lien" : "Se connecter"}
                  </Button>
                </form>

                <button type="button" onClick={() => { setUseMagicLink(!useMagicLink); setMessage(null); }} className="text-xs text-muted-foreground font-medium hover:text-primary w-full text-center">
                  {useMagicLink ? "Utiliser mon mot de passe" : "Se connecter sans mot de passe (Lien magique)"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input required placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  <Input required placeholder="Nom" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <Input type="tel" required placeholder="Téléphone (ex: 066...)" value={phone} onChange={e => setPhone(e.target.value)} />
                <Input type="email" required placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
                <Input type="password" required placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} />
                <Button type="submit" className="w-full font-bold h-11 mt-2" disabled={formLoading}>
                  <UserPlus className="h-4 w-4 mr-2" /> Créer mon compte
                </Button>
              </form>
            )}

            <div className="mt-6 text-center border-t pt-4">
              <button 
                type="button" 
                onClick={() => { setModalView(modalView === "signin" ? "signup" : "signin"); setMessage(null); }} 
                className="text-sm font-bold text-primary hover:underline"
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