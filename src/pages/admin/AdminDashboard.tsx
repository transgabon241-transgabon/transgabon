"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Skeleton } from '@/components/ui/skeleton';
import { Ticket, DollarSign, UsersRound, Building2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
    paymentMethod: string;
    amount: number;
  }[];
};

const PIE_COLORS = [
  'hsl(152, 55%, 38%)', 'hsl(40, 95%, 55%)', 'hsl(200, 65%, 50%)',
  'hsl(280, 55%, 55%)', 'hsl(15, 80%, 55%)', 'hsl(180, 50%, 45%)',
];

export default function AdminDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Interrogation de la fonction RPC analytique optimisée
        const { data: res, error } = await supabase.rpc('get_admin_dashboard_stats');
        
        if (error) throw new Error(error.message);
        setData(res);
      } catch (e: any) {
        setError(e.message || 'Erreur lors de la récupération des données.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <DashSkeleton />;
  if (error) return <div className="text-destructive p-8 text-left">{error}</div>;
  if (!data) return null;

  return (
    <div className="text-foreground text-left">
      <h1 className="text-2xl font-bold mb-1">Tableau de bord</h1>
      <p className="text-muted-foreground mb-6">Vue d&apos;ensemble de la plateforme GabonTransport</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI icon={Ticket} label="Réservations" value={data.totalBookings} />
        <KPI icon={DollarSign} label="Chiffre d&apos;affaires" value={`${data.totalRevenue.toLocaleString()} FCFA`} />
        <KPI icon={UsersRound} label="Voyageurs" value={data.totalUsers} />
        <KPI icon={Building2} label="Compagnies" value={data.totalCompanies} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly revenue chart */}
        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Revenus mensuels</h3>
          {data.monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.monthlyRevenue}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} FCFA`, 'Revenu']} />
                <Bar dataKey="revenue" fill="hsl(152, 55%, 38%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12 text-sm">Aucune donnée disponible</p>
          )}
        </div>

        {/* Bookings by status pie */}
        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Réservations par statut</h3>
          {data.bookingsByStatus.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={250} className="max-w-[200px]">
                <PieChart>
                  <Pie data={data.bookingsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                    {data.bookingsByStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Réservations']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {data.bookingsByStatus.map((s, i) => (
                  <div key={s.status} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{s.status}</span>
                    <span className="font-semibold ml-auto">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12 text-sm">Aucune donnée</p>
          )}
        </div>
      </div>

      {/* Revenue by company & Top routes */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Revenus par compagnie</h3>
          <div className="space-y-3">
            {data.revenueByCompany.slice(0, 8).map(c => {
              const maxRev = data.revenueByCompany[0]?.revenue || 1;
              const pct = maxRev > 0 ? (c.revenue / maxRev) * 100 : 0;
              return (
                <div key={c.company}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{c.company}</span>
                    <span className="text-muted-foreground">{c.revenue.toLocaleString()} FCFA ({c.bookings} rés.)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {data.revenueByCompany.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Aucune donnée</p>}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Trajets les plus demandés</h3>
          <div className="space-y-3">
            {data.topRoutes.map((r, i) => (
              <div key={r.route} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <span className="text-sm font-medium">{r.route}</span>
                </div>
                <span className="text-sm text-muted-foreground">{r.bookings} réservations</span>
              </div>
            ))}
            {data.topRoutes.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Aucune donnée</p>}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-semibold mb-4">Dernières réservations</h3>
        {data.recentBookings.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Aucune réservation</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">N° Billet</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Passager</th>
                  <th className="text-left p-3 font-medium">Statut</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Paiement</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Méthode</th>
                  <th className="text-right p-3 font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map(b => (
                  <tr key={b.id} className="border-t hover:bg-muted/30 text-left">
                    <td className="p-3 font-mono text-xs">{b.bookingNumber}</td>
                    <td className="p-3 hidden md:table-cell">{b.passengerName}</td>
                    <td className="p-3"><StatusBadge value={b.status} /></td>
                    <td className="p-3 hidden md:table-cell"><PayBadge value={b.paymentStatus} /></td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{b.paymentMethod}</td>
                    <td className="p-3 text-right font-medium">{b.amount.toLocaleString()} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    'En attente': 'bg-yellow-100 text-yellow-800',
    'Confirmé': 'bg-green-100 text-green-800',
    'Annulé': 'bg-red-100 text-red-800',
    'Terminé': 'bg-blue-100 text-blue-800',
    'Remboursé': 'bg-gray-100 text-gray-800',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[value] || 'bg-muted'}`}>{value}</span>;
}

function PayBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    'Payé': 'bg-green-100 text-green-800',
    'Non payé': 'bg-red-100 text-red-800',
    'Remboursé': 'bg-gray-100 text-gray-800',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[value] || 'bg-muted'}`}>{value}</span>;
}

function DashSkeleton() {
  return (
    <div className="text-left">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-64 mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}