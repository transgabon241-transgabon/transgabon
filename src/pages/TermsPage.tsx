"use client"

import { Gavel, CheckCircle, AlertTriangle, HelpCircle, ShieldAlert, FileText, Scale, CalendarClock, Database, History } from "lucide-react";
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
            <Badge className="bg-slate-100 text-slate-100 border-none px-3 py-1 font-black uppercase text-[10px] tracking-widest mb-2">
                Cadre Juridique v1.1
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-100 uppercase leading-none">
              Conditions d'usage
            </h1>
          </div>
        </div>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em] max-w-2xl leading-relaxed">
          Règles de fonctionnement, responsabilités et protection des données (Loi 001/2011).
        </p>
      </header>
      
      <div className="space-y-12 text-slate-600 leading-relaxed">
        
        {/* 1. ACCEPTATION */}
        <section className="px-6 border-l-4 border-primary">
          <h2 className="text-2xl font-black text-slate-100 mb-4 uppercase italic tracking-tight flex items-center gap-3">
            <FileText size={22} className="text-primary" /> 1. Acceptation des termes
          </h2>
          <p className="font-medium">
            En accédant à **TransGabon-Connect**, vous acceptez d'être lié par les présentes conditions. Ce service est régi par les lois de la République Gabonaise, notamment celles relatives au commerce électronique et à la protection du consommateur.
          </p>
        </section>

        {/* 2. NATURE DU SERVICE */}
        <section className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
             <HelpCircle size={100} />
          </div>
          <h2 className="text-2xl font-black text-slate-100 mb-6 uppercase italic flex items-center gap-3">
            <Scale className="h-6 w-6 text-primary" /> 2. Nature du Service
          </h2>
          <p className="font-medium mb-4">
            TransGabon-Connect est un <strong>intermédiaire technologique</strong>. 
          </p>
          <p className="text-sm text-slate-500 italic leading-relaxed">
            Notre rôle se limite à la facilitation des réservations et à la traçabilité du fret. Le contrat de transport physique lie l'utilisateur au transporteur choisi (SETRAG, agences de bus, etc.). TransGabon-Connect décline toute responsabilité pour les incidents liés à l'exécution du transport physique (retards, accidents, pannes).
          </p>
        </section>

        {/* 3. VALIDITÉ ET PAIEMENT */}
        <section className="px-6">
          <h2 className="text-2xl font-black text-slate-100 mb-6 uppercase italic flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" /> 3. Validité des Billets
          </h2>
          <p className="font-medium mb-4">
            L'émission d'un titre de transport ou d'un bordereau de fret définitif est conditionnée par le règlement intégral des frais affichés.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-bold text-slate-500 uppercase">
                <span className="text-primary block mb-1">Paiement Mobile :</span> Validation et émission immédiate du QR Code.
            </div>
            <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-bold text-slate-500 uppercase">
                <span className="text-primary block mb-1">Paiement Agence :</span> Réservation temporaire. Le client doit payer au guichet sous peine d'annulation automatique.
            </div>
          </div>
        </section>

        {/* 4. DONNÉES GOOGLE OAUTH (EXIGENCE CNPDCP) */}
        <section className="px-6">
          <h2 className="text-2xl font-black text-slate-100 mb-6 uppercase italic flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-primary" /> 4. Données Utilisateurs (Loi 001/2011)
          </h2>
          <p className="font-medium">
            L'authentification via Google OAuth est utilisée pour sécuriser votre accès. En vous connectant, vous autorisez la plateforme à utiliser votre nom, prénom et email exclusivement pour :
          </p>
          <ul className="list-disc ml-6 mt-4 space-y-2 text-sm font-medium">
            <li>La personnalisation de vos billets et reçus.</li>
            <li>L'établissement du manifeste de bord légal pour les autorités de contrôle.</li>
            <li>Le suivi logistique de vos envois de fret.</li>
          </ul>
        </section>

        {/* --- NOUVELLE SECTION : DURÉE DE CONSERVATION (CRUCIAL POUR LA CONFORMITÉ) --- */}
        <section className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute bottom-0 right-0 p-6 opacity-10">
            <Database size={120} />
          </div>
          <h2 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-primary">
            <CalendarClock className="h-6 w-6" /> 5. Conservation des Données
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
             <div className="space-y-2">
                <p className="text-primary font-black text-[10px] uppercase tracking-widest">Comptes Utilisateurs</p>
                <p className="text-xs text-slate-400">Données conservées tant que le compte est actif. Suppression après <strong>3 ans d'inactivité</strong> totale.</p>
             </div>
             <div className="space-y-2">
                <p className="text-primary font-black text-[10px] uppercase tracking-widest">Billetterie (Historique)</p>
                <p className="text-xs text-slate-400">Les données de voyage sont archivées pendant <strong>5 ans</strong> pour répondre aux obligations fiscales et juridiques gabonaises.</p>
             </div>
             <div className="space-y-2">
                <p className="text-primary font-black text-[10px] uppercase tracking-widest">Logistique Fret</p>
                <p className="text-xs text-slate-400">L'historique des envois et tracking est conservé pendant <strong>2 ans</strong> après la livraison effective du colis.</p>
             </div>
          </div>
        </section>

        {/* 6. BAGAGES ET MARCHANDISES */}
        <section className="bg-amber-50 p-10 rounded-[2.5rem] border-2 border-amber-100 relative">
          <h2 className="text-2xl font-black text-amber-900 mb-6 uppercase italic flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" /> 6. Bagages et Marchandises
          </h2>
          <p className="text-sm font-medium text-amber-900/80">
            Le transport de produits dangereux ou prohibés est strictement interdit. Les suppléments bagages sont calculés sur la base de la déclaration de l'usager mais restent soumis à la <strong>pesée contradictoire</strong> en agence. En cas de différence de poids, le tarif de l'agence fait foi.
          </p>
        </section>

        {/* 7. REMBOURSEMENTS */}
        <section className="px-6 border-t border-dashed pt-12">
          <h2 className="text-2xl font-black text-slate-100 mb-6 uppercase italic">
            7. Annulation et Remboursement
          </h2>
          <p className="text-sm font-medium">
            Toute demande de remboursement s'effectue au guichet de l'agence de départ. Les frais de service perçus par TransGabon-Connect pour la gestion numérique ne sont pas remboursables.
          </p>
        </section>

        {/* --- FOOTER DE PAGE --- */}
        <footer className="pt-16 pb-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t-2 border-slate-50">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Dernière mise à jour : 22 Juillet 2026</p>
            <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">TransGabon Connect • Direction des Affaires Juridiques</p>
          </div>
          <div className="text-right">
             <p className="text-[9px] font-black uppercase text-primary tracking-widest italic">Libreville, République Gabonaise</p>
          </div>
        </footer>
      </div>
    </div>
  );
}