"use client"

import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, Printer, RefreshCw, Ship, Train, Bus, Hash, MapPin, Gem, Package } from 'lucide-react';

// Type pour les bagages
type Luggage = {
  id: string;
  label: string;
  quantity: number;
  total_price: number;
};

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
  transportTypeCode: string;
  registration: string;
  travelClass: string;
  classCode: string;
  departureDate: string;
  departureTime: string;
  seatNumber: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  qrCodeData: string;
  luggages: Luggage[]; // Ajouté
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
          .select('*, trip:trips(*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name), vehicle:vehicles(registration)), passengers(*), luggages(*)')
          .eq('id', bookingId)
          .single();

        if (b && !error) {
          const leadPassenger = b.passengers[0];
          const passengerName = leadPassenger ? `${leadPassenger.first_name} ${leadPassenger.last_name}` : '—';
          const seatNumber = b.passengers.map((p: any) => p.seat_number).filter(Boolean).join(', ') || '—';

          const methodLabel: Record<string, string> = {
            AGENCE: 'Paiement en agence',
            AIRTEL_MONEY: 'Airtel Money',
            MOOV_MONEY: 'Moov Money',
          };

          const classMapping: Record<string, string> = {
            'VIP': 'Salon VIP',
            'BUSINESS': 'Classe Business',
            '1ERE_CLASSE': '1ère Classe',
            '2EME_CLASSE': '2ème Classe',
            'ECO': 'Économique',
            'STANDARD': 'Standard'
          };

          const destination = b.arrival_city_name || b.trip.to.name;
          const prettyClass = classMapping[b.class_type] || b.travel_class || 'Standard';

          const qrPayload = JSON.stringify({
            ref: b.reference,
            pass: passengerName,
            to: destination,
            seat: seatNumber,
            cls: prettyClass
          });

          const typeLabels: Record<string, string> = {
            BUS: 'Autocar',
            TRAIN: 'Train Voyageur',
            BOAT: 'Navire / Bateau'
          };

          setBooking({
            id: b.id,
            bookingNumber: b.reference,
            status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : 'En attente',
            passengerName,
            passengerPhone: b.contact_phone,
            departureCity: b.trip.from.name,
            arrivalCity: destination,
            companyName: b.trip.company.name,
            transportType: typeLabels[b.trip.type] || b.trip.type,
            transportTypeCode: b.trip.type,
            registration: b.trip.vehicle?.registration || '—',
            travelClass: prettyClass,
            classCode: b.class_type,
            departureDate: b.trip.departure_date,
            departureTime: b.trip.departure_time,
            seatNumber,
            amount: b.total_amount,
            paymentMethod: methodLabel[b.payment_method] || b.payment_method,
            paymentStatus: b.status === 'PAYE' ? 'Réglé' : 'À régler',
            qrCodeData: qrPayload,
            luggages: b.luggages || [] // Ajouté
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

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black uppercase">Sécurisation...</div>;
  if (loading) return <div className="max-w-lg mx-auto p-8"><Skeleton className="h-[500px] w-full rounded-[3rem]" /></div>;
  if (!booking) return <div className="p-20 text-center font-bold text-red-500 uppercase">Erreur : Billet introuvable</div>;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(booking.qrCodeData)}`;
  const TransportIcon = booking.transportTypeCode === 'BOAT' ? Ship : booking.transportTypeCode === 'TRAIN' ? Train : Bus;

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg animate-in fade-in duration-700">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground hover:text-primary mb-6 print:hidden">
        <ArrowLeft size={12} /> Retour à mon espace
      </Link>

      <div className="bg-white border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl print:border-none print:shadow-none">
        
        {/* Header dynamique */}
        <div className={`p-8 text-white ${
          booking.transportTypeCode === 'BOAT' ? 'bg-blue-600' : 
          booking.transportTypeCode === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                 <TransportIcon size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Billet Officiel</span>
            </div>
            <div className="text-right">
               <p className="text-[8px] font-bold uppercase opacity-60">Référence</p>
               <p className="font-mono font-black text-sm">{booking.bookingNumber}</p>
            </div>
          </div>
          
          <div className="space-y-1">
             <h2 className="text-3xl font-black leading-none tracking-tighter uppercase">{booking.departureCity}</h2>
             <div className="flex items-center gap-3 opacity-40">
                <div className="h-px flex-1 bg-white" />
                <ArrowLeft className="rotate-180" size={14} />
                <div className="h-px flex-1 bg-white" />
             </div>
             <h2 className="text-3xl font-black leading-none tracking-tighter uppercase">{booking.arrivalCity}</h2>
          </div>
          
          <p className="mt-4 text-xs font-bold uppercase tracking-widest opacity-80">{booking.companyName}</p>
        </div>

        {/* QR Code Section */}
        <div className="p-8 flex flex-col items-center justify-center bg-white border-b-2 border-dashed border-slate-100 relative">
          <div className="absolute -left-4 top-full -translate-y-1/2 h-8 w-8 bg-slate-50 rounded-full border-r-2 border-slate-100 print:hidden" />
          <div className="absolute -right-4 top-full -translate-y-1/2 h-8 w-8 bg-slate-50 rounded-full border-l-2 border-slate-100 print:hidden" />
          
          <div className="p-4 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 mb-4 shadow-inner">
            <img src={qrUrl} alt="QR Code" className="h-40 w-44" />
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Scanner à l'embarquement</p>
        </div>

        {/* Détails du passager */}
        <div className="p-8 grid grid-cols-2 gap-y-8 text-left bg-white">
            <InfoField label="Voyageur" value={booking.passengerName} />
            <InfoField label="Siège attribué">
               <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-sm shadow-md">
                 {booking.seatNumber}
               </span>
            </InfoField>

            <InfoField label="Immatriculation">
                <div className="flex items-center gap-1.5 font-black text-xs text-slate-700 uppercase">
                    <Hash size={14} className="text-primary" /> {booking.registration}
                </div>
            </InfoField>

            <InfoField label="Classe / Confort">
                <div className="flex items-center gap-1.5 font-black text-xs text-primary uppercase italic">
                    {(booking.classCode === 'VIP' || booking.classCode === '1ERE_CLASSE') && <Gem size={14} />}
                    {booking.travelClass}
                </div>
            </div>

            {/* SECTION BAGAGES AJOUTÉE */}
            {booking.luggages.length > 0 && (
              <div className="col-span-2 space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400">
                   <Package size={14} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Détail Bagages</span>
                </div>
                <div className="grid gap-2">
                   {booking.luggages.map((lug) => (
                     <div key={lug.id} className="flex justify-between items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">{lug.label}</span>
                        <span className="text-[11px] font-black text-slate-900">x{lug.quantity}</span>
                     </div>
                   ))}
                </div>
              </div>
            )}

            <div className="col-span-2 grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-4">
               <InfoField label="Date" value={new Date(booking.departureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} />
               <InfoField label="Départ" value={booking.departureTime} />
               <InfoField label="Montant" value={`${booking.amount.toLocaleString()} F`} />
            </div>
        </div>

        {/* Footer actions */}
        <div className="p-8 pt-0 flex flex-col gap-4 print:hidden">
          <Button onClick={() => window.print()} variant="outline" className="w-full h-14 rounded-2xl font-black border-2 gap-2 hover:bg-slate-50">
            <Printer size={18} /> TÉLÉCHARGER / IMPRIMER
          </Button>
          <div className="flex items-center justify-center gap-2">
             <div className={`h-2 w-2 rounded-full animate-pulse ${booking.paymentStatus === 'Réglé' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
             <span className="text-[10px] font-black uppercase text-slate-400">Statut : {booking.paymentStatus}</span>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-center text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed opacity-60">
        TransGabon-Connect • Validateur de Transport National<br/>
        Ce titre est personnel. Une pièce d'identité peut être exigée lors du contrôle.
      </p>
    </div>
  );
}

function InfoField({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</div>
      <div className={`text-sm font-bold text-slate-900 truncate uppercase`}>
        {children || value || '—'}
      </div>
    </div>
  );
}