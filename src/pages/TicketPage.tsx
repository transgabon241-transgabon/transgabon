"use client"

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, Printer, AlertCircle, RefreshCw, Ship, Train, Bus } from 'lucide-react';

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
  transportTypeCode: string; // BUS, TRAIN, BOAT
  travelClass: string; // NOUVEAU
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
  const { user, isLoading, loginWithRedirect, isModalOpen } = useAuth() as any;
  
  const [booking, setBooking] = useState<MappedBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        if (error) console.error("🔴 Error:", error.message);

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
            class: b.travel_class
          });

          // Traduction du type de transport
          const typeLabels: Record<string, string> = {
            BUS: 'Autocar',
            TRAIN: 'Train',
            BOAT: 'Bateau'
          };

          setBooking({
            id: b.id,
            bookingNumber: b.reference,
            status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'En attente',
            passengerName,
            passengerPhone: b.contact_phone,
            departureCity: b.trip.from.name,
            arrivalCity: b.trip.to.name,
            companyName: b.trip.company.name,
            transportType: typeLabels[b.trip.type] || b.trip.type,
            transportTypeCode: b.trip.type,
            travelClass: b.travel_class || 'Économique', // Valeur par défaut
            departureDate: b.trip.departure_date,
            departureTime: b.trip.departure_time,
            seatNumber,
            amount: b.total_amount,
            paymentMethod: methodLabel[b.payment_method] || b.payment_method,
            paymentStatus: b.status === 'PAYE' ? 'Réglé' : 'Non réglé',
            qrCodeData: qrPayload,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTicketDetails();
  }, [user, bookingId]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Authentification...</p>
    </div>
  );

  if (!user) return <div className="min-h-screen bg-background" />;
  if (loading) return <div className="max-w-lg mx-auto p-8"><Skeleton className="h-[400px] w-full rounded-[2.5rem]" /></div>;

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8 text-center max-w-sm space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
        <h3 className="font-black text-xl italic">Billet introuvable</h3>
        <Link to="/dashboard"><Button className="w-full rounded-2xl font-black">MES VOYAGES</Button></Link>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(booking.qrCodeData)}`;

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-black uppercase text-muted-foreground hover:text-primary mb-6 print:hidden transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour aux voyages
      </Link>

      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xl print:border-none print:shadow-none">
        
        {/* Header du Billet */}
        <div className={`p-8 text-white print:[print-color-adjust:exact] ${
          booking.transportTypeCode === 'BOAT' ? 'bg-blue-600' : 
          booking.transportTypeCode === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Billet Électronique</span>
            </div>
            {booking.transportTypeCode === 'BOAT' && <Ship size={24} className="opacity-50" />}
            {booking.transportTypeCode === 'TRAIN' && <Train size={24} className="opacity-50" />}
          </div>
          <h2 className="text-3xl font-black leading-none mb-1 tracking-tighter uppercase">{booking.departureCity} → {booking.arrivalCity}</h2>
          <p className="text-xs font-bold opacity-80 uppercase tracking-widest">{booking.companyName} • {booking.transportType}</p>
        </div>

        {/* Zone QR Code */}
        <div className="p-8 flex flex-col items-center justify-center bg-white border-b-2 border-dashed border-slate-100">
          <div className="p-4 bg-slate-50 rounded-[2rem] border-2 border-slate-100 mb-4">
            <img src={qrUrl} alt="QR Code Billet" className="h-44 w-44" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Scanner à l'embarquement</p>
        </div>

        {/* Détails du Voyage */}
        <div className="p-8 grid grid-cols-2 gap-y-6 gap-x-4 text-left">
            <InfoField label="Réf. Billet" value={booking.bookingNumber} isMono />
            <InfoField label="Passager" value={booking.passengerName} />
            
            {/* AFFICHAGE DE LA CLASSE DE VOYAGE */}
            <InfoField label="Classe / Confort">
                <span className="bg-primary/5 text-primary px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-tighter border border-primary/10">
                    {booking.travelClass}
                </span>
            </InfoField>

            <InfoField label="Siège" value={booking.seatNumber} />
            <InfoField label="Date" value={new Date(booking.departureDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <InfoField label="Heure" value={booking.departureTime} />
            <InfoField label="Montant" value={`${booking.amount.toLocaleString()} FCFA`} />
            <InfoField label="Paiement">
               <span className={`font-black uppercase text-[10px] ${booking.paymentStatus === 'Réglé' ? 'text-emerald-600' : 'text-amber-600'}`}>
                 {booking.paymentStatus}
               </span>
            </InfoField>
        </div>

        {/* Footer Actions */}
        <div className="p-8 pt-0 print:hidden">
          <Button onClick={() => window.print()} className="w-full h-14 rounded-2xl font-black text-lg gap-2 shadow-xl active:scale-95 transition-transform">
            <Printer className="h-5 w-5" /> IMPRIMER EN PDF
          </Button>
        </div>
      </div>
      
      <div className="mt-8 text-center space-y-2 opacity-50">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Document généré par Gabon Mobilité</p>
        <p className="text-[8px] font-bold text-slate-400 max-w-[280px] mx-auto leading-relaxed">
          Présentation obligatoire d'une pièce d'identité originale à l'embarquement. Billet non remboursable 2h avant le départ.
        </p>
      </div>
    </div>
  );
}

function InfoField({ label, value, children, isMono = false }: { label: string; value?: string; children?: React.ReactNode; isMono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">{label}</div>
      <div className={`text-sm font-bold truncate leading-none ${isMono ? 'font-mono text-primary' : 'text-slate-900'}`}>
        {children || value || '—'}
      </div>
    </div>
  );
}