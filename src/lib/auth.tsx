"use client"

import React, { useEffect, useState, ReactNode } from "react"
import { supabase } from "./supabase"
import { AuthContext, AuthUser } from "./auth-context"
import { RefreshCw, X, AlertCircle, Lock, Mail, UserPlus, CheckCircle2 } from "lucide-react"
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

  // RÉCUPÉRATION DU PROFIL
  const fetchProfile = async (supabaseUser: any) => {
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
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error("Erreur Sync Profil:", e)
    } finally {
      setIsLoading(false)
      setFormSubmitting(false)
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
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsLoading(false)
        setFormSubmitting(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // HANDLERS
  const handleGoogleSignIn = async () => {
    setFormSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) {
        setMessage({ type: "error", text: "Erreur Google." });
        setFormSubmitting(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      setFormSubmitting(false);
    } else {
      setMessage({ type: "success", text: "Lien envoyé ! Vérifiez vos emails." });
      setFormSubmitting(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setFormSubmitting(true); setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password: password 
    });
    if (error) { 
      setMessage({ type: "error", text: "Identifiants incorrects." }); 
      setFormSubmitting(false); 
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setFormSubmitting(true); setMessage(null)
    const { error: authError } = await supabase.auth.signUp({ 
        email, password, 
        options: { 
          emailRedirectTo: window.location.origin,
          data: { first_name: firstName, last_name: lastName, phone: phone }
        } 
    })
    if (authError) { 
      setMessage({ type: "error", text: authError.message }); 
      setFormSubmitting(false); 
      return; 
    }
    setMessage({ type: "success", text: "Vérifiez vos emails pour valider." })
    setFormSubmitting(false)
  }

  const handleForgotPassword = async () => {
    if (!email) return setMessage({ type: "error", text: "Saisissez votre e-mail." });
    setFormSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setMessage({ type: "error", text: error.message });
    else setMessage({ type: "success", text: "Lien envoyé !" });
    setFormSubmitting(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, isLoading, isModalOpen, 
      loginWithRedirect: (p:any) => { setModalView(p?.initialView || "signin"); setIsModalOpen(true); }, 
      logout: () => supabase.auth.signOut() 
    }}>
      {children}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md text-left">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-border bg-slate-900 p-8 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative animate-in zoom-in-95 duration-300">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute right-6 top-6 p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500">
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
              <div className={`p-4 rounded-2xl text-[10px] font-bold mb-6 flex gap-3 items-center animate-in slide-in-from-top-2 border ${
                message.type === "success" 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span className="flex-1">{message.text}</span>
              </div>
            )}

            {modalView === "signin" ? (
              <div className="space-y-4">
                <Button onClick={handleGoogleSignIn} disabled={formLoading} variant="outline" className="w-full h-12 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-bold gap-3 hover:bg-slate-700 transition-all">
                    <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c1.47-1.35 2.32-3.34 2.32-5.71z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continuer avec Google
                </Button>

                <div className="flex items-center gap-4 my-4">
                    <div className="h-px flex-1 bg-slate-800" />
                    <span className="text-[10px] font-black text-slate-600 uppercase italic">Ou par email</span>
                    <div className="h-px flex-1 bg-slate-800" />
                </div>

                <form onSubmit={useMagicLink ? handleMagicLink : handlePasswordSignIn} className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Email</Label>
                    <Input type="email" required placeholder="nom@exemple.ga" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" disabled={formLoading} autoComplete="email" />
                  </div>
                  
                  {!useMagicLink && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-2">
                          <Label className="text-[10px] font-black uppercase text-slate-500">Mot de passe</Label>
                          <button type="button" onClick={handleForgotPassword} className="text-[10px] text-primary font-black uppercase hover:underline">Oublié ?</button>
                      </div>
                      <Input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" disabled={formLoading} autoComplete="current-password" />
                    </div>
                  )}

                  <Button type="submit" className="w-full font-black h-14 rounded-2xl shadow-xl bg-primary text-white text-lg uppercase tracking-widest active:scale-95 transition-all border-none" disabled={formLoading}>
                    {formLoading ? <RefreshCw className="h-6 w-6 animate-spin" /> : (useMagicLink ? <Mail className="h-5 w-5 mr-2"/> : "Se connecter")}
                    {useMagicLink && !formLoading && "Recevoir mon lien"}
                  </Button>
                </form>

                <button type="button" onClick={() => { setUseMagicLink(!useMagicLink); setMessage(null); }} className="text-[10px] text-slate-500 font-black uppercase hover:text-primary w-full text-center transition-colors">
                  {useMagicLink ? "Utiliser mon mot de passe" : "Connexion sans mot de passe (Magic Link)"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-3 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-2">Prénom</Label>
                    <Input required value={firstName} onChange={e => setFirstName(e.target.value)} className="h-11 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-2">Nom</Label>
                    <Input required value={lastName} onChange={e => setLastName(e.target.value)} className="h-11 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" />
                  </div>
                </div>
                <div className="space-y-1 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-2">Téléphone (+241)</Label>
                    <Input type="tel" required placeholder="066 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} className="h-11 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" />
                </div>
                <div className="space-y-1 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-2">Email</Label>
                    <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" autoComplete="email" />
                </div>
                <div className="space-y-1 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-2">Créer un passe</Label>
                    <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full font-black h-14 rounded-2xl shadow-xl bg-primary text-white text-lg mt-4 uppercase active:scale-95 border-none transition-all" disabled={formLoading}>
                  {formLoading ? <RefreshCw className="h-6 w-6 animate-spin" /> : <><UserPlus className="h-5 w-5 mr-2" /> Créer mon compte</>}
                </Button>
              </form>
            )}

            <div className="mt-8 text-center border-t border-slate-800 pt-6">
              <button type="button" onClick={() => { setModalView(modalView === "signin" ? "signup" : "signin"); setMessage(null); }} className="text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
                {modalView === "signin" ? "Nouveau ? Créer un compte" : "Déjà membre ? Se connecter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}