"use client"

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  RefreshCw, 
  Wallet, 
  History, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  MapPin, 
  Calendar,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

type Booking = {
  id: string;
  bookingNumber: string;
  passengerName: string;
  passengerPhone: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  paymentMethod: string;
  status: string;
  paymentStatus: string;
  amount: number;
  classLabel: string;
};

export default function AgencyRefunds() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('bookings')
        .select(`
          *, 
          trip:trips!inner(
            departure_date, 
            from:cities!from_id(name), 
            to:cities!to_id(name),
            company_id
          ), 
          passengers(*)
        `)
        .eq('trip.company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      const formatted: Booking[] = (data || []).map(b => {
        const lead = b.passengers[0];
        
        const methodLabel: Record<string, string> = {
          AGENCE: 'Espèces',
          AIRTEL_MONEY: 'Airtel Money',
          MOOV_MONEY: 'Moov Money',
        };

        const classMapping: Record<string, string> = {
          'VIP': 'VIP',
          'BUSINESS': 'Business',
          '1ERE_CLASSE': '1ère Classe',
          '2EME_CLASSE': '2ème Classe',
          'ECO': 'Éco',
          'STANDARD': 'Standard'
        };

        return {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme',
          passengerPhone: b.contact_phone || '—',
          departureCity: b.trip?.from?.name || '—',
          arrivalCity: b.arrival_city_name || b.trip?.to?.name || '—',
          departureDate: b.trip?.departure_date || '',
          paymentMethod: methodLabel[b.payment_method] || b.payment_method,
          status: b.status,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'Non payé',
          amount: b.total_amount,
          classLabel: classMapping[b.class_type] || 'Standard'
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

  const handleRefund = async (id: string) => {
    try {
      const { data: res, error } = await supabase.rpc('process_agency_refund', {
        p_booking_id: id,
        p_agent_user_id: user?.id
      });

      if (error || !res?.success) throw new Error(res?.error || "Erreur lors du remboursement");

      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'REMBOURSE', paymentStatus: 'Remboursé' } : b));
      toast.success('Remboursement effectué avec succès !');
    } catch (e: any) { 
      toast.error(e.message); 
    }
  };

  const filteredRefundable = useMemo(() => {
    const list = bookings.filter(b => b.status !== 'ANNULE' && b.status !== 'REMBOURSE');
    if (!searchTerm) return list;
    
    const q = searchTerm.toLowerCase();
    return list.filter(b => 
      b.bookingNumber.toLowerCase().includes(q) || 
      b.passengerName.toLowerCase().includes(q) ||
      b.arrivalCity.toLowerCase().includes(q)
    );
  }, [bookings, searchTerm]);

  const refundedHistory = useMemo(() => bookings.filter(b => b.status === 'REMBOURSE'), [bookings]);
  
  const totalPages = Math.ceil(filteredRefundable.length / itemsPerPage);
  const currentRefundable = filteredRefundable.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return (
    <div className="max-w-4xl mx-auto p-8 space-y-4 bg-background min-h-screen">
      <Skeleton className="h-12 w-48 bg-slate-800" />
      <Skeleton className="h-64 w-full bg-slate-800 rounded-[2.5rem]" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 text-left space-y-8 animate-in fade-in duration-500 bg-background text-foreground">
      
      {/* HEADER SOMBRE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-[2.5rem] border-2 border-slate-800 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-900/20 text-white">
            <Wallet className="h-8 w-8" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase text-white leading-none">Annulations</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Remboursements & Dossiers Clos</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={loadData} className="rounded-xl border-slate-700 bg-slate-950 h-11 w-11 hover:bg-slate-800 transition-all">
          <RefreshCw className="h-5 w-5 text-slate-400" />
        </Button>
      </div>

      {/* BARRE DE RECHERCHE SOMBRE */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Référence, Passager ou Destination..." 
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="h-14 pl-12 rounded-2xl border-2 border-slate-800 bg-slate-950 text-white shadow-inner font-medium text-base focus-visible:ring-primary/50"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Dossiers remboursables</h3>
          <Badge className="bg-slate-900 text-slate-400 border border-slate-800 font-bold uppercase text-[9px]">{filteredRefundable.length} billets</Badge>
        </div>

        {currentRefundable.length === 0 ? (
          <div className="p-16 text-center border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/40">
            <p className="text-slate-600 italic font-medium uppercase text-xs tracking-widest">Aucun dossier à traiter</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {currentRefundable.map(b => (
              <div key={b.id} className="bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-6 shadow-xl hover:border-primary/20 transition-all group overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-primary font-black text-xs uppercase shadow-inner">
                          {b.passengerName.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-black text-white uppercase leading-none">{b.passengerName}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-bold text-primary font-mono uppercase tracking-tighter">{b.bookingNumber}</span>
                            <Badge variant="outline" className="text-[8px] font-black h-4 px-1.5 uppercase border-primary/20 text-primary bg-primary/10">
                                {b.classLabel}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1 text-left">
                          <p className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1"><MapPin size={10}/> Destination</p>
                          <p className="text-xs font-bold text-slate-200 leading-none uppercase">{b.arrivalCity}</p>
                       </div>
                       <div className="space-y-1 text-left">
                          <p className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1"><Calendar size={10}/> Voyage le</p>
                          <p className="text-xs font-bold text-slate-200 leading-none">{new Date(b.departureDate).toLocaleDateString('fr-FR')}</p>
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between border-t md:border-t-0 md:border-l border-dashed border-slate-800 pt-4 md:pt-0 md:pl-8 min-w-[180px]">
                    <div className="text-right w-full">
                       <p className="text-2xl font-black text-white tracking-tighter leading-none">{b.amount.toLocaleString()} <span className="text-xs text-slate-500">F</span></p>
                       <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 italic">Via {b.paymentMethod}</p>
                    </div>

                    {b.paymentStatus === 'Payé' ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] h-10 px-6 uppercase shadow-lg border-none active:scale-95 transition-all">
                            REMBOURSER
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem] border-slate-800 bg-slate-900 text-white shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black italic uppercase text-white leading-tight">Confirmer le remboursement</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400 font-medium leading-relaxed mt-2">
                              Vous allez rembourser <strong className="text-white">{b.amount.toLocaleString()} FCFA</strong>. <br/>
                              Le passager <strong className="text-white">{b.passengerName}</strong> ne pourra plus voyager avec ce billet.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-6 gap-2">
                            <AlertDialogCancel className="rounded-xl font-bold bg-slate-800 border-none text-white hover:bg-slate-700">ANNULER</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRefund(b.id)} className="bg-red-600 hover:bg-red-700 rounded-xl font-black uppercase text-[10px] border-none text-white">PROCÉDER AU REMBOURSEMENT</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Badge variant="outline" className="mt-4 text-[9px] font-black uppercase text-slate-600 border-slate-800">Non Éligible</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION SOMBRE */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-12 bg-slate-900 p-2 rounded-2xl border-2 border-slate-800 w-fit mx-auto shadow-2xl">
            <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><ChevronLeft size={18} /></Button>
            <span className="text-[10px] font-black uppercase text-slate-500 px-2">Page {currentPage} / {totalPages}</span>
            <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><ChevronRight size={18} /></Button>
          </div>
        )}
      </div>

      {/* HISTORIQUE SOMBRE */}
      {refundedHistory.length > 0 && (
        <div className="pt-8 border-t border-slate-800 border-dashed">
          <div className="flex items-center gap-2 mb-4 px-4 text-slate-500">
            <History size={16} />
            <h3 className="font-black text-[9px] uppercase tracking-widest italic leading-none">Derniers remboursements</h3>
          </div>
          <div className="grid gap-2">
            {refundedHistory.slice(0, 3).map(b => (
              <div key={b.id} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-red-500" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase">{b.bookingNumber} • {b.passengerName}</span>
                </div>
                <span className="text-[10px] font-black text-red-500 uppercase italic">Remboursé</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}