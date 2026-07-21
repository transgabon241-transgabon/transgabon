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
  DollarSign, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Train,
  Bus,
  Ship,
  Hash,
  MapPin,
  TrendingUp,
  Activity,
  Package // Icone pour le fret
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
  if (error) return <div className="p-10 bg-red-50 text-red-600 rounded-[2.5rem] border-2 border-red-100 font-black uppercase text-xs text-center">{error}</div>;
  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER PREMIUM AVEC ACCÈS FRET POUR LA CAISSIÈRE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <Activity size={120} />
        </div>
        <div className="relative z-10 flex-1">
          <p className="text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-2">Console Agence</p>
          <h1 className="text-4xl font-black italic text-slate-900 tracking-tighter uppercase leading-none">{data.companyName || 'Mon Agence'}</h1>
          <p className="text-sm font-bold text-slate-400 mt-2">Suivi des flux de transport et logistique.</p>
        </div>

        {/* BOUTON D'ACCÈS RAPIDE FRET (Pour Caissière & Agents) */}
        <div className="relative z-10">
            {['Agent', 'Caissier', 'Service Colis', 'Administrateur'].includes(user?.role || '') && (
                <Link to="/agency/parcels">
                    <Button className="rounded-2xl font-black bg-slate-900 text-white hover:bg-black h-14 px-8 gap-3 shadow-2xl transition-all active:scale-95">
                        <Package size={20} className="text-primary" />
                        <div className="flex flex-col items-start leading-none text-left">
                            <span className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Module</span>
                            <span className="text-xs uppercase tracking-tighter">Logistique Fret</span>
                        </div>
                    </Button>
                </Link>
            )}
        </div>
      </div>

      {/* KPIs DYNAMIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPI icon={CalendarDays} label="Départs Jour" value={data.todayDepartures || 0} color="text-blue-600" bg="bg-blue-50" sub="Mouvements prévus" />
        <KPI icon={Ticket} label="Billets Vendus" value={data.totalBookingsToday || 0} color="text-emerald-600" bg="bg-emerald-50" sub="Aujourd'hui" />
        <KPI icon={TrendingUp} label="Recettes Jour" value={`${(data.totalRevenue || 0).toLocaleString()} F`} color="text-primary" bg="bg-primary/5" sub="Volume de caisse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PROCHAINS DÉPARTS */}
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-900">
              <Clock className="h-4 w-4 text-primary" /> Planning Immédiat
            </h2>
            <Link to="/agency/departures">
               <Button variant="ghost" size="sm" className="text-[10px] font-black text-primary hover:bg-primary/5">Détails</Button>
            </Link>
          </div>

          {(!data.upcomingDepartures || data.upcomingDepartures.length === 0) ? (
            <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-slate-50">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucun départ programmé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.upcomingDepartures.slice(0, 3).map(dep => {
                 const Icon = dep.type === 'BOAT' ? Ship : dep.type === 'TRAIN' ? Train : Bus;
                 return (
                  <div key={dep.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary/30 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg ${dep.type === 'BOAT' ? 'bg-blue-600' : dep.type === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'}`}>
                                <Icon size={20} />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded border border-primary/10 tracking-tighter">
                                 <Hash size={10} className="inline mr-1" /> {dep.registration}
                               </p>
                            </div>
                         </div>
                         <StatusBadge status={dep.status} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                         <div className="font-black text-slate-900 uppercase text-sm flex items-center gap-2">
                            {dep.departureCity} <ArrowRight size={14} className="text-slate-300" /> {dep.arrivalCity}
                         </div>
                         <p className="font-black text-primary text-xs uppercase">{dep.departureTime}</p>
                      </div>
                  </div>
                 )
              })}
            </div>
          )}
        </div>

        {/* DERNIÈRES VENTES */}
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50">
          <h2 className="text-sm font-black uppercase tracking-widest mb-8 text-slate-900">Activité de Caisse</h2>
          
          {(!data.recentBookings || data.recentBookings.length === 0) ? (
             <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-slate-50">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucune transaction</p>
             </div>
          ) : (
            <div className="space-y-4">
               {currentBookings.map(b => (
                 <div key={b.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all">
                    <div className="flex flex-col">
                       <span className="font-mono text-[10px] font-black text-primary">{b.bookingNumber}</span>
                       <span className="font-bold text-slate-900 text-xs uppercase mt-1">{b.passengerName}</span>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-slate-900 text-sm">{(b.amount || 0).toLocaleString()} F</p>
                       <div className="flex items-center justify-end gap-1 mt-1">
                          <MapPin size={10} className="text-slate-300" />
                          <span className="text-[8px] font-black text-slate-400 uppercase">{b.destinationName || 'Terminus'}</span>
                       </div>
                    </div>
                 </div>
               ))}
               
               {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 rounded-lg border-2 bg-white"><ChevronLeft size={14}/></Button>
                    <span className="text-[9px] font-black text-slate-400">PAGE {currentPage} / {totalPages}</span>
                    <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 rounded-lg border-2 bg-white"><ChevronRight size={14}/></Button>
                  </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color, bg, sub }: any) {
  return (
    <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-5 group hover:scale-[1.02] transition-transform">
      <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center shrink-0 border-2 border-white shadow-inner`}>
        <Icon className={`h-7 w-7 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-900 opacity-70 tracking-widest leading-none mb-2">{label}</p>
        <div className={`text-2xl font-black tracking-tighter leading-none ${color}`}>{value}</div>
        <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase italic">{sub}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Programmé': 'bg-blue-50 text-blue-600 border-blue-100',
    'Embarquement': 'bg-orange-50 text-orange-600 border-orange-100',
    'Parti': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Arrivé': 'bg-slate-50 text-slate-600 border-slate-200',
    'Annulé': 'bg-red-50 text-red-600 border-red-100',
    'PAYE': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border-2 ${colors[status] || 'bg-muted'}`}>
      {(status || '').replace('_', ' ')}
    </span>
  );
}

function DashSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <Skeleton className="h-32 w-full rounded-[2.5rem]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-[2rem]" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-96 w-full rounded-[2.5rem]" />
        <Skeleton className="h-96 w-full rounded-[2.5rem]" />
      </div>
    </div>
  );
}