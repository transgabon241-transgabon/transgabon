"use client"

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl text-left">
      <h1 className="text-4xl font-black mb-8 border-b pb-4">Politique de Confidentialité</h1>
      
      <div className="space-y-8 text-slate-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
          <p>La présente Politique de Confidentialité régit la manière dont **TransGabon Connect** collecte, utilise, conserve et divulgue les informations collectées auprès des utilisateurs de la plateforme. Nous nous engageons à protéger vos données personnelles conformément à la **Loi N°001/2011 relative à la protection des données à caractère personnel** en République Gabonaise.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Collecte des données</h2>
          <p>Nous collectons des informations d'identification personnelle de plusieurs manières :</p>
          <ul className="list-disc ml-6 mt-2 space-y-2">
            <li><strong>Authentification Google :</strong> Nom, prénom, adresse e-mail et photo de profil.</li>
            <li><strong>Inscription directe :</strong> Nom, prénom, adresse e-mail, numéro de téléphone.</li>
            <li><strong>Données de voyage :</strong> Historique des réservations, trajets effectués, numéros de siège.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Utilisation des données</h2>
          <p>Les informations collectées sont utilisées pour :</p>
          <ul className="list-disc ml-6 mt-2 space-y-2">
            <li>Générer vos titres de transport électroniques (billets avec QR Code).</li>
            <li>Assurer le suivi logistique de vos colis (fret).</li>
            <li>Vous contacter par SMS ou e-mail en cas de retard ou d'annulation de trajet.</li>
            <li>Améliorer nos services et sécuriser les transactions financières.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Partage des données</h2>
          <p>Nous ne vendons, n'échangeons ni ne louons vos informations. Cependant, vos données de voyage sont partagées avec les <strong>partenaires de transport</strong> (Agences de bus, SETRAG) uniquement pour l'établissement de la liste d'embarquement officielle.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Sécurité</h2>
          <p>Vos données sont stockées sur des serveurs sécurisés via notre partenaire technologique Supabase. L'accès à vos informations est strictement limité au personnel autorisé (Agents d'embarquement et Caissiers) via des comptes sécurisés.</p>
        </section>

        <p className="text-xs text-muted-foreground pt-8 border-t">Dernière mise à jour : 14 Juillet 2026</p>
      </div>
    </div>
  );
}