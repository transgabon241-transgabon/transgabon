"use client"

import React, { useState } from "react"
import { supabase } from "../lib/supabase" // Vérifie bien le chemin vers ton fichier supabase.ts
import { useNavigate } from "react-router-dom"
import { Lock, RefreshCw, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
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
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 6 caractères." })
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setMessage({ type: "error", text: error.message })
      setLoading(false)
    } else {
      setMessage({ type: "success", text: "Mot de passe mis à jour ! Redirection..." })
      setTimeout(() => {
        navigate("/")
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <div className="text-center mb-8">
          <img src={logo} alt="Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
          <h3 className="text-2xl font-extrabold text-foreground">Nouveau mot de passe</h3>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-xs mb-6 flex gap-2 items-center ${
            message.type === "success" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
          }`}>
            {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="space-y-2 text-left">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
            <Input id="confirm" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
          </div>
          <Button type="submit" className="w-full font-bold h-12" disabled={loading}>
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : "Mettre à jour"}
          </Button>
        </form>
      </div>
    </div>
  )
}