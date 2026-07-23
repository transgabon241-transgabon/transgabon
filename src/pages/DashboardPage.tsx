"use client"

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CalendarDays, MapPin, Ticket, X, Eye, Bus, Package, Ship, Train, Hash, Gem, ArrowRight, ChevronLeft, ChevronRight, Plane } from 'lucide-react';
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
  classLabel: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect({ redirectUrl: window.location.href });
  }, [isLoading, user, loginWithRedirect]);

  useEffect(() => {
    if (isLoading || !user) return;
    setLoading(true);

    const loadDashboardData = async () => {
      try {
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
          arrivalCity: b.arrival_city_name || b.trip.to.name,
          companyName: b.trip.company.name,
          // MISE À JOUR DU MAPPING POUR L'AVION
          transportType: b.trip.type === 'TRAIN' ? 'Train' : b.trip.type === 'BOAT' ? 'Bateau' : b.trip.type === 'PLANE' ? 'Avion' : 'Bus',
          transportTypeCode: b.trip.type,
          departureDate: b.trip.departure_date,
          departureTime: b.trip.departure_time,
          seatNumber: b.passengers[0]?.seat_number || '—',
          amount: b.total_amount,
          paymentMethod: b.payment_method.replace('_', ' '),
          classLabel: classMapping[b.class_type] || 'Standard'
        }));

        setBookings(formattedBookings);

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
  const past = bookings.filter(b => b.status !== 'Annulé' && b.status !== 'Remboursé' && (b.status === 'Terminé' || b.departureDate < today));
  const cancelled = bookings.filter(b => b.status === 'Annulé' || b.status === 'Remboursé');

  const paginate = (items: any[]) => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 max-w-5xl text-left space-y-8 sm:space-y-10 animate-in fade-in duration-500 bg-background text-foreground">
      
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] text-white shadow-2xl border border-slate-800 overflow-hidden">
        <div className="space-y-1">
          <p className="text-primary font-black uppercase text-[9px] sm:text-[10px] tracking-[0.3em]">Mon Espace Personnel</p>
          <h1 className="text-2xl sm:text-3xl font-black italic leading-tight">Bonjour, {user.firstName || 'Voyageur'}</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Gérez vos billets et suivez vos colis en temps réel.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={() => navigate('/send-parcel')} className="flex-1 sm:flex-none rounded-xl sm:rounded-2xl font-black bg-white/5 border-white/10 hover:bg-white/10 text-white h-11 sm:h-12 text-[11px] sm:text-sm gap-2">
            <Package size={16} /> FRET
          </Button>
          <Button onClick={() => navigate('/')} className="flex-1 sm:flex-none rounded-xl sm:rounded-2xl font-black shadow-lg shadow-primary/20 h-11 sm:h-12 text-[11px] sm:text-sm gap-2 bg-primary text-white">
            <Bus size={16} /> NOUVEAU VOYAGE
          </Button>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatItem label="Billets actifs" value={upcoming.length} icon={Ticket} color="text-primary" />
        <StatItem label="Colis envoyés" value={parcels.length} icon={Package} color="text-emerald-500" />
        <StatItem label="Voyages passés" value={past.length} icon={CalendarDays} color="text-blue-500" />
        <StatItem label="Annulations" value={cancelled.length} icon={X} color="text-red-400" />
      </div>

      <Tabs defaultValue="upcoming" className="w-full" onValueChange={() => setCurrentPage(1)}>
        <div className="overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl sm:rounded-2xl h-12 sm:h-14 flex w-max sm:w-fit mb-6 sm:mb-8 shadow-inner">
            <TabsTrigger value="upcoming" className="rounded-lg sm:rounded-xl px-3 sm:px-6 font-black uppercase text-[9px] sm:text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">À Venir ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg sm:rounded-xl px-3 sm:px-6 font-black uppercase text-[9px] sm:text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">Historique ({past.length})</TabsTrigger>
            <TabsTrigger value="cancelled" className="rounded-lg sm:rounded-xl px-3 sm:px-6 font-black uppercase text-[9px] sm:text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">Annulés ({cancelled.length})</TabsTrigger>
            <TabsTrigger value="parcels" className="rounded-lg sm:rounded-xl px-3 sm:px-6 font-black uppercase text-[9px] sm:text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">Mes Colis ({parcels.length})</TabsTrigger>
          </TabsList>
        </div>

        {loading ? (
            <div className="space-y-4"><Skeleton className="h-32 w-full rounded-[1.5rem] sm:rounded-[2rem] bg-slate-900" /><Skeleton className="h-32 w-full rounded-[1.5rem] sm:rounded-[2rem] bg-slate-900" /></div>
        ) : (
          <div className="mt-2">
            <TabsContent value="upcoming" className="space-y-6">
              <BookingList bookings={paginate(upcoming)} onCancel={handleCancel} showActions />
              <PaginationControls currentPage={currentPage} totalItems={upcoming.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
            </TabsContent>
            <TabsContent value="past" className="space-y-6">
              <BookingList bookings={paginate(past)} />
              <PaginationControls currentPage={currentPage} totalItems={past.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
            </TabsContent>
            <TabsContent value="cancelled" className="space-y-6">
              <BookingList bookings={paginate(cancelled)} />
              <PaginationControls currentPage={currentPage} totalItems={cancelled.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
            </TabsContent>
            <TabsContent value="parcels" className="space-y-6">
              <ParcelList parcels={paginate(parcels)} />
              <PaginationControls currentPage={currentPage} totalItems={parcels.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
            </TabsContent>
          </div>
        )}
      </Tabs>
    </div>
  );
}

function PaginationControls({ currentPage, totalItems, itemsPerPage, onPageChange }: any) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-3 mt-8 bg-slate-900 p-2 rounded-2xl border border-slate-800 w-fit mx-auto shadow-xl">
            <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="rounded-xl h-9 w-9 border border-slate-800 hover:bg-slate-800 text-slate-400">
                <ChevronLeft size={16} />
            </Button>
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500 px-2">Page {currentPage} / {totalPages}</span>
            <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-9 w-9 border border-slate-800 hover:bg-slate-800 text-slate-400">
                <ChevronRight size={16} />
            </Button>
        </div>
    );
}

