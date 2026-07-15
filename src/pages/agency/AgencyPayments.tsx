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
  Calculator
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
  
  // --- ÉTATS POUR LES FILTRES ---
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'Payé' | 'Non payé' | 'Remboursé'>('all');

  // --- ÉTATS POUR LA PAGINATION ---
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
          trip:trips!inner(company_id)
        `)
        .eq('trip.company_id', user.companyId) // Filtre de sécurité Agence
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: Booking[] = (data || []).map(b => {
        const lead = b.passengers[0];
        const passengerName = lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme';

        const methodLabel: Record<string, string> = {
          AGENCE: 'Espèces',
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

  // --- LOGIQUE DE FILTRAGE ---
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (filter !== 'all' && b.paymentStatus !== filter) return false;
      const q = search.toLowerCase();
      return !q || b.bookingNumber.toLowerCase().includes(q) || b.passengerName.toLowerCase().includes(q);
    });
  }, [bookings, filter, search]);

  // Reset pagination au changement de filtre
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  // --- LOGIQUE DE PAGINATION ---
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  // Calculs financiers (Stats de l'agence)
  const totalPaid = bookings.filter(b => b.paymentStatus === 'Payé').reduce((s, b) => s + b.amount, 0);
  const totalPending = bookings.filter(b => b.paymentStatus === 'Non payé').reduce((s, b) => s + b.amount, 0);
  const totalRefunded = bookings.filter(b => b.paymentStatus === 'Remboursé').reduce((s, b) => s + b.amount, 0);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8">
      
      {/* HEADER PROFESSIONNEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-slate-900 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" /> État de Caisse
          </h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Suivi des encaissements agence</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} className="rounded-xl font-bold border-2 gap-2 h-11 print:hidden">
              <Printer className="h-4 w-4" /> Imprimer
            </Button>
            <Button variant="outline" onClick={loadData} className="rounded-xl border-2 h-11 w-11 flex items-center justify-center print:hidden">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
        </div>
      </div>

      {/* SUMMARY CARDS (STATS AGENCE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard label="Encaissé" value={`${totalPaid.toLocaleString()} F`} color="text-emerald-600" bg="bg-emerald-50" icon={DollarSign} />
        <SummaryCard label="En attente" value={`${totalPending.toLocaleString()} F`} color="text-amber-600" bg="bg-amber-50" icon={CreditCard} />
        <SummaryCard label="Remboursé" value={`${totalRefunded.toLocaleString()} F`} color="text-slate-400" bg="bg-slate-50" icon={RefreshCw} />
      </div>

      {/* FILTRES (RECHERCHE + STATUTS) */}
      <div className="flex flex-col lg:flex-row gap-4 bg-card border-2 rounded-[2rem] p-6 shadow-sm print:hidden">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="N° Billet ou Nom passager..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="h-11 pl-10 rounded-xl border-2" 
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'Payé', 'Non payé', 'Remboursé'] as const).map(f => (
            <Button 
              key={f} 
              variant={filter === f ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter(f)} 
              className="rounded-xl font-bold h-11 px-5 uppercase text-[10px] tracking-widest"
            >
              {f === 'all' ? 'Tous' : f}
            </Button>
          ))}
        </div>
      </div>

      {/* TABLEAU PROFESSIONNEL */}
      <div className="bg-card border-2 rounded-[2rem] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500">Date / Billet</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500">Passager</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500 hidden md:table-cell">Méthode</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500 text-center">Paiement</th>
              <th className="p-4 font-black uppercase text-[10px] text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedBookings.length === 0 ? (
              <tr><td colSpan={5} className="p-16 text-center text-slate-400 italic">Aucune transaction trouvée</td></tr>
            ) : (
              paginatedBookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="text-[10px] font-bold text-slate-400 mb-0.5">{b.date}</p>
                    <p className="font-mono font-black text-primary text-xs">{b.bookingNumber}</p>
                  </td>
                  <td className="p-4 font-bold text-slate-700">{b.passengerName}</td>
                  <td className="p-4 hidden md:table-cell text-[10px] font-black uppercase text-slate-500 tracking-tighter italic">{b.paymentMethod}</td>
                  <td className="p-4 text-center">
                    <Badge className={`rounded-full px-3 py-1 text-[9px] font-black uppercase border-2 ${
                      b.paymentStatus === 'Payé' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      b.paymentStatus === 'Remboursé' ? 'bg-red-50 text-red-700 border-red-100' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {b.paymentStatus}
                    </Badge>
                  </td>
                  <td className="p-4 text-right font-black text-slate-900 text-base">{b.amount.toLocaleString()} F</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-white p-2 rounded-2xl border-2 border-slate-50 w-fit mx-auto shadow-sm print:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            className="rounded-xl h-10 w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Page {currentPage} sur {totalPages}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            className="rounded-xl h-10 w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-4 text-center font-bold uppercase tracking-widest leading-relaxed">
        Ce rapport est confidentiel et réservé à l'usage interne de l'agence.
      </p>
    </div>
  );
}

function SummaryCard({ label, value, color, bg, icon: Icon }: any) {
  return (
    <div className="bg-white border-2 border-slate-50 rounded-[2rem] p-6 shadow-sm flex items-center gap-5">
      <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-7 w-7 ${color}`} />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</div>
        <div className={`text-2xl font-black tracking-tight ${color}`}>{value}</div>
      </div>
    </div>
  );
}