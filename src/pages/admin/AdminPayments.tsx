"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreditCard, Search, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

type Booking = {
  id: string;
  bookingNumber: string;
  passengerName: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  amount: number;
};

export default function AdminPayments() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'Payé' | 'Non payé' | 'Remboursé'>('all');

  useEffect(() => {
    const fetchPaymentsData = async () => {
      try {
        // Récupération globale de toutes les réservations dans PostgreSQL
        const { data, error } = await supabase
          .from('bookings')
          .select('*, passengers(*)')
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // Mappage des propriétés vers le format attendu par la table d'administration
        const formatted: Booking[] = (data || []).map(b => {
          const lead = b.passengers[0];
          const passengerName = lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme';

          const methodLabel: Record<string, string> = {
            AGENCE: 'Paiement en agence',
            AIRTEL_MONEY: 'Airtel Money',
            MOOV_MONEY: 'Moov Money',
          };

          return {
            id: b.id,
            bookingNumber: b.reference,
            passengerName,
            paymentMethod: methodLabel[b.payment_method] || b.payment_method,
            paymentStatus: b.status === 'PAYE' ? 'Payé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'Non payé',
            status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'En attente',
            amount: b.total_amount
          };
        });

        setBookings(formatted);
      } catch (e: any) {
        toast.error(e.message || 'Erreur lors du chargement des règlements');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentsData();
  }, []);

  const filtered = bookings.filter(b => {
    if (filter !== 'all' && b.paymentStatus !== filter) return false;
    const q = search.toLowerCase();
    return !q || b.bookingNumber.toLowerCase().includes(q) || b.passengerName.toLowerCase().includes(q);
  });

  const totalPaid = bookings.filter(b => b.paymentStatus === 'Payé').reduce((s, b) => s + b.amount, 0);
  const totalPending = bookings.filter(b => b.paymentStatus === 'Non payé').reduce((s, b) => s + b.amount, 0);
  const totalRefunded = bookings.filter(b => b.paymentStatus === 'Remboursé').reduce((s, b) => s + b.amount, 0);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div className="text-foreground text-left">
      <h1 className="text-2xl font-bold mb-6">Gestion des paiements</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SummaryCard label="Total encaissé" value={`${totalPaid.toLocaleString()} FCFA`} color="text-green-600" icon={DollarSign} />
        <SummaryCard label="En attente" value={`${totalPending.toLocaleString()} FCFA`} color="text-yellow-600" icon={CreditCard} />
        <SummaryCard label="Remboursé" value={`${totalRefunded.toLocaleString()} FCFA`} color="text-muted-foreground" icon={CreditCard} />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par billet ou passager…" className="pl-9" />
        </div>
        <div className="flex gap-2">
          {(['all', 'Payé', 'Non payé', 'Remboursé'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Tous' : f}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-4" />
          <p>Aucun paiement trouvé</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">N° Billet</th>
                <th className="p-3 font-medium hidden md:table-cell">Passager</th>
                <th className="p-3 font-medium">Méthode</th>
                <th className="p-3 font-medium">Statut paiement</th>
                <th className="p-3 font-medium hidden md:table-cell">Statut réservation</th>
                <th className="text-right p-3 font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs font-bold tracking-wider text-primary">{b.bookingNumber}</td>
                  <td className="p-3 hidden md:table-cell">{b.passengerName}</td>
                  <td className="p-3 text-muted-foreground">{b.paymentMethod || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      b.paymentStatus === 'Payé' ? 'bg-green-100 text-green-800' :
                      b.paymentStatus === 'Non payé' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{b.paymentStatus}</span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      b.status === 'Confirmé' ? 'bg-green-100 text-green-800' :
                      b.status === 'Annulé' ? 'bg-red-100 text-red-800' :
                      b.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-muted'
                    }`}>{b.status}</span>
                  </td>
                  <td className="p-3 text-right font-medium">{b.amount.toLocaleString()} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <div className="bg-card border rounded-xl p-5 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}