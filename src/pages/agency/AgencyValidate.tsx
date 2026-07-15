"use client"

import { useState } from 'react';
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
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

// Tarifs forfaitaires pour le mode BUS
const BUS_LUGGAGE_RATES = [
  { label: 'Sac de voyage / Valise', price: 1000 },
  { label: 'Grand Sac (Ballot / Mbinda)', price: 2000 },
  { label: 'Sac de vivres (Riz/Manioc)', price: 1500 },
  { label: 'Carton / Caisse', price: 2500 },
  { label: 'Électroménager (TV, etc)', price: 3000 },
];

type PassengerData = {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string | null;
  seatNumber: string | null;
  boarded: boolean;
};

type LuggageData = {
  id: string;
  label: string;
  quantity: number;
  total_price: number;
};

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
    departureDate: string;
    departureTime: string;
    paymentStatus: string;
    rawStatus: string;
    passengers: PassengerData[];
    // Infos Bagages & Trajet
    tripType: string;
    luggageRule: string; 
    freeWeight: number;
    excessPrice: number;
    luggages: LuggageData[];
  };
};

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  // États pour le formulaire bagages
  const [weightInput, setWeightInput] = useState<string>('');
  const [selectedBusItem, setSelectedBusItem] = useState(BUS_LUGGAGE_RATES[0]);
  const [qtyInput, setQtyInput] = useState('1');

  const userRole = user?.role?.toUpperCase();
  const canCollectMoney = ['CAISSIER', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');
  const canBoardPassengers = ['AGENCE_EMBARQUEMENT', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');
  const isAgencyStaff = ['AGENT', 'AGENCE_EMBARQUEMENT', 'CAISSIER', 'SERVICE_COLIS', 'ADMIN'].includes(userRole || '');

  /**
   * Recherche et chargement du billet + passagers + bagages
   */
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

      // Requête SQL avec récupération simultanée des bagages
      const { data: b, error } = await supabase
        .from('bookings')
        .select(`
          *, 
          trip:trips(*, from:cities!from_id(name), to:cities!to_id(name), company:companies(name)), 
          passengers(*),
          luggages(*)
        `)
        .eq('reference', ref)
        .single();

      if (error || !b) {
        setResult({ valid: false, message: 'Billet introuvable.' });
        toast.error('Billet introuvable');
        return;
      }

      if (isAgencyStaff && user?.companyId && b.trip.company_id !== user.companyId) {
        setResult({ valid: false, message: `Accès refusé : Compagnie différente.` });
        toast.error("Accès non autorisé.");
        return;
      }

      const lead = b.passengers[0];
      const passengerName = lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme';
      
      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'Billet validé !' : 'Attention : Paiement requis.',
        booking: {
          id: b.id,
          bookingNumber: b.reference,
          passengerName,
          passengerPhone: b.contact_phone,
          seatNumber: b.passengers.map((p: any) => p.seat_number).filter(Boolean).join(', ') || '—',
          departureCity: b.trip.from.name,
          arrivalCity: b.trip.to.name,
          departureDate: b.trip.departure_date,
          departureTime: b.trip.departure_time,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
          rawStatus: b.status,
          passengers: b.passengers.map((p: any) => ({ ...p, firstName: p.first_name, lastName: p.last_name })),
          tripType: b.trip.type || 'BUS',
          luggageRule: b.trip.luggage_rule_type || 'PER_ITEM',
          freeWeight: b.trip.free_weight_limit || 30,
          excessPrice: b.trip.excess_weight_price || 500,
          luggages: b.luggages || [],
        }
      });
    } catch (e) {
      toast.error('Erreur lors de la vérification.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enregistrement d'un bagage (Train ou Bus)
   */
  const handleSaveLuggage = async () => {
    if (!result?.booking) return;
    setLoading(true);

    try {
      let payload: any = {
        booking_id: result.booking.id,
        passenger_id: result.booking.passengers[0]?.id || null,
      };

      if (result.booking.tripType === 'TRAIN') {
        const w = parseFloat(weightInput);
        if (isNaN(w) || w <= 0) {
          toast.error("Saisissez un poids valide.");
          setLoading(false);
          return;
        }
        const excess = Math.max(0, w - result.booking.freeWeight);
        payload = {
          ...payload,
          label: `Poids total : ${w}kg`,
          weight: w,
          is_excess_weight: excess > 0,
          total_price: excess * result.booking.excessPrice,
          quantity: 1,
          price_per_unit: result.booking.excessPrice
        };
      } else {
        const qty = parseInt(qtyInput);
        if (isNaN(qty) || qty <= 0) {
          toast.error("Quantité invalide.");
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          label: selectedBusItem.label,
          quantity: qty,
          price_per_unit: selectedBusItem.price,
          total_price: selectedBusItem.price * qty,
        };
      }

      const { error } = await supabase.from('luggages').insert([payload]);
      if (error) throw error;

      toast.success("Bagage enregistré avec succès !");
      
      // RECHARGEMENT AUTOMATIQUE POUR METTRE À JOUR LE BILLET À L'ÉCRAN
      await handleValidate(result.booking.bookingNumber);

      setWeightInput('');
      setQtyInput('1');
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'enregistrement du bagage.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Action : Embarquer un passager
   */
  const handleBoardPassenger = async (passengerId: string) => {
    if (!canBoardPassengers) {
      toast.error("Seul l'agent d'embarquement peut valider la montée.");
      return;
    }
    setBoardingId(passengerId);
    try {
      const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      if (error) throw error;
      await handleValidate(result?.booking?.bookingNumber);
      toast.success("Passager à bord !");
    } catch (err) {
      toast.error("Erreur de mise à jour.");
    } finally {
      setBoardingId(null);
    }
  };

  /**
   * Action : Encaisser le billet au guichet
   */
  const handleCollectPayment = async () => {
    if (!result?.booking?.id || !canCollectMoney) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('bookings').update({ status: 'PAYE' }).eq('id', result.booking.id);
      if (error) throw error;
      toast.success("Encaissement validé !");
      await handleValidate(result.booking.bookingNumber);
    } catch (e) {
      toast.error("Erreur d'encaissement.");
    } finally {
      setLoading(false);
    }
  };

  // Calcul du montant total cumulé des bagages
  const luggageTotal = result?.booking?.luggages?.reduce((sum, l) => sum + Number(l.total_price || 0), 0) || 0;

  return (
    <div className="max-w-xl text-foreground text-left mx-auto p-4 pb-20">
      <h1 className="text-2xl font-black mb-1">Contrôle & Bagages</h1>
      <p className="text-muted-foreground mb-8 text-xs uppercase tracking-widest font-bold">Gestion des départs en temps réel</p>

      {/* RECHERCHE DE BILLET */}
      <div className="bg-card border-2 rounded-3xl p-6 mb-6 shadow-sm">
        <Label className="text-xs font-black uppercase mb-3 block text-primary">Scanner ou saisir le numéro</Label>
        <div className="flex gap-2">
          <Input 
            value={qrInput} 
            onChange={e => setQrInput(e.target.value)} 
            placeholder="GAB-XXXXXX" 
            onKeyDown={e => e.key === 'Enter' && handleValidate()} 
            disabled={loading}
          />
          <Button onClick={() => handleValidate()} disabled={loading || !qrInput.trim()} className="rounded-xl px-6">
            {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {result && result.booking && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          {/* CARTE BILLET */}
          <div className={`border-2 rounded-3xl p-6 ${result.valid ? 'border-emerald-500 bg-emerald-50/30' : 'border-amber-500 bg-amber-50/30'}`}>
            <div className="flex items-center gap-3 mb-6">
              {result.valid ? <CheckCircle className="h-8 w-8 text-emerald-600" /> : <AlertCircle className="h-8 w-8 text-amber-600" />}
              <span className="text-xl font-black">{result.message}</span>
            </div>

            <div className="grid grid-cols-2 gap-y-4 text-sm border-t border-dashed pt-4">
              <InfoField label="Passager" value={result.booking.passengerName} />
              <InfoField label="N° Billet" value={result.booking.bookingNumber} />
              <InfoField label="Trajet" value={`${result.booking.departureCity} → ${result.booking.arrivalCity}`} />
              <InfoField label="Siège" value={result.booking.seatNumber} />
            </div>

            {/* LISTE DES BAGAGES ENREGISTRÉS */}
            {result.booking.luggages.length > 0 && (
              <div className="mt-6 pt-4 border-t border-dashed space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Bagages Enregistrés sur ce billet</p>
                <div className="space-y-1.5">
                  {result.booking.luggages.map((lug) => (
                    <div key={lug.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-primary/10 text-sm shadow-xs">
                      <span className="font-bold">{lug.quantity > 1 ? `${lug.quantity}x ` : ''}{lug.label}</span>
                      <span className="font-black text-primary">{lug.total_price.toLocaleString()} FCFA</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between p-3 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase mt-2 shadow-sm">
                  <span>Total Bagages</span>
                  <span>{luggageTotal.toLocaleString()} FCFA</span>
                </div>
              </div>
            )}

            {/* FORMULAIRE ENREGISTREMENT BAGAGES */}
            <div className="mt-8 pt-6 border-t-2 border-white/50">
              <h3 className="font-black text-sm flex items-center gap-2 mb-4 uppercase tracking-tighter">
                <Package className="h-4 w-4 text-primary" /> Enregistrer un Bagage
              </h3>
              
              <div className="bg-white/80 p-4 rounded-2xl space-y-4 border border-slate-200">
                {result.booking.tripType === 'TRAIN' ? (
                  /* MODE TRAIN : PAR POIDS */
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">Poids total (Limite gratuite : {result.booking.freeWeight}kg)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Ex: 45" 
                        value={weightInput} 
                        onChange={e => setWeightInput(e.target.value)} 
                        className="bg-white font-bold" 
                      />
                      <Button onClick={handleSaveLuggage} disabled={loading} variant="default" className="font-bold">
                        {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : "Calculer & Ajouter"}
                      </Button>
                    </div>
                    {parseFloat(weightInput) > result.booking.freeWeight && (
                      <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                        Surplus : {parseFloat(weightInput) - result.booking.freeWeight}kg • Frais supplémentaire : {((parseFloat(weightInput) - result.booking.freeWeight) * result.booking.excessPrice).toLocaleString()} FCFA
                      </p>
                    )}
                  </div>
                ) : (
                  /* MODE BUS : PAR TYPE D'ARTICLE */
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">Type de bagage / colis à bord</Label>
                    <div className="space-y-2">
                      <select 
                        className="w-full h-11 rounded-xl border bg-white px-3 text-sm font-bold shadow-xs"
                        onChange={(e) => setSelectedBusItem(JSON.parse(e.target.value))}
                      >
                        {BUS_LUGGAGE_RATES.map((item, i) => (
                          <option key={i} value={JSON.stringify(item)}>{item.label} — {item.price.toLocaleString()} FCFA</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          min="1" 
                          value={qtyInput} 
                          onChange={e => setQtyInput(e.target.value)} 
                          className="w-20 bg-white font-bold text-center" 
                        />
                        <Button onClick={handleSaveLuggage} disabled={loading} className="flex-1 font-bold gap-2">
                          {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4"/>}
                          Ajouter au billet
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* LISTE D'EMBARQUEMENT DES PASSAGERS */}
            {result.valid && (
              <div className="mt-8 pt-6 border-t border-dashed">
                 <h3 className="font-black text-sm mb-4 uppercase flex items-center gap-2">
                   <Users className="h-4 w-4" /> Contrôle Embarquement
                 </h3>
                 <div className="space-y-2">
                    {result.booking.passengers.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-xs border border-emerald-100">
                        <div>
                          <p className="font-bold text-sm">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-primary font-bold">Siège {p.seatNumber || "—"}</p>
                        </div>
                        {p.boarded ? (
                          <span className="text-emerald-600 font-black text-[10px] uppercase flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5"/> Embarqué
                          </span>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleBoardPassenger(p.id)} 
                            disabled={!canBoardPassengers || boardingId === p.id} 
                            className="h-8 text-xs font-bold gap-1"
                          >
                             {boardingId === p.id ? <RefreshCw className="animate-spin h-3 w-3"/> : <UserCheck className="h-3.5 w-3.5" />}
                             Valider la montée
                          </Button>
                        )}
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>

          {/* SECTION CAISSIER POUR LES BILLETS NON PAYÉS */}
          {!result.valid && canCollectMoney && (
            <div className="bg-amber-600 p-6 rounded-3xl shadow-xl text-white">
              <p className="font-bold text-sm mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Action Caissier : Encaisser le billet
              </p>
              <Button onClick={handleCollectPayment} disabled={loading} className="w-full h-12 bg-white text-amber-700 hover:bg-amber-50 font-black text-lg rounded-2xl">
                {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : "Valider le paiement Cash"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">{label}</div>
      <div className="font-bold text-slate-800 truncate">{value || '—'}</div>
    </div>
  );
}