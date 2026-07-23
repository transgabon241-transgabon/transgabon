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
  classLabel: string;
  destination: string;
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
      const { data: cData } = await supabase.from('companies').select('id, name').order('name');
      if (cData) setCompanies(cData);

      // 2. Récupération des réservations
      // Note: On utilise des jointures explicites. Si "passengers" ou "trips" sont au singulier dans votre DB, modifiez ici.
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          passengers (first_name, last_name),
          trip:trips (
            company_id,
            company:companies (name),
            to:cities!to_id (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log("Aucune donnée trouvée dans la table bookings");
        setBookings([]);
        return;
      }

      const classMapping: Record<string, string> = {
        'VIP': 'VIP', 'BUSINESS': 'Business', '1ERE_CLASSE': '1ère Cl.', '2EME_CLASSE': '2ème Cl.', 'ECO': 'Éco', 'STANDARD': 'Std'
      };

      const formatted: Booking[] = data.map(b => {
        const lead = b.passengers?.[0];
        return {
          id: b.id,
          bookingNumber: b.reference || 'REF-INV',
          passengerName: lead ? `${lead.first_name} ${lead.last_name}` : 'Passager Inconnu',
          paymentMethod: b.payment_method === 'AGENCE' ? 'Espèces' : b.payment_method,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'Non payé',
          status: b.status,
          amount: Number(b.total_amount) || 0,
          companyId: b.trip?.company_id || '',
          companyName: b.trip?.company?.name || 'Agence Inconnue',
          classLabel: classMapping[b.class_type] || 'Standard',
          destination: b.arrival_city_name || b.trip?.to?.name || 'Terminus'
        };
      });

      setBookings(formatted);
    } catch (e: any) {
      console.error("Erreur AdminPayments:", e);
      toast.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (filter !== 'all' && b.paymentStatus !== filter) return false;
      if (companyFilter !== 'all' && b.companyId !== companyFilter) return false;
      const q = search.toLowerCase();
      return !q || 
             b.bookingNumber.toLowerCase().includes(q) || 
             b.passengerName.toLowerCase().includes(q) || 
             b.companyName.toLowerCase().includes(q) || 
             b.destination.toLowerCase().includes(q);
    });
  }, [bookings, filter, companyFilter, search]);

  useEffect(() => { setCurrentPage(1); }, [filter, companyFilter, search]);

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const statsSource = companyFilter === 'all' ? bookings : bookings.filter(b => b.companyId === companyFilter);
  const totalPaid = statsSource.filter(b => b.status === 'PAYE').reduce((s, b) => s + b.amount, 0);
  const totalPending = statsSource.filter(b => b.status === 'ATTENTE').reduce((s, b) => s + b.amount, 0);

  if (loading && bookings.length === 0) return (
    <div className="p-8 space-y-4 bg-background min-h-screen">
      <Skeleton className="h-12 w-48 bg-card" />
      <Skeleton className="h-64 w-full rounded-[2rem] bg-card" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500 bg-background text-foreground pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-left">
          <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" /> Flux Financiers
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Supervision globale des encaissements</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border-2 border-border shadow-2xl">
          <Building2 className="h-4 w-4 text-primary ml-2" />
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[180px] border-none bg-transparent font-bold text-xs focus:ring-0 text-slate-200">
              <SelectValue placeholder="Agences" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-2xl bg-slate-900 border-border text-slate-200">
              <SelectItem value="all" className="font-bold focus:bg-primary/20">Toutes les agences</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id} className="font-bold focus:bg-primary/20">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={loadData} className="rounded-xl h-9 w-9 text-slate-600 hover:text-primary"><RefreshCw size={16}/></Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard label="Volume Encaissé" value={`${totalPaid.toLocaleString()} F`} color="text-emerald-400" bg="bg-emerald-500/10" icon={DollarSign} sub="Ventes confirmées" />
        <SummaryCard label="Reste à percevoir" value={`${totalPending.toLocaleString()} F`} color="text-amber-400" bg="bg-amber-500/10" icon={CreditCard} sub="Réservations en attente" />
        <SummaryCard label="Transactions" value={filtered.length} color="text-primary" bg="bg-primary/10" icon={Tag} sub="Total des dossiers" />
      </div>

      {/* RECHERCHE */}
      <div className="bg-card border border-border rounded-[2.5rem] p-6 shadow-2xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
        <div className="lg:col-span-2 space-y-2 text-left">
           <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Recherche par Billet, Passager ou Agence</Label>
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-primary transition-colors" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Ex: GAB-9EA..." 
                className="w-full pl-12 h-14 rounded-2xl border-none bg-slate-950 text-white font-medium text-base shadow-inner focus:ring-1 focus:ring-primary/40 outline-none" 
              />
           </div>
        </div>
        <div className="space-y-2 text-left">
            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Statut du paiement</Label>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-border shadow-inner">
                {(['all', 'Payé', 'Non payé'] as const).map(f => (
                <button 
                    key={f} 
                    onClick={() => setFilter(f)}
                    className={`flex-1 text-[10px] font-black uppercase py-3 rounded-lg transition-all ${filter === f ? 'bg-primary text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                >
                    {f === 'all' ? 'Tous' : f}
                </button>
                ))}
            </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 border-b border-border">
              <tr>
                <th className="p-5 font-black uppercase text-[10px] text-slate-500 text-left">Référence</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-500 text-left">Passager / Transporteur</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-500 text-center">Destination</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-500 text-center">Paiement</th>
                <th className="p-5 font-black uppercase text-[10px] text-white text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-600 font-bold uppercase text-xs italic">Aucune donnée trouvée</td></tr>
              ) : (
                paginated.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="p-5 text-left">
                      <p className="font-mono font-black text-primary text-xs tracking-tighter">{b.bookingNumber}</p>
                    </td>
                    <td className="p-5 text-left">
                      <p className="font-bold text-slate-200 group-hover:text-white transition-colors leading-none truncate max-w-[180px]">{b.passengerName}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase mt-1.5 flex items-center gap-1">
                          <Building2 size={10} /> {b.companyName}
                      </p>
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-1 text-[10px] font-black text-slate-300 uppercase truncate max-w-[120px]">
                              <MapPin size={10} className="text-primary/50" /> {b.destination}
                          </div>
                          <Badge variant="outline" className="text-[7px] font-black uppercase border-primary/20 text-primary bg-primary/5">
                              {b.classLabel}
                          </Badge>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                        b.paymentStatus === 'Payé' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        b.paymentStatus === 'Remboursé' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td className="p-5 text-right font-black text-white text-lg tracking-tighter">
                      {b.amount.toLocaleString()} <span className="text-[10px] text-slate-500">F</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-card p-2 rounded-2xl border border-border w-fit mx-auto shadow-2xl">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border border-border bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><ChevronLeft size={18}/></Button>
          <div className="flex items-center gap-1 font-black text-[10px] uppercase text-slate-500 px-4">
             <span className="text-primary">Page {currentPage} / {totalPages}</span>
          </div>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border border-border bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><ChevronRight size={18}/></Button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, bg, icon: Icon, sub }: any) {
  return (
    <div className="bg-card border border-border rounded-[2.5rem] p-6 shadow-2xl flex items-center gap-5 group hover:border-primary/20 transition-all">
      <div className={`h-16 w-16 rounded-[1.5rem] ${bg} flex items-center justify-center shrink-0 border border-border shadow-inner group-hover:scale-110 transition-transform`}>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-2">{label}</p>
        <div className={`text-2xl font-black tracking-tighter leading-none ${color}`}>{value}</div>
        <p className="text-[9px] font-bold text-slate-600 mt-2 uppercase italic leading-none">{sub}</p>
      </div>
    </div>
  );
}