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
  AlertCircle, Package, Lock, Ticket, Hash, Ship, Bus, Train, MapPin, Gem, ArrowRight 
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
            vehicle:vehicles (registration)
          ),
          passengers (*)
        `)
        .eq('reference', ref)
        .maybeSingle();

      if (error) throw error;
      if (!b) {
        setResult({ valid: false, message: 'BILLET INTROUVABLE' });
        return;
      }

      // LOGIQUE DE DÉTERMINATION D'ESCALE
      const terminusName = b.trip.to_city?.name;
      const ticketDest = b.arrival_city_name;
      // On considère une escale si la ville du billet est renseignée ET différente du terminus
      const isEscale = ticketDest && ticketDest.toLowerCase() !== terminusName.toLowerCase();

      const classMapping: Record<string, string> = {
        'VIP': 'SALON VIP',
        'BUSINESS': 'CLASSE BUSINESS',
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
          departureCity: b.trip.from_city?.name,
          arrivalCity: ticketDest || terminusName, // Affiche l'escale si elle existe, sinon le terminus
          terminusTrain: terminusName,
          isEscale: !!isEscale,
          classLabel: classMapping[b.class_type] || 'STANDARD',
          classCode: b.class_type,
          registration: b.trip.vehicle?.registration || 'EXPRESS',
          amount: b.total_amount,
          passengers: b.passengers,
          tripType: b.trip.type,
          seatNumber: b.passengers[0]?.seat_number || '—'
        }
      });
    } catch (e) {
      toast.error('Erreur de scan');
    } finally {
      setLoading(false);
    }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
    if (!error) {
      toast.success("Passager à bord");
      handleValidate(result.booking.bookingNumber);
    }
    setBoardingId(null);
  };

  const TransportIcon = result?.booking?.tripType === 'TRAIN' ? Train : result?.booking?.tripType === 'BOAT' ? Ship : Bus;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 space-y-6">
      {/* BARRE DE RECHERCHE */}
      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-4 shadow-xl flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="RÉFÉRENCE DU BILLET..." 
          className="h-14 rounded-2xl border-none bg-slate-50 font-black px-6 shadow-inner"
          onKeyDown={e => e.key === 'Enter' && handleValidate()} 
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-14 w-14 rounded-2xl bg-primary shadow-lg">
          {loading ? <RefreshCw className="animate-spin" /> : <Search />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className={`border-4 rounded-[3rem] p-8 shadow-2xl bg-white ${result.valid ? 'border-emerald-500' : 'border-amber-500'}`}>
            
            {/* ENTÊTE DE STATUT */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-dashed">
              <div className="flex items-center gap-4">
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

            {/* CARTE DE TRAJET RÉALISTE */}
            <div className="bg-slate-900 text-white rounded-[2rem] p-6 mb-8 relative overflow-hidden shadow-xl">
                <div className="flex justify-between items-center relative z-10">
                    <div className="text-left">
                        <Label className="text-[9px] font-black uppercase text-primary tracking-widest">Départ</Label>
                        <p className="text-lg font-black uppercase">{result.booking.departureCity}</p>
                    </div>
                    
                    <div className="flex-1 px-6 flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 w-full">
                            <div className={`h-2 w-2 rounded-full ${result.booking.isEscale ? 'bg-amber-400' : 'bg-primary'}`} />
                            <div className="h-px flex-1 border-t border-dashed border-white/30" />
                            <ArrowRight size={16} className={result.booking.isEscale ? 'text-amber-400' : 'text-primary'} />
                        </div>
                        {result.booking.isEscale && <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter">Billet Escale</span>}
                    </div>

                    <div className="text-right">
                        <Label className="text-[9px] font-black uppercase text-primary tracking-widest">Destination</Label>
                        <p className={`text-lg font-black uppercase ${result.booking.isEscale ? 'text-amber-400' : 'text-white'}`}>
                            {result.booking.arrivalCity}
                        </p>
                    </div>
                </div>

                {/* ALERTE ESCALE */}
                {result.booking.isEscale && (
                    <div className="mt-6 p-3 bg-white/10 rounded-xl border border-white/10 flex items-center gap-3">
                        <AlertCircle className="text-amber-400 h-5 w-5 shrink-0" />
                        <p className="text-[10px] font-bold text-amber-100 leading-tight uppercase">
                            Attention Agent : Le passager descend à <span className="text-white underline">{result.booking.arrivalCity}</span>. 
                            Ne pas l'envoyer vers {result.booking.terminusTrain}.
                        </p>
                    </div>
                )}
            </div>

            {/* INFOS COMPLÉMENTAIRES */}
            <div className="grid grid-cols-2 gap-6 mb-8">
               <div className="bg-slate-50 p-4 rounded-2xl border">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Passager Principal</Label>
                  <p className="font-black text-slate-900 uppercase text-sm">{result.booking.passengerName}</p>
               </div>
               <div className="bg-slate-900 p-4 rounded-2xl text-center">
                  <Label className="text-[9px] font-black uppercase text-primary tracking-widest">Siège</Label>
                  <p className="text-2xl font-black text-white leading-none mt-1">{result.booking.seatNumber}</p>
               </div>
            </div>

            {/* LISTE D'EMBARQUEMENT */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <Users size={16} className="text-slate-400" />
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contrôle de montée</h3>
                </div>

                {!result.valid ? (
                    <div className="p-8 bg-amber-50 rounded-3xl border-2 border-amber-100 text-center space-y-4">
                        <p className="text-sm font-black text-amber-800 uppercase italic">Embarquement verrouillé</p>
                        {canCollectMoney && (
                            <Button 
                                onClick={() => supabase.from('bookings').update({status:'PAYE'}).eq('id', result.booking.id).then(()=>handleValidate(result.booking.bookingNumber))}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl"
                            >
                                ENCAISSER {(result.booking.amount || 0).toLocaleString()} F
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {result.booking.passengers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-4 bg-white border-2 border-slate-50 rounded-2xl">
                                <p className="font-black text-xs text-slate-800 uppercase">{p.first_name} {p.last_name}</p>
                                {p.boarded ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px]">À BORD</Badge>
                                ) : (
                                    <Button onClick={() => handleBoardPassenger(p.id)} className="h-9 px-6 rounded-xl font-black text-[10px] uppercase bg-slate-900">Embarquer</Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}