"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Ticket, 
  DollarSign, 
  UsersRound, 
  Building2, 
  TrendingUp, 
  MapPin, 
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Badge } from '@/components/ui/badge';

type DashData = {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  totalCompanies: number;
  monthlyRevenue: { month: string; revenue: number }[];
  bookingsByStatus: { status: string; count: number }[];
  revenueByCompany: { company: string; revenue: number; bookings: number }[];
  topRoutes: { route: string; bookings: number }[];
  recentBookings: {
    id: string;
    bookingNumber: string;
    passengerName: string;
    status: string;
    paymentStatus: string;
    amount: number;
    destinationName: string;
    classLabel: string;
  }[];
};

// Couleurs adaptées au mode sombre
const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1'];

export default function AdminDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: res, error } = await supabase.rpc('get_admin_dashboard_stats');
        if (error) throw error;
        setData(res);
      } catch (e: any) {
        console.error("Erreur stats:", e);
        setError(e.message || 'Erreur de chargement des statistiques.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <DashSkeleton />;
  if (error) return (
    <div className="p-8 bg-red-500/10 text-red-400 rounded-3xl border-2 border-red-500/20 font-bold text-center">
      {error}
    </div>
  );
  if (!data) return null;

  return (
    <div className="text-left space-y-8 animate-in fade-in duration-700 bg-background text-foreground">
      <div className="text-left">
        <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">Supervision Nationale</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Gabon Mobilité • Statistiques Globales</p>
      </div>

      {/* KPIs PREMIUM SOMBRES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI icon={DollarSign} label="Volume d'affaires" value={`${(data.totalRevenue || 0).toLocaleString()} F`} color="text-emerald-400" bg="bg-emerald-500/10" />
        <KPI icon={Ticket} label="Billets émis" value={data.totalBookings || 0} color="text-primary" bg="bg-primary/10" />
        <KPI icon={UsersRound} label="Membres actifs" value={data.totalUsers || 0} color="text-blue-400" bg="bg-blue-500/10" />
        <KPI icon={Building2} label="Transporteurs" value={data.totalCompanies || 0} color="text-slate-300" bg="bg-slate-800" />
      </div>

      {/* GRAPHIQUES */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* REVENUS MENSUELS SOMBRE */}
        <div className="bg-card border border-border rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2 text-white">
                <TrendingUp size={18} className="text-emerald-500" /> Croissance Mensuelle
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyRevenue || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${v/1000}k`} />
              <Tooltip 
                cursor={{fill: '#0f172a'}}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '15px', border: '1px solid #1e293b', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* RÉPARTITION STATUTS SOMBRE */}
        <div className="bg-card border border-border rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <h3 className="font-black uppercase text-xs tracking-widest mb-8 text-white">État des Réservations</h3>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ResponsiveContainer width="100%" height={250} className="max-w-[220px]">
              <PieChart>
                <Pie data={data.bookingsByStatus || []} dataKey="count" nameKey="status" innerRadius={60} outerRadius={100} paddingAngle={5}>
                  {(data.bookingsByStatus || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 flex-1 w-full">
              {(data.bookingsByStatus || []).map((s, i) => (
                <div key={s.status} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-border">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[10px] font-black uppercase text-slate-400">{(s.status || '').replace('_', ' ')}</span>
                  </div>
                  <span className="font-black text-sm text-white">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PERFORMANCE AGENCES & TRAJETS */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <h3 className="font-black uppercase text-xs tracking-widest mb-6 text-white text-left">Top Transporteurs (CA)</h3>
          <div className="space-y-6">
            {(data.revenueByCompany || []).slice(0, 5).map((c, i) => {
              const max = data.revenueByCompany?.[0]?.revenue || 1;
              return (
                <div key={c.company} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-lg bg-slate-950 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-black">{i+1}</span>
                        <span className="font-bold text-sm text-slate-200 uppercase">{c.company}</span>
                    </div>
                    <span className="text-xs font-black text-primary">{(c.revenue || 0).toLocaleString()} F</span>
                  </div>
                  <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(var(--primary),0.5)]" style={{ width: `${(c.revenue / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <h3 className="font-black uppercase text-xs tracking-widest mb-6 text-white text-left">Axes les plus fréquentés</h3>
          <div className="space-y-3">
            {(data.topRoutes || []).map((r) => (
              <div key={r.route} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-border group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4 text-left">
                  <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 text-primary group-hover:scale-110 transition-transform">
                    <MapPin size={18} />
                  </div>
                  <span className="text-sm font-black text-slate-200 uppercase italic tracking-tighter">{r.route}</span>
                </div>
                <div className="text-right">
                   <p className="text-sm font-black text-white">{r.bookings}</p>
                   <p className="text-[8px] font-bold text-slate-500 uppercase">Voyages</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DERNIÈRES RÉSERVATIONS SOMBRE */}
      <div className="bg-card border border-border rounded-[2.5rem] p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-8">
            <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2 text-white">
                <Activity size={18} className="text-primary" /> Transactions Récentes
            </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-black uppercase text-[10px] text-slate-500">Billet / Passager</th>
                <th className="p-4 font-black uppercase text-[10px] text-slate-500">Destination</th>
                <th className="p-4 font-black uppercase text-[10px] text-slate-500 text-center">Confort</th>
                <th className="p-4 font-black uppercase text-[10px] text-slate-500 text-center">Statut</th>
                <th className="p-4 font-black uppercase text-[10px] text-white text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(data.recentBookings || []).map(b => (
                <tr key={b.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="p-4 text-left">
                    <p className="font-mono font-black text-primary text-xs tracking-tighter">{b.bookingNumber}</p>
                    <p className="text-xs font-bold text-slate-200 uppercase mt-1 truncate max-w-[150px]">{b.passengerName}</p>
                  </td>
                  <td className="p-4 text-left">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
                        <MapPin size={12} className="text-primary/50" /> {b.destinationName}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                     <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary bg-primary/5 px-2">
                        {(b.classLabel || 'Standard').replace('_', ' ')}
                     </Badge>
                  </td>
                  <td className="p-4 text-center">
                     <StatusBadge value={b.status} />
                  </td>
                  <td className="p-4 text-right font-black text-white text-base tracking-tighter">
                    {(b.amount || 0).toLocaleString()} F
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="bg-card border border-border rounded-[2rem] p-6 shadow-xl flex items-center gap-5 group hover:border-primary/30 transition-all">
      <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center shrink-0 border border-border shadow-inner group-hover:scale-110 transition-transform`}>
        <Icon className={`h-7 w-7 ${color}`} />
      </div>
      <div className="text-left">
        <div className="text-2xl font-black tracking-tight text-white leading-none mb-1">{value}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    'PAYE': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'ATTENTE_PAIEMENT': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'ANNULE': 'bg-red-500/10 text-red-400 border-red-500/20',
    'REMBOURSE': 'bg-slate-800 text-slate-400 border-slate-700',
  };
  return <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${colors[value] || 'bg-slate-900 border-slate-800'}`}>{(value || '').replace('_', ' ')}</span>;
}

function DashSkeleton() {
  return (
    <div className="space-y-8 text-left bg-background min-h-screen">
      <div className="h-12 w-64 bg-card rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-[2rem] bg-card border-border" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-8">
        <Skeleton className="h-[400px] rounded-[2.5rem] bg-card border-border" />
        <Skeleton className="h-[400px] rounded-[2.5rem] bg-card border-border" />
      </div>
    </div>
  );
}