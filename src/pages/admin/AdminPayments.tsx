"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Search, DollarSign, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { toast } from 'sonner';

type Booking = {
  id: string;
  bookingNumber: string;
  passengerName: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  amount: number;
  companyId: string;
  companyName: string;
};

export default function AdminPayments() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [companies, setCompanies] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'Payé' | 'Non payé' | 'Remboursé'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  // --- ÉTATS POUR LA PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // 1. Récupération des compagnies pour le filtre
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name')
          .order('name');
        
        if (companiesData) setCompanies(companiesData);

        // 2. Récupération globale des réservations avec jointure sur trip et company
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *, 
            passengers(*), 
            trip:trips(company_id, company:companies(name))
          `)
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

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
            amount: b.total_amount,
            companyId: b.trip?.company_id || '',
            companyName: b.trip?.company?.name || 'Inconnue'
          };
        });

        setBookings(formatted);
      } catch (e: any) {
        toast.error(e.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // --- LOGIQUE DE FILTRAGE ---
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      // Filtre de statut
      if (filter !== 'all' && b.paymentStatus !== filter) return false;
      
      // Filtre de compagnie
      if (companyFilter !== 'all' && b.companyId !== companyFilter) return false;
      
      // Recherche textuelle
      const q = search.toLowerCase();
      return !q || b.bookingNumber.toLowerCase().includes(q) || b.passengerName.toLowerCase().includes(q);
    });
  }, [bookings, filter, companyFilter, search]);

  // Réinitialise la page à 1 quand un filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, companyFilter, search]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  // Calculs financiers basés sur le filtre de compagnie actuel (mais pas sur le statut pour garder la cohérence des cartes)
  const statsSource = companyFilter === 'all' 
    ? bookings 
    : bookings.filter(b => b.companyId === companyFilter);

  const totalPaid = statsSource.filter(b => b.paymentStatus === 'Payé').reduce((s, b) => s + b.amount, 0);
  const totalPending = statsSource.filter(b => b.paymentStatus === 'Non payé').reduce((s, b) => s + b.amount, 0);
  const totalRefunded = statsSource.filter(b => b.paymentStatus === 'Remboursé').reduce((s, b) => s + b.amount, 0);

  if (loading) return <div className="space-y-3 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div className="text-foreground text-left p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Gestion des paiements</h1>
        
        {/* Filtre par Compagnie */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[200px] bg-white border-2">
              <SelectValue placeholder="Toutes les agences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SummaryCard label="Total encaissé" value={`${totalPaid.toLocaleString()} FCFA`} color="text-green-600" icon={DollarSign} />
        <SummaryCard label="En attente" value={`${totalPending.toLocaleString()} FCFA`} color="text-yellow-600" icon={CreditCard} />
        <SummaryCard label="Remboursé" value={`${totalRefunded.toLocaleString()} FCFA`} color="text-muted-foreground" icon={CreditCard} />
      </div>

      {/* Barre de recherche et Filtres de Statut */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Billet ou passager…" className="pl-9 border-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'Payé', 'Non payé', 'Remboursé'] as const).map(f => (
            <Button 
              key={f} 
              variant={filter === f ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter(f)}
              className="font-semibold"
            >
              {f === 'all' ? 'Tous les statuts' : f}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {paginatedBookings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-slate-50 rounded-2xl border-2 border-dashed">
          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Aucune transaction ne correspond à vos critères</p>
        </div>
      ) : (
        <>
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-3 font-semibold uppercase text-[10px] text-slate-500">N° Billet</th>
                  <th className="p-3 font-semibold uppercase text-[10px] text-slate-500 hidden md:table-cell">Passager</th>
                  <th className="p-3 font-semibold uppercase text-[10px] text-slate-500">Agence</th>
                  <th className="p-3 font-semibold uppercase text-[10px] text-slate-500 hidden lg:table-cell">Méthode</th>
                  <th className="p-3 font-semibold uppercase text-[10px] text-slate-500">Paiement</th>
                  <th className="text-right p-3 font-semibold uppercase text-[10px] text-slate-500">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedBookings.map(b => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs font-bold text-primary">{b.bookingNumber}</td>
                    <td className="p-3 hidden md:table-cell font-medium">{b.passengerName}</td>
                    <td className="p-3 text-xs font-semibold text-slate-600">{b.companyName}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">{b.paymentMethod || '—'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                        b.paymentStatus === 'Payé' ? 'bg-green-100 text-green-700 border-green-200' :
                        b.paymentStatus === 'Non payé' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>{b.paymentStatus}</span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">{b.amount.toLocaleString()} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- CONTRÔLES DE PAGINATION --- */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6 bg-slate-100 p-2 rounded-xl w-fit mx-auto border shadow-inner">
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                className="h-8 w-8 rounded-lg bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-xs font-black">
                <span className="text-primary">{currentPage}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-500">{totalPages}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                className="h-8 w-8 rounded-lg bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-4 text-center font-bold uppercase tracking-widest">
            {filtered.length} transaction(s) filtrée(s)
          </p>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <div className="bg-card border-2 border-slate-50 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div>
        <div className={`text-xl font-black tracking-tight ${color}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">{label}</div>
      </div>
    </div>
  );
}