"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label'; 
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Printer,
  Calendar as CalendarIcon,
  TrendingUp,
  BarChart3,
  MapPin,
  Tag
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
  dateStr: string;
  rawDate: Date;
  classLabel: string;
  destination: string;
};

export default function AgencyPayments() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Payé' | 'Non payé' | 'Remboursé'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

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
          trip:trips!inner(
            company_id, 
            to:cities!to_id(name)
          )
        `)
        .eq('trip.company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: Booking[] = (data || []).map(b => {
        const lead = b.passengers[0];
        const methodLabel: Record<string, string> = { AGENCE: 'Espèces' };
        const classMapping: Record<string, string> = {
          'VIP': 'VIP', 'BUSINESS': 'Business', '1ERE_CLASSE': '1ère Classe',
          '2EME_CLASSE': '2ème Classe', 'ECO': 'Éco', 'STANDARD': 'Standard'
        };

        return {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme',
          paymentMethod: methodLabel[b.payment_method] || b.payment_method,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'Non payé',
          status: b.status,
          amount: b.total_amount,
          dateStr: new Date(b.created_at).toLocaleDateString('fr-FR'),
          rawDate: new Date(b.created_at),
          classLabel: classMapping[b.class_type] || 'Standard',
          destination: b.arrival_city_name || b.trip?.to?.name || 'Terminus'
        };
      });

      setBookings(formatted);
    } catch (e: any) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const stats = useMemo(() => {
    const today = new Date();
    const paidOnly = bookings.filter(b => b.paymentStatus === 'Payé');
    return {
      totalToday: paidOnly.filter(b => b.rawDate.toDateString() === today.toDateString()).reduce((sum, b) => sum + b.amount, 0),
      totalMonth: paidOnly.filter(b => b.rawDate.getMonth() === today.getMonth() && b.rawDate.getFullYear() === today.getFullYear()).reduce((sum, b) => sum + b.amount, 0),
      countToday: paidOnly.filter(b => b.rawDate.toDateString() === today.toDateString()).length,
    };
  }, [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter !== 'all' && b.paymentStatus !== statusFilter) return false;
      if (selectedDate && b.rawDate.toISOString().split('T')[0] !== selectedDate) return false;
      const q = search.toLowerCase();
      return !q || b.bookingNumber.toLowerCase().includes(q) || b.passengerName.toLowerCase().includes(q) || b.destination.toLowerCase().includes(q);
    });
  }, [bookings, statusFilter, selectedDate, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="p-8 space-y-4 bg-slate-950 min-h-screen"><Skeleton className="h-12 w-48 bg-slate-800" /><Skeleton className="h-64 w-full bg-slate-800" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER - Texte passé en Blanc/Slate-200 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-white flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" /> État de Caisse
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Suivi des encaissements agence</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} className="rounded-xl font-bold border-slate-700 bg-slate-900 text-slate-200 h-11 print:hidden hover:bg-slate-800">
              <Printer className="h-4 w-4 mr-2" /> Imprimer
            </Button>
            <Button variant="outline" onClick={loadData} className="rounded-xl border-slate-700 bg-slate-900 h-11 w-11 flex items-center justify-center print:hidden hover:bg-slate-800">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
        </div>
      </div>

      {/* RECAP CARTES - bg-slate-900 au lieu de white */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard label="Recettes Jour" value={`${stats.totalToday.toLocaleString()} F`} color="text-emerald-400" bg="bg-emerald-500/10" icon={CalendarIcon} sub={`${stats.countToday} billets aujourd'hui`} />
        <SummaryCard label="Recettes Mois" value={`${stats.totalMonth.toLocaleString()} F`} color="text-blue-400" bg="bg-blue-500/10" icon={TrendingUp} sub="Mois en cours" />
        <SummaryCard label="Total Billets" value={filtered.length} color="text-primary" bg="bg-primary/10" icon={Tag} sub="Transactions listées" />
      </div>

      {/* FILTRES - fond sombre border-slate-800 */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-6 shadow-2xl print:hidden grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Recherche rapide</Label>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="Billet, Nom, Ville..." value={search} onChange={e => setSearch(e.target.value)} className="h-11 pl-10 rounded-xl border-slate-800 bg-slate-950 text-white" />
             </div>
          </div>
          <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Filtrer par date</Label>
             <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-11 rounded-xl border-slate-800 bg-slate-950 text-white font-bold" />
          </div>
          <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Règlement</Label>
             <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['all', 'Payé', 'Non payé'] as const).map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)} className={`flex-1 text-[10px] font-black uppercase py-2 rounded-lg transition-all ${statusFilter === f ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    {f === 'all' ? 'Tous' : f}
                  </button>
                ))}
             </div>
          </div>
      </div>

      {/* TABLEAU - Totalement revu pour le mode sombre */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500 text-left">Billet / Date</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500 text-left">Voyageur / Destination</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500 text-center">Classe</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500 text-center">Paiement</th>
              <th className="p-4 font-black uppercase text-[10px] text-white text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginated.length === 0 ? (
              <tr><td colSpan={5} className="p-16 text-center text-slate-500 italic">Aucune transaction trouvée</td></tr>
            ) : (
              paginated.map(b => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="p-4">
                    <p className="font-mono font-black text-primary text-xs tracking-tighter">{b.bookingNumber}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{b.dateStr}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{b.passengerName}</p>
                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase">
                       <MapPin size={10} className="text-primary/50" /> {b.destination}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                     <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/30 text-primary bg-primary/5 px-2 py-0.5">
                        {b.classLabel}
                     </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                      b.paymentStatus === 'Payé' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      b.paymentStatus === 'Remboursé' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {b.paymentStatus}
                    </span>
                    <p className="text-[8px] font-bold text-slate-500 mt-1 uppercase">{b.paymentMethod}</p>
                  </td>
                  <td className="p-4 text-right font-black text-white text-base">
                    {b.amount.toLocaleString()} F CFA
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION SOMBRE */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-slate-900 p-2 rounded-2xl border-2 border-slate-800 w-fit mx-auto shadow-xl print:hidden">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 text-slate-400 hover:bg-slate-800 hover:text-white"><ChevronLeft size={18}/></Button>
          <span className="text-[10px] font-black uppercase text-slate-500 px-4">Page {currentPage} / {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 text-slate-400 hover:bg-slate-800 hover:text-white"><ChevronRight size={18}/></Button>
        </div>
      )}

      <footer className="text-center pb-10 opacity-20">
        <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Document Comptable Interne • TransGabon-Connect</p>
      </footer>
    </div>
  );
}

// Sous-composant SummaryCard adapté au mode sombre
function SummaryCard({ label, value, color, bg, icon: Icon, sub }: any) {
  return (
    <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-6 shadow-2xl flex items-center gap-5 group hover:border-primary/30 transition-all">
      <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center shrink-0 border border-slate-800 shadow-inner group-hover:scale-110 transition-transform`}>
        <Icon className={`h-7 w-7 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1.5">{label}</p>
        <div className={`text-2xl font-black tracking-tighter leading-none ${color}`}>{value}</div>
        <p className="text-[9px] font-bold text-slate-600 mt-2 uppercase italic leading-none">{sub}</p>
      </div>
    </div>
  );
}