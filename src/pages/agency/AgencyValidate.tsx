"use client"

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle, Search, RefreshCw, AlertCircle, Package, Ticket, 
  Hash, Ship, Bus, Train, Plane, ArrowRight, Phone, Wallet, Plus, Scale, Gem, Calculator, Info, Lock,
  Calendar, Clock, MapPin, Car, UserCheck, Trash2, Pencil, X, Save
} from 'lucide-react';

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editRateId, setEditRateId] = useState("");

  const userRole = user?.role;
  const isChefOrAdmin = ['Administrateur', 'Chef d\'agence'].includes(userRole || '');
  const canCollectMoney = ['Administrateur', 'Agent', 'Caissier', 'Chef d\'agence'].includes(userRole || '');
  const canBoard = ['Administrateur', 'Agent', 'Agent Embarquement', 'Chef d\'agence'].includes(userRole || '');

  const currentCalculation = useMemo(() => {
    if (!result?.booking) return 0;
    if (result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE') {
      const w = parseFloat(weightInput) || 0;
      return Math.max(0, w - result.booking.freeWeight) * result.booking.excessPrice;
    } else {
      const rate = agencyRates.find(r => r.id === selectedRateId);
      return rate ? rate.price * (parseInt(qtyInput) || 1) : 0;
    }
  }, [weightInput, selectedRateId, qtyInput, result, agencyRates]);

  const handleValidate = async (forcedRef?: string) => {
    const targetRef = forcedRef || qrInput.trim();
    if (!targetRef) return;
    setLoading(true);
    try {
      let ref = targetRef.toUpperCase();
      const { data: b, error } = await supabase
        .from('bookings')
        .select(`*, trip:trips (*, from_city:cities!from_id (name), to_city:cities!to_id (name), company:companies (*), vehicle:vehicles (name, registration)), passengers (*), luggages (*)`)
        .eq('reference', ref).maybeSingle();

      if (error) throw error;
      if (!b) { setResult({ valid: false, message: 'BILLET INTROUVABLE' }); return; }

      const { data: rates } = await supabase.from('company_luggage_settings').select('*').eq('company_id', b.trip.company_id);
      if (rates) setAgencyRates(rates);

      const luggageTotal = (b.luggages || []).reduce((sum: number, l: any) => sum + (Number(l.total_price) || 0), 0);
      const classMapping: any = { 'VIP': 'SALON VIP', 'BUSINESS': 'BUSINESS', 'ECO': 'ÉCONOMIQUE', '1ERE_CLASSE': '1ÈRE CLASSE', '2EME_CLASSE': '2ÈME CLASSE' };

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'ACCÈS VALIDE' : 'PAIEMENT REQUIS',
        booking: {
          ...b,
          id: b.id,
          bookingNumber: b.reference,
          passengerName: `${b.passengers[0]?.first_name || ''} ${b.passengers[0]?.last_name || ''}`,
          departureCity: b.trip.from_city?.name,
          arrivalCity: b.arrival_city_name || b.trip.to_city?.name,
          departureDate: b.trip.departure_date,
          departureTime: b.trip.departure_time,
          vehicleName: b.trip.vehicle?.name || 'Standard',
          registration: b.trip.vehicle?.registration || 'N/A',
          classLabel: classMapping[b.class_type] || b.class_type,
          ticketAmount: Number(b.total_amount) || 0,
          luggageAmount: luggageTotal,
          totalToPay: Number(b.total_amount) + luggageTotal,
          tripType: b.trip.type,
          seatNumber: b.passengers[0]?.seat_number || '—',
          freeWeight: b.trip.company.default_free_weight_limit || 30,
          excessPrice: b.trip.company.default_excess_weight_price || 500
        }
      });
    } catch (e) { toast.error('Erreur de lecture'); } finally { setLoading(false); }
  };

  const handleAddLuggage = async () => {
    if (!result?.booking) return;
    try {
      const isWeight = result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE';
      const label = isWeight ? `Pesée (${weightInput}kg)` : agencyRates.find(r => r.id === selectedRateId)?.label;
      
      const { error } = await supabase.from('luggages').insert([{
        booking_id: result.booking.id,
        passenger_id: result.booking.passengers[0]?.id,
        label,
        quantity: parseInt(qtyInput) || 1,
        total_price: currentCalculation
      }]);
      if (error) throw error;
      if (currentCalculation > 0) await supabase.from('bookings').update({ status: 'ATTENTE' }).eq('id', result.booking.id);
      toast.success("Bagage ajouté");
      setWeightInput(""); setSelectedRateId("");
      handleValidate(result.booking.bookingNumber);
    } catch (e) { toast.error("Erreur d'ajout"); }
  };

  const startEdit = (lug: any) => {
    setEditingId(lug.id);
    setEditQty(lug.quantity.toString());
    if (result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE') {
        const weightMatch = lug.label.match(/\((.*?)kg\)/);
        setEditWeight(weightMatch ? weightMatch[1] : "");
    } else {
        const rate = agencyRates.find(r => r.label === lug.label);
        setEditRateId(rate?.id || "");
    }
  };

  const handleUpdateLuggage = async (lugId: string) => {
    try {
      let newPrice = 0;
      let newLabel = "";
      const isWeight = result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE';

      if (isWeight) {
        const w = parseFloat(editWeight) || 0;
        newPrice = Math.max(0, w - result.booking.freeWeight) * result.booking.excessPrice;
        newLabel = `Pesée (${w}kg)`;
      } else {
        const rate = agencyRates.find(r => r.id === editRateId);
        newPrice = (rate?.price || 0) * (parseInt(editQty) || 1);
        newLabel = rate?.label || "Bagage";
      }

      const { error } = await supabase.from('luggages').update({
        label: newLabel,
        quantity: parseInt(editQty) || 1,
        total_price: newPrice
      }).eq('id', lugId);

      if (error) throw error;
      await supabase.from('bookings').update({ status: 'ATTENTE' }).eq('id', result.booking.id);
      toast.success("Bagage mis à jour");
      setEditingId(null);
      handleValidate(result.booking.bookingNumber);
    } catch (e) { toast.error("Erreur de modification"); }
  };

  const handleDeleteLuggage = async (lugId: string) => {
    if (!confirm("Supprimer ce bagage ?")) return;
    try {
      const { error } = await supabase.from('luggages').delete().eq('id', lugId);
      if (error) throw error;
      handleValidate(result.booking.bookingNumber);
      toast.success("Bagage supprimé");
    } catch (e) { toast.error("Erreur de suppression"); }
  };

  const handleProcessPayment = async () => {
    try {
      await supabase.from('bookings').update({ status: 'PAYE' }).eq('id', result.booking.id);
      toast.success("Paiement validé");
      handleValidate(result.booking.bookingNumber);
    } catch (e) { toast.error("Erreur caisse"); }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      toast.success("Passager embarqué");
      handleValidate(result.booking.bookingNumber);
    } finally { setBoardingId(null); }
  };

  const TransportIcon = result?.booking?.tripType === 'PLANE' ? Plane : result?.booking?.tripType === 'TRAIN' ? Train : Bus;

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-4 pb-20 space-y-4 bg-background min-h-screen text-foreground">
      
      <header className="flex items-center gap-3 bg-slate-900 p-4 rounded-[1.5rem] border-2 border-slate-800 shadow-xl text-left">
        <div className="p-2 bg-emerald-600 rounded-xl text-white shrink-0"><UserCheck size={20} /></div>
        <div className="min-w-0">
          <h1 className="text-lg font-black italic uppercase leading-none text-white">Boarding Pass Control</h1>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Contrôle Billets & Manifeste</p>
        </div>
      </header>

      <div className="bg-slate-900 border-2 border-slate-800 rounded-[1.2rem] p-2 flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="RÉFÉRENCE OU SCAN..." 
          className="h-12 rounded-xl border-none bg-slate-950 text-white font-black uppercase text-xs px-4"
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-12 w-12 rounded-xl bg-primary">
          {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 text-left">
          <div className={`border-2 rounded-[2.5rem] p-5 bg-slate-900 shadow-2xl relative overflow-hidden ${result.valid ? 'border-emerald-500' : 'border-amber-500'}`}>
            
            {/* --- EN-TÊTE DU BILLET --- */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-slate-800">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${result.valid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                   {result.valid ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter text-white leading-none">{result.message}</h2>
                  <p className="text-xs font-bold text-primary mt-1 flex items-center gap-2">
                    <Hash size={12}/> {result.booking.bookingNumber}
                  </p>
                </div>
              </div>
              <Badge className="bg-slate-950 border border-slate-800 text-white h-8 px-4 font-black uppercase text-[10px] tracking-widest">
                {result.booking.classLabel}
              </Badge>
            </div>

            {/* --- DÉTAILS DU VOYAGE (ITINÉRAIRE) --- */}
            <div className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800 mb-6">
                <div className="flex items-center justify-between gap-4 mb-6">
                   <div className="text-left flex-1 min-w-0">
                      <Label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Origine</Label>
                      <p className="text-base font-black text-white uppercase truncate">{result.booking.departureCity}</p>
                   </div>
                   <div className="flex flex-col items-center px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div className="h-px w-10 border-t-2 border-dashed border-slate-800" />
                        <TransportIcon size={20} className="text-primary mx-1" />
                        <div className="h-px w-10 border-t-2 border-dashed border-slate-800" />
                        <ArrowRight size={18} className="text-primary" />
                      </div>
                   </div>
                   <div className="text-right flex-1 min-w-0">
                      <Label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Destination</Label>
                      <p className="text-base font-black text-white uppercase truncate">{result.booking.arrivalCity}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-slate-800/50">
                    <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-slate-500"><Calendar size={10} className="text-primary"/> Date</span>
                        <p className="text-[11px] font-black text-white">{new Date(result.booking.departureDate).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'})}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-slate-500"><Clock size={10} className="text-primary"/> Départ</span>
                        <p className="text-[11px] font-black text-white">{result.booking.departureTime}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-slate-500"><Car size={10} className="text-primary"/> Appareil</span>
                        <p className="text-[10px] font-black text-white truncate uppercase">{result.booking.vehicleName}</p>
                        <p className="text-[8px] font-bold text-slate-500 leading-none">{result.booking.registration}</p>
                    </div>
                    <div className="bg-primary/10 rounded-xl p-2 text-center border border-primary/20">
                        <span className="text-[8px] font-black uppercase text-primary block mb-0.5">Siège</span>
                        <p className="text-base font-black text-primary leading-none">{result.booking.seatNumber}</p>
                    </div>
                </div>
            </div>

            {/* --- PASSAGER --- */}
            <div className="bg-slate-800/30 p-4 rounded-2xl mb-6 border border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-slate-400 border border-slate-700">
                      <UserCheck size={20} />
                   </div>
                   <div>
                      <Label className="text-[8px] font-black uppercase text-slate-500">Nom du passager</Label>
                      <p className="text-sm font-black text-white uppercase">{result.booking.passengerName}</p>
                   </div>
                </div>
                <div className="text-right">
                   <Label className="text-[8px] font-black uppercase text-slate-500">Contact</Label>
                   <p className="text-[10px] font-bold text-primary flex items-center justify-end gap-1"><Phone size={10}/> {result.booking.passengerPhone}</p>
                </div>
            </div>

            {/* --- SECTION BAGAGES (EXISTANTE & AMÉLIORÉE) --- */}
            <div className="space-y-2 mb-6">
                <Label className="text-[9px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Détail Bagagerie</Label>
                {result.booking.luggages.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                        {result.booking.luggages.map((lug: any) => (
                            <div key={lug.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 transition-all">
                                {editingId === lug.id ? (
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            {result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE' ? (
                                                <Input type="number" value={editWeight} onChange={e => setEditWeight(e.target.value)} className="h-9 bg-slate-900 border-none text-white text-xs" placeholder="KG" />
                                            ) : (
                                                <select value={editRateId} onChange={e => setEditRateId(e.target.value)} className="flex-1 h-9 bg-slate-900 rounded-lg text-[10px] text-white px-2 outline-none">
                                                    {agencyRates.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                                </select>
                                            )}
                                            <Input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} className="w-14 h-9 bg-slate-900 border-none text-white text-xs text-center" />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={() => handleUpdateLuggage(lug.id)} className="flex-1 h-8 bg-emerald-600 text-[9px] uppercase font-black"><Save size={14} className="mr-2"/> Enregistrer</Button>
                                            <Button onClick={() => setEditingId(null)} variant="ghost" className="h-8 text-slate-500 px-2"><X size={14}/></Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase">{lug.label} (x{lug.quantity})</p>
                                            <p className="text-[9px] font-bold text-primary italic">{Number(lug.total_price).toLocaleString()} F</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button onClick={() => startEdit(lug)} variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-white"><Pencil size={14} /></Button>
                                            {isChefOrAdmin && (
                                                <Button onClick={() => handleDeleteLuggage(lug.id)} variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-500"><Trash2 size={14} /></Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 rounded-2xl border-2 border-dashed border-slate-800 text-center opacity-40">
                         <Package className="mx-auto mb-2" size={24}/>
                         <p className="text-[9px] font-black uppercase tracking-widest">Aucun bagage enregistré</p>
                    </div>
                )}
            </div>

            {/* --- POSTE DE PESAGE (AJOUT) --- */}
            <div className="bg-slate-950 p-4 rounded-[2rem] border-2 border-slate-800 mb-6 shadow-inner">
                <h4 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2 mb-4 tracking-widest"><Scale size={14} className="text-primary"/> Poste de Pesage Officiel</h4>
                <div className="space-y-4">
                    {(result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE') ? (
                        <div className="relative">
                            <Input type="number" placeholder="0.0" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-16 rounded-2xl border-none bg-slate-900 text-white font-black text-4xl text-center shadow-inner" />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-700 text-sm tracking-widest">KG</span>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                             <select value={selectedRateId} onChange={e => setSelectedRateId(e.target.value)} className="flex-1 h-12 rounded-xl bg-slate-900 border-none px-4 text-[10px] font-black uppercase text-white outline-none shadow-inner">
                                <option value="">SÉLECTIONNER TYPE...</option>
                                {agencyRates.map(r => <option key={r.id} value={r.id}>{r.label} ({r.price} F)</option>)}
                            </select>
                            <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-20 h-12 rounded-xl border-none bg-slate-900 text-white font-black text-center" />
                        </div>
                    )}
                    <Button onClick={handleAddLuggage} className="w-full h-14 rounded-2xl font-black bg-emerald-600 text-white uppercase text-[10px] tracking-widest gap-2 active:scale-95 transition-all shadow-xl">
                        <Plus size={18} /> {currentCalculation > 0 ? `Ajouter Excédent (+${currentCalculation.toLocaleString()} F)` : 'Valider conforme'}
                    </Button>
                </div>
            </div>

            {/* --- SECTION CAISSE --- */}
            {!result.valid && (
                <div className="bg-slate-800 p-5 rounded-[2rem] border border-slate-700 mb-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Global dû</Label>
                        <span className="text-3xl font-black text-emerald-500 tracking-tighter">{result.booking.totalToPay.toLocaleString()} F</span>
                    </div>
                    {canCollectMoney ? (
                        <Button onClick={handleProcessPayment} className="w-full h-14 bg-emerald-600 text-white font-black uppercase text-xs rounded-2xl shadow-lg active:scale-95 gap-3">
                            <Wallet size={18}/> Encaisser & Libérer le billet
                        </Button>
                    ) : (
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-2">
                            <Info size={16} className="text-amber-500" />
                            <p className="text-[9px] font-bold text-amber-500 uppercase italic">Paiement requis au guichet principal</p>
                        </div>
                    )}
                </div>
            )}

            {/* --- MANIFESTE --- */}
            {result.valid && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.3em]">Manifeste d'embarquement</h3>
                    {result.booking.passengers.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl group hover:border-primary transition-colors">
                            <div className="text-left">
                                <p className="font-black text-sm text-white uppercase leading-none">{p.first_name} {p.last_name}</p>
                                <p className="text-[10px] font-bold text-primary mt-1 flex items-center gap-1">
                                    <MapPin size={10}/> Siège {result.booking.seatNumber}
                                </p>
                            </div>
                            {p.boarded ? (
                                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl border border-emerald-500/20">
                                    <CheckCircle size={14}/>
                                    <span className="font-black text-[9px] uppercase">Embarqué</span>
                                </div>
                            ) : (
                                <Button 
                                    disabled={!canBoard} 
                                    onClick={() => handleBoardPassenger(p.id)} 
                                    className="h-11 px-8 rounded-xl font-black bg-emerald-600 text-white shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest border-none"
                                >
                                    Valider
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}