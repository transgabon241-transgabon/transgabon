"use client"

import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CalendarDays, MapPin, Ticket, X, Eye, Bus, Package, Ship, Train, Hash, Gem, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

type Booking = {
  id: string;
  bookingNumber: string;
  status: string;
  passengerName: string;
  departureCity: string;
  arrivalCity: string;
  companyName: string;
  transportType: string;
  transportTypeCode: string;
  departureDate: string;
  departureTime: string;
  seatNumber: string;
  amount: number;
  paymentMethod: string;
  classLabel: string; // NOUVEAU
};

type Parcel = {
  id: string;
  trackingNumber: string;
  status: string;
  departureCity: string;
  arrivalCity: string;
  companyName: string;
  departureDate: string;
  description: string;
  price: number;
};

export default function DashboardPage() {
  const { user, isLoading, loginWithRedirect } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect({ redirectUrl: window.location.href });
  }, [isLoading, user, loginWithRedirect]);

  useEffect(() => {
    if (isLoading || !user) return;
    setLoading(true);

    const loadDashboardData = async () => {
      try {
        // 1. RÉCUPÉRATION DES RÉSERVATIONS
        const { data: bData } = await supabase
          .from('bookings')
          .select('*, trip:trips(*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name)), passengers(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const classMapping: Record<string, string> = {
          'VIP': 'VIP', 'BUSINESS': 'Business', '1ERE_CLASSE': '1ère Cl.', '2EME_CLASSE': '2ème Cl.', 'ECO': 'Éco', 'STANDARD': 'Std'
        };

        const formattedBookings: Booking[] = (bData || []).map(b => ({
          id: b.id,
          bookingNumber: b.reference,
          status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'En attente',
          passengerName: b.passengers[0] ? `${b.passengers[0].first_name} ${b.passengers[0].last_name}` : 'Moi',
          departureCity: b.trip.from.name,
          arrivalCity: b.arrival_city_name || b.trip.to.name, // GESTION ESCALE
          companyName: b.trip.company.name,
          transportType: b.trip.type === 'TRAIN' ? 'Train' : b.trip.type === 'BOAT' ? 'Bateau' : 'Bus',
          transportTypeCode: b.trip.type,
          departureDate: b.trip.departure_date,
          departureTime: b.trip.departure_time,
          seatNumber: b.passengers[0]?.seat_number || '—',
          amount: b.total_amount,
          paymentMethod: b.payment_method.replace('_', ' '),
          classLabel: classMapping[b.class_type] || 'Standard'
        }));

        setBookings(formattedBookings);

        // 2. RÉCUPÉRATION DES COLIS
        const { data: pData } = await supabase
          .from('parcels')
          .select('*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name)')
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false });

        setParcels((pData || []).map(p => ({
          id: p.id,
          trackingNumber: p.tracking_number,
          status: {
            COLIS_ENREGISTRE: 'En attente',
            EN_ATTENTE_DEPART: 'Pris en charge',
            EN_COURS_DE_TRANSPORT: 'En transit',
            ARRIVE_A_DESTINATION: 'Arrivé',
            LIVRE: 'Livré'
          }[p.status as string] || p.status,
          departureCity: p.from.name,
          arrivalCity: p.to.name,
          companyName: p.company.name,
          departureDate: p.created_at.slice(0, 10),
          description: p.description,
          price: p.price
        })));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isLoading, user]);

  const handleCancel = async (id: string) => {
    try {
      const { data: res, error } = await supabase.rpc('cancel_booking_by_user', { p_booking_id: id, p_user_id: user?.id });
      if (error || !res?.success) throw new Error(res?.error || "Erreur d'annulation");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'Annulé' } : b));
      toast.success('Réservation annulée');
    } catch (err: any) { toast.error(err.message); }
  };

  if (isLoading || !user) return null;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter(b => b.status === 'Confirmé' && b.departureDate >= today);
  const past = bookings.filter(b => b.status !== 'Annulé' && (b.status === 'Terminé' || b.departureDate < today));

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl text-left space-y-10 animate-in fade-in duration-500">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
        <div>
          <p className="text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-2">Mon Espace Personnel</p>
          <h1 className="text-3xl font-black italic">Bonjour, {user.firstName || 'Voyageur'}</h1>
          <p className="text-slate-400 text-sm mt-1">Gérez vos billets et suivez vos colis en temps réel.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/send-parcel')} className="rounded-2xl font-black bg-white/5 border-white/10 hover:bg-white/10 text-white h-12 gap-2">
            <Package size={18} /> FRET
          </Button>
          <Button onClick={() => navigate('/')} className="rounded-2xl font-black shadow-lg shadow-primary/20 h-12 gap-2">
            <Bus size={18} /> NOUVEAU VOYAGE
          </Button>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatItem label="Billets actifs" value={upcoming.length} icon={Ticket} color="text-primary" />
        <StatItem label="Colis envoyés" value={parcels.length} icon={Package} color="text-emerald-500" />
        <StatItem label="Voyages passés" value={past.length} icon={CalendarDays} color="text-blue-500" />
        <StatItem label="Annulations" value={bookings.filter(b => b.status === 'Annulé').length} icon={X} color="text-red-400" />
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-14 w-fit mb-8">
          <TabsTrigger value="upcoming" className="rounded-xl px-6 font-black uppercase text-[10px]">À Venir ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past" className="rounded-xl px-6 font-black uppercase text-[10px]">Historique ({past.length})</TabsTrigger>
          <TabsTrigger value="parcels" className="rounded-xl px-6 font-black uppercase text-[10px]">Mes Colis ({parcels.length})</TabsTrigger>
        </TabsList>

        {loading ? (
            <div className="space-y-4"><Skeleton className="h-32 w-full rounded-[2rem]" /><Skeleton className="h-32 w-full rounded-[2rem]" /></div>
        ) : (
          <>
            <TabsContent value="upcoming" className="space-y-4 animate-in slide-in-from-bottom-2">
              <BookingList bookings={upcoming} onCancel={handleCancel} showActions />
            </TabsContent>
            <TabsContent value="past" className="space-y-4 animate-in slide-in-from-bottom-2">
              <BookingList bookings={past} />
            </TabsContent>
            <TabsContent value="parcels" className="space-y-4 animate-in slide-in-from-bottom-2">
              <ParcelList parcels={parcels} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

/**
 * LISTE DES RÉSERVATIONS
 */
function BookingList({ bookings, onCancel, showActions }: { bookings: Booking[], onCancel?: (id: string) => void, showActions?: boolean }) {
  const navigate = useNavigate();
  if (bookings.length === 0) return <EmptyState label="Aucune réservation trouvée" />;

  return (
    <div className="grid gap-4">
      {bookings.map(b => {
        const TransportIcon = b.transportTypeCode === 'BOAT' ? Ship : b.transportTypeCode === 'TRAIN' ? Train : Bus;
        return (
          <div key={b.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all group flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-5 flex-1 w-full">
               <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${b.transportTypeCode === 'BOAT' ? 'bg-blue-600' : b.transportTypeCode === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'}`}>
                  <TransportIcon size={24} />
               </div>
               <div>
                  <div className="flex items-center gap-2 font-black text-lg text-slate-800 uppercase tracking-tighter">
                     {b.departureCity} <ArrowRight size={14} className="text-primary opacity-30" /> {b.arrivalCity}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                     <Badge variant="outline" className="text-[8px] font-black uppercase h-5 border-primary/20 text-primary">{b.classLabel}</Badge>
                     <span className="text-[10px] font-bold text-muted-foreground uppercase">{b.companyName} • {new Date(b.departureDate).toLocaleDateString('fr-FR')} • {b.departureTime}</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="text-right mr-4 hidden sm:block">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Montant</p>
                  <p className="font-black text-slate-900">{b.amount.toLocaleString()} F</p>
               </div>
               <Button onClick={() => navigate(`/ticket/${b.id}`)} variant="outline" className="flex-1 md:flex-none h-11 rounded-xl border-2 font-black text-[10px] uppercase gap-2">
                 <Eye size={16} /> Billet
               </Button>
               {showActions && b.status === 'Confirmé' && onCancel && (
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <Button variant="ghost" className="h-11 w-11 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><X size={20}/></Button>
                   </AlertDialogTrigger>
                   <AlertDialogContent className="rounded-[2.5rem]">
                     <AlertDialogHeader>
                       <AlertDialogTitle className="font-black italic uppercase">Annuler le voyage ?</AlertDialogTitle>
                       <AlertDialogDescription className="font-medium">Cette action est soumise aux conditions de remboursement de {b.companyName}.</AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel className="rounded-xl font-bold">RETOUR</AlertDialogCancel>
                       <AlertDialogAction onClick={() => onCancel(b.id)} className="bg-red-600 rounded-xl font-bold">ANNULER BILLET</AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>
               )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * LISTE DES COLIS
 */
function ParcelList({ parcels }: { parcels: Parcel[] }) {
  if (parcels.length === 0) return <EmptyState label="Aucun colis enregistré" icon={Package} />;

  return (
    <div className="grid gap-4">
      {parcels.map(p => (
        <div key={p.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5 flex-1 w-full">
             <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                <Package size={24} />
             </div>
             <div>
                <div className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-tighter mb-1">
                   {p.departureCity} ➔ {p.arrivalCity}
                </div>
                <div className="flex items-center gap-2">
                   <Badge className="bg-slate-900 text-white text-[8px] font-mono h-5">{p.trackingNumber}</Badge>
                   <span className="text-[10px] font-bold text-muted-foreground uppercase">{p.companyName} • {p.status}</span>
                </div>
             </div>
          </div>
          <Link to={`/track?q=${p.trackingNumber}`} className="w-full md:w-auto">
             <Button variant="outline" className="w-full h-11 rounded-xl border-2 font-black text-[10px] uppercase gap-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100">
               <Eye size={16} /> Suivre colis
             </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

function StatItem({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white border-2 border-slate-100 p-5 rounded-3xl shadow-sm hover:border-primary/20 transition-colors">
      <Icon className={`h-5 w-5 ${color} mb-3`} />
      <p className="text-2xl font-black text-slate-900 leading-none mb-1">{value}</p>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function EmptyState({ label, icon: Icon = Ticket }: any) {
  return (
    <div className="py-20 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50">
      <Icon className="h-12 w-12 mx-auto text-slate-200 mb-4" />
      <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em]">{label}</p>
    </div>
  );
}