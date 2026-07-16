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
  Calendar as CalendarIcon,
  TrendingUp,
  BarChart3
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
  dateStr: string; // Affichage FR
  rawDate: Date;   // Pour les calculs
};

export default function AgencyPayments() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- ÉTATS POUR LES FILTRES ---
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Payé' | 'Non payé' | 'Remboursé'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(''); // Format YYYY-MM-DD

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
        .eq('trip.company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: Booking[] = (data || []).map(b => {
        const lead = b.passengers[0];
        const methodLabel: Record<string, string> = {
          AGENCE: 'Espèces',
          AIRTEL_MONEY: 'Airtel Money',
          MOOV_MONEY: 'Moov Money',
        };

        return {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme',
          paymentMethod: methodLabel[b.payment_method] || b.payment_method,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'Non payé',
          status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'En attente',
          amount: b.total_amount,
          dateStr: new Date(b.created_at).toLocaleDateString('fr-FR'),
          rawDate: new Date(b.created_at)
        };
      });

      setBookings(formatted);
    } catch (e: any) {
      toast.error('Erreur de caisse');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // --- LOGIQUE DE CALCULS FINANCIERS (Dynamique selon la date) ---
  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // On ne compte que les billets au statut "Payé"
    const paidOnly = bookings.filter(b => b.paymentStatus === 'Payé');

    return {
      totalToday: paidOnly
        .filter(b => b.rawDate.toDateString() === today.toDateString())
        .reduce((sum, b) => sum + b.amount, 0),
      
      totalMonth: paidOnly
        .filter(b => b.rawDate.getMonth() === currentMonth && b.rawDate.getFullYear() === currentYear)
        .reduce((sum, b) => sum + b.amount, 0),
        
      totalYear: paidOnly
        .filter(b => b.rawDate.getFullYear() === currentYear)
        .reduce((sum, b) => sum + b.amount, 0),
    };
  }, [bookings]);

  // --- LOGIQUE DE FILTRAGE ---
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      // 1. Filtre Statut
      if (statusFilter !== 'all' && b.paymentStatus !== statusFilter) return false;
      
      // 2. Filtre Date
      if (selectedDate) {
        const bDate = b.rawDate.toISOString().split('T')[0];
        if (bDate !== selectedDate) return false;
      }
      
      // 3. Recherche texte
      const q = search.toLowerCase();
      return !q || b.bookingNumber.toLowerCase().includes(q) || b.passengerName.toLowerCase().includes(q);
    });
  }, [bookings, statusFilter, selectedDate, search]);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, selectedDate, search]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-slate-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" /> État de Caisse
          </h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Analyse des revenus en temps réel</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} className="rounded-xl font-bold border-2 h-11 print:hidden">
              <Printer className="h-4 w-4 mr-2" /> Rapport PDF
            </Button>
            <Button variant="outline" onClick={loadData} className="rounded-xl border-2 h-11 w-11 flex items-center justify-center print:hidden">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
        </div>
      </div>

      {/* CARTES DE RÉCAPITULATIF TEMPOREL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard 
          label="Recettes Jour" 
          value={`${stats.totalToday.toLocaleString()} F`} 
          color="text-emerald-600" bg="bg-emerald-50" 
          icon={CalendarIcon} 
          sub="Aujourd'hui"
        />
        <SummaryCard 
          label="Recettes Mois" 
          value={`${stats.totalMonth.toLocaleString()} F`} 
          color="text-blue-600" bg="bg-blue-50" 
          icon={TrendingUp} 
          sub="Mois en cours"
        />
        <SummaryCard 
          label="Recettes Année" 
          value={`${stats.totalYear.toLocaleString()} F`} 
          color="text-primary" bg="bg-primary/5" 
          icon={DollarSign} 
          sub="Cumul annuel"
        />
      </div>

      {/* BARRE DE FILTRES AVANCÉS */}
      <div className="bg-card border-2 rounded-[2rem] p-6 shadow-sm print:hidden space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recherche */}
          <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Recherche</Label>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Billet ou Passager..." value={search} onChange={e => setSearch(e.target.value)} className="h-11 pl-10 rounded-xl border-2" />
             </div>
          </div>

          {/* Filtre Date */}
          <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Filtrer par date précise</Label>
             <div className="flex gap-2">
                <Input 
                  type="date" 
                  value={selectedDate} 
                  onChange={e => setSelectedDate(e.target.value)} 
                  className="h-11 rounded-xl border-2 font-bold" 
                />
                {selectedDate && (
                  <Button variant="ghost" onClick={() => setSelectedDate('')} className="h-11 text-xs font-bold text-red-500">Effacer</Button>
                )}
             </div>
          </div>

          {/* Statuts */}
          <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Statut du règlement</Label>
             <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['all', 'Payé', 'Non payé'] as const).map(f => (
                  <button 
                    key={f} 
                    onClick={() => setStatusFilter(f)}
                    className={`flex-1 text-[10px] font-black uppercase py-2 rounded-lg transition-all ${statusFilter === f ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {f === 'all' ? 'Tous' : f}
                  </button>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* TABLEAU DE CAISSE */}
      <div className="bg-card border-2 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
           <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500">Journal des transactions</h3>
           <Badge variant="outline" className="bg-white font-bold">{filtered.length} lignes</Badge>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50/50 border-b">
            <tr>
              <th className="p-4 font-black uppercase text-[10px] text-slate-400 text-left">Date / Billet</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-400 text-left">Passager</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-400 text-left hidden md:table-cell">Mode</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-400 text-center">Paiement</th>
              <th className="p-4 font-black uppercase text-[10px] text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.length === 0 ? (
              <tr><td colSpan={5} className="p-16 text-center text-slate-400 italic">Aucune donnée sur cette période</td></tr>
            ) : (
              paginated.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="text-[10px] font-bold text-slate-400 mb-0.5">{b.dateStr}</p>
                    <p className="font-mono font-black text-primary text-xs tracking-tighter">{b.bookingNumber}</p>
                  </td>
                  <td className="p-4 font-bold text-slate-700">{b.passengerName}</td>
                  <td className="p-4 hidden md:table-cell">
                     <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 text-slate-500">{b.paymentMethod}</Badge>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase border-2 ${
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

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-white p-2 rounded-2xl border-2 w-fit mx-auto shadow-sm print:hidden">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10"><ChevronLeft size={18}/></Button>
          <span className="text-[10px] font-black uppercase text-slate-400">Page {currentPage} sur {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10"><ChevronRight size={18}/></Button>
        </div>
      )}

      <footer className="text-center pb-10">
        <p className="text-[9px] font-black uppercase text-slate-300 tracking-[0.3em]">Document Comptable Interne • TransGabon-Connect</p>
      </footer>
    </div>
  );
}

function SummaryCard({ label, value, color, bg, icon: Icon, sub }: any) {
  return (
    <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-6 shadow-xl shadow-slate-100/50 flex items-center gap-5 group hover:scale-[1.02] transition-transform">
      <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center shrink-0 border border-white shadow-inner`}>
        <Icon className={`h-7 w-7 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">{label}</p>
        <div className={`text-2xl font-black tracking-tighter leading-none ${color}`}>{value}</div>
        <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase italic">{sub}</p>
      </div>
    </div>
  );
}