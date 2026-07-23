"use client"

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, Printer, RefreshCw, Ship, Train, Bus, Hash, MapPin, Gem, Package, Info, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Type précis pour les bagages
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
  luggages: Luggage[];
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

          const classMapping: Record<string, string> = {
            'VIP': 'Salon VIP',
            'BUSINESS': 'Business',
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
            lugs: b.luggages?.length || 0
          });

          setBooking({
            id: b.id,
            bookingNumber: b.reference,
            status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : 'En attente',
            passengerName,
            passengerPhone: b.contact_phone,
            departureCity: b.trip.from.name,
            arrivalCity: destination,
            companyName: b.trip.company.name,
            transportType: b.trip.type === 'TRAIN' ? 'Train' : b.trip.type === 'BOAT' ? 'Bateau' : 'Bus',
            transportTypeCode: b.trip.type,
            registration: b.trip.vehicle?.registration || '—',
            travelClass: prettyClass,
            classCode: b.class_type,
            departureDate: b.trip.departure_date,
            departureTime: b.trip.departure_time,
            seatNumber,
            amount: b.total_amount,
            paymentMethod: b.payment_method === 'AGENCE' ? 'Paiement Agence' : b.payment_method,
            paymentStatus: b.status === 'PAYE' ? 'Réglé' : 'À régler',
            qrCodeData: qrPayload,
            luggages: b.luggages || []
          });
        }
      } catch (err) {
        console.error("Erreur Ticket:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTicketDetails();
  }, [user, bookingId]);

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black uppercase text-slate-500">Vérification...</div>;
  if (loading) return <div className="max-w-lg mx-auto p-8"><Skeleton className="h-[500px] w-full rounded-[3rem] bg-slate-900" /></div>;
  if (!booking) return <div className="p-20 text-center font-bold text-red-500 uppercase">Billet introuvable</div>;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(booking.qrCodeData)}`;
  const TransportIcon = booking.transportTypeCode === 'BOAT' ? Ship : booking.transportTypeCode === 'TRAIN' ? Train : Bus;

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg animate-in fade-in duration-700">
      
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-primary mb-6 print:hidden tracking-widest">
        <ArrowLeft size={14} /> Retour à mon espace
      </Link>

      <div className="bg-card border-2 border-border rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] print:border-none print:shadow-none">
        
        {/* HEADER - Couleurs d'accent conservées pour la distinction */}
        <div className={`p-8 text-white ${
          booking.transportTypeCode === 'BOAT' ? 'bg-blue-600' : 
          booking.transportTypeCode === 'TRAIN' ? 'bg-slate-950' : 'bg-primary'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                 <TransportIcon size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">Billet Officiel</span>
            </div>
            <div className="text-right">
               <p className="text-[8px] font-bold uppercase opacity-50">Référence</p>
               <p className="font-mono font-black text-sm tracking-tighter">{booking.bookingNumber}</p>
            </div>
          </div>
          
          <div className="space-y-1">
             <h2 className="text-3xl font-black leading-none tracking-tighter uppercase">{booking.departureCity}</h2>
             <div className="flex items-center gap-3 opacity-20 py-1">
                <div className="h-px flex-1 bg-white" />
                <ArrowRight size={14} />
                <div className="h-px flex-1 bg-white" />
             </div>
             <h2 className="text-3xl font-black leading-none tracking-tighter uppercase">{booking.arrivalCity}</h2>
          </div>
          
          <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-white/60 italic">{booking.companyName}</p>
        </div>

        {/* SECTION QR CODE */}
        <div className="p-8 flex flex-col items-center justify-center bg-card border-b-2 border-dashed border-border relative">
          {/* Cercles de découpe ticket (doivent matcher la couleur de fond du site) */}
          <div className="absolute -left-4 top-full -translate-y-1/2 h-8 w-8 bg-background rounded-full border-r-2 border-border print:hidden" />
          <div className="absolute -right-4 top-full -translate-y-1/2 h-8 w-8 bg-background rounded-full border-l-2 border-border print:hidden" />
          
          <div className="p-4 bg-slate-950 rounded-[2.5rem] border-2 border-border mb-4 shadow-inner">
            <img src={qrUrl} alt="QR Code" className="h-40 w-40 brightness-90 contrast-125" />
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Scanner au contrôle</p>
        </div>

        {/* DÉTAILS - bg-card au lieu de bg-white */}
        <div className="p-8 space-y-8 bg-card">
            <div className="grid grid-cols-2 gap-y-8 text-left">
                <InfoField label="Voyageur" value={booking.passengerName} />
                <InfoField label="Siège">
                   <span className="bg-slate-950 text-primary border border-primary/20 px-3 py-1 rounded-lg font-black text-xs shadow-lg">
                     {booking.seatNumber}
                   </span>
                </InfoField>

                <InfoField label="Véhicule / Train">
                    <div className="flex items-center gap-1.5 font-black text-xs text-slate-200 uppercase">
                        <Hash size={12} className="text-primary" /> {booking.registration}
                    </div>
                </InfoField>

                <InfoField label="Confort choisi">
                    <div className="flex items-center gap-1.5 font-black text-[10px] text-primary uppercase italic tracking-wider">
                        {booking.travelClass}
                    </div>
                </InfoField>
            </div>

            {/* SECTION BAGAGES SOMBRE */}
            {booking.luggages.length > 0 ? (
              <div className="p-5 bg-slate-950 rounded-[2rem] border-2 border-border animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-slate-500 mb-4">
                   <Package size={14} className="text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Bagages enregistrés</span>
                </div>
                <div className="space-y-2">
                   {booking.luggages.map((lug) => (
                     <div key={lug.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-border shadow-sm">
                        <span className="text-[10px] font-black text-slate-300 uppercase">{lug.label}</span>
                        <Badge className="bg-slate-800 text-slate-400 border-none font-black text-[10px]">x{lug.quantity}</Badge>
                     </div>
                   ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 flex items-center gap-3">
                 <Info size={14} className="text-slate-700" />
                 <p className="text-[9px] font-bold text-slate-600 uppercase italic">Aucun supplément déclaré</p>
              </div>
            )}

            {/* BOX RÉCAPITULATIF SOMBRE */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-6 rounded-[2rem] border border-border shadow-xl text-white">
               <div className="text-left">
                  <p className="text-[8px] font-black text-primary uppercase opacity-70">Date</p>
                  <p className="font-black text-xs text-slate-200">{new Date(booking.departureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
               </div>
               <div className="text-center border-x border-white/5">
                  <p className="text-[8px] font-black text-primary uppercase opacity-70">Heure</p>
                  <p className="font-black text-xs text-slate-200">{booking.departureTime}</p>
               </div>
               <div className="text-right">
                  <p className="text-[8px] font-black text-primary uppercase opacity-70">Montant</p>
                  <p className="font-black text-xs text-slate-200">{booking.amount.toLocaleString()} F</p>
               </div>
            </div>
        </div>

        <div className="p-8 pt-0 flex flex-col gap-4 print:hidden bg-card">
          <Button onClick={() => window.print()} variant="outline" className="w-full h-14 rounded-2xl font-black border-border bg-slate-900 text-slate-200 hover:bg-slate-800 gap-2">
            <Printer size={18} /> IMPRIMER LE BILLET
          </Button>
          <div className="flex items-center justify-center gap-2">
             <div className={`h-2 w-2 rounded-full ${booking.paymentStatus === 'Réglé' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
             <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Statut : {booking.paymentStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none">{label}</div>
      <div className="text-sm font-black text-slate-200 truncate uppercase mt-1">
        {children || value || '—'}
      </div>
    </div>
  );
}