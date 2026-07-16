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
  Eye, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type DashData = {
  companyName: string;
  todayDepartures: number;
  totalBookingsToday: number;
  totalRevenue: number;
  upcomingDepartures: {
    id: string;
    departureCode: string;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    departureTime: string;
    price: number;
    totalSeats: number;
    bookingCount: number;
    status: string;
  }[];
  recentBookings: {
    id: string;
    bookingNumber: string;
    passengerName: string;
    seatNumber: string;
    status: string;
    amount: number;
  }[];
};

export default function AgencyDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- ÉTATS POUR LA PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!user) return;

    const fetchAgencyData = async () => {
      try {
        const companyId = user.companyId || null;
        if (!companyId) {
          setError("Ce compte agent n'est rattaché à aucune compagnie de transport.");
          setLoading(false);
          return;
        }

        const { data: res, error } = await supabase.rpc('get_agency_dashboard_stats', {
          p_company_id: companyId
        });

        if (error) throw new Error(error.message);
        setData(res);
      } catch (e: any) {
        setError(e.message || 'Erreur lors du chargement des données.');
      } finally {
        setLoading(false);
      }
    };

    fetchAgencyData();
  }, [user]);

  // --- LOGIQUE DE PAGINATION ---
  const totalPages = useMemo(() => {
    if (!data) return 0;
    return Math.ceil(data.recentBookings.length / itemsPerPage);
  }, [data]);

  const currentBookings = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return data.recentBookings.slice(start, start + itemsPerPage);
  }, [data, currentPage]);

  if (loading) return <DashSkeleton />;
  if (error) return <div className="text-destructive p-8 text-left font-bold bg-red-50 rounded-3xl border-2 border-red-100">{error}</div>;
  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8">
      <div>
        <h1 className="text-3xl font-black italic text-slate-900 tracking-tight">{data.companyName}</h1>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tableau de bord agence</p>
      </div>

      {/* KPIs STYLE PROFESSIONNEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPI icon={CalendarDays} label="Départs aujourd'hui" value={data.todayDepartures} color="text-blue-600" bg="bg-blue-50" />
        <KPI icon={Ticket} label="Ventes du jour" value={data.totalBookingsToday} color="text-emerald-600" bg="bg-emerald-50" />
        <KPI icon={DollarSign} label="Chiffre d'affaires" value={`${data.totalRevenue.toLocaleString()} F`} color="text-primary" bg="bg-primary/5" />
      </div>

      {/* PROCHAINS DÉPARTS */}
      <div className="bg-card border-2 rounded-[2.5rem] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Prochains départs
          </h2>
          <Link to="/agency/departures">
            <Button variant="ghost" size="sm" className="font-bold text-primary hover:bg-primary/10">Voir tout</Button>
          </Link>
        </div>

        {data.upcomingDepartures.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed rounded-3xl text-muted-foreground italic">
            Aucun départ programmé
          </div>
        ) : (
          <div className="space-y-3">
            {data.upcomingDepartures.slice(0, 5).map(dep => (
              <div key={dep.id} className="bg-white border-2 border-slate-50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-primary/20 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    {dep.departureCity} <ArrowRight className="h-4 w-4 text-primary" /> {dep.arrivalCity}
                    <StatusBadge status={dep.status} />
                  </div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mt-1">
                    {dep.departureCode} • {new Date(dep.departureDate + 'T00:00:00').toLocaleDateString('fr-FR')} • {dep.departureTime}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-black text-primary">{dep.bookingCount}/{dep.totalSeats} PLACES</p>
                    <p className="text-[10px] font-bold text-slate-400">{dep.price.toLocaleString()} FCFA</p>
                  </div>
                  <Link to={`/agency/passengers/${dep.id}`}>
                    <Button variant="outline" size="sm" className="rounded-xl border-2 font-bold h-9">Manifeste</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DERNIÈRES RÉSERVATIONS AVEC PAGINATION */}
      <div className="bg-card border-2 rounded-[2.5rem] p-6 shadow-sm overflow-hidden">
        <h2 className="text-lg font-black uppercase tracking-tighter mb-6 px-2">Dernières réservations</h2>
        
        {data.recentBookings.length === 0 ? (
          <p className="text-muted-foreground text-sm py-12 text-center italic">Aucune réservation aujourd'hui</p>
        ) : (
          <>
            <div className="border rounded-2xl overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-black uppercase text-[10px] text-slate-500">N° Billet</th>
                    <th className="text-left p-4 font-black uppercase text-[10px] text-slate-500 hidden md:table-cell">Passager</th>
                    <th className="text-left p-4 font-black uppercase text-[10px] text-slate-500">Siège</th>
                    <th className="text-left p-4 font-black uppercase text-[10px] text-slate-500 text-center">Statut</th>
                    <th className="text-right p-4 font-black uppercase text-[10px] text-slate-500">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentBookings.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-primary">{b.bookingNumber}</td>
                      <td className="p-4 hidden md:table-cell font-bold text-slate-700">{b.passengerName}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className="font-black rounded-md">{b.seatNumber || '—'}</Badge>
                      </td>
                      <td className="p-4 text-center"><StatusBadge status={b.status} /></td>
                      <td className="p-4 text-right font-black text-slate-900">{b.amount.toLocaleString()} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CONTRÔLES DE PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="rounded-xl h-10 w-10 border hover:bg-slate-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-1 font-black text-xs uppercase tracking-widest text-slate-400">
                  <span className="text-primary">Page {currentPage}</span>
                  <span>sur</span>
                  <span>{totalPages}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="rounded-xl h-10 w-10 border hover:bg-slate-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="bg-white border-2 border-slate-50 rounded-[2rem] p-6 shadow-sm shadow-slate-100/50 flex items-center gap-5">
      <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
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
    'En attente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Confirmé': 'bg-green-100 text-green-800 border-green-200',
    'Terminé': 'bg-blue-100 text-blue-800 border-blue-200',
    'Remboursé': 'bg-slate-100 text-slate-800 border-slate-200',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${colors[status] || 'bg-muted border-slate-100'}`}>
      {status}
    </span>
  );
}

function DashSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-4 w-40 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-[2rem]" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-[2.5rem]" />
      <Skeleton className="h-96 w-full rounded-[2.5rem]" />
    </div>
  );
}