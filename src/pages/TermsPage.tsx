"use client"

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl text-left">
      <h1 className="text-4xl font-black mb-8 border-b pb-4">Conditions Générales d'Utilisation</h1>
      
      <div className="space-y-8 text-slate-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptation des conditions</h2>
          <p>En accédant à Gabon Mobilité, vous acceptez d'être lié par les présentes conditions d'utilisation, toutes les lois et réglementations applicables en République Gabonaise.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Service de Réservation</h2>
          <p>Gabon Mobilité est une plateforme numérique facilitant la réservation de billets de transport. La plateforme n'est pas le transporteur physique. La responsabilité du transport incombe exclusivement à l'agence de voyage ou à la compagnie ferroviaire sélectionnée lors de l'achat.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Validité du Billet</h2>
          <p>Un billet électronique n'est considéré comme valide que lorsqu'il porte le statut <strong>"PAYÉ"</strong> dans le système. Tout voyageur présentant un billet "En attente" se verra refuser l'accès à bord.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Politique de Bagages</h2>
          <p>Les bagages accompagnés sont soumis aux règles de chaque transporteur. Gabon Mobilité permet l'enregistrement numérique des bagages pour assurer leur traçabilité, mais ne pourra être tenu responsable en cas de perte ou de dégradation par le transporteur.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Annulation et Remboursement</h2>
          <p>Les demandes de remboursement doivent être formulées auprès de l'agence de départ. Les frais de service de la plateforme ne sont pas remboursables, sauf en cas d'annulation totale du voyage du fait du transporteur.</p>
        </section>
      </div>
    </div>
  );
}