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
    <div className="container mx-auto px-4 py-16 max-w-4xl text-left animate-in fade-in duration-700">
      
      {/* --- HEADER JURIDIQUE --- */}
      <header className="mb-16 relative">
        <div className="flex items-center gap-5 mb-6">
          <div className="p-4 bg-slate-900 rounded-[1.5rem] shadow-xl shadow-slate-200">
            <Gavel className="h-10 w-10 text-primary" />
          </div>
          <div>
            <Badge variant="premium" className="px-3 py-1 mb-2">
                Conformité Loi N°001/2011
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
              Protection des Données
            </h1>
          </div>
        </div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] max-w-2xl leading-relaxed">
          Engagement de confidentialité et de sécurité du Responsable de Traitement.
        </p>
      </header>
      
      <div className="space-y-12 text-slate-600 leading-relaxed">
        
        {/* 1. DISPOSITIONS GÉNÉRALES */}
        <section className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-white shadow-sm relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" /> 1. Cadre Réglementaire
          </h2>
          <p className="font-medium mb-4">
            La présente politique s'inscrit dans le strict respect des dispositions de la **Loi N°001/2011 relative à la protection des données à caractère personnel** en République Gabonaise.
          </p>
          <p className="text-sm">
            En tant que Responsable de Traitement, **TransGabon-Connect** garantit que les données sont collectées pour des finalités déterminées, explicites et légitimes, et ne sont pas traitées ultérieurement de manière incompatible avec ces finalités (Art. 13).
          </p>
        </section>

        {/* 2. BASE JURIDIQUE ET FINALITÉ */}
        <section className="px-6">
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic flex items-center gap-3 text-left">
            <ShieldCheck className="h-6 w-6 text-primary" /> 2. Fondement du Traitement
          </h2>
          <div className="space-y-6">
            <p className="font-medium italic text-slate-900">
               Le traitement de vos données repose sur les bases juridiques suivantes :
            </p>
            <div className="grid md:grid-cols-2 gap-4">
               <div className="p-6 bg-white border-2 border-slate-100 rounded-2xl">
                  <h4 className="font-black text-primary text-xs uppercase mb-2">Exécution Contractuelle</h4>
                  <p className="text-xs leading-relaxed">Nécessaire pour l'émission de votre titre de transport et la gestion de vos bagages conformément aux conditions du transporteur.</p>
               </div>
               <div className="p-6 bg-white border-2 border-slate-100 rounded-2xl">
                  <h4 className="font-black text-primary text-xs uppercase mb-2">Obligation Légale</h4>
                  <p className="text-xs leading-relaxed">Établissement du manifeste de bord pour les autorités de sûreté nationale et de gendarmerie.</p>
               </div>
            </div>
          </div>
        </section>

        {/* 3. CATÉGORIES DE DONNÉES ET OAUTH */}
        <section className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <Fingerprint size={150} />
          </div>
          <h2 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-primary">
            <Lock className="h-6 w-6" /> 3. Collecte de Données (OAuth 2.0)
          </h2>
          <div className="space-y-6">
             <p className="text-slate-300 font-medium">
                Via l'API Google OAuth, nous ne collectons que les données d'identification non sensibles :
             </p>
             <div className="flex flex-wrap gap-4">
                {["Nom", "Prénom", "Adresse E-mail"].map(item => (
                    <Badge key={item} variant="premium" className="bg-white/10 text-primary border-primary/20 px-4 py-1.5">{item}</Badge>
                ))}
             </div>
             <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-xs italic text-primary">
                Avertissement : TransGabon-Connect ne collecte aucune donnée relative à la santé, aux opinions politiques ou aux croyances religieuses (Données Sensibles - Art. 33 de la Loi 001/2011).
             </div>
          </div>
        </section>

        {/* 4. DROITS DE LA PERSONNE CONCERNÉE */}
        <section className="px-6">
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic flex items-center gap-3 text-left">
            <Scale className="h-6 w-6 text-primary" /> 4. Exercice de vos Droits
          </h2>
          <p className="mb-6 font-medium">
            Conformément aux Articles 20 à 25 de la Loi 001/2011, vous bénéficiez des droits suivants :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
             <RightItem title="Droit à l'information" desc="Savoir comment et pourquoi vos données sont traitées." />
             <RightItem title="Droit d'accès" desc="Consulter l'intégralité de vos informations stockées." />
             <RightItem title="Droit d'opposition" desc="Refuser le traitement pour des motifs légitimes." />
             <RightItem title="Droit d'effacement" desc="Obtenir la suppression totale de votre profil agence." />
          </div>
          
          <div className="p-8 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] space-y-4">
             <p className="text-sm font-black text-emerald-800 uppercase flex items-center gap-2">
                <AlertCircle size={16} /> Recours et Réclamation
             </p>
             <p className="text-xs text-emerald-700 font-medium">
                Pour toute difficulté, vous pouvez contacter notre Délégué à la Protection des Données (DPO) à <strong>transgabon241@gmail.com</strong>. Si la réponse ne vous satisfait pas, vous avez le droit de porter plainte auprès de la <strong>Commission Nationale de Protection des Données à Caractère Personnel (CNPDCP)</strong> à Libreville.
             </p>
          </div>
        </section>

        {/* 5. DESTINATAIRES ET TRANSFERTS */}
        <section className="px-6 border-l-4 border-slate-100">
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic flex items-center gap-3 text-left">
            <Globe className="h-6 w-6 text-primary" /> 5. Destinataires et Hébergement
          </h2>
          <p className="text-sm font-medium mb-4 italic text-slate-500">
             Vos données ne sont jamais vendues ou cédées à des tiers à des fins marketing.
          </p>
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" />
                <span><strong>Partenaires de transport :</strong> Les informations passagers sont transmises aux transporteurs (SETRAG, agences) uniquement pour le trajet réservé.</span>
            </li>
            <li className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" />
                <span><strong>Hébergement Cloud :</strong> Vos données sont stockées via **Supabase** (PostgreSQL). L'utilisateur est informé que ces serveurs peuvent être situés hors de la République Gabonaise. TransGabon-Connect garantit un niveau de sécurité équivalent aux exigences nationales (Art. 40).</span>
            </li>
          </ul>
        </section>

        {/* 6. SÉCURITÉ TECHNIQUE */}
        <section className="px-6">
           <h2 className="text-xl font-black text-slate-900 mb-4 uppercase flex items-center gap-2 text-left">
             <Database className="h-5 w-5 text-primary" /> 6. Intégrité des systèmes
           </h2>
           <p className="text-sm font-medium leading-relaxed">
             Nous mettons en œuvre les mesures techniques et organisationnelles appropriées (Art. 28) pour protéger vos données contre la destruction accidentelle, la perte, l'altération ou l'accès non autorisé. Cela inclut l'isolation stricte des bases de données entre chaque agence partenaire.
           </p>
        </section>

        {/* --- FOOTER DE PAGE --- */}
        <footer className="pt-16 pb-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t-2 border-slate-50">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Archivé sous version : V1.2.0-2026</p>
            <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Édité à Libreville • TransGabon-Connect</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="h-px w-12 bg-slate-100" />
             <ShieldCheck size={32} className="text-primary opacity-20" />
             <div className="h-px w-12 bg-slate-100" />
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
        <div className="p-5 bg-white border-2 border-slate-50 rounded-2xl shadow-sm hover:border-primary/20 transition-all text-left">
            <h4 className="font-black text-slate-900 uppercase text-[11px] mb-1 tracking-tight">{title}</h4>
            <p className="text-[11px] font-medium text-slate-500 leading-tight">{desc}</p>
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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
}