"use client"

import { useEffect, useState } from 'react';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { RefreshCw, AlertCircle, CircleSlash } from 'lucide-react';
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
  const [error, setError] = useState('');

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const companyId = user.companyId || null;
      if (!companyId) {
        setError("Ce compte agent n'est rattaché à aucune compagnie de transport.");
        setLoading(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('bookings')
        .select('*, trip:trips(*), passengers(*)')
        .eq('trip.company_id', companyId)
        .order('created_at', { ascending: false });

      if (dbError) throw new Error(dbError.message);

      const formatted: Booking[] = (data || []).map(b => {
        const lead = b.passengers[0];
        return {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme',
          status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'En attente',
          paymentStatus: b.status === 'PAYE' ? 'Payé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'Non payé',
          amount: b.total_amount
        };
      });

      setBookings(formatted);
    } catch (e: any) { 
      toast.error(e.message || 'Erreur réseau lors du chargement'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleRefund = async (id: string) => {
    // Sécurité supplémentaire : On vérifie que le billet est bien payé avant de lancer le RPC
    const booking = bookings.find(b => b.id === id);
    if (booking?.paymentStatus !== 'Payé') {
      toast.error("Impossible de rembourser un billet non payé.");
      return;
    }

    try {
      const { data: res, error } = await supabase.rpc('process_agency_refund', {
        p_booking_id: id,
        p_agent_user_id: user.id
      });

      if (error || !res?.success) {
        toast.error(error?.message || res?.error || "Erreur lors du traitement du remboursement.");
        return;
      }

      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'Remboursé', paymentStatus: 'Remboursé' } : b));
      toast.success('Remboursement effectué avec succès !');
    } catch (e: any) { 
      toast.error('Erreur réseau.'); 
    }
  };

  if (loading) return <div className="space-y-3 p-6">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (error) return <div className="text-destructive p-8 text-left">{error}</div>;

  const refundable = bookings.filter(b => b.status !== 'Annulé' && b.status !== 'Remboursé');
  const refunded = bookings.filter(b => b.status === 'Remboursé');

  return (
    <div className="text-foreground text-left p-4">
      <h1 className="text-2xl font-bold mb-2">Gestion des remboursements</h1>
      <p className="text-muted-foreground mb-8">Traitez les demandes de remboursement des voyageurs</p>

      {refundable.length === 0 && refunded.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-2xl border-2 border-dashed">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Aucune réservation à traiter</p>
        </div>
      ) : (
        <>
          {refundable.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Réservations actives ({refundable.length})</h2>
              <div className="border rounded-xl overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">N° Billet</th>
                      <th className="text-left p-3 font-medium">Passager</th>
                      <th className="text-left p-3 font-medium">Statut</th>
                      <th className="text-right p-3 font-medium">Montant</th>
                      <th className="text-right p-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundable.map(b => (
                      <tr key={b.id} className="border-t hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-mono text-xs text-primary font-bold tracking-wider">{b.bookingNumber}</td>
                        <td className="p-3">{b.passengerName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${b.paymentStatus === 'Payé' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {b.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium">{b.amount.toLocaleString()} FCFA</td>
                        <td className="p-3 text-right">
                          {b.paymentStatus === 'Payé' ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1 font-semibold border-red-200 hover:bg-red-50 hover:text-red-600 transition-all">
                                  <RefreshCw className="h-3 w-3" /> Rembourser
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader className="text-left">
                                  <AlertDialogTitle>Rembourser {b.bookingNumber} ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Le montant de <strong>{b.amount.toLocaleString()} FCFA</strong> sera remboursé au voyageur {b.passengerName}. 
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRefund(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Confirmer le remboursement
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <div className="flex items-center justify-end text-muted-foreground gap-1.5 text-xs italic">
                              <CircleSlash className="h-3 w-3" />
                              Paiement requis
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {refunded.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Remboursements effectués ({refunded.length})</h2>
              <div className="border rounded-xl overflow-hidden opacity-80">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-3 font-medium">N° Billet</th>
                      <th className="text-left p-3 font-medium">Passager</th>
                      <th className="text-right p-3 font-medium">Montant</th>
                      <th className="text-right p-3 font-medium">Etat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunded.map(b => (
                      <tr key={b.id} className="border-t text-muted-foreground text-left bg-muted/5">
                        <td className="p-3 font-mono text-xs">{b.bookingNumber}</td>
                        <td className="p-3">{b.passengerName}</td>
                        <td className="p-3 text-right">{b.amount.toLocaleString()} FCFA</td>
                        <td className="p-3 text-right">
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase font-bold">Traité</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}