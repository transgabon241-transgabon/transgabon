"use client"

import { ShieldCheck, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl text-left animate-in fade-in duration-700">
      {/* HEADER STYLE SaaS */}
      <header className="mb-12 border-b-4 border-primary pb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase">
            Confidentialité
          </h1>
        </div>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">
          Protection de vos données personnelles — République Gabonaise
        </p>
      </header>
      
      <div className="space-y-10 text-slate-700 leading-relaxed">
        <section className="bg-slate-50 p-8 rounded-[2rem] border-2 border-white shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> 1. Introduction
          </h2>
          <p>
            La présente Politique de Confidentialité régit la manière dont **TransGabon-Connect** collecte, utilise, conserve et divulgue les informations collectées auprès des utilisateurs de la plateforme. Nous nous engageons à protéger vos données personnelles conformément à la **Loi N°001/2011 relative à la protection des données à caractère personnel** en République Gabonaise.
          </p>
        </section>

        <section className="px-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> 2. Collecte des données
          </h2>
          <p>Nous collectons des informations d'identification personnelle de plusieurs manières :</p>
          <ul className="list-disc ml-6 mt-4 space-y-3 font-medium">
            <li><span className="text-primary font-bold">Authentification Google :</span> Nom, prénom, adresse e-mail et photo de profil via les services OAuth.</li>
            <li><span className="text-primary font-bold">Inscription directe :</span> Informations d'identité et coordonnées fournies volontairement.</li>
            <li><span className="text-primary font-bold">Données de voyage :</span> Historique des réservations, trajets effectués et numéros de siège.</li>
          </ul>
        </section>

        <section className="bg-white border-2 border-slate-100 p-8 rounded-[2rem] shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">3. Utilisation des informations</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="font-bold text-primary text-sm uppercase">Logistique</p>
              <p className="text-sm">Génération des titres de transport (QR Code) et suivi du fret marchandise.</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-primary text-sm uppercase">Communication</p>
              <p className="text-sm">Alertes par SMS ou e-mail en cas de retard, modification ou annulation de trajet.</p>
            </div>
          </div>
        </section>

        <section className="px-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> 4. Sécurité et Partage
          </h2>
          <p>
            Vos données sont stockées sur des serveurs sécurisés via notre partenaire technologique **Supabase**. L'accès est strictement limité au personnel autorisé (Agents d'embarquement et Caissiers). Vos données de voyage sont partagées avec les transporteurs partenaires (Agences de bus, SETRAG, Compagnies Maritimes) uniquement pour l'établissement du manifeste officiel.
          </p>
        </section>

        <footer className="pt-12 border-t border-dashed flex justify-between items-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dernière mise à jour : 14 Juillet 2026</p>
          <div className="h-8 w-px bg-slate-200"></div>
          <p className="text-[10px] font-black uppercase text-primary tracking-widest italic">TransGabon-Connect</p>
        </footer>
      </div>
    </div>
  );
}