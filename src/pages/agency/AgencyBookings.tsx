"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { 
  Ticket, 
  Search, 
  Download, 
  Calendar as CalendarIcon, 
  User, 
  ArrowRight,
  Filter,
  RefreshCw,
  FileText,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function AgencyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadBookings = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          trip:trips!trip_id (
            departure_date,
            departure_time,
            from:cities!from_id(name),
            to:cities!to_id(name),
            vehicle:vehicles(registration)
          ),
          passengers (first_name, last_name, seat_number)
        `)
        .eq('trip.company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (e: any) {
      toast.error("Erreur de chargement des ventes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, [user]);

  // Filtrage
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchSearch = 
        b.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.passengers?.[0]?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.passengers?.[0]?.last_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchDate = dateFilter ? b.created_at.startsWith(dateFilter) : true;
      
      return matchSearch && matchDate;
    });
  }, [bookings, searchTerm, dateFilter]);

  // Statistiques du rapport
  const stats = useMemo(() => {
    const total = filteredBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    return {
      revenue: total,
      count: filteredBookings.length
    };
  }, [filteredBookings]);

  // Pagination
  const paginated = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500 bg-background text-foreground pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-6 rounded-[2rem] border-2 border-border shadow-2xl">
        <div className="flex items-center gap-4 text-left w-full">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Rapport des Ventes</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Historique des billets émis</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={loadBookings} className="rounded-xl font-black border-slate-800 bg-slate-950 h-11 px-6 text-[10px] uppercase hover:bg-slate-800 text-slate-300">
                <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
            </Button>
        </div>
      </div>

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-border p-6 rounded-[1.5rem] flex items-center justify-between">
            <div className="text-left">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Volume de Ventes (Sélection)</p>
                <p className="text-3xl font-black text-white tracking-tighter">{stats.count} <span className="text-sm text-slate-600">Billets</span></p>
            </div>
            <Ticket className="text-primary opacity-20" size={40} />
        </div>
        <div className="bg-slate-900 border border-emerald-500/20 p-6 rounded-[1.5rem] flex items-center justify-between">
            <div className="text-left">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Chiffre d'Affaires (Sélection)</p>
                <p className="text-3xl font-black text-emerald-500 tracking-tighter">{stats.revenue.toLocaleString()} <span className="text-sm">FCFA</span></p>
            </div>
            <TrendingUp className="text-emerald-500 opacity-20" size={40} />
        </div>
      </div>

      {/* FILTRES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card p-4 rounded-2xl border border-border shadow-xl">
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Rechercher une référence ou un nom..." 
            value={searchTerm}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl border-none bg-slate-950 text-white font-bold"
          />
        </div>
        <div className="relative">
          <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-10 h-12 rounded-xl border-none bg-slate-950 text-white font-bold"
          />
        </div>
      </div>

      {/* TABLEAU DES VENTES */}
      <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-border">
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Référence / Date</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Passager</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Trajet</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Statut</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.map((b) => (
                <tr key={b.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-5">
                    <p className="font-mono font-black text-primary text-xs">{b.reference}</p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1">{new Date(b.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="p-5">
                    <p className="font-black text-white text-xs uppercase">
                      {b.passengers?.[0]?.first_name} {b.passengers?.[0]?.last_name}
                    </p>
                    <Badge variant="outline" className="mt-1 text-[8px] border-slate-700 text-slate-500">Siège {b.passengers?.[0]?.seat_number}</Badge>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase">
                      <span>{b.trip?.from?.name}</span>
                      <ArrowRight size={10} className="text-primary" />
                      <span>{b.trip?.to?.name}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <Badge className={`text-[8px] font-black ${
                      b.status === 'PAYE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {b.status}
                    </Badge>
                  </td>
                  <td className="p-5 text-right">
                    <p className="font-black text-white text-sm">{(Number(b.total_amount) || 0).toLocaleString()} F</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBookings.length === 0 && (
          <div className="py-20 text-center text-slate-600">
            <Ticket size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest">Aucune vente trouvée</p>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            className="rounded-xl border border-border bg-slate-900 text-white"
          >
            <ChevronLeft size={20} />
          </Button>
          <span className="text-[10px] font-black text-slate-500 uppercase">Page {currentPage} / {totalPages}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            className="rounded-xl border border-border bg-slate-900 text-white"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 bg-background min-h-screen">
      <Skeleton className="h-20 w-full rounded-2xl bg-card" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-2xl bg-card" />
        <Skeleton className="h-32 rounded-2xl bg-card" />
      </div>
      <Skeleton className="h-96 w-full rounded-2xl bg-card" />
    </div>
  );
}