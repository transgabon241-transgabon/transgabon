"use client"

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Search, 
  CreditCard, 
  RefreshCw, 
  Users, 
  UserCheck, 
  AlertCircle,
  Package,
  Lock,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Hash,
  Ship,
  Bus,
  Train,
  MapPin,
  Gem,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

/** ... types PassengerData, LuggageData, AgencyLuggageType restent identiques ... */

type Result = {
  valid: boolean; 
  message: string;
  booking?: {
    id: string;
    bookingNumber: string;
    passengerName: string;
    passengerPhone: string;
    seatNumber: string;
    departureCity: string;
    arrivalCity: string;
    isEscale: boolean; // NOUVEAU : Pour alerter l'agent
    classLabel: string;
    classCode: string;
    paymentStatus: string;
    rawStatus: string;
    passengers: any[];
    tripType: string;
    registration: string;
    freeWeight: number;
    excessPrice: number;
    luggages: any[];
    companyId: string;
    amount: number;
  };
};

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [weightInput, setWeightInput] = useState<string>('');
  const [selectedBusItem, setSelectedBusItem] = useState<any | null>(null);
  const [qtyInput, setQtyInput] = useState('1');

  const userRole = user?.role?.toUpperCase();
  const canCollectMoney = ['CAISSIER', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');
  const canBoardPassengers = ['AGENCE_EMBARQUEMENT', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');

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
            company:companies (*),
            vehicle:vehicles (registration)
          ),
          passengers (*),
          luggages (*)
        `)
        .eq('reference', ref)
        .maybeSingle();

      if (error) throw error;
      if (!b) {
        setResult({ valid: false, message: 'Billet introuvable.' });
        setLoading(false);
        return;
      }

      const { data: rates } = await supabase.from('company_luggage_settings').select('label, price').eq('company_id', b.trip.company_id);
      if (rates) setAgencyRates(rates);

      const classMapping: Record<string, string> = {
        'VIP': 'Salon VIP', 'BUSINESS': 'Business', '1ERE_CLASSE': '1ère Classe',
        '2EME_CLASSE': '2ème Classe', 'ECO': 'Économique', 'STANDARD': 'Standard'
      };

      // DÉTERMINATION DE LA DESTINATION RÉELLE
      const finalDest = b.arrival_city_name || b.trip.to_city?.name;
      const isEscale = b.arrival_city_name && b.arrival_city_name !== b.trip.to_city?.name;

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'Billet Validé' : 'Paiement Requis',
        booking: {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: `${b.passengers[0]?.first_name || ''} ${b.passengers[0]?.last_name || ''}`,
          passengerPhone: b.contact_phone,
          seatNumber: (b.passengers || []).map((p: any) => p.seat_number).filter(Boolean).join(', ') || '—',
          departureCity: b.trip.from_city?.name || '—',
          arrivalCity: finalDest, // Affiche l'escale si elle existe
          isEscale: !!isEscale,   // True si c'est un arrêt avant le terminus
          classLabel: classMapping[b.class_type] || 'Standard',
          classCode: b.class_type,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
          rawStatus: b.status,
          passengers: b.passengers,
          tripType: b.trip.type,
          registration: b.trip.vehicle?.registration || '—',
          freeWeight: b.trip.company.default_free_weight_limit || 30,
          excessPrice: b.trip.company.default_excess_weight_price || 500,
          luggages: b.luggages || [],
          companyId: b.trip.company_id,
          amount: Number(b.total_amount) || 0
        }
      });
      setCurrentPage(1);
    } catch (e) {
      toast.error('Erreur de validation');
    } finally {
      setLoading(false);
    }
  };

  /** ... handleBoardPassenger et handleSaveLuggage restent identiques ... */
  const handleBoardPassenger = async (passengerId: string) => {
    if (!result?.valid) { toast.error("Paiement requis."); return; }
    setBoardingId(passengerId);
    try {
      const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      if (error) throw error;
      toast.success("Embarqué !");
      handleValidate(result?.booking?.bookingNumber);
    } finally { setBoardingId(null); }
  };

  const luggageTotal = useMemo(() => result?.booking?.luggages?.reduce((sum: number, l: any) => sum + Number(l.total_price || 0), 0) || 0, [result]);
  const TransportIcon = result?.booking?.tripType === 'BOAT' ? Ship : result?.booking?.tripType === 'TRAIN' ? Train : Bus;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 text-left space-y-6 animate-in fade-in duration-500">
      
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm w-full">
        <div className="p-3 bg-slate-900 rounded-2xl shadow-lg text-white"><Ticket size={24} /></div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">Guichet Contrôle</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic">Vérification des titres</p>
        </div>
      </header>

      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-4 shadow-xl flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="RÉFÉRENCE OU SCAN QR..." 
          className="h-14 rounded-2xl border-none bg-slate-50 font-black uppercase tracking-widest px-6 shadow-inner focus-visible:ring-primary"
          onKeyDown={e => e.key === 'Enter' && handleValidate()} 
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-14 w-14 rounded-2xl shadow-lg bg-primary">
          {loading ? <RefreshCw className="animate-spin" /> : <Search />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className={`border-4 rounded-[2.5rem] p-8 shadow-2xl transition-all ${result.valid ? 'border-emerald-500 bg-emerald-50/5' : 'border-amber-500 bg-amber-50/5'}`}>
            
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-dashed border-slate-200">
              <div className="flex items-center gap-4">
                {result.valid ? <CheckCircle size={40} className="text-emerald-600" /> : <AlertCircle size={40} className="text-amber-600" />}
                <div>
                    <span className="text-2xl font-black uppercase tracking-tighter block leading-none text-slate-900">{result.message}</span>
                    <Badge variant="outline" className="mt-2 border-primary/20 text-primary font-black text-[10px] uppercase px-3">{result.booking.classLabel}</Badge>
                </div>
              </div>
              {result.booking.isEscale && (
                <div className="flex flex-col items-center">
                    <Badge className="bg-amber-500 text-white border-none font-black text-[10px] animate-pulse">ARRÊT INTERMÉDIAIRE</Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-y-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-inner">
              <div className="flex items-center justify-between">
                <InfoField label="Nom du Voyageur" value={result.booking.passengerName} />
                <div className="text-right">
                    <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70">Siège(s)</Label>
                    <p className="bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-sm">{result.booking.seatNumber}</p>
                </div>
              </div>

              {/* TRAJET DÉTAILLÉ */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-slate-400">Départ</Label>
                        <p className="font-black text-sm text-slate-900 uppercase">{result.booking.departureCity}</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                        <ArrowRight size={16} className="text-primary" />
                        <div className="h-0.5 w-full bg-slate-200 border-t border-dashed" />
                    </div>
                    <div className="space-y-1 text-right">
                        <Label className="text-[9px] font-black uppercase text-slate-400">Destination Billet</Label>
                        <p className="font-black text-sm text-primary uppercase">{result.booking.arrivalCity}</p>
                    </div>
                </div>
                {result.booking.isEscale && (
                    <p className="text-[9px] font-bold text-amber-600 uppercase mt-3 text-center bg-amber-50 py-1 rounded-lg border border-amber-100">
                        Attention : Le passager descend avant le terminus du voyage.
                    </p>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-2">
                 <InfoField label="N° de Billet" value={result.booking.bookingNumber} />
                 <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-primary shadow-md">
                        <TransportIcon size={16} />
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] font-black uppercase text-slate-900 opacity-70 leading-none">Matériel / Immat</span>
                        <p className="font-mono text-xs font-black text-slate-900 uppercase mt-0.5">{result.booking.registration}</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* ... Sections Bagages, Embarquement et Caisse restent identiques à votre version fonctionnelle ... */}
            {/* Note: Assurez-vous d'avoir bien recopié les sections Bagages et Embarquement ici */}
            
            {/* SECTION EMBARQUEMENT (Exemple simplifié pour la démo) */}
            <div className="mt-8 space-y-4">
                <h3 className="text-[10px] font-black uppercase flex items-center gap-2 text-slate-900 opacity-70 tracking-widest ml-4">
                    <Users size={14} /> Liste d'embarquement
                </h3>
                {result.valid ? (
                    <div className="space-y-3">
                        {result.booking.passengers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between bg-white border-2 border-slate-50 p-5 rounded-3xl shadow-sm">
                                <p className="font-black text-sm text-slate-900 uppercase">{p.first_name} {p.last_name}</p>
                                {p.boarded ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 uppercase text-[9px] font-black">À BORD</Badge>
                                ) : (
                                    <Button onClick={() => handleBoardPassenger(p.id)} className="h-10 px-6 rounded-xl font-black text-[10px] uppercase bg-slate-900">Embarquer</Button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-amber-100/50 p-6 rounded-3xl border-2 border-amber-200 text-center">
                        <p className="text-xs font-black uppercase text-amber-900">Embarquement bloqué : Paiement requis</p>
                    </div>
                )}
            </div>
          </div>
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