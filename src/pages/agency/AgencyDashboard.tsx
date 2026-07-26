"use client"

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, 
  Ticket, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Train,
  Bus,
  Ship,
  Plane,
  Hash,
  MapPin,
  TrendingUp,
  Activity,
  Package,
  Box,
  Truck,
  Wallet,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type DashData = {
  companyName: string;
  // Stats Passagers
  todayDepartures: number;
  totalBookingsToday: number;
  totalRevenue: number;
  // Stats Colis (Ajoutées)
  totalParcelsToday: number;
  totalParcelRevenueToday: number;
  pendingParcelsCount: number;
  // Listes
  upcomingDepartures: any[];
  recentBookings: any[];
  recentParcels: any[]; // Ajouté
};

export default function AgencyDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!user) return;

    const fetchAgencyData = async () => {
      try {
        const companyId = user.companyId || null;
        if (!companyId) {
          setError("Ce compte agent n'est rattaché à aucune compagnie.");
          setLoading(false);
          return;
        }

        // On appelle la fonction RPC qui doit maintenant retourner aussi les stats colis
        const { data: res, error: rpcError } = await supabase.rpc('get_agency_dashboard_stats', {
          p_company_id: companyId
        });

        if (rpcError) throw rpcError;
        setData(res);
      } catch (e: any) {
        console.error("Erreur dashboard:", e);
        setError(e.message || 'Erreur lors du chargement des statistiques.');
      } finally {
        setLoading(false);
      }
    };

    fetchAgencyData();
  }, [user]);

  // Pagination pour les réservations
  const currentBookings = useMemo(() => {
    if (!data?.recentBookings) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return data.recentBookings.slice(start, start + itemsPerPage);
  }, [data, currentPage]);

  if (loading) return <DashSkeleton />;
  if (error) return (
    <div className="p-10 bg-red-500/10 text-red-400 rounded-[2.5rem] border-2 border-red-500/20 font-black uppercase text-xs text-center max-w-2xl mx-auto my-10">
      {error}
    </div>
  );
  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-700 bg-background text-foreground pb-20">
      
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 md:p-8 rounded-[2rem] border-2 border-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none text-white">
            <Activity size={120} />
        </div>
        <div className="relative z-10 text-left">
          <p className="text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-2">Tableau de Bord Direction</p>
          <h1 className="text-2xl md:text-4xl font-black italic text-white tracking-tighter uppercase leading-none">{data.companyName}</h1>
          <p className="text-xs md:text-sm font-bold text-slate-500 mt-2">Vue consolidée : Voyageurs & Fret</p>
        </div>
        <div className="relative z-10 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
           <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Chiffre d'Affaires Global Jour</p>
           <p className="text-2xl font-black text-emerald-500 tracking-tighter">
            {((data.totalRevenue || 0) + (data.totalParcelRevenueToday || 0)).toLocaleString()} F
           </p>
        </div>
      </div>

      {/* SECTION KPIs VOYAGEURS */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2 flex items-center gap-2">
            <Users size={14} className="text-primary"/> Flux Voyageurs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPI icon={CalendarDays} label="Mouvements" value={data.todayDepartures || 0} color="text-blue-400" bg="bg-blue-500/10" sub="Départs aujourd'hui" />
            <KPI icon={Ticket} label="Billets" value={data.totalBookingsToday || 0} color="text-emerald-400" bg="bg-emerald-500/10" sub="Ventes confirmées" />
            <KPI icon={TrendingUp} label="Recettes Billets" value={`${(data.totalRevenue || 0).toLocaleString()} F`} color="text-primary" bg="bg-primary/10" sub="Encaissé en agence/ligne" />
        </div>
      </div>

      {/* SECTION KPIs FRET */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2 flex items-center gap-2">
            <Package size={14} className="text-amber-500"/> Flux Logistique
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPI icon={Box} label="Colis Reçus" value={data.totalParcelsToday || 0} color="text-amber-400" bg="bg-amber-500/10" sub="Enregistrés ce jour" />
            <KPI icon={Truck} label="En Attente" value={data.pendingParcelsCount || 0} color="text-purple-400" bg="bg-purple-500/10" sub="Colis au dépôt" />
            <KPI icon={Wallet} label="Recettes Fret" value={`${(data.totalParcelRevenueToday || 0).toLocaleString()} F`} color="text-emerald-500" bg="bg-emerald-500/10" sub="Chiffre d'affaires colis" />
        </div>
      </div>

      {/* GRILLE D'ACTIVITÉ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PLANNING DÉPARTS */}
        <div className="bg-card border border-border rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-white text-left">
              <Clock className="h-4 w-4 text-primary" /> Prochains Départs
            </h2>
          </div>

          <div className="space-y-4">
            {data.upcomingDepartures?.length > 0 ? (
              data.upcomingDepartures.slice(0, 4).map(dep => {
                 const Icon = dep.type === 'BOAT' ? Ship : dep.type === 'TRAIN' ? Train : dep.type === 'PLANE' ? Plane : Bus;
                 return (
                  <div key={dep.id} className="p-4 rounded-2xl bg-slate-950/50 border border-border hover:border-primary/40 transition-all group">
                      <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-primary border border-border">
                                <Icon size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                                {dep.registration}
                            </span>
                         </div>
                         <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0 border-primary/30 text-primary">
                            {dep.departureTime}
                         </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-black text-white uppercase">
                         <span className="truncate">{dep.departureCity}</span>
                         <ArrowRight size={12} className="text-slate-600 shrink-0" />
                         <span className="text-primary truncate">{dep.arrivalCity}</span>
                      </div>
                  </div>
                 )
              })
            ) : (
                <EmptyState message="Aucun départ imminent" />
            )}
          </div>
        </div>

        {/* DERNIÈRES TRANSACTIONS (MIXTE) */}
        <div className="bg-card border border-border rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <h2 className="text-sm font-black uppercase tracking-widest mb-8 text-white text-left">Transactions Récentes</h2>
          
          <div className="space-y-3">
             {currentBookings.length > 0 ? (
               currentBookings.map(b => (
                 <div key={b.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-border rounded-xl group">
                    <div className="flex flex-col text-left min-w-0">
                       <span className="font-mono text-[9px] font-black text-primary uppercase">REF: {b.bookingNumber}</span>
                       <span className="font-bold text-white text-xs uppercase mt-1 truncate">{b.passengerName}</span>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="font-black text-emerald-400 text-sm">{b.amount.toLocaleString()} F</p>
                       <span className="text-[7px] font-black text-slate-600 uppercase bg-slate-900 px-1.5 py-0.5 rounded">BILLET</span>
                    </div>
                 </div>
               ))
             ) : (
                <EmptyState message="Aucune vente récente" />
             )}
             
             {/* LIEN VERS LES RAPPORTS */}
             <div className="pt-4 grid grid-cols-2 gap-4">
                <Link to="/agency/bookings" className="w-full">
                    <Button variant="outline" className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-800 hover:bg-slate-800 text-slate-400">Rapport Ventes</Button>
                </Link>
                <Link to="/agency/parcels" className="w-full">
                    <Button variant="outline" className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-800 hover:bg-slate-800 text-slate-400">Rapport Colis</Button>
                </Link>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color, bg, sub }: any) {
  return (
    <div className="bg-card border border-border rounded-[2rem] p-6 shadow-xl flex items-center gap-5 group hover:border-primary/20 transition-all">
      <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center shrink-0 border border-white/5 shadow-inner group-hover:scale-110 transition-transform`}>
        <Icon className={`h-7 w-7 ${color}`} />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-2">{label}</p>
        <div className={`text-2xl font-black tracking-tighter leading-none ${color}`}>{value}</div>
        <p className="text-[9px] font-bold text-slate-600 mt-2 uppercase italic leading-none">{sub}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-3xl bg-slate-950/40">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">{message}</p>
        </div>
    )
}

function DashSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 bg-background min-h-screen">
      <Skeleton className="h-40 w-full rounded-[2.5rem] bg-card border-border" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-[2rem] bg-card border-border" />)}
      </div>
    </div>
  );
}