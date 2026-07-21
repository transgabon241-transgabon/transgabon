"use client"

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle, Search, CreditCard, RefreshCw, Users, UserCheck, 
  AlertCircle, Package, Lock, Ticket, Hash, Ship, Bus, Train, 
  MapPin, Gem, ArrowRight, Phone, Wallet, Calendar, Receipt
} from 'lucide-react';

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  // Vérification des droits : Seuls le Chef d'agence (Agent) et le Caissier encaissent
  const userRole = user?.role;
  const canCollectMoney = ['Administrateur', 'Agent', 'Caissier'].includes(userRole || '');
  const canBoard = ['Administrateur', 'Agent', 'Agent Embarquement'].includes(userRole || '');

  const handleValidate = async (forcedRef?: string) => {
    const targetRef = forcedRef || qrInput.trim();
    if (!targetRef) return;

    setLoading(true);
    try {
      let ref = targetRef.toUpperCase();
      try {
        const parsed = JSON.parse(targetRef);
        if (parsed && parsed.ref) ref = parsed.ref.toUpperCase();
      } catch (e) {}

      const { data: b, error } = await supabase
        .from('bookings')
        .select(`
          *,
          trip:trips (
            *,
            from_city:cities!from_id (name),
            to_city:cities!to_id (name),
            company:companies (name),
            vehicle:vehicles (registration)
          ),
          passengers (*),
          luggages (*)
        `)
        .eq('reference', ref)
        .maybeSingle();

      if (error) throw error;
      if (!b) {
        setResult({ valid: false, message: 'BILLET INTROUVABLE' });
        return;
      }

      const terminusName = b.trip.to_city?.name;
      const ticketDest = b.arrival_city_name;
      const isEscale = ticketDest && ticketDest.toLowerCase() !== terminusName.toLowerCase();

      const classMapping: Record<string, string> = {
        'VIP': 'SALON VIP', 'BUSINESS': 'BUSINESS', '1ERE_CLASSE': '1ÈRE CLASSE',
        '2EME_CLASSE': '2ÈME CLASSE', 'ECO': 'ÉCONOMIQUE', 'STANDARD': 'STANDARD'
      };

      // Calcul du total bagages déjà enregistrés
      const luggageTotal = (b.luggages || []).reduce((sum: number, l: any) => sum + (Number(l.total_price) || 0), 0);

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'ACCÈS AUTORISÉ' : 'PAIEMENT REQUIS',
        booking: {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: `${b.passengers[0]?.first_name || ''} ${b.passengers[0]?.last_name || ''}`,
          passengerPhone: b.contact_phone || '—',
          departureCity: b.trip.from_city?.name,
          arrivalCity: ticketDest || terminusName, 
          terminusTrain: terminusName,
          isEscale: !!isEscale,
          departureDate: b.trip.departure_date,
          departureTime: b.trip.departure_time,
          classLabel: classMapping[b.class_type] || 'STANDARD',
          classCode: b.class_type,
          registration: b.trip.vehicle?.registration || 'NON ASSIGNÉ',
          ticketAmount: Number(b.total_amount) || 0,
          luggageAmount: luggageTotal,
          totalToPay: Number(b.total_amount) + luggageTotal,
          paymentMethod: b.payment_method?.replace('_', ' '),
          passengers: b.passengers || [],
          luggages: b.luggages || [],
          tripType: b.trip.type,
          seatNumber: b.passengers[0]?.seat_number || '—'
        }
      });
    } catch (e) {
      toast.error('Erreur de lecture');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!result?.booking) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'PAYE' })
        .eq('id', result.booking.id);

      if (error) throw error;
      toast.success("Paiement encaissé avec succès !");
      handleValidate(result.booking.bookingNumber); // Rafraîchir l'affichage
    } catch (e) {
      toast.error("Erreur lors de l'encaissement");
    } finally {
      setLoading(false);
    }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      if (error) throw error;
      toast.success("Passager à bord");
      handleValidate(result.booking.bookingNumber);
    } finally {
      setBoardingId(null);
    }
  };

  const TransportIcon = result?.booking?.tripType === 'TRAIN' ? Train : result?.booking?.tripType === 'BOAT' ? Ship : Bus;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 space-y-6 animate-in fade-in duration-500">
      
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm w-full">
        <div className="p-3 bg-slate-900 rounded-2xl shadow-lg text-white"><Ticket size={24} /></div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">Guichet Contrôle</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic">Vérification & Encaissement</p>
        </div>
      </header>

      {/* RECHERCHE */}
      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-4 shadow-xl flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="RÉFÉRENCE OU SCAN QR..." 
          className="h-14 rounded-2xl border-none bg-slate-50 font-black uppercase tracking-widest px-6 shadow-inner focus-visible:ring-primary"
          onKeyDown={e => e.key === 'Enter' && handleValidate()} 
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-14 w-14 rounded-2xl bg-primary shadow-lg">
          {loading ? <RefreshCw className="animate-spin" /> : <Search />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className={`border-4 rounded-[3rem] p-8 shadow-2xl bg-white ${result.valid ? 'border-emerald-500' : 'border-amber-500'}`}>
            
            {/* STATUT DU BILLET */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-dashed border-slate-100">
              <div className="flex items-center gap-4 text-left">
                {result.valid ? <CheckCircle size={48} className="text-emerald-600" /> : <AlertCircle size={48} className="text-amber-600" />}
                <div>
                  <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">{result.message}</h2>
                  <Badge variant="outline" className="mt-2 border-primary/20 text-primary font-black text-[10px] uppercase px-3">
                    {result.booking.classLabel}
                  </Badge>
                </div>
              </div>
              {(result.booking.classCode === 'VIP' || result.booking.classCode === '1ERE_CLASSE') && (
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 animate-float shadow-lg"><Gem size={32} /></div>
              )}
            </div>

            {/* TRAJET */}
            <div className={`rounded-[2rem] p-6 mb-8 relative overflow-hidden shadow-xl text-white ${result.booking.isEscale ? 'bg-amber-600' : 'bg-slate-900'}`}>
                <div className="flex justify-between items-center relative z-10">
                    <div className="text-left">
                        <Label className="text-[10px] font-black uppercase text-white/60 tracking-widest">Départ</Label>
                        <p className="text-xl font-black uppercase leading-none">{result.booking.departureCity}</p>
                    </div>
                    
                    <div className="flex-1 px-6 flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 w-full">
                            <div className="h-2 w-2 rounded-full bg-white" />
                            <div className="h-px flex-1 border-t border-dashed border-white/40" />
                            <ArrowRight size={18} className="text-white" />
                        </div>
                        {result.booking.isEscale && <span className="text-[8px] font-black uppercase">Arrêt Escale</span>}
                    </div>

                    <div className="text-right">
                        <Label className="text-[10px] font-black uppercase text-white/60 tracking-widest">Destination</Label>
                        <p className="text-xl font-black uppercase leading-tight">{result.booking.arrivalCity}</p>
                        {result.booking.isEscale && <p className="text-[9px] font-bold opacity-50 italic">Terminus: {result.booking.terminusTrain}</p>}
                    </div>
                </div>
            </div>

            {/* INFOS VOYAGEUR */}
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex items-center gap-4 text-left">
                  <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border"><Phone size={18} /></div>
                  <div>
                     <Label className="text-[9px] font-black uppercase text-slate-900 opacity-70">Passager</Label>
                     <p className="font-black text-slate-900 text-sm">{result.booking.passengerName}</p>
                     <p className="text-[10px] font-bold text-slate-400">{result.booking.passengerPhone}</p>
                  </div>
               </div>
               <div className="bg-slate-900 p-5 rounded-[1.5rem] flex items-center gap-4 shadow-xl text-left">
                  <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-sm"><Hash size={18} /></div>
                  <div>
                     <Label className="text-[9px] font-black uppercase text-primary/60">Siège / Immat</Label>
                     <p className="font-black text-white text-lg leading-none">{result.booking.seatNumber}</p>
                     <p className="text-[9px] font-bold text-primary uppercase mt-1">{result.booking.registration}</p>
                  </div>
               </div>
            </div>

            {/* DÉTAIL DES BAGAGES (Inclus depuis la réservation) */}
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8 text-left">
                <h4 className="text-[10px] font-black uppercase text-slate-900 opacity-60 mb-4 flex items-center gap-2 tracking-widest">
                    <Package size={14} className="text-primary" /> Détail Logistique
                </h4>
                {result.booking.luggages.length > 0 ? (
                    <div className="space-y-2">
                        {result.booking.luggages.map((lug: any) => (
                            <div key={lug.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-[11px] font-bold">
                                <span className="text-slate-600">{lug.label} (x{lug.quantity})</span>
                                <span className="text-primary font-black">{(lug.total_price || 0).toLocaleString()} F</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">Aucun bagage enregistré à la réservation</p>
                )}
            </div>

            {/* --- ACTION CAISSE (UNIQUEMENT SI NON PAYÉ ET RÔLE CAISSIER) --- */}
            {!result.valid && (
                <div className="space-y-4">
                    {canCollectMoney ? (
                        <div className="bg-emerald-600 p-8 rounded-[2.5rem] shadow-2xl text-white text-center space-y-6">
                            <div className="flex flex-col items-center gap-2">
                                <Wallet size={40} className="opacity-50" />
                                <h3 className="text-xl font-black uppercase italic">Encaisser le paiement</h3>
                            </div>
                            
                            <div className="bg-white/10 p-5 rounded-2xl space-y-2 border border-white/20">
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span>Prix Billet :</span>
                                    <span>{result.booking.ticketAmount.toLocaleString()} F</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span>Suppléments Bagages :</span>
                                    <span>{result.booking.luggageAmount.toLocaleString()} F</span>
                                </div>
                                <div className="h-px bg-white/20 my-2" />
                                <div className="flex justify-between text-lg font-black uppercase tracking-tighter">
                                    <span>Total à Encaisser :</span>
                                    <span className="text-2xl">{result.booking.totalToPay.toLocaleString()} F</span>
                                </div>
                            </div>

                            <Button 
                                onClick={handleProcessPayment}
                                className="w-full h-16 bg-white text-emerald-700 hover:bg-slate-50 rounded-2xl font-black text-xl shadow-xl uppercase tracking-widest"
                            >
                                VALIDER LE RÈGLEMENT CASH
                            </Button>
                        </div>
                    ) : (
                        <div className="p-8 bg-amber-50 rounded-3xl border-2 border-amber-100 text-center flex flex-col items-center gap-3">
                            <Lock size={32} className="text-amber-400" />
                            <p className="text-sm font-black text-amber-800 uppercase italic">Veuillez diriger le passager vers la caisse</p>
                        </div>
                    )}
                </div>
            )}

            {/* --- LISTE D'EMBARQUEMENT (UNIQUEMENT SI PAYÉ) --- */}
            {result.valid && (
                <div className="space-y-4 text-left">
                    <h3 className="text-[10px] font-black uppercase text-slate-900 opacity-60 tracking-widest flex items-center gap-2 ml-4">
                        <Users size={16} /> Contrôle Embarquement
                    </h3>
                    <div className="space-y-2">
                        {result.booking.passengers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary transition-all">
                                <div>
                                    <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{p.first_name} {p.last_name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Billet Validé</p>
                                </div>
                                {p.boarded ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-4 py-1.5 rounded-xl font-black text-[10px]">À BORD</Badge>
                                ) : (
                                    <Button 
                                        disabled={!canBoard}
                                        onClick={() => handleBoardPassenger(p.id)} 
                                        className="h-10 px-8 rounded-xl font-black text-[10px] uppercase bg-slate-900 hover:bg-primary transition-all"
                                    >
                                        Embarquer
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER SCAN */}
      {!result && (
        <div className="pt-20 text-center opacity-20">
            <Ticket size={80} className="mx-auto mb-4" />
            <p className="text-sm font-black uppercase tracking-[0.5em]">Prêt pour le scan</p>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 text-left">
      <div className="text-[10px] uppercase font-black text-slate-900 opacity-70 tracking-widest leading-none">{label}</div>
      <div className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{value || '—'}</div>
    </div>
  );
}