function BookingList({ bookings, onCancel, showActions }: { bookings: Booking[], onCancel?: (id: string) => void, showActions?: boolean }) {
  const navigate = useNavigate();
  if (bookings.length === 0) return <EmptyState label="Aucune réservation trouvée" />;

  return (
    <div className="grid gap-4">
      {bookings.map(b => {
        // LOGIQUE D'ICÔNE MISE À JOUR POUR L'AVION
        const TransportIcon = b.transportTypeCode === 'BOAT' ? Ship : b.transportTypeCode === 'TRAIN' ? Train : b.transportTypeCode === 'PLANE' ? Plane : Bus;
        
        return (
          <div key={b.id} className="bg-slate-900 border-2 border-slate-800/50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-primary/20 transition-all group flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 overflow-hidden">
            <div className="flex items-center gap-4 sm:gap-5 flex-1 w-full overflow-hidden">
               <div className={`h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg ${
                 b.transportTypeCode === 'BOAT' ? 'bg-blue-600' : 
                 b.transportTypeCode === 'TRAIN' ? 'bg-slate-950 border border-slate-800' : 
                 b.transportTypeCode === 'PLANE' ? 'bg-indigo-600' : 
                 'bg-primary'}`}>
                  <TransportIcon size={20} className="sm:w-6 sm:h-6" />
               </div>
               <div className="overflow-hidden text-left">
                  <div className="flex items-center gap-2 font-black text-sm sm:text-lg text-slate-100 uppercase tracking-tighter truncate">
                     {b.departureCity} <ArrowRight size={12} className="text-primary opacity-30 shrink-0" /> {b.arrivalCity}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 sm:mt-1">
                     <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black uppercase h-4 sm:h-5 border-primary/20 text-primary bg-primary/5">{b.classLabel}</Badge>
                     <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase truncate">{b.companyName} • {new Date(b.departureDate).toLocaleDateString('fr-FR')}</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 border-t border-slate-800 sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
               <div className="text-left md:text-right md:mr-4 flex-1 md:flex-none">
                  <p className="text-[7px] sm:text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none">Montant</p>
                  <p className="font-black text-slate-100 text-sm sm:text-base mt-1">{b.amount.toLocaleString()} F</p>
               </div>
               <Button onClick={() => navigate(`/ticket/${b.id}`)} variant="outline" className="flex-1 md:flex-none h-10 sm:h-11 rounded-lg sm:rounded-xl border-slate-800 bg-slate-950 text-slate-300 font-black text-[9px] sm:text-[10px] uppercase gap-2 hover:bg-slate-800 hover:text-white transition-all">
                 <Eye size={14} /> Billet
               </Button>
               {showActions && b.status === 'Confirmé' && onCancel && (
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <Button variant="ghost" className="h-10 w-10 sm:h-11 sm:w-11 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg sm:rounded-xl transition-colors shrink-0"><X size={18}/></Button>
                   </AlertDialogTrigger>
                   <AlertDialogContent className="rounded-[2rem] sm:rounded-[2.5rem] w-[90vw] max-w-md bg-slate-900 border border-slate-800 text-white">
                     <AlertDialogHeader className="text-left">
                       <AlertDialogTitle className="font-black italic uppercase text-lg sm:text-xl text-white">Annuler le voyage ?</AlertDialogTitle>
                       <AlertDialogDescription className="font-medium text-slate-400 text-sm italic mt-2">Cette action est soumise aux conditions de remboursement de {b.companyName}.</AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
                       <AlertDialogCancel className="rounded-xl font-bold mt-0 bg-slate-800 border-none hover:bg-slate-700 text-white">RETOUR</AlertDialogCancel>
                       <AlertDialogAction onClick={() => onCancel(b.id)} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold border-none text-white">ANNULER BILLET</AlertDialogAction>
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

function ParcelList({ parcels }: { parcels: Parcel[] }) {
  if (parcels.length === 0) return <EmptyState label="Aucun colis enregistré" icon={Package} />;

  return (
    <div className="grid gap-4">
      {parcels.map(p => (
        <div key={p.id} className="bg-slate-900 border-2 border-slate-800/50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 hover:shadow-xl transition-all flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 overflow-hidden">
          <div className="flex items-center gap-4 sm:gap-5 flex-1 w-full text-left overflow-hidden">
             <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl sm:rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/20">
                <Package size={20} className="sm:w-6 sm:h-6" />
             </div>
             <div className="overflow-hidden">
                <div className="flex items-center gap-2 font-black text-sm sm:text-base text-slate-100 uppercase tracking-tighter mb-1 truncate">
                   {p.departureCity} ➔ {p.arrivalCity}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                   <Badge className="bg-slate-950 text-emerald-500 border border-emerald-500/20 text-[7px] sm:text-[8px] font-mono h-4 sm:h-5">{p.trackingNumber}</Badge>
                   <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase truncate">{p.status}</span>
                </div>
             </div>
          </div>
          <Link to={`/track?q=${p.trackingNumber}`} className="w-full md:w-auto">
             <Button variant="outline" className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl border-slate-800 bg-slate-950 text-slate-300 font-black text-[9px] sm:text-[10px] uppercase gap-2 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all">
               <Eye size={14} /> Suivre colis
             </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

function StatItem({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-slate-900 border-2 border-slate-800/50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl hover:border-primary/30 transition-all flex flex-col items-start group">
      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color} mb-2 sm:mb-3 group-hover:scale-110 transition-transform`} />
      <p className="text-xl sm:text-2xl font-black text-slate-100 leading-none mb-1">{value}</p>
      <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">{label}</p>
    </div>
  );
}

function EmptyState({ label, icon: Icon = Ticket }: any) {
  return (
    <div className="py-12 sm:py-20 text-center border-2 border-dashed border-slate-800 rounded-[2rem] sm:rounded-[3rem] bg-slate-900/40 px-4">
      <Icon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-slate-700 mb-4" />
      <p className="text-slate-500 font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] italic text-center">{label}</p>
    </div>
  );
}