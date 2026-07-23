"use client"

import { Gavel, CheckCircle, AlertTriangle, HelpCircle, ShieldAlert, FileText, Scale, CalendarClock, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl text-left animate-in fade-in duration-700">
      
      {/* --- HEADER --- */}
      <header className="mb-16 relative">
        <div className="flex items-center gap-5 mb-6">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-[1.5rem] shadow-2xl text-primary">
            <Gavel className="h-10 w-10" />
          </div>
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 px-3 py-1 font-black uppercase text-[10px] tracking-widest mb-2">
                Cadre Juridique v1.1
            </Badge>
            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
              Conditions d'usage
            </h1>
          </div>
        </div>
        <p className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-[0.3em] max-w-2xl leading-relaxed">
          Règles de fonctionnement, responsabilités et protection des données (Loi 001/2011).
        </p>
      </header>
      
      <div className="space-y-12 leading-relaxed">
        
        {/* 1. ACCEPTATION */}
        <section className="px-6 border-l-4 border-primary">
          <h2 className="text-xl md:text-2xl font-black text-white mb-4 uppercase italic tracking-tight flex items-center gap-3">
            <FileText size={22} className="text-primary" /> 1. Acceptation des termes
          </h2>
          <p className="text-slate-300 font-medium text-sm md:text-base">
            En accédant à <span className="text-white font-bold">TransGabon-Connect</span>, vous acceptez d'être lié par les présentes conditions. Ce service est régi par les lois de la République Gabonaise, notamment celles relatives au commerce électronique et à la protection du consommateur.
          </p>
        </section>

        {/* 2. NATURE DU SERVICE - Carte sombre transparente */}
        <section className="bg-slate-900/50 p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-white">
             <HelpCircle size={100} />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white mb-6 uppercase italic flex items-center gap-3">
            <Scale className="h-6 w-6 text-primary" /> 2. Nature du Service
          </h2>
          <p className="text-slate-200 font-bold mb-4">
            TransGabon-Connect est un <span className="text-primary">intermédiaire technologique</span>. 
          </p>
          <p className="text-sm text-slate-400 italic leading-relaxed border-l-2 border-slate-700 pl-4">
            Notre rôle se limite à la facilitation des réservations et à la traçabilité du fret. Le contrat de transport physique lie l'utilisateur au transporteur choisi (SETRAG, agences de bus, etc.). TransGabon-Connect décline toute responsabilité pour les incidents liés à l'exécution du transport physique (retards, accidents, pannes).
          </p>
        </section>

        {/* 3. VALIDITÉ ET PAIEMENT */}
        <section className="px-2 md:px-6">
          <h2 className="text-xl md:text-2xl font-black text-white mb-6 uppercase italic flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-500" /> 3. Validité des Billets
          </h2>
          <p className="text-slate-300 font-medium mb-6">
            L'émission d'un titre de transport ou d'un bordereau de fret définitif est conditionnée par le règlement intégral des frais affichés.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl">
                <span className="text-primary font-black text-[10px] uppercase block mb-1">Paiement Mobile :</span> 
                <p className="text-slate-300 text-xs font-bold uppercase">Validation et émission immédiate du QR Code.</p>
            </div>
            <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl">
                <span className="text-primary font-black text-[10px] uppercase block mb-1">Paiement Agence :</span> 
                <p className="text-slate-300 text-xs font-bold uppercase leading-tight">Réservation temporaire. Le client doit payer au guichet sous peine d'annulation.</p>
            </div>
          </div>
        </section>

        {/* 4. DONNÉES UTILISATEURS */}
        <section className="px-6">
          <h2 className="text-xl md:text-2xl font-black text-white mb-6 uppercase italic flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-primary" /> 4. Données Utilisateurs
          </h2>
          <p className="text-slate-300 font-medium">
            L'authentification sécurisée Google OAuth permet d'accéder à nos services. Vos données (Nom, Prénom, Email) sont utilisées exclusivement pour :
          </p>
          <ul className="list-disc ml-6 mt-4 space-y-2 text-sm text-slate-400 font-bold uppercase">
            <li>La personnalisation de vos billets et reçus.</li>
            <li>Le manifeste de bord légal (Autorités).</li>
            <li>Le suivi logistique de votre fret.</li>
          </ul>
        </section>

        {/* 5. CONSERVATION DES DONNÉES */}
        <section className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute bottom-0 right-0 p-6 opacity-5 text-white">
            <Database size={120} />
          </div>
          <h2 className="text-xl md:text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-primary">
            <CalendarClock className="h-6 w-6" /> 5. Conservation des Données
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
             <div className="space-y-2">
                <p className="text-primary font-black text-[10px] uppercase tracking-widest">Comptes</p>
                <p className="text-xs text-slate-400 font-medium">Suppression automatique après <strong className="text-slate-200">3 ans d'inactivité</strong> totale.</p>
             </div>
             <div className="space-y-2">
                <p className="text-primary font-black text-[10px] uppercase tracking-widest">Billetterie</p>
                <p className="text-xs text-slate-400 font-medium">Archivage pendant <strong className="text-slate-200">5 ans</strong> (obligations fiscales gabonaises).</p>
             </div>
             <div className="space-y-2">
                <p className="text-primary font-black text-[10px] uppercase tracking-widest">Fret</p>
                <p className="text-xs text-slate-400 font-medium">Historique conservé <strong className="text-slate-200">2 ans</strong> après la livraison du colis.</p>
             </div>
          </div>
        </section>

        {/* 6. BAGAGES - Thème Amber adapté au sombre */}
        <section className="bg-amber-950/10 p-8 md:p-10 rounded-[2.5rem] border border-amber-900/30 relative">
          <h2 className="text-xl md:text-2xl font-black text-amber-500 mb-6 uppercase italic flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" /> 6. Bagages et Marchandises
          </h2>
          <p className="text-sm font-medium text-amber-200/80 leading-relaxed">
            Le transport de produits dangereux ou prohibés est strictement interdit. Les suppléments bagages sont calculés sur la base de votre déclaration mais restent soumis à la <strong className="text-amber-500">pesée contradictoire</strong> en agence. En cas de litige, le tarif de l'agence fait foi.
          </p>
        </section>

        {/* 7. REMBOURSEMENTS */}
        <section className="px-6 border-t border-slate-800 border-dashed pt-12">
          <h2 className="text-xl md:text-2xl font-black text-white mb-6 uppercase italic">
            7. Annulation et Remboursement
          </h2>
          <p className="text-slate-300 text-sm font-medium">
            Toute demande de remboursement s'effectue physiquement au guichet de l'agence de départ. Les frais de service numériques perçus par TransGabon-Connect ne sont pas remboursables.
          </p>
        </section>

        {/* --- FOOTER --- */}
        <footer className="pt-16 pb-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-800">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Dernière mise à jour : 22 Juillet 2026</p>
            <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">TransGabon Connect • Affaires Juridiques</p>
          </div>
          <div className="text-right">
             <p className="text-[9px] font-black uppercase text-primary tracking-widest italic">Libreville, République Gabonaise</p>
          </div>
        </footer>
      </div>
    </div>
  );
}