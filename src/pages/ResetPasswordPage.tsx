"use client"

import React, { useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate, Link } from "react-router-dom"
import { Lock, RefreshCw, AlertCircle, CheckCircle, ArrowLeft, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import logo from "@/assets/logo.png"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const navigate = useNavigate()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas." })
      return
    }

    if (password.length < 6) {
      setMessage({ type: "error", text: "Sécurité insuffisante : 6 caractères minimum." })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setMessage({ type: "error", text: error.message })
      } else {
        setMessage({ type: "success", text: "Mot de passe modifié ! Connexion en cours..." })
        setTimeout(() => {
          navigate("/")
        }, 2000)
      }
    } catch (err) {
      setMessage({ type: "error", text: "Une erreur est survenue." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden text-foreground">
      
      {/* --- DÉCORATION DE FOND SOMBRE --- */}
      <div className="absolute -top-20 -right-20 p-20 opacity-[0.02] text-white pointer-events-none select-none">
        <Lock size={500} />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* BOUTON RETOUR DISCRET */}
        <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-primary mb-6 transition-colors tracking-widest">
           <ArrowLeft size={12} /> Retour à l'accueil
        </Link>

        <div className="rounded-[2.5rem] border-2 border-border bg-card/80 backdrop-blur-xl p-10 shadow-2xl">
          
          <div className="text-center mb-10">
            <img src={logo} alt="Logo TransGabon" className="h-20 w-auto mx-auto mb-6 object-contain filter brightness-110 drop-shadow-lg" />
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full mb-3">
               <ShieldCheck size={12} />
               <span className="text-[9px] font-black uppercase tracking-widest">Sécurité Compte</span>
            </div>
            <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">Nouveau Passe</h3>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-[11px] font-bold mb-8 flex gap-3 items-center animate-in slide-in-from-top-2 border ${
              message.type === "success" 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
              {message.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">Mot de passe secret</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                placeholder="••••••••"
                className="h-14 rounded-2xl border-2 border-border bg-slate-950 text-white px-6 font-black focus:border-primary transition-all shadow-inner" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                disabled={loading} 
              />
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">Confirmer le passe</Label>
              <Input 
                id="confirm" 
                type="password" 
                required 
                placeholder="••••••••"
                className="h-14 rounded-2xl border-2 border-border bg-slate-950 text-white px-6 font-black focus:border-primary transition-all shadow-inner" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                disabled={loading} 
              />
            </div>

            <Button 
                type="submit" 
                className="w-full h-16 rounded-[1.5rem] font-black text-lg uppercase tracking-widest shadow-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95" 
                disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-6 w-6 animate-spin" />
              ) : (
                "RÉINITIALISER"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">
            TransGabon Connect • Sécurisation SSL
        </p>
      </div>
    </div>
  )
}