"use client"

import { ShieldCheck, Lock, Eye, FileText, Trash2, Mail, Bell, database } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl text-left animate-in fade-in duration-700">
      
      {/* --- HEADER OFFICIEL --- */}
      <header className="mb-16 relative">
        <div className="flex items-center gap-5 mb-6">
          <div className="p-4 bg-slate-900 rounded-[1.5rem] shadow-xl shadow-slate-200">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <div>
            <Badge className="bg-primary/10 text-primary border-none px-3 py-1 font-black uppercase text-[10px] tracking-widest mb-2">
                Document Officiel
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
              Confidentialité
            </h1>
          </div>
        </div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] max-w-2xl leading-relaxed">
          Engagement de protection des données personnelles conforme à la Loi Gabonaise N°001/2011.
        </p>
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none hidden md:block">
            <ShieldCheck size={200} />
        </div>
      </header>
      
      <div className="space-y-12 text-slate-600 leading-relaxed">
        
        {/* 1. INTRODUCTION */}
        <section className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" /> 1. Objet de la Politique
          </h2>
          <p className="font-medium">
            **TransGabon-Connect** s’engage à ce que la collecte et le traitement de vos données soient conformes au cadre juridique de la République Gabonaise. Cette politique détaille nos pratiques concernant les informations que nous recueillons via l'authentification Google et les formulaires de réservation.
          </p>
        </section>

        {/* 2. DONNÉES GOOGLE (SECTION CRUCIALE POUR GOOGLE) */}
        <section className="px-6 border-l-4 border-slate-100">
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic flex items-center gap-3">
            <Eye className="h-6 w-6 text-primary" /> 2. Utilisation de Google OAuth
          </h2>
          <p className="mb-4">
            Lorsque vous utilisez la connexion Google, nous accédons uniquement aux informations suivantes :
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl">
               <p className="font-black text-primary text-xs uppercase mb-1">Identité de base</p>
               <p className="text-sm font-medium">Votre nom et prénom pour personnaliser vos titres de transport.</p>
            </div>
            <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl">
               <p className="font-black text-primary text-xs uppercase mb-1">Adresse Email</p>
               <p className="text-sm font-medium">Pour l'envoi de vos bordereaux de colis et confirmations de voyage.</p>
            </div>
          </div>
          <p className="mt-6 text-sm italic font-bold text-slate-400 bg-slate-50 p-4 rounded-xl border border-dashed">
            * TransGabon-Connect ne demande jamais accès à vos contacts, vos fichiers Drive ou vos données de navigation.
          </p>
        </section>

        {/* 3. FINALITÉ DU TRAITEMENT */}
        <section className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl">
          <h2 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" /> 3. Pourquoi traitons-nous vos données ?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center text-primary">
                 <ShieldCheck size={20} />
              </div>
              <h4 className="font-black uppercase text-sm tracking-tight text-primary">Sécurité Logistique</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Vérifier l'identité du porteur d'un billet lors de l'embarquement ou du retrait d'un colis en agence afin d'éviter les usurpations.
              </p>
            </div>
            <div className="space-y-3">
              <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center text-primary">
                 <Mail size={20} />
              </div>
              <h4 className="font-black uppercase text-sm tracking-tight text-primary">Service Client</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Vous notifier par email ou SMS en cas de changement d'horaire, d'annulation ou de disponibilité d'un colis à destination.
              </p>
            </div>
          </div>
        </section>

        {/* 4. DROITS DE L'UTILISATEUR (EXIGENCE GOOGLE) */}
        <section className="px-6">
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic flex items-center gap-3">
            <Trash2 className="h-6 w-6 text-red-500" /> 4. Vos Droits et Suppression
          </h2>
          <p className="mb-6 font-medium">
            Conformément à la loi, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
          </p>
          <div className="p-8 bg-red-50 border-2 border-red-100 rounded-[2rem] space-y-4">
             <p className="text-sm font-bold text-red-700 uppercase flex items-center gap-2">
                <Lock size={16} /> Demande de suppression de compte
             </p>
             <p className="text-sm text-red-600/80 font-medium">
                Vous pouvez demander la suppression définitive de vos données de notre base de données (incluant l'historique Google OAuth) en nous contactant directement :
             </p>
             <a href="mailto:transgabon241@gmail.com" className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all">
                <Mail size={16} /> Nous écrire
             </a>
          </div>
        </section>

        {/* 5. CONSERVATION */}
        <section className="px-6 border-t border-dashed pt-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4 uppercase flex items-center gap-2">
             5. Conservation des données
          </h2>
          <p className="text-sm font-medium">
            Nous conservons vos informations de voyage pendant une durée de 3 ans après votre dernière activité pour des raisons de traçabilité légale exigée par les transporteurs nationaux. Les données relatives au fret sont conservées 1 an après la livraison effective du colis.
          </p>
        </section>

        {/* --- FOOTER DE PAGE --- */}
        <footer className="pt-16 pb-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t-2 border-slate-50">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Mise à jour : 19 Juillet 2026</p>
            <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">TransGabon-Connect • Connectivité & Transport</p>
          </div>
          <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
             <ShieldCheck size={24} className="text-slate-200" />
          </div>
        </footer>
      </div>
    </div>
  );
}