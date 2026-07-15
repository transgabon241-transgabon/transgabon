"use client"

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  CircleSlash, 
  Wallet, 
  History, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Banknote
} from 'lucide-react';
import { toast } from 'sonner';

type Booking = {
  id: string;
  bookingNumber: string;
  passengerName: string;
  status: string;
  paymentStatus: string;
  amount: number;
};

export default function AgencyRefunds() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('bookings')
        .select('*, trip:trips(*), passengers(*)')
        .eq('trip.company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      const formatted: Booking[] = (data || []).map(b => ({
        id: b.id,
        bookingNumber: b.reference,
        passengerName: b.passengers[0] ? `${b.passengers[0].first_name} ${b.passengers[0].last_name}` : 'Anonyme',
        status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'En attente',
        paymentStatus: b.status === 'PAYE' ? 'Payé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'Non payé',
        amount: b.total_amount
      }));

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
      toast.success('Remboursement validé !');
    } catch (e: any) { 
      toast.error(e.message); 
    }
  };

  // Filtrage et Pagination
  const refundable = useMemo(() => bookings.filter(b => b.status !== 'Annulé' && b.status !== 'Remboursé'), [bookings]);
  const refunded = useMemo(() => bookings.filter(b => b.status === 'Remboursé'), [bookings]);
  
  const totalPages = Math.ceil(refundable.length / itemsPerPage);
  const currentRefundable = refundable.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="max-w-4xl mx-auto p-8 space-y-4"><Skeleton className="h-12 w-48 rounded-2xl" /><Skeleton className="h-64 w-full rounded-3xl" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-2 pb-20 text-left space-y-4">
      
      {/* HEADER COMPACT */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500 rounded-2xl shadow-lg shadow-red-100">
            <Banknote className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tight uppercase">Remboursements</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Caisse & Annulations</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={loadData} className="rounded-xl border-2 h-11 w-11">
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      {/* SECTION ACTIVES AVEC CARTES RÉDUITES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Demandes en attente</h3>
          <Badge className="bg-slate-100 text-slate-600 border-none font-bold">{refundable.length} dossiers</Badge>
        </div>

        {refundable.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed rounded-[2.5rem] bg-slate-50/50">
            <p className="text-slate-400 italic text-sm">Aucun remboursement à traiter</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {currentRefundable.map(b => (
                <div key={b.id} className="bg-white border-2 border-slate-100 rounded-3xl p-4 hover:shadow-md transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800">{b.passengerName}</p>
                        <span className="font-mono text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-md">{b.bookingNumber}</span>
                      </div>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{b.amount.toLocaleString()} FCFA</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {b.paymentStatus === 'Payé' ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] h-9 px-4 uppercase tracking-tighter shadow-md">
                            Rembourser
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black italic uppercase">Confirmer le remboursement ?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600 font-medium">
                              Remboursement de <strong>{b.amount.toLocaleString()} FCFA</strong> pour <strong>{b.passengerName}</strong>. Cette action videra le montant de la caisse.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl font-bold">Retour</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRefund(b.id)} className="bg-red-600 hover:bg-red-700 rounded-xl font-black">CONFIRMER</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-300 border-slate-100">Non Payé</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button 
                  variant="ghost" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="rounded-full h-10 w-10 p-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-xs font-black text-slate-400">PAGE {currentPage} SUR {totalPages}</span>
                <Button 
                  variant="ghost" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="rounded-full h-10 w-10 p-0"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* HISTORIQUE COMPACT */}
      {refunded.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-dashed">
          <div className="flex items-center justify-between px-4">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-300">Historique récent</h3>
            <History className="h-4 w-4 text-slate-200" />
          </div>
          <div className="grid gap-2 opacity-60">
            {refunded.slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 grayscale">
                <span className="text-[10px] font-bold text-slate-500">{b.bookingNumber} • {b.passengerName}</span>
                <span className="text-[10px] font-black text-slate-400">{b.amount.toLocaleString()} FCFA</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}