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
  User, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  MapPin, 
  CreditCard, 
  Calendar,
  Phone
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
        .select('*, trip:trips(*, from:cities!from_id(name), to:cities!to_id(name)), passengers(*)')
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

        return {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme',
          passengerPhone: b.contact_phone || '—',
          departureCity: b.trip?.from?.name || '—',
          arrivalCity: b.trip?.to?.name || '—',
          departureDate: b.trip?.departure_date || '',
          paymentMethod: methodLabel[b.payment_method] || b.payment_method,
          status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'En attente',
          paymentStatus: b.status === 'PAYE' ? 'Payé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'Non payé',
          amount: b.total_amount
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

      if (error || !res?.success) throw new Error(res?.error || "Erreur");

      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'Remboursé', paymentStatus: 'Remboursé' } : b));
      toast.success('Remboursement effectué !');
    } catch (e: any) { 
      toast.error(e.message); 
    }
  };

  // Filtrage intelligent
  const filteredRefundable = useMemo(() => {
    const list = bookings.filter(b => b.status !== 'Annulé' && b.status !== 'Remboursé');
    if (!searchTerm) return list;
    
    const q = searchTerm.toLowerCase();
    return list.filter(b => 
      b.bookingNumber.toLowerCase().includes(q) || 
      b.passengerName.toLowerCase().includes(q) ||
      b.passengerPhone.includes(q)
    );
  }, [bookings, searchTerm]);

  const refunded = useMemo(() => bookings.filter(b => b.status === 'Remboursé'), [bookings]);
  
  // Pagination
  const totalPages = Math.ceil(filteredRefundable.length / itemsPerPage);
  const currentRefundable = filteredRefundable.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="max-w-4xl mx-auto p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full rounded-3xl" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 text-left space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500 rounded-2xl shadow-lg shadow-red-100">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase">Remboursements</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gestion des annulations clients</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={loadData} className="rounded-xl border-2 h-11 w-11 hover:bg-slate-50 transition-all">
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Rechercher un billet, un nom ou un téléphone..." 
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="h-14 pl-12 rounded-2xl border-2 border-slate-100 bg-white shadow-inner font-medium text-base"
        />
      </div>

      {/* LISTE DES DEMANDES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Dossiers éligibles</h3>
          <Badge className="bg-slate-100 text-slate-600 border-none font-bold">{filteredRefundable.length} résultats</Badge>
        </div>

        {currentRefundable.length === 0 ? (
          <div className="p-16 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50">
            <p className="text-slate-400 italic font-medium">Aucune demande correspondant à votre recherche</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {currentRefundable.map(b => (
              <div key={b.id} className="bg-white border-2 border-slate-50 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  
                  {/* Infos Passager & Trajet */}
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs uppercase tracking-tighter">
                        {b.passengerName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 uppercase leading-none">{b.passengerName}</p>
                        <p className="text-[10px] font-bold text-primary font-mono mt-1 uppercase tracking-tighter">{b.bookingNumber}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1"><MapPin size={10}/> Itinéraire</p>
                          <p className="text-xs font-bold text-slate-700 leading-none">{b.departureCity} → {b.arrivalCity}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1"><Calendar size={10}/> Date Voyage</p>
                          <p className="text-xs font-bold text-slate-700 leading-none">{new Date(b.departureDate).toLocaleDateString('fr-FR')}</p>
                       </div>
                    </div>
                  </div>

                  {/* Infos Paiement & Action */}
                  <div className="flex flex-col items-end justify-between border-t md:border-t-0 md:border-l border-dashed border-slate-100 pt-4 md:pt-0 md:pl-8 min-w-[180px]">
                    <div className="text-right w-full">
                       <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{b.amount.toLocaleString()} <span className="text-xs">F</span></p>
                       <div className="flex items-center justify-end gap-2 mt-2">
                          <Badge variant="outline" className="text-[9px] font-black uppercase h-5 px-2 bg-slate-50 border-slate-200">{b.paymentMethod}</Badge>
                          <Badge className={`text-[9px] font-black uppercase h-5 px-2 ${b.paymentStatus === 'Payé' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-100'}`}>
                             {b.paymentStatus}
                          </Badge>
                       </div>
                    </div>

                    {b.paymentStatus === 'Payé' ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] h-10 px-6 uppercase shadow-lg shadow-red-100">
                            REMBOURSER
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black italic uppercase">Action irréversible</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600 font-medium leading-relaxed">
                              Voulez-vous rembourser <strong>{b.amount.toLocaleString()} FCFA</strong> à <strong>{b.passengerName}</strong> ? <br/>
                              Le billet {b.bookingNumber} sera définitivement annulé.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl font-bold">ANNULER</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRefund(b.id)} className="bg-red-600 hover:bg-red-700 rounded-xl font-black uppercase">CONFIRMER</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <div className="text-[9px] font-black text-slate-300 mt-4 italic uppercase">Non remboursable</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-12 bg-white p-2 rounded-2xl border-2 border-slate-50 w-fit mx-auto shadow-sm">
            <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10"><ChevronLeft size={18} /></Button>
            <span className="text-[10px] font-black uppercase text-slate-400">Page {currentPage} / {totalPages}</span>
            <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10"><ChevronRight size={18} /></Button>
          </div>
        )}
      </div>

      {/* HISTORIQUE DISCRET */}
      {refunded.length > 0 && (
        <div className="pt-8 opacity-50 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 mb-4 px-4 text-slate-400">
            <History size={16} />
            <h3 className="font-black text-[9px] uppercase tracking-widest italic text-left">Historique des annulations</h3>
          </div>
          <div className="grid gap-2">
            {refunded.slice(0, 3).map(b => (
              <div key={b.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{b.bookingNumber} • {b.passengerName}</span>
                <span className="text-[10px] font-black text-slate-400 italic">Remboursé</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}