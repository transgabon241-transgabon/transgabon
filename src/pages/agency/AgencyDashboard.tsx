"use client"

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Ticket, DollarSign, Bus, ArrowRight, Eye } from 'lucide-react';
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

        // Appel de la fonction RPC analytique d'agence
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

  if (loading) return <DashSkeleton />;
  if (error) return <div className="text-destructive p-8 text-left">{error}</div>;
  if (!data) return null;

  return (
    <div className="text-foreground text-left">
      <h1 className="text-2xl font-bold mb-1">{data.companyName}</h1>
      <p className="text-muted-foreground mb-6">Tableau de bord agence</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <KPI icon={CalendarDays} label="Départs aujourd'hui" value={data.todayDepartures} />
        <KPI icon={Ticket} label="Réservations du jour" value={data.totalBookingsToday} />
        <KPI icon={DollarSign} label="Revenus totaux" value={`${data.totalRevenue.toLocaleString()} FCFA`} />
      </div>

      {/* Upcoming departures */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Prochains départs</h2>
          <Link to="/agency/departures"><Button variant="outline" size="sm">Gérer</Button></Link>
        </div>
        {data.upcomingDepartures.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Aucun départ à venir</p>
        ) : (
          <div className="space-y-3">
            {data.upcomingDepartures.slice(0, 5).map(dep => (
              <div key={dep.id} className="border rounded-xl bg-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    {dep.departureCity} <ArrowRight className="h-4 w-4 text-primary" /> {dep.arrivalCity}
                    <StatusBadge status={dep.status} />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {dep.departureCode} • {new Date(dep.departureDate + 'T00:00:00').toLocaleDateString('fr-FR')} à {dep.departureTime}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm justify-between md:justify-end">
                  <span>{dep.bookingCount}/{dep.totalSeats} passagers</span>
                  <span className="font-semibold text-primary">{dep.price.toLocaleString()} FCFA</span>
                  <Link to={`/agency/passengers/${dep.id}`}>
                    <Button variant="outline" size="sm" className="gap-1"><Eye className="h-3 w-3" /> Passagers</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent bookings */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Dernières réservations</h2>
        {data.recentBookings.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Aucune réservation</p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">N° Billet</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Passager</th>
                  <th className="text-left p-3 font-medium">Siège</th>
                  <th className="text-left p-3 font-medium">Statut</th>
                  <th className="text-right p-3 font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map(b => (
                  <tr key={b.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{b.bookingNumber}</td>
                    <td className="p-3 hidden md:table-cell">{b.passengerName}</td>
                    <td className="p-3">{b.seatNumber || '—'}</td>
                    <td className="p-3"><StatusBadge status={b.status} /></td>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Programmé': 'bg-blue-100 text-blue-800',
    'Embarquement': 'bg-orange-100 text-orange-800',
    'Parti': 'bg-emerald-100 text-emerald-800',
    'Arrivé': 'bg-green-100 text-green-800',
    'Annulé': 'bg-red-100 text-red-800',
    'En attente': 'bg-yellow-100 text-yellow-800',
    'Confirmé': 'bg-green-100 text-green-800',
    'Terminé': 'bg-blue-100 text-blue-800',
    'Remboursé': 'bg-gray-100 text-gray-800',
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-muted'}`}>{status}</span>;
}

function DashSkeleton() {
  return (
    <div className="text-left">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-32 mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-6 w-40 mb-4" />
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl mb-3" />)}
    </div>
  );
}