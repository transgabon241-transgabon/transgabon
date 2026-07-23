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
  Plane, // AJOUT DE L'ICÔNE AVION
  Hash,
  MapPin,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type DashData = {
  companyName: string;
  todayDepartures: number;
  totalBookingsToday: number;
  totalRevenue: number;
  upcomingDepartures: any[];
  recentBookings: any[];
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

  const totalPages = useMemo(() => {
    if (!data || !data.recentBookings) return 0;
    return Math.ceil(data.recentBookings.length / itemsPerPage);
  }, [data]);

  const currentBookings = useMemo(() => {
    if (!data || !data.recentBookings) return [];
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
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-700 bg-background text-foreground">
      
      {/* HEADER PREMIUM SOMBRE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none text-white">
            <Activity size={120} />
        </div>
        <div className="relative z-10 text-left">
          <p className="text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-2">Console Agence</p>
          <h1 className="text-2xl md:text-4xl font-black italic text-white tracking-tighter uppercase leading-none">{data.companyName || 'Mon Agence'}</h1>
          <p className="text-xs md:text-sm font-bold text-slate-500 mt-2">Suivi des flux de transport en temps réel.</p>
        </div>
      </div>

      {/* KPIs DYNAMIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPI icon={CalendarDays} label="Départs Jour" value={data.todayDepartures || 0} color="text-blue-400" bg="bg-blue-500/10" sub="Mouvements prévus" />
        <KPI icon={Ticket} label="Billets Vendus" value={data.totalBookingsToday || 0} color="text-emerald-400" bg="bg-emerald-500/10" sub="Aujourd'hui" />
        <KPI icon={TrendingUp} label="Recettes Jour" value={`${(data.totalRevenue || 0).toLocaleString()} F`} color="text-primary" bg="bg-primary/10" sub="Volume de caisse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PROCHAINS DÉPARTS - SOMBRE AVEC SUPPORT AVION */}
        <div className="bg-card border border-border rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-white">
              <Clock className="h-4 w-4 text-primary" /> Planning Immédiat
            </h2>
            <Link to="/agency/departures">
               <Button variant="ghost" size="sm" className="text-[10px] font-black text-primary hover:bg-primary/10 transition-colors">Détails</Button>
            </Link>
          </div>

          {(!data.upcomingDepartures || data.upcomingDepartures.length === 0) ? (
            <div className="p-12 text-center border-2 border-dashed border-border rounded-3xl bg-slate-950/40">
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Aucun départ programmé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.upcomingDepartures.slice(0, 3).map(dep => {
                 // LOGIQUE D'ICÔNE ET COULEUR POUR L'AVION
                 const Icon = dep.type === 'BOAT' ? Ship : dep.type === 'TRAIN' ? Train : dep.type === 'PLANE' ? Plane : Bus;
                 const iconBg = dep.type === 'BOAT' ? 'bg-blue-600' : dep.type === 'TRAIN' ? 'bg-slate-900 border border-slate-800' : dep.type === 'PLANE' ? 'bg-indigo-600' : 'bg-primary';

                 return (
                  <div key={dep.id} className="p-5 rounded-2xl bg-slate-950/50 border border-border hover:border-primary/40 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg ${iconBg}`}>
                                <Icon size={20} />
                            </div>
                            <div className="text-left">
                               <p className="text-[10px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20 tracking-tighter leading-none">
                                 <Hash size={10} className="inline mr-1" /> {dep.registration}
                               </p>
                            </div>
                         </div>
                         <StatusBadge status={dep.status} />
                      </div>
                      
                      <div className="flex items-center justify-between gap-4">
                         <div className="font-black text-slate-200 uppercase text-xs md:text-sm flex items-center gap-2 truncate text-left">
                            {dep.departureCity} <ArrowRight size={14} className="text-slate-600 shrink-0" /> {dep.arrivalCity}
                         </div>
                         <p className="font-black text-primary text-xs uppercase shrink-0">{dep.departureTime}</p>
                      </div>
                  </div>
                 )
              })}
            </div>
          )}
        </div>

        {/* DERNIÈRES VENTES - SOMBRE */}
        <div className="bg-card border border-border rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <h2 className="text-sm font-black uppercase tracking-widest mb-8 text-white text-left leading-none">Activité de Caisse</h2>
          
          {(!data.recentBookings || data.recentBookings.length === 0) ? (
             <div className="p-12 text-center border-2 border-dashed border-border rounded-3xl bg-slate-950/40">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Aucune transaction</p>
             </div>
          ) : (
            <div className="space-y-3">
               {currentBookings.map(b => (
                 <div key={b.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-border rounded-xl hover:shadow-lg transition-all group">
                    <div className="flex flex-col text-left min-w-0">
                       <span className="font-mono text-[10px] font-black text-primary group-hover:text-primary-foreground transition-colors truncate">{b.bookingNumber}</span>
                       <span className="font-bold text-white text-xs uppercase mt-1 truncate">{b.passengerName}</span>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="font-black text-slate-100 text-sm">{(b.amount || 0).toLocaleString()} F</p>
                       <div className="flex items-center justify-end gap-1 mt-1">
                          <MapPin size={10} className="text-slate-600" />
                          <span className="text-[8px] font-black text-slate-500 uppercase truncate max-w-[80px]">{b.destinationName || 'Terminus'}</span>
                       </div>
                    </div>
                 </div>
               ))}
               
               {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-6">
                    <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-9 w-9 rounded-lg border border-border bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"><ChevronLeft size={16}/></Button>
                    <span className="text-[9px] font-black text-slate-500 uppercase px-2">Page {currentPage} / {totalPages}</span>
                    <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-9 w-9 border border-border bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"><ChevronRight size={16}/></Button>
                  </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * COMPOSANT : KPI CARD HARMONISÉ
 */
function KPI({ icon: Icon, label, value, color, bg, sub }: any) {
  return (
    <div className="bg-card border border-border rounded-[1.5rem] md:rounded-[2rem] p-6 shadow-xl flex items-center gap-5 group hover:border-primary/20 transition-all">
      <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center shrink-0 border border-border shadow-inner group-hover:scale-110 transition-transform`}>
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

/**
 * COMPOSANT : STATUS BADGE SOMMET
 */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Programmé': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Embarquement': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Parti': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Arrivé': 'bg-slate-800 text-slate-400 border-slate-700',
    'Annulé': 'bg-red-500/10 text-red-400 border-red-500/20',
    'PAYE': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border shadow-sm ${colors[status] || 'bg-slate-900 border-slate-800 text-slate-600'}`}>
      {(status || '').replace('_', ' ')}
    </span>
  );
}

/**
 * SQUELETTE DE CHARGEMENT SOMBRE
 */
function DashSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 bg-background min-h-screen">
      <Skeleton className="h-32 w-full rounded-[2.5rem] bg-card border-border" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-[2rem] bg-card border-border" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-96 w-full rounded-[2.5rem] bg-card border-border" />
        <Skeleton className="h-96 w-full rounded-[2.5rem] bg-card border-border" />
      </div>
    </div>
  );
}