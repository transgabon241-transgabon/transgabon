"use client"

import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  FileText, 
  Trash2, 
  Mail, 
  Scale, 
  Database, 
  Gavel, 
  Fingerprint,
  Globe,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl text-left animate-in fade-in duration-700">
      
      {/* --- HEADER JURIDIQUE --- */}
      <header className="mb-16 relative">
        <div className="flex items-center gap-5 mb-6">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-[1.5rem] shadow-2xl text-primary">
            <Gavel className="h-10 w-10" />
          </div>
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 px-3 py-1 mb-2 font-black uppercase text-[10px] tracking-widest">
                Conformité Loi N°001/2011
            </Badge>
            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
              Protection des Données
            </h1>
          </div>
        </div>
        <p className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-[0.3em] max-w-2xl leading-relaxed">
          Engagement de confidentialité et de sécurité du Responsable de Traitement.
        </p>
      </header>
      
      <div className="space-y-12 leading-relaxed">
        
        {/* 1. DISPOSITIONS GÉNÉRALES */}
        <section className="bg-slate-900/50 p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-800 shadow-xl relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
          <h2 className="text-xl md:text-2xl font-black text-white mb-6 uppercase italic flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" /> 1. Cadre Réglementaire
          </h2>
          <p className="text-slate-300 font-medium mb-4 text-sm md:text-base">
            La présente politique s'inscrit dans le strict respect des dispositions de la <span className="text-white font-bold">Loi N°001/2011 relative à la protection des données à caractère personnel</span> en République Gabonaise.
          </p>
          <p className="text-sm text-slate-400">
            En tant que Responsable de Traitement, **TransGabon-Connect** garantit que les données sont collectées pour des finalités déterminées, explicites et légitimes (Art. 13).
          </p>
        </section>

        {/* 2. BASE JURIDIQUE ET FINALITÉ */}
        <section className="px-6">
          <h2 className="text-xl md:text-2xl font-black text-white mb-6 uppercase italic flex items-center gap-3 text-left">
            <ShieldCheck className="h-6 w-6 text-primary" /> 2. Fondement du Traitement
          </h2>
          <div className="space-y-6">
            <p className="text-slate-300 font-medium italic">
               Le traitement de vos données repose sur les bases juridiques suivantes :
            </p>
            <div className="grid md:grid-cols-2 gap-4">
               <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <h4 className="font-black text-primary text-[10px] uppercase mb-2 tracking-widest">Exécution Contractuelle</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">Nécessaire pour l'émission de votre titre de transport et la gestion logistique de vos bagages et fret.</p>
               </div>
               <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <h4 className="font-black text-primary text-[10px] uppercase mb-2 tracking-widest">Obligation Légale</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">Transmission du manifeste de voyage aux autorités de sûreté nationale et de gendarmerie.</p>
               </div>
            </div>
          </div>
        </section>

        {/* 3. CATÉGORIES DE DONNÉES - Carte sombre */}
        <section className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 text-white">
             <Fingerprint size={150} />
          </div>
          <h2 className="text-xl md:text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-primary">
            <Lock className="h-6 w-6" /> 3. Collecte de Données (OAuth 2.0)
          </h2>
          <div className="space-y-6">
             <p className="text-slate-300 font-medium">
                Via l'API sécurisée Google OAuth, nous ne collectons que les données d'identification essentielles :
             </p>
             <div className="flex flex-wrap gap-3">
                {["Nom", "Prénom", "Adresse E-mail"].map(item => (
                    <Badge key={item} variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5 font-black uppercase text-[10px] tracking-widest">{item}</Badge>
                ))}
             </div>
             <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-xs italic text-primary">
                Note : TransGabon-Connect ne collecte aucune donnée sensible (santé, opinions, croyances) conformément à l'Art. 33 de la Loi 001/2011.
             </div>
          </div>
        </section>

        {/* 4. DROITS DE LA PERSONNE */}
        <section className="px-6">
          <h2 className="text-xl md:text-2xl font-black text-white mb-6 uppercase italic flex items-center gap-3 text-left">
            <Scale className="h-6 w-6 text-primary" /> 4. Exercice de vos Droits
          </h2>
          <p className="mb-6 text-slate-300 font-medium">
            Conformément aux Articles 20 à 25 de la Loi 001/2011, vous disposez des droits suivants :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
             <RightItem title="Information" desc="Savoir comment et pourquoi vos données sont traitées." />
             <RightItem title="Accès" desc="Consulter l'intégralité de vos informations stockées." />
             <RightItem title="Opposition" desc="Refuser le traitement pour des motifs légitimes." />
             <RightItem title="Effacement" desc="Obtenir la suppression totale de votre compte." />
          </div>
          
          <div className="p-6 md:p-8 bg-emerald-950/20 border-2 border-emerald-900/30 rounded-[2rem] space-y-4">
             <p className="text-sm font-black text-emerald-400 uppercase flex items-center gap-2 tracking-widest">
                <AlertCircle size={16} /> Recours et Réclamation
             </p>
             <p className="text-xs text-emerald-100/60 font-medium leading-relaxed uppercase">
                Pour toute difficulté, contactez notre DPO à <strong className="text-emerald-400 font-black">transgabon241@gmail.com</strong>. Vous avez également le droit de saisir la <strong className="text-white">CNPDCP</strong> à Libreville.
             </p>
          </div>
        </section>

        {/* 5. DESTINATAIRES */}
        <section className="px-6 border-l-4 border-slate-800">
          <h2 className="text-xl md:text-2xl font-black text-white mb-6 uppercase italic flex items-center gap-3 text-left">
            <Globe className="h-6 w-6 text-primary" /> 5. Destinataires et Hébergement
          </h2>
          <p className="text-sm font-bold mb-6 italic text-slate-500 uppercase tracking-widest">
             Zéro revente de données à des fins marketing.
          </p>
          <ul className="space-y-4 text-sm">
            <li className="flex gap-4">
                <CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" />
                <span className="text-slate-300"><strong>Partenaires transport :</strong> Vos informations sont transmises aux transporteurs uniquement pour la validité du voyage.</span>
            </li>
            <li className="flex gap-4">
                <CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" />
                <span className="text-slate-300"><strong>Hébergement Cloud :</strong> Données sécurisées via **Supabase**. Nous garantissons un niveau de sécurité conforme aux exigences nationales (Art. 40).</span>
            </li>
          </ul>
        </section>

        {/* 6. SÉCURITÉ */}
        <section className="px-6">
           <h2 className="text-xl font-black text-white mb-4 uppercase flex items-center gap-2 text-left">
             <Database className="h-5 w-5 text-primary" /> 6. Intégrité des systèmes
           </h2>
           <p className="text-sm text-slate-400 font-medium leading-relaxed">
             Nous utilisons le chiffrement et l'isolation des données pour protéger vos informations contre tout accès non autorisé, conformément à l'Art. 28 de la loi gabonaise.
           </p>
        </section>

        {/* --- FOOTER --- */}
        <footer className="pt-16 pb-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-800">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Archivé sous version : V1.2.0-2026</p>
            <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">TransGabon-Connect • République Gabonaise</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="h-px w-12 bg-slate-800" />
             <ShieldCheck size={32} className="text-primary opacity-30" />
             <div className="h-px w-12 bg-slate-800" />
          </div>
        </footer>
      </div>
    </div>
  );
}

/**
 * COMPOSANT : ITEM DE DROIT
 */
function RightItem({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl shadow-sm hover:border-primary/30 transition-all text-left group">
            <h4 className="font-black text-white uppercase text-[10px] mb-1 tracking-widest group-hover:text-primary transition-colors">{title}</h4>
            <p className="text-[11px] font-medium text-slate-400 leading-tight">{desc}</p>
        </div>
    );
}

function CheckCircle2(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
}