"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  Search, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  MapPin, 
  Tag, 
  BarChart3,
  RefreshCw
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
  companyId: string;
  companyName: string;
  classLabel: string; // NOUVEAU
  destination: string; // NOUVEAU
};

export default function AdminPayments() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [companies, setCompanies] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'Payé' | 'Non payé' | 'Remboursé'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. Récupération des compagnies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (companiesData) setCompanies(companiesData);

      // 2. Récupération globale avec jointures enrichies
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *, 
          passengers(*), 
          trip:trips(
            company_id, 
            company:companies(name),
            to:cities!to_id(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const classMapping: Record<string, string> = {
        'VIP': 'VIP', 'BUSINESS': 'Business', '1ERE_CLASSE': '1ère Cl.', '2EME_CLASSE': '2ème Cl.', 'ECO': 'Éco', 'STANDARD': 'Std'
      };

      const formatted: Booking[] = (data || []).map(b => {
        const lead = b.passengers[0];
        const methodLabel: Record<string, string> = {
          AGENCE: 'Espèces',
          // AIRTEL_MONEY: 'Airtel Money',
          // MOOV_MONEY: 'Moov Money',
        };

        return {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme',
          paymentMethod: methodLabel[b.payment_method] || b.payment_method,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'Non payé',
          status: b.status,
          amount: b.total_amount,
          companyId: b.trip?.company_id || '',
          companyName: b.trip?.company?.name || 'Inconnue',
          classLabel: classMapping[b.class_type] || 'Standard',
          destination: b.arrival_city_name || b.trip?.to?.name || 'Terminus'
        };
      });

      setBookings(formatted);
    } catch (e: any) {
      toast.error('Erreur de chargement des flux financiers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Filtrage
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (filter !== 'all' && b.paymentStatus !== filter) return false;
      if (companyFilter !== 'all' && b.companyId !== companyFilter) return false;
      const q = search.toLowerCase();
      return !q || b.bookingNumber.toLowerCase().includes(q) || b.passengerName.toLowerCase().includes(q) || b.companyName.toLowerCase().includes(q) || b.destination.toLowerCase().includes(q);
    });
  }, [bookings, filter, companyFilter, search]);

  useEffect(() => { setCurrentPage(1); }, [filter, companyFilter, search]);

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // Statistiques dynamiques selon le filtre agence
  const statsSource = companyFilter === 'all' ? bookings : bookings.filter(b => b.companyId === companyFilter);
  const totalPaid = statsSource.filter(b => b.status === 'PAYE').reduce((s, b) => s + b.amount, 0);
  const totalPending = statsSource.filter(b => b.status === 'ATTENTE_PAIEMENT').reduce((s, b) => s + b.amount, 0);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full rounded-[2rem]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER ADMIM */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black italic text-slate-100 uppercase tracking-tighter flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" /> Flux Financiers
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Supervision globale des encaissements réseau</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border-2 border-slate-50 shadow-sm">
          <Building2 className="h-4 w-4 text-primary ml-2" />
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[220px] border-none font-bold text-xs focus:ring-0">
              <SelectValue placeholder="Toutes les agences" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl">
              <SelectItem value="all" className="font-bold">Toutes les agences</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={loadData} className="rounded-xl h-9 w-9 text-slate-300 hover:text-primary"><RefreshCw size={16}/></Button>
        </div>
      </div>

      {/* SUMMARY CARDS PREMIUM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard label="Volume Encaissé" value={`${totalPaid.toLocaleString()} F`} color="text-emerald-600" bg="bg-emerald-50" icon={DollarSign} sub="Paiements confirmés" />
        <SummaryCard label="En attente agence" value={`${totalPending.toLocaleString()} F`} color="text-amber-600" bg="bg-amber-50" icon={CreditCard} sub="Réservations non soldées" />
        <SummaryCard label="Transactions" value={filtered.length} color="text-primary" bg="bg-primary/5" icon={Tag} sub="Volume total traité" />
      </div>

      {/* RECHERCHE ET FILTRES RAPIDES */}
      <div className="bg-card border-2 rounded-[2.5rem] p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
        <div className="lg:col-span-2 space-y-2">
           <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Recherche multicritères</Label>
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
              <Input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Billet, Passager, Agence ou Destination..." 
                className="pl-12 h-14 rounded-2xl border-2 border-slate-100 bg-white font-medium text-base shadow-inner focus:border-primary transition-all" 
              />
           </div>
        </div>
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Filtre Statut</Label>
            <div className="flex bg-slate-100 p-1 rounded-xl border-2 border-white shadow-sm">
                {(['all', 'Payé', 'Non payé'] as const).map(f => (
                <button 
                    key={f} 
                    onClick={() => setFilter(f)}
                    className={`flex-1 text-[10px] font-black uppercase py-3 rounded-lg transition-all ${filter === f ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
                >
                    {f === 'all' ? 'Tous' : f}
                </button>
                ))}
            </div>
        </div>
      </div>

      {/* TABLEAU FINANCIER REFAIT */}
      <div className="bg-card border-2 rounded-[2.5rem] overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-5 font-black uppercase text-[10px] text-slate-400 text-left">Réf. Billet</th>
              <th className="p-5 font-black uppercase text-[10px] text-slate-400 text-left">Passager / Agence</th>
              <th className="p-5 font-black uppercase text-[10px] text-slate-400 text-center">Destination / Cl.</th>
              <th className="p-5 font-black uppercase text-[10px] text-slate-400 text-center">Paiement</th>
              <th className="p-5 font-black uppercase text-[10px] text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.length === 0 ? (
              <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">Aucune donnée correspondante</td></tr>
            ) : (
              paginated.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-5">
                    <p className="font-mono font-black text-primary text-xs tracking-tighter">{b.bookingNumber}</p>
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-slate-100 leading-none">{b.passengerName}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1.5 flex items-center gap-1">
                        <Building2 size={10} /> {b.companyName}
                    </p>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-700 uppercase">
                            <MapPin size={10} className="text-primary" /> {b.destination}
                        </div>
                        <Badge variant="outline" className="text-[7px] font-black uppercase border-primary/20 text-primary bg-primary/5 px-2 py-0">
                            {b.classLabel}
                        </Badge>
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase border-2 ${
                      b.paymentStatus === 'Payé' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      b.paymentStatus === 'Remboursé' ? 'bg-red-50 text-red-700 border-red-100' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {b.paymentStatus}
                    </span>
                    <p className="text-[8px] font-bold text-slate-300 mt-1 uppercase italic">{b.paymentMethod}</p>
                  </td>
                  <td className="p-5 text-right font-black text-slate-100 text-lg tracking-tighter">
                    {b.amount.toLocaleString()} F
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-white p-2 rounded-2xl border-2 w-fit mx-auto shadow-sm">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border hover:bg-slate-50"><ChevronLeft size={18}/></Button>
          <div className="flex items-center gap-1 font-black text-[10px] uppercase text-slate-400 px-4">
             <span className="text-primary">Page {currentPage}</span>
             <span>/</span>
             <span>{totalPages}</span>
          </div>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border hover:bg-slate-50"><ChevronRight size={18}/></Button>
        </div>
      )}

      <footer className="text-center pb-10 opacity-30">
        <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.5em]">Console d'Administration Financière • Gabon Mobilité</p>
      </footer>
    </div>
  );
}

function SummaryCard({ label, value, color, bg, icon: Icon, sub }: any) {
  return (
    <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-6 shadow-xl shadow-slate-100/50 flex items-center gap-5 group hover:scale-[1.02] transition-all">
      <div className={`h-16 w-16 rounded-[1.5rem] ${bg} flex items-center justify-center shrink-0 border-2 border-white shadow-sm`}>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-2">{label}</p>
        <div className={`text-2xl font-black tracking-tighter leading-none ${color}`}>{value}</div>
        <p className="text-[8px] font-bold text-slate-300 mt-2 uppercase italic">{sub}</p>
      </div>
    </div>
  );
}