"use client"

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context"; // Importation depuis le contexte séparé
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, Printer, AlertCircle, RefreshCw } from 'lucide-react';

type MappedBooking = {
  id: string;
  bookingNumber: string;
  status: string;
  passengerName: string;
  passengerPhone: string;
  departureCity: string;
  arrivalCity: string;
  companyName: string;
  transportType: string;
  departureDate: string;
  departureTime: string;
  seatNumber: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  qrCodeData: string;
};

export default function TicketPage() {
  const { bookingId } = useParams();
  
  // 1. On récupère isModalOpen pour savoir si l'utilisateur interagit avec le modal
  const { user, isLoading, loginWithRedirect, isModalOpen } = useAuth() as any;
  
  const [booking, setBooking] = useState<MappedBooking | null>(null);
  const [loading, setLoading] = useState(true);

  // 2. Gestion de la redirection (CORRIGÉE)
  useEffect(() => {
    // On ne redirige QUE si :
    // - Le chargement de l'auth est fini
    // - Il n'y a pas d'utilisateur
    // - LE MODAL N'EST PAS DÉJÀ OUVERT (évite de réinitialiser le modal pendant une inscription)
    if (!isLoading && !user && !isModalOpen) {
      loginWithRedirect({ initialView: 'signin' });
    }
  }, [isLoading, user, loginWithRedirect, isModalOpen]);

  useEffect(() => {
    if (!user || !bookingId) return;
    setLoading(true);

    const loadTicketDetails = async () => {
      try {
        const { data: b, error } = await supabase
          .from('bookings')
          .select('*, trip:trips(*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name)), passengers(*)')
          .eq('id', bookingId)
          .single();

        if (error) {
          console.error("🔴 [ERREUR SUPABASE BILLET] :", error.message);
        }

        if (b && !error) {
          const leadPassenger = b.passengers[0];
          const passengerName = leadPassenger ? `${leadPassenger.first_name} ${leadPassenger.last_name}` : '—';
          const seatNumber = b.passengers.map((p: any) => p.seat_number).filter(Boolean).join(', ') || '—';

          const methodLabel: Record<string, string> = {
            AGENCE: 'Paiement en agence',
            AIRTEL_MONEY: 'Airtel Money',
            MOOV_MONEY: 'Moov Money',
          };

          const qrPayload = JSON.stringify({
            ref: b.reference,
            trip: b.trip_id,
            passenger: passengerName,
            seats: seatNumber,
          });

          setBooking({
            id: b.id,
            bookingNumber: b.reference,
            status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'En attente',
            passengerName,
            passengerPhone: b.contact_phone,
            departureCity: b.trip.from.name,
            arrivalCity: b.trip.to.name,
            companyName: b.trip.company.name,
            transportType: b.trip.type === 'TRAIN' ? 'Train' : 'Bus',
            departureDate: b.trip.departure_date,
            departureTime: b.trip.departure_time,
            seatNumber,
            amount: b.total_amount,
            paymentMethod: methodLabel[b.payment_method] || b.payment_method,
            paymentStatus: b.status === 'PAYE' ? 'Réglé' : b.status === 'ANNULE' ? 'Annulé' : 'Non réglé',
            qrCodeData: qrPayload,
          });
        } else {
          setBooking(null);
        }
      } catch (err) {
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };

    loadTicketDetails();
  }, [user, bookingId]);

  const handleDownload = () => {
    window.print();
  };

  // 3. Rendu pendant le chargement de l'auth
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Vérification de l'accès...</p>
      </div>
    );
  }

  // 4. Si pas d'utilisateur, on affiche un écran vide mais stable (pour garder le modal affiché)
  if (!user) {
    return <div className="min-h-screen bg-background" />;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8 text-center max-w-sm space-y-4">
        <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
        <h3 className="font-bold text-lg">Billet indisponible</h3>
        <p className="text-xs text-muted-foreground">Impossible de charger cette réservation.</p>
        <Link to="/dashboard"><Button variant="outline" className="w-full">Retour au tableau de bord</Button></Link>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(booking.qrCodeData)}`;

  const statusColor: Record<string, string> = {
    'En attente': 'bg-yellow-100 text-yellow-800',
    'Confirmé': 'bg-green-100 text-green-800',
    'Annulé': 'bg-red-100 text-red-800',
    'Remboursé': 'bg-red-100 text-red-800',
    'Terminé': 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 print:hidden transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour à mes voyages
      </Link>

      <div className="bg-card border rounded-3xl overflow-hidden print:border-2 print:shadow-none shadow-xl border-border">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6 print:[print-color-adjust:exact]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="text-[10px] uppercase font-black tracking-widest">Billet Officiel</span>
          </div>
          <div className="text-2xl font-black">{booking.departureCity} → {booking.arrivalCity}</div>
          <div className="text-xs opacity-80 font-bold mt-1 uppercase tracking-wider">{booking.companyName} • {booking.transportType}</div>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center py-8 border-b border-dashed bg-white">
          <div className="bg-white p-3 border-2 border-primary/10 rounded-2xl mb-2">
             <img src={qrUrl} alt="QR Code" className="h-40 w-40" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Scanner à l'embarquement</p>
        </div>

        {/* Info Grid */}
        <div className="p-6 grid grid-cols-2 gap-y-5 gap-x-4 text-left">
            <InfoField label="Référence" value={booking.bookingNumber} isMono />
            <InfoField label="Statut">
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-black ${statusColor[booking.status] || 'bg-muted'}`}>
                {booking.status}
              </span>
            </InfoField>
            <InfoField label="Passager" value={booking.passengerName} />
            <InfoField label="Siège(s)" value={booking.seatNumber} />
            <InfoField label="Date" value={booking.departureDate ? new Date(booking.departureDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} />
            <InfoField label="Heure" value={booking.departureTime} />
            <InfoField label="Montant" value={`${booking.amount.toLocaleString()} FCFA`} />
            <InfoField label="Paiement" value={booking.paymentStatus} />
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 print:hidden">
          <Button className="w-full gap-2 font-bold h-12 shadow-lg" onClick={handleDownload}>
            <Printer className="h-4 w-4" />
            Imprimer mon billet (PDF)
          </Button>
        </div>
      </div>
      
      <p className="text-center text-[10px] text-muted-foreground mt-8 uppercase font-bold tracking-widest leading-relaxed">
        Ce titre de transport est personnel et incessible.<br/> Présentation d'une pièce d'identité obligatoire.
      </p>
    </div>
  );
}

function InfoField({ label, value, children, isMono = false }: { label: string; value?: string; children?: React.ReactNode; isMono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{label}</div>
      <div className={`text-sm font-bold truncate ${isMono ? 'font-mono text-primary' : 'text-slate-900'}`}>
        {children || value || '—'}
      </div>
    </div>
  );
}