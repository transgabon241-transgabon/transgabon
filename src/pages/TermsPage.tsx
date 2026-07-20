"use client"

import { Gavel, CheckCircle, AlertTriangle, HelpCircle, ShieldAlert, FileText, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl text-left animate-in fade-in duration-700">
      
      {/* --- HEADER STYLE SaaS --- */}
      <header className="mb-16 relative">
        <div className="flex items-center gap-5 mb-6">
          <div className="p-4 bg-slate-900 rounded-[1.5rem] shadow-xl shadow-slate-200">
            <Gavel className="h-10 w-10 text-white" />
          </div>
          <div>
            <Badge className="bg-slate-100 text-slate-900 border-none px-3 py-1 font-black uppercase text-[10px] tracking-widest mb-2">
                Cadre Contractuel
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
              Conditions d'usage
            </h1>
          </div>
        </div>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em] max-w-2xl leading-relaxed">
          Règles de fonctionnement et limites de responsabilité de la plateforme.
        </p>
      </header>
      
      <div className="space-y-12 text-slate-600 leading-relaxed">
        
        {/* 1. ACCEPTATION */}
        <section className="px-6 border-l-4 border-primary">
          <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase italic tracking-tight flex items-center gap-3">
            <FileText size={22} className="text-primary" /> 1. Acceptation des termes
          </h2>
          <p className="font-medium">
            En utilisant la plateforme **TransGabon-Connect**, vous reconnaissez avoir lu, compris et accepté sans réserve les présentes conditions. Ce service est régi par les lois de la République Gabonaise relatives au commerce électronique et à la protection du consommateur.
          </p>
        </section>

        {/* 2. NATURE DU SERVICE */}
        <section className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
             <HelpCircle size={100} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic flex items-center gap-3">
            <Scale className="h-6 w-6 text-primary" /> 2. Nature du Service
          </h2>
          <p className="font-medium mb-4">
            TransGabon-Connect agit exclusivement en tant qu'<strong>intermédiaire technologique</strong>. 
          </p>
          <p className="text-sm text-slate-500 italic">
            Notre rôle se limite à la facilitation des réservations et à la traçabilité du fret. Le contrat de transport physique est conclu entre l'utilisateur et le transporteur (SETRAG, agences de bus, compagnies maritimes). TransGabon-Connect ne saurait être tenu responsable des incidents survenant durant le transport physique.
          </p>
        </section>

        {/* 3. VALIDITÉ ET PAIEMENT */}
        <section className="px-6">
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" /> 3. Validité et Paiement
          </h2>
          <div className="space-y-4">
             <p className="font-medium">
                L'émission d'un titre de transport ou d'un bordereau de fret définitif est conditionnée par le paiement intégral du montant affiché.
             </p>
             <ul className="grid sm:grid-cols-2 gap-4">
                <li className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-500 uppercase tracking-tighter">
                   <span className="text-primary block mb-1">Paiement Digital:</span> Validation instantanée du billet.
                </li>
                <li className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-500 uppercase tracking-tighter">
                   <span className="text-primary block mb-1">Paiement Agence:</span> Le client doit payer au guichet avant l'heure limite fixée.
                </li>
             </ul>
          </div>
        </section>

        {/* 4. BAGAGES ET MARCHANDISES */}
        <section className="bg-amber-50 p-10 rounded-[2.5rem] border-2 border-amber-100 relative">
          <h2 className="text-2xl font-black text-amber-900 mb-6 uppercase italic flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" /> 4. Bagages et Marchandises
          </h2>
          <div className="space-y-4 text-amber-900/80 font-medium text-sm">
            <p>
                Le transport de matières dangereuses, illégales ou prohibées par la loi gabonaise est strictement interdit.
            </p>
            <p>
                Les suppléments bagages (poids ou volume) sont calculés sur la plateforme mais restent soumis à la vérification physique par l'agent de quai. En cas de litige sur le poids, la pesée officielle de l'agence fait foi.
            </p>
          </div>
        </section>

        {/* 5. DONNÉES ET CONFIDENTIALITÉ (POUR GOOGLE) */}
        <section className="px-6">
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-primary" /> 5. Données Utilisateurs
          </h2>
          <p className="font-medium">
            Pour assurer le fonctionnement du service, TransGabon-Connect collecte des données via Google OAuth. L'utilisateur accepte que ses informations (Email, Nom) soient partagées avec les transporteurs uniquement pour l'établissement du manifeste de bord légal. Pour plus de détails, consultez notre <a href="/privacy" className="text-primary underline font-black">Politique de Confidentialité</a>.
          </p>
        </section>

        {/* 6. REMBOURSEMENTS */}
        <section className="px-6 border-t border-dashed pt-12">
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic">
            6. Annulation et Remboursement
          </h2>
          <p className="text-sm font-medium">
            Les conditions d'annulation dépendent de la politique commerciale de chaque transporteur. TransGabon-Connect perçoit des frais de service numériques qui ne sont pas remboursables, sauf en cas de défaillance technique majeure de la plateforme empêchant la délivrance du titre de transport.
          </p>
        </section>

        {/* --- FOOTER DE PAGE --- */}
        <footer className="pt-16 pb-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t-2 border-slate-50">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Dernière révision : 19 Juillet 2026</p>
            <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">TransGabon-Connect • Portail Juridique</p>
          </div>
          <div className="text-right">
             <p className="text-[9px] font-black uppercase text-primary tracking-widest italic">Libreville, Gabon</p>
          </div>
        </footer>
      </div>
    </div>
  );
}