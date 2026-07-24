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

  // États pour l'ajout
  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");

  // États pour la modification
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editRateId, setEditRateId] = useState("");

  const userRole = user?.role;
  const isChefOrAdmin = ['Administrateur', 'Chef d\'agence'].includes(userRole || '');
  const canCollectMoney = ['Administrateur', 'Agent', 'Caissier', 'Chef d\'agence'].includes(userRole || '');
  const canBoard = ['Administrateur', 'Agent', 'Agent Embarquement', 'Chef d\'agence'].includes(userRole || '');

  // Calcul pour l'AJOUT
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
      const classMapping: any = { 'VIP': 'SALON VIP', 'BUSINESS': 'BUSINESS', 'ECO': 'ÉCO' };

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'ACCÈS VALIDE' : 'PAIEMENT REQUIS',
        booking: {
          ...b,
          id: b.id,
          bookingNumber: b.reference,
          passengerName: `${b.passengers[0]?.first_name || ''} ${b.passengers[0]?.last_name || ''}`,
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

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-4 pb-20 space-y-4 bg-background min-h-screen text-foreground">
      
      <header className="flex items-center gap-3 bg-slate-900 p-4 rounded-[1.5rem] border-2 border-slate-800 shadow-xl text-left">
        <div className="p-2 bg-emerald-600 rounded-xl text-white shrink-0"><UserCheck size={20} /></div>
        <div className="min-w-0">
          <h1 className="text-lg font-black italic uppercase leading-none text-white">Validation Embarquement</h1>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Contrôle Billets & Bagages</p>
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
          <div className={`border-2 rounded-[1.5rem] p-4 bg-slate-900 shadow-2xl ${result.valid ? 'border-emerald-500' : 'border-amber-500'}`}>
            
            <div className="flex items-center justify-between mb-4 border-b border-dashed border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                {result.valid ? <CheckCircle className="text-emerald-600 h-10 w-10" /> : <AlertCircle className="text-amber-600 h-10 w-10" />}
                <div>
                  <h2 className="text-sm font-black uppercase text-white">{result.message}</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{result.booking.passengerName}</p>
                </div>
              </div>
              <Badge className="bg-slate-800 text-[8px] font-black uppercase">{result.booking.classLabel}</Badge>
            </div>

            {/* --- LISTE DES BAGAGES --- */}
            <div className="space-y-2 mb-6">
                <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Bagages Enregistrés</Label>
                {result.booking.luggages.length > 0 ? (
                    result.booking.luggages.map((lug: any) => (
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
                    ))
                ) : (
                    <p className="text-[9px] text-slate-600 italic text-center py-2">Aucun bagage enregistré</p>
                )}
            </div>

            {/* --- POSTE DE PESAGE (AJOUT) --- */}
            <div className="bg-slate-950 p-4 rounded-2xl border-2 border-slate-800 mb-6 shadow-inner">
                <h4 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2 mb-4 tracking-widest"><Scale size={14} className="text-primary"/> Pesée Officielle</h4>
                <div className="space-y-4">
                    {(result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE') ? (
                        <div className="relative">
                            <Input type="number" placeholder="0.0" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-14 rounded-xl border-none bg-slate-900 text-white font-black text-3xl text-center shadow-inner" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-700 text-xs">KG</span>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                             <select value={selectedRateId} onChange={e => setSelectedRateId(e.target.value)} className="flex-1 h-11 rounded-xl bg-slate-900 border-none px-4 text-[10px] font-black uppercase text-white outline-none shadow-inner">
                                <option value="">SÉLECTIONNER TYPE...</option>
                                {agencyRates.map(r => <option key={r.id} value={r.id}>{r.label} ({r.price} F)</option>)}
                            </select>
                            <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-16 h-11 rounded-xl border-none bg-slate-900 text-white font-black text-center" />
                        </div>
                    )}
                    <Button onClick={handleAddLuggage} className="w-full h-12 rounded-xl font-black bg-emerald-600 text-white uppercase text-[10px] gap-2 active:scale-95 transition-all">
                        <Plus size={18} /> {currentCalculation > 0 ? `Ajouter (+${currentCalculation} F)` : 'Confirmer le poids'}
                    </Button>
                </div>
            </div>

            {/* --- SECTION CAISSE --- */}
            {!result.valid && (
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Total dû (Billet + Excédents)</Label>
                        <span className="text-2xl font-black text-emerald-500">{result.booking.totalToPay.toLocaleString()} F</span>
                    </div>
                    {canCollectMoney ? (
                        <Button onClick={handleProcessPayment} className="w-full h-12 bg-emerald-600 text-white font-black uppercase text-xs rounded-xl shadow-lg active:scale-95">Valider le Paiement Cash</Button>
                    ) : (
                        <p className="text-[9px] font-bold text-amber-500 text-center uppercase italic">En attente de paiement en caisse</p>
                    )}
                </div>
            )}

            {/* --- MANIFESTE --- */}
            {result.valid && (
                <div className="space-y-3">
                    <h3 className="text-[9px] font-black uppercase text-slate-500 ml-1">Manifeste Passager</h3>
                    {result.booking.passengers.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                            <div className="text-left">
                                <p className="font-black text-xs text-white uppercase leading-none">{p.first_name} {p.last_name}</p>
                                <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 italic">Siège {result.booking.seatNumber}</p>
                            </div>
                            {p.boarded ? (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-none px-3 h-8 rounded-lg font-black text-[8px]">EMBARQUÉ</Badge>
                            ) : (
                                <Button disabled={!canBoard} onClick={() => handleBoardPassenger(p.id)} className="h-10 px-6 rounded-lg font-black text-[9px] uppercase bg-emerald-600 text-white shadow-md active:scale-95">Valider</Button>
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