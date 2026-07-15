"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Search, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Printer,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

type Booking = {
  id: string;
  bookingNumber: string;
  passengerName: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  amount: number;
  date: string;
};

export default function AgencyPayments() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'Payé' | 'Non payé' | 'Remboursé'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *, 
          passengers(*), 
          trip:trips(company_id)
        `)
        .eq('trip.company_id', user.companyId) // VERROUILLAGE SÉCURISÉ SUR L'AGENCE
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: Booking[] = (data || []).map(b => {
        const lead = b.passengers[0];
        const passengerName = lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme';

        const methodLabel: Record<string, string> = {
          AGENCE: 'Espèces (Agence)',
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
          date: new Date(b.created_at).toLocaleDateString('fr-FR')
        };
      });

      setBookings(formatted);
    } catch (e: any) {
      toast.error('Erreur lors du chargement de la caisse');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // Filtrage
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (filter !== 'all' && b.paymentStatus !== filter) return false;
      const q = search.toLowerCase();
      return !q || b.bookingNumber.toLowerCase().includes(q) || b.passengerName.toLowerCase().includes(q);
    });
  }, [bookings, filter, search]);

  useEffect(() => { setCurrentPage(1); }, [filter, search]);

  // Pagination calcul
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedBookings = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Stats Caisse
  const totalPaid = bookings.filter(b => b.paymentStatus === 'Payé').reduce((s, b) => s + b.amount, 0);
  const totalPending = bookings.filter(b => b.paymentStatus === 'Non payé').reduce((s, b) => s + b.amount, 0);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-slate-900 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" /> État de Caisse
          </h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Récapitulatif des encaissements de l'agence</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} className="rounded-xl font-bold border-2 gap-2 h-11 print:hidden">
              <Printer className="h-4 w-4" /> Imprimer Rapport
            </Button>
            <Button variant="outline" onClick={loadData} className="rounded-xl font-bold border-2 h-11 w-11 print:hidden">
              <RefreshCw className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-5">
           <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
             <DollarSign className="h-8 w-8 text-emerald-600" />
           </div>
           <div>
             <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Total Encaissé</p>
             <p className="text-3xl font-black text-slate-900 tracking-tight">{totalPaid.toLocaleString()} F</p>
           </div>
        </div>
        <div className="bg-white border-2 border-amber-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-5">
           <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
             <CreditCard className="h-8 w-8 text-amber-600" />
           </div>
           <div>
             <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">Paiements en attente</p>
             <p className="text-3xl font-black text-slate-900 tracking-tight">{totalPending.toLocaleString()} F</p>
           </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card border-2 rounded-[2rem] p-6 shadow-sm print:hidden">
        <div className="md:col-span-1 space-y-1.5">
           <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Recherche</Label>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="N° Billet ou Nom..." value={search} onChange={e => setSearch(e.target.value)} className="h-11 pl-10 rounded-xl border-2" />
           </div>
        </div>
        <div className="md:col-span-2 space-y-1.5">
           <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Statut du paiement</Label>
           <div className="flex flex-wrap gap-2">
              {(['all', 'Payé', 'Non payé', 'Remboursé'] as const).map(f => (
                <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="rounded-xl font-bold h-11 px-6">
                  {f === 'all' ? 'Toutes les transactions' : f}
                </Button>
              ))}
           </div>
        </div>
      </div>

      {/* Tableau Compact & Pro */}
      <div className="bg-card border-2 rounded-[2rem] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500">Date / Billet</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500">Passager</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500">Méthode</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500 text-center">Paiement</th>
              <th className="p-4 font-black uppercase text-[10px] text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedBookings.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic">Aucun mouvement trouvé</td></tr>
            ) : (
              paginatedBookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="text-[10px] font-bold text-slate-400 mb-0.5">{b.date}</p>
                    <p className="font-mono font-black text-primary text-xs">{b.bookingNumber}</p>
                  </td>
                  <td className="p-4 font-bold text-slate-700">{b.passengerName}</td>
                  <td className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-tighter italic">{b.paymentMethod}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                      b.paymentStatus === 'Payé' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      b.paymentStatus === 'Remboursé' ? 'bg-red-50 text-red-700 border-red-100' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-slate-900 text-base">{b.amount.toLocaleString()} F</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-white p-3 rounded-2xl border-2 w-fit mx-auto shadow-sm">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="h-5 w-5" /></Button>
          <span className="text-xs font-black">PAGE {currentPage} SUR {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="h-5 w-5" /></Button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon: Icon }: any) {
  return (
    <div className="bg-white border-2 border-slate-50 rounded-[2rem] p-6 shadow-sm flex items-center gap-5">
      <div className={`h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100`}>
        <Icon className={`h-7 w-7 ${color}`} />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</div>
        <div className={`text-2xl font-black tracking-tight ${color}`}>{value}</div>
      </div>
    </div>
  );
}