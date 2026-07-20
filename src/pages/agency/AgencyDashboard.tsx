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
  MapPin
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
        console.error("Erreur chargement dashboard:", e);
        setError(e.message || 'Erreur lors du chargement.');
      } finally {
        setLoading(false);
      }
    };

    fetchAgencyData();
  }, [user]);

  // --- LOGIQUE DE PAGINATION SÉCURISÉE ---
  const totalPages = useMemo(() => {
    // Sécurité : si data est null ou si recentBookings est null, on renvoie 0
    if (!data || !data.recentBookings) return 0;
    return Math.ceil(data.recentBookings.length / itemsPerPage);
  }, [data]);

  const currentBookings = useMemo(() => {
    // Sécurité : si data ou recentBookings est null, on renvoie un tableau vide
    if (!data || !data.recentBookings) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return data.recentBookings.slice(start, start + itemsPerPage);
  }, [data, currentPage]);

  if (loading) return <DashSkeleton />;
  if (error) return <div className="p-8 bg-red-50 text-red-600 rounded-3xl border-2 border-red-100 font-bold">{error}</div>;
  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black italic text-slate-900 tracking-tight">{data.companyName || 'Mon Agence'}</h1>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tableau de bord agence</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPI icon={CalendarDays} label="Départs aujourd'hui" value={data.todayDepartures || 0} color="text-blue-600" bg="bg-blue-50" />
        <KPI icon={Ticket} label="Ventes du jour" value={data.totalBookingsToday || 0} color="text-emerald-600" bg="bg-emerald-50" />
        <KPI icon={DollarSign} label="Chiffre d'affaires" value={`${(data.totalRevenue || 0).toLocaleString()} F`} color="text-primary" bg="bg-primary/5" />
      </div>

      {/* PROCHAINS DÉPARTS */}
      <div className="bg-card border-2 rounded-[2.5rem] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Prochains départs
          </h2>
          <Link to="/agency/departures">
            <Button variant="ghost" size="sm" className="font-bold text-primary">Voir tout</Button>
          </Link>
        </div>

        {(!data.upcomingDepartures || data.upcomingDepartures.length === 0) ? (
          <div className="p-10 text-center border-2 border-dashed rounded-3xl text-muted-foreground italic uppercase text-[10px] font-bold">Aucun départ programmé</div>
        ) : (
          <div className="space-y-3">
            {data.upcomingDepartures.slice(0, 5).map(dep => {
               const Icon = dep.type === 'BOAT' ? Ship : dep.type === 'TRAIN' ? Train : Bus;
               return (
                <div key={dep.id} className="bg-white border-2 border-slate-50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white ${dep.type === 'BOAT' ? 'bg-blue-600' : dep.type === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'}`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 font-bold text-slate-800 uppercase text-sm">
                                {dep.departureCity} <ArrowRight className="h-3 w-3 text-slate-300" /> {dep.arrivalCity}
                                <StatusBadge status={dep.status} />
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                                <span className="flex items-center gap-1 text-primary"><Hash size={10} /> {dep.registration}</span>
                                <span>•</span>
                                <span>{dep.departureTime}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 justify-between md:justify-end">
                        <div className="text-right">
                            <p className="text-xs font-black text-primary">{dep.bookingCount}/{dep.totalSeats} PLACES</p>
                        </div>
                        <Link to={`/agency/passengers/${dep.id}`}>
                            <Button variant="outline" size="sm" className="rounded-xl border-2 font-bold h-9">Manifeste</Button>
                        </Link>
                    </div>
                </div>
               )
            })}
          </div>
        )}
      </div>

      {/* DERNIÈRES RÉSERVATIONS */}
      <div className="bg-card border-2 rounded-[2.5rem] p-6 shadow-sm overflow-hidden">
        <h2 className="text-lg font-black uppercase tracking-tighter mb-6 px-2">Dernières transactions</h2>
        
        {(!data.recentBookings || data.recentBookings.length === 0) ? (
          <p className="text-muted-foreground text-sm py-12 text-center italic uppercase font-bold text-[10px] tracking-widest">Aucune vente aujourd'hui</p>
        ) : (
          <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-black uppercase text-[10px] text-slate-500">Billet / Passager</th>
                    <th className="text-left p-4 font-black uppercase text-[10px] text-slate-500">Destination</th>
                    <th className="text-left p-4 font-black uppercase text-[10px] text-slate-500">Classe</th>
                    <th className="text-center p-4 font-black uppercase text-[10px] text-slate-500">Statut</th>
                    <th className="text-right p-4 font-black uppercase text-[10px] text-slate-500">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentBookings.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <p className="font-mono font-bold text-primary text-xs">{b.bookingNumber}</p>
                        <p className="text-xs font-bold text-slate-700 mt-1 uppercase">{b.passengerName}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                            <MapPin size={10} /> {b.destinationName}
                        </div>
                      </td>
                      <td className="p-4">
                         <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary">
                            {(b.classLabel || 'Std').replace('_', ' ')}
                         </Badge>
                      </td>
                      <td className="p-4 text-center"><StatusBadge status={b.status} /></td>
                      <td className="p-4 text-right font-black text-slate-900">{(b.amount || 0).toLocaleString()} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* CONTRÔLES DE PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8 bg-slate-100 p-2 rounded-2xl w-fit mx-auto border-2 border-white shadow-sm">
                  <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border bg-white"><ChevronLeft size={18}/></Button>
                  <div className="flex items-center gap-1 font-black text-[10px] uppercase text-slate-400 px-4">
                    <span className="text-primary">{currentPage}</span>
                    <span>/</span>
                    <span>{totalPages}</span>
                  </div>
                  <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border bg-white"><ChevronRight size={18}/></Button>
                </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="bg-white border-2 border-slate-50 rounded-[2rem] p-6 shadow-sm shadow-slate-100/50 flex items-center gap-5 hover:scale-[1.02] transition-transform">
      <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center shrink-0 border border-white shadow-inner`}>
        <Icon className={`h-7 w-7 ${color}`} />
      </div>
      <div>
        <div className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">{value}</div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Programmé': 'bg-blue-100 text-blue-800 border-blue-200',
    'Embarquement': 'bg-orange-100 text-orange-800 border-orange-200',
    'Parti': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Arrivé': 'bg-green-100 text-green-800 border-green-200',
    'Annulé': 'bg-red-100 text-red-800 border-red-200',
    'PAYE': 'bg-emerald-100 text-emerald-700 border-emerald-100',
    'ATTENTE_PAIEMENT': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'REMBOURSE': 'bg-slate-100 text-slate-800 border-slate-200',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${colors[status] || 'bg-muted border-slate-100'}`}>
      {(status || '').replace('_', ' ')}
    </span>
  );
}

function DashSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-[2rem]" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-[2.5rem]" />
      <Skeleton className="h-96 w-full rounded-[2.5rem]" />
    </div>
  );
}