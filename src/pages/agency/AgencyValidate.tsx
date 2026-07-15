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
  Plus,
  Lock,
  Calculator,
  Ticket
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

/**
 * TYPES DE DONNÉES
 */
type PassengerData = {
  id: string;
  firstName: string;
  lastName: string;
  boarded: boolean;
  seatNumber: string | null;
};

type LuggageData = {
  id: string;
  label: string;
  quantity: number;
  total_price: number;
};

type AgencyLuggageType = {
  label: string;
  price: number;
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
    paymentStatus: string;
    rawStatus: string;
    passengers: PassengerData[];
    tripType: string;
    freeWeight: number;
    excessPrice: number;
    luggages: LuggageData[];
    companyId: string;
  };
};

export default function AgencyValidate() {
  const { user } = useAuth();
  
  // États de l'interface
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  // États des formulaires bagages
  const [agencyRates, setAgencyRates] = useState<AgencyLuggageType[]>([]);
  const [weightInput, setWeightInput] = useState<string>('');
  const [selectedBusItem, setSelectedBusItem] = useState<AgencyLuggageType | null>(null);
  const [qtyInput, setQtyInput] = useState('1');

  // Gestion des permissions
  const userRole = user?.role?.toUpperCase();
  const canCollectMoney = ['CAISSIER', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');
  const canBoardPassengers = ['AGENCE_EMBARQUEMENT', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');

  /**
   * ACTION : VALIDER LE BILLET
   * Récupère les infos du trajet, des passagers et des bagages déjà enregistrés.
   */
  const handleValidate = async (forcedRef?: string) => {
    const targetRef = forcedRef || qrInput.trim();
    if (!targetRef) return;

    setLoading(true);
    try {
      let ref = targetRef.toUpperCase();
      // Gestion du format JSON si scan QR direct
      try {
        const parsed = JSON.parse(targetRef);
        if (parsed && parsed.ref) ref = parsed.ref.toUpperCase();
      } catch (e) {}

      const { data: b, error } = await supabase
        .from('bookings')
        .select(`
          *, 
          trip:trips(*, from:cities!from_id(name), to:cities!to_id(name), company:companies(*)), 
          passengers(*), 
          luggages(*)
        `)
        .eq('reference', ref)
        .single();

      if (error || !b) {
        setResult({ valid: false, message: 'Billet introuvable.' });
        return;
      }

      // Chargement des tarifs personnalisés de l'agence pour les colis/bagages
      const { data: rates } = await supabase
        .from('company_luggage_settings')
        .select('label, price')
        .eq('company_id', b.trip.company_id);

      if (rates) {
        setAgencyRates(rates);
        if (rates.length > 0) setSelectedBusItem(rates[0]);
      }

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'Billet prêt pour départ' : 'Paiement en attente',
        booking: {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: `${b.passengers[0]?.first_name} ${b.passengers[0]?.last_name}`,
          passengerPhone: b.contact_phone,
          seatNumber: b.passengers.map((p: any) => p.seat_number).filter(Boolean).join(', ') || '—',
          departureCity: b.trip.from.name,
          arrivalCity: b.trip.to.name,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
          rawStatus: b.status,
          passengers: b.passengers.map((p: any) => ({ ...p, firstName: p.first_name, lastName: p.last_name })),
          tripType: b.trip.type,
          freeWeight: b.trip.company.default_free_weight_limit || 30,
          excessPrice: b.trip.company.default_excess_weight_price || 500,
          luggages: b.luggages || [],
          companyId: b.trip.company_id
        }
      });
    } catch (e) {
      toast.error('Erreur de communication avec le serveur.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ACTION : ENREGISTRER UN BAGAGE
   * Applique la règle selon le transport (Poids pour Train / Forfait pour Bus).
   */
  const handleSaveLuggage = async () => {
    if (!result?.booking) return;
    
    // SÉCURITÉ : On bloque l'ajout si les passagers sont déjà dans le véhicule
    if (result.booking.passengers.some(p => p.boarded)) {
      toast.error("Impossible : Le passager est déjà embarqué.");
      return;
    }

    setLoading(true);
    try {
      let payload: any = {
        booking_id: result.booking.id,
        passenger_id: result.booking.passengers[0].id,
      };

      if (result.booking.tripType === 'TRAIN') {
        const w = parseFloat(weightInput);
        const excess = Math.max(0, w - result.booking.freeWeight);
        payload = { ...payload, label: `Pesée: ${w}kg`, total_price: excess * result.booking.excessPrice, quantity: 1 };
      } else {
        if (!selectedBusItem) return;
        const qty = parseInt(qtyInput);
        payload = { ...payload, label: selectedBusItem.label, quantity: qty, total_price: selectedBusItem.price * qty };
      }

      const { error } = await supabase.from('luggages').insert([payload]);
      if (error) throw error;
      
      toast.success("Bagage enregistré sur le billet");
      handleValidate(result.booking.bookingNumber); // Refresh
      setWeightInput('');
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * LOGIQUE DE CALCULS FINAUX
   */
  const isAnyPassengerBoarded = result?.booking?.passengers.some(p => p.boarded) || false;
  const luggageTotal = result?.booking?.luggages?.reduce((sum, l) => sum + Number(l.total_price || 0), 0) || 0;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 text-left space-y-8">
      
      {/* HEADER PROFESSIONNEL */}
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm w-full">
        <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
          <Ticket className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tight text-slate-900 uppercase">Guichet de Contrôle</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Validation & Gestion des départs</p>
        </div>
      </header>

      {/* ZONE DE RECHERCHE DYNAMIQUE */}
      <div className="bg-card border-2 border-primary/10 rounded-[2rem] p-6 shadow-sm">
        <Label className="text-[10px] font-black uppercase text-primary ml-2 mb-2 block">Scanner ou saisir le numéro de billet</Label>
        <div className="flex gap-2">
          <Input 
            value={qrInput} 
            onChange={e => setQrInput(e.target.value)} 
            placeholder="Ex: GAB-XXXXXX" 
            className="h-14 rounded-2xl border-2 font-bold text-lg px-6 focus:border-primary transition-all"
            onKeyDown={e => e.key === 'Enter' && handleValidate()} 
          />
          <Button onClick={() => handleValidate()} disabled={loading} className="h-14 px-8 rounded-2xl shadow-lg active:scale-95 transition-transform">
            {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Search className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {result && result.booking && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* CARTE RÉSULTAT PRINCIPALE */}
          <div className={`border-2 rounded-[2.5rem] p-8 shadow-xl transition-all ${result.valid ? 'border-emerald-500 bg-emerald-50/20 shadow-emerald-100/50' : 'border-amber-500 bg-amber-50/20 shadow-amber-100/50'}`}>
            
            {/* Statut du billet */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-dashed border-slate-200">
              <div className="flex items-center gap-4">
                {result.valid ? <CheckCircle className="h-10 w-10 text-emerald-600" /> : <AlertCircle className="h-10 w-10 text-amber-600" />}
                <div>
                  <span className="text-2xl font-black uppercase tracking-tighter block leading-none">{result.message}</span>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Vérification système OK</p>
                </div>
              </div>
              <Badge className={`rounded-full px-4 py-1 font-black text-[10px] uppercase border-2 ${result.valid ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                {result.booking.rawStatus}
              </Badge>
            </div>

            {/* Infos Passager */}
            <div className="grid grid-cols-2 gap-8 text-sm mb-10">
              <InfoField label="Nom du Voyageur" value={result.booking.passengerName} />
              <InfoField label="Référence Billet" value={result.booking.bookingNumber} />
              <InfoField label="Itinéraire" value={`${result.booking.departureCity} → ${result.booking.arrivalCity}`} />
              <InfoField label="Siège(s) attribué(s)" value={result.booking.seatNumber} />
            </div>

            {/* SECTION 1 : GESTION DES BAGAGES (Calcul dynamique) */}
            <div className="bg-white/60 p-6 rounded-[2rem] border-2 border-primary/5 shadow-inner mb-8 relative overflow-hidden">
               <h3 className="text-xs font-black uppercase mb-4 flex items-center gap-2 text-slate-500">
                 <Package className="h-4 w-4 text-primary" /> Enregistrement des Bagages
               </h3>
               
               {/* Affichage des bagages déjà présents */}
               {result.booking.luggages.length > 0 && (
                 <div className="space-y-2 mb-6">
                    {result.booking.luggages.map(lug => (
                      <div key={lug.id} className="flex justify-between items-center bg-white p-3 rounded-xl border-2 border-slate-50 text-xs font-bold shadow-sm">
                         <span className="text-slate-700">{lug.quantity}x {lug.label}</span>
                         <span className="text-primary font-black">{lug.total_price.toLocaleString()} FCFA</span>
                      </div>
                    ))}
                    <div className="flex justify-between p-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-tighter">
                      <span>Total à payer (Suppléments)</span>
                      <span>{luggageTotal.toLocaleString()} FCFA</span>
                    </div>
                 </div>
               )}

               {/* Verrouillage si déjà à bord */}
               {isAnyPassengerBoarded ? (
                 <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-2xl text-slate-500 font-bold text-xs italic border border-slate-200">
                    <Lock className="h-4 w-4" /> Modification impossible : Le passager est déjà en voyage.
                 </div>
               ) : (
                 <div className="space-y-4">
                    {result.booking.tripType === 'TRAIN' ? (
                      /* Mode TRAIN : Pesée au KG */
                      <div className="space-y-3">
                         <Label className="text-[10px] font-black uppercase ml-1">Saisie du poids total (Poids gratuit : {result.booking.freeWeight}kg)</Label>
                         <div className="flex gap-2">
                           <Input type="number" placeholder="Poids en KG" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-12 rounded-xl border-2 font-bold" />
                           <Button onClick={handleSaveLuggage} className="h-12 px-6 font-black uppercase text-xs rounded-xl shadow-lg"><Calculator className="mr-2 h-4 w-4"/> Calculer</Button>
                         </div>
                      </div>
                    ) : (
                      /* Mode BUS : Sélection par article */
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase ml-1">Type de bagage / colis</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select 
                            className="flex-1 h-12 rounded-xl border-2 bg-white px-4 text-sm font-bold shadow-sm focus:border-primary outline-none transition-all"
                            onChange={(e) => setSelectedBusItem(JSON.parse(e.target.value))}
                          >
                            {agencyRates.map((item, i) => (
                              <option key={i} value={JSON.stringify(item)}>{item.label} ({item.price} F)</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-20 h-12 rounded-xl border-2 font-black text-center" />
                            <Button onClick={handleSaveLuggage} className="flex-1 h-12 font-black uppercase text-xs rounded-xl shadow-lg"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
                          </div>
                        </div>
                      </div>
                    )}
                 </div>
               )}
            </div>

            {/* SECTION 2 : EMBARQUEMENT (Verrouillé si non payé) */}
            <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-200">
               <h3 className="text-xs font-black uppercase mb-4 flex items-center gap-2 text-slate-500">
                 <Users className="h-4 w-4 text-primary" /> Contrôle de la montée (Quai)
               </h3>
               
               {!result.valid ? (
                 <div className="bg-amber-100/50 p-6 rounded-[2rem] border-2 border-amber-200 flex items-center gap-4 text-amber-800 text-sm font-bold">
                   <div className="p-3 bg-amber-200 rounded-2xl"><CreditCard className="h-6 w-6" /></div>
                   <p>EMBARQUEMENT REFUSÉ : Veuillez diriger le voyageur vers la caisse pour régler son billet.</p>
                 </div>
               ) : (
                 <div className="grid gap-3">
                    {result.booking.passengers.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white border-2 border-slate-50 p-5 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group">
                        <div>
                          <p className="font-bold text-slate-800">{p.firstName} {p.lastName}</p>
                          <Badge variant="outline" className="mt-1 font-black text-[9px] uppercase tracking-widest border-primary/20 text-primary">Siège {p.seatNumber || "Libre"}</Badge>
                        </div>
                        {p.boarded ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase bg-emerald-50 px-4 py-2 rounded-xl border-2 border-emerald-100 shadow-inner">
                            <CheckCircle className="h-4 w-4"/> À Bord
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleBoardPassenger(p.id)} 
                            disabled={boardingId === p.id || !canBoardPassengers} 
                            className="h-10 px-6 font-black uppercase text-[10px] rounded-xl shadow-lg active:scale-95"
                          >
                             {boardingId === p.id ? <RefreshCw className="animate-spin h-4 w-4"/> : <UserCheck className="mr-2 h-4 w-4" />}
                             Valider montée
                          </Button>
                        )}
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>

          {/* SECTION 3 : CAISSE (Actions financières) */}
          {!result.valid && canCollectMoney && (
            <div className="bg-emerald-600 p-8 rounded-[3rem] shadow-2xl shadow-emerald-200/50 text-white flex flex-col sm:flex-row items-center justify-between gap-6 animate-pulse hover:animate-none transition-all">
              <div className="text-center sm:text-left">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Caisse Agence</p>
                <h4 className="text-xl font-black uppercase italic leading-tight">Encaisser le paiement total</h4>
              </div>
              <Button 
                onClick={() => supabase.from('bookings').update({status:'PAYE'}).eq('id', result.booking?.id).then(()=>handleValidate(result.booking?.bookingNumber))} 
                className="w-full sm:w-auto h-14 px-10 bg-white text-emerald-700 hover:bg-slate-50 font-black text-lg rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                VALIDER CASH
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * COMPOSANT : CHAMP D'INFORMATION
 */
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{label}</div>
      <div className="font-bold text-slate-900 text-base leading-tight truncate">{value || '—'}</div>
    </div>
  );
}