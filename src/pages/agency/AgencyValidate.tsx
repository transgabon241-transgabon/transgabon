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
  MapPin, Gem, ArrowRight, Phone, Wallet, Calendar
} from 'lucide-react';

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  const userRole = user?.role?.toUpperCase();
  const canCollectMoney = ['CAISSIER', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');

  const handleValidate = async (forcedRef?: string) => {
    const targetRef = forcedRef || qrInput.trim();
    if (!targetRef) return;

    setLoading(true);
    try {
      let ref = targetRef.toUpperCase();
      // Gestion du format JSON si c'est un scan direct
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

      // LOGIQUE D'ESCALE : On compare la destination du billet au terminus du trajet
      const terminusName = b.trip.to_city?.name;
      const ticketDest = b.arrival_city_name;
      const isEscale = ticketDest && ticketDest.toLowerCase() !== terminusName.toLowerCase();

      const classMapping: Record<string, string> = {
        'VIP': 'SALON VIP',
        'BUSINESS': 'BUSINESS',
        '1ERE_CLASSE': '1ÈRE CLASSE',
        '2EME_CLASSE': '2ÈME CLASSE',
        'ECO': 'ÉCONOMIQUE',
        'STANDARD': 'STANDARD'
      };

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
          amount: b.total_amount,
          paymentMethod: b.payment_method?.replace('_', ' '),
          passengers: b.passengers || [],
          luggages: b.luggages || [],
          tripType: b.trip.type,
          seatNumber: b.passengers[0]?.seat_number || '—'
        }
      });
    } catch (e) {
      console.error(e);
      toast.error('Erreur de scan');
    } finally {
      setLoading(false);
    }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      if (error) throw error;
      toast.success("Passager enregistré à bord");
      handleValidate(result.booking.bookingNumber);
    } catch (e) {
      toast.error("Erreur technique");
    } finally {
      setBoardingId(null);
    }
  };

  const TransportIcon = result?.booking?.tripType === 'TRAIN' ? Train : result?.booking?.tripType === 'BOAT' ? Ship : Bus;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm w-full">
        <div className="p-3 bg-slate-900 rounded-2xl shadow-lg text-white"><Ticket size={24} /></div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">Guichet Contrôle</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic">Vérification & Embarquement</p>
        </div>
      </header>

      {/* BARRE DE RECHERCHE */}
      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-4 shadow-xl flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="RÉFÉRENCE DU BILLET (GAB-XXXX)..." 
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
            
            {/* ENTÊTE DE STATUT */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-dashed border-slate-100">
              <div className="flex items-center gap-4 text-left">
                {result.valid ? <CheckCircle size={48} className="text-emerald-600" /> : <AlertCircle size={48} className="text-amber-600" />}
                <div>
                  <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">{result.message}</h2>
                  <Badge variant="outline" className="mt-2 border-primary/20 text-primary font-black text-[10px] uppercase">
                    {result.booking.classLabel}
                  </Badge>
                </div>
              </div>
              {(result.booking.classCode === 'VIP' || result.booking.classCode === '1ERE_CLASSE') && (
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 animate-pulse"><Gem size={32} /></div>
              )}
            </div>

            {/* CARTE DE TRAJET : FOCUS DESTINATION PASSAGER */}
            <div className={`rounded-[2rem] p-6 mb-8 relative overflow-hidden shadow-xl text-white ${result.booking.isEscale ? 'bg-amber-600' : 'bg-slate-900'}`}>
                <div className="flex justify-between items-center relative z-10">
                    <div className="text-left">
                        <Label className="text-[10px] font-black uppercase text-white/60 tracking-widest">Départ</Label>
                        <p className="text-xl font-black uppercase leading-none">{result.booking.departureCity}</p>
                        <p className="text-[10px] font-bold opacity-60">{result.booking.departureTime}</p>
                    </div>
                    
                    <div className="flex-1 px-6 flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 w-full">
                            <div className="h-2 w-2 rounded-full bg-white" />
                            <div className="h-px flex-1 border-t border-dashed border-white/40" />
                            <ArrowRight size={18} className="text-white" />
                        </div>
                        {result.booking.isEscale && <Badge className="bg-white text-amber-600 border-none font-black text-[8px] uppercase tracking-widest">Escale</Badge>}
                    </div>

                    <div className="text-right">
                        <Label className="text-[10px] font-black uppercase text-white/60 tracking-widest">Destination Passager</Label>
                        <p className="text-xl font-black uppercase leading-tight">
                            {result.booking.arrivalCity}
                        </p>
                        <p className="text-[9px] font-bold opacity-50 italic">Terminus: {result.booking.terminusTrain}</p>
                    </div>
                </div>

                {/* ALERTE ESCALE VISIBLE */}
                {result.booking.isEscale && (
                    <div className="mt-6 p-3 bg-white/10 rounded-2xl border border-white/10 flex items-center gap-3">
                        <MapPin className="text-white h-5 w-5" />
                        <p className="text-[10px] font-bold text-amber-50 leading-tight uppercase tracking-tight">
                            Info : Le voyageur doit descendre à <span className="text-white underline">{result.booking.arrivalCity}</span>.
                        </p>
                    </div>
                )}
            </div>

            {/* INFORMATIONS ENRICHIES (CONTACT & VOYAGE) */}
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex items-center gap-4">
                  <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border">
                      <Phone size={18} />
                  </div>
                  <div className="text-left">
                     <Label className="text-[9px] font-black uppercase text-slate-900 opacity-70">Contact</Label>
                     <p className="font-black text-slate-900 text-sm">{result.booking.passengerPhone}</p>
                  </div>
               </div>
               <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex items-center gap-4">
                  <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border">
                      <Wallet size={18} />
                  </div>
                  <div className="text-left">
                     <Label className="text-[9px] font-black uppercase text-slate-900 opacity-70">Paiement</Label>
                     <p className="font-black text-slate-900 text-[10px] uppercase truncate">{result.booking.paymentMethod}</p>
                  </div>
               </div>
               <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex items-center gap-4">
                  <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-sm border">
                      <Calendar size={18} />
                  </div>
                  <div className="text-left">
                     <Label className="text-[9px] font-black uppercase text-slate-900 opacity-70">Date</Label>
                     <p className="font-black text-slate-900 text-sm">{new Date(result.booking.departureDate).toLocaleDateString('fr-FR')}</p>
                  </div>
               </div>
               <div className="bg-slate-900 p-5 rounded-[1.5rem] flex items-center gap-4 shadow-xl">
                  <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-sm">
                      <Hash size={18} />
                  </div>
                  <div className="text-left">
                     <Label className="text-[9px] font-black uppercase text-primary/60">Siège</Label>
                     <p className="font-black text-white text-xl leading-none">{result.booking.seatNumber}</p>
                  </div>
               </div>
            </div>

            {/* RECAP BAGAGES */}
            {result.booking.luggages.length > 0 && (
                <div className="bg-slate-50 p-5 rounded-3xl border-2 border-slate-100 mb-8">
                    <h4 className="text-[10px] font-black uppercase text-slate-900 opacity-60 mb-3 flex items-center gap-2">
                        <Package size={14} /> Suppléments Bagages
                    </h4>
                    <div className="space-y-2">
                        {result.booking.luggages.map((lug: any) => (
                            <div key={lug.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-[11px] font-bold">
                                <span className="text-slate-600">{lug.label} (x{lug.quantity})</span>
                                <span className="text-primary font-black">{(lug.total_price || 0).toLocaleString()} F</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LISTE D'EMBARQUEMENT */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[11px] font-black uppercase text-slate-900 opacity-60 tracking-[0.2em] flex items-center gap-2">
                        <Users size={16} /> Liste de montée
                    </h3>
                    <Badge variant="outline" className="font-black border-slate-200 text-slate-400">Réf: {result.booking.bookingNumber}</Badge>
                </div>

                {!result.valid ? (
                    <div className="p-8 bg-amber-50 rounded-[2rem] border-2 border-amber-100 text-center space-y-4 animate-in fade-in">
                        <div className="p-4 bg-amber-100 rounded-full w-fit mx-auto text-amber-600">
                            <CreditCard size={32} />
                        </div>
                        <p className="text-sm font-black text-amber-800 uppercase italic">Paiement en agence requis</p>
                        {canCollectMoney && (
                            <Button 
                                onClick={() => supabase.from('bookings').update({status:'PAYE'}).eq('id', result.booking.id).then(()=>handleValidate(result.booking.bookingNumber))}
                                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest"
                            >
                                ENCAISSER {Number(result.booking.amount || 0).toLocaleString()} F CFA
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {result.booking.passengers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-5 bg-white border-2 border-slate-50 rounded-[1.5rem] shadow-sm group hover:border-primary/20 transition-all">
                                <div>
                                    <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{p.first_name} {p.last_name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Billet Validé</p>
                                </div>
                                {p.boarded ? (
                                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 font-black text-[10px] uppercase">
                                        <CheckCircle size={14} /> À BORD
                                    </div>
                                ) : (
                                    <Button 
                                        onClick={() => handleBoardPassenger(p.id)} 
                                        disabled={boardingId === p.id}
                                        className="h-11 px-8 rounded-xl font-black text-[10px] uppercase bg-slate-900 hover:bg-primary transition-colors shadow-lg"
                                    >
                                        {boardingId === p.id ? <RefreshCw className="animate-spin h-4 w-4" /> : "Embarquer"}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* INFO MATERIEL */}
            <div className="mt-8 pt-6 border-t border-dashed border-slate-100 flex items-center justify-between opacity-70">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <TransportIcon size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[9px] font-black uppercase text-slate-400 leading-none">Matériel affecté</p>
                        <p className="font-black text-slate-900 uppercase text-xs mt-1">{result.booking.registration}</p>
                    </div>
                </div>
                <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center">
                    <Hash size={16} className="text-primary" />
                </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER DISCRET */}
      {!result && (
        <div className="pt-20 text-center opacity-20">
            <Ticket size={80} className="mx-auto mb-4" />
            <p className="text-sm font-black uppercase tracking-[0.5em]">Attente de scan</p>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 text-left">
      <div className="text-[10px] uppercase font-black text-slate-900 opacity-60 tracking-widest leading-none">{label}</div>
      <div className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{value || '—'}</div>
    </div>
  );
}