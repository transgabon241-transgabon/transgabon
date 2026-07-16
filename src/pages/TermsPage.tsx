"use client"

import { Gavel, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl text-left animate-in fade-in duration-700">
      {/* HEADER STYLE SaaS */}
      <header className="mb-12 border-b-4 border-slate-900 pb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-slate-900 rounded-2xl shadow-lg shadow-slate-200">
            <Gavel className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase">
            Conditions d'usage
          </h1>
        </div>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">
          Cadre contractuel de la plateforme TransGabon-Connect
        </p>
      </header>
      
      <div className="space-y-10 text-slate-700 leading-relaxed">
        <section className="px-4 border-l-4 border-primary">
          <h2 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">1. Acceptation</h2>
          <p>
            En accédant à **TransGabon-Connect**, vous acceptez d'être lié par les présentes conditions d'utilisation, ainsi que par toutes les lois et réglementations applicables en vigueur en République Gabonaise.
          </p>
        </section>

        <section className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-white shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> 2. Nature du Service
          </h2>
          <p>
            TransGabon-Connect est un intermédiaire numérique facilitant la mise en relation entre voyageurs et transporteurs (Terrestres, Ferroviaires et Maritimes). La plateforme n'est pas le transporteur physique. La responsabilité du voyage incombe exclusivement à la compagnie sélectionnée.
          </p>
        </section>

        <section className="px-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" /> 3. Validité et Paiement
          </h2>
          <p>
            Un billet n'est juridiquement valide que s'il porte le statut <strong className="text-emerald-700 uppercase">"Payé"</strong>. En cas de paiement en agence, le client doit finaliser la transaction avant l'heure limite d'embarquement sous peine d'annulation de sa place.
          </p>
        </section>

        <section className="bg-amber-50 p-8 rounded-[2.5rem] border-2 border-amber-100">
          <h2 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> 4. Bagages et Marchandises
          </h2>
          <p>
            Les bagages sont soumis aux limites de poids et forfaits de chaque transporteur. TransGabon-Connect assure la traçabilité numérique mais décline toute responsabilité en cas de perte, vol ou dommage matériel durant le transport physique.
          </p>
        </section>

        <section className="px-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4">5. Annulation et Remboursement</h2>
          <p>
            Toute demande de remboursement doit être effectuée directement au guichet de l'agence de départ. Les frais de service perçus par la plateforme sont non remboursables, sauf en cas d'annulation totale imputable au transporteur.
          </p>
        </section>

        <div className="pt-10 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">
              Pour toute question juridique, veuillez contacter notre support technique.
            </p>
        </div>
      </div>
    </div>
  );
}