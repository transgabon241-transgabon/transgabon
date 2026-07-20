"use client"

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Package, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  Hash, 
  Ship, 
  Bus, 
  Train,
  Truck,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

type ParcelData = {
  id: string;
  trackingNumber: string;
  status: string;
  departureCity: string;
  arrivalCity: string;
  senderName: string;
  receiverName: string;
  companyName: string;
  parcelType: string;
  weightKg: number;
  description: string;
  date: string;
  price: number;
  paymentStatus: string;
  transportType: string;
  registration: string;
};

const STATUS_STEPS = ['En attente', 'Pris en charge', 'En transit', 'Arrivé', 'Livré'];

/**
 * COMPOSANT : BARRE DE PROGRESSION DU COLIS
 */
function StatusTimeline({ current }: { current: string }) {
  const idx = STATUS_STEPS.indexOf(current);
  const isReturned = current === 'Retourné';

  if (isReturned) {
    return (
      <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold mt-8 shadow-sm">
        <AlertCircle size={20} /> Colis retourné à l'expéditeur
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mt-10 mb-2 px-2 overflow-x-auto pb-4 scrollbar-hide">
      {STATUS_STEPS.map((step, i) => {
        const isDone = i <= idx;
        const isCurrent = i === idx;
        return (
          <div key={step} className="flex flex-col items-center flex-1 min-w-[90px] relative">
            {/* Ligne de connexion */}
            {i > 0 && (
              <div className={`absolute top-4 -left-1/2 w-full h-1 z-0 ${i <= idx ? 'bg-emerald-500' : 'bg-slate-200/50'}`} />
            )}
            
            <div className={`h-9 w-9 rounded-full flex items-center justify-center z-10 border-4 transition-all duration-500 ${
              isDone ? 'bg-emerald-500 border-slate-900 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'
            } ${isCurrent ? 'scale-125 ring-4 ring-primary/20' : ''}`}>
              {isDone ? <CheckCircle2 size={16} strokeWidth={3} /> : <span className="text-[10px] font-black">{i + 1}</span>}
            </div>
            
            <span className={`text-[9px] mt-4 font-black uppercase tracking-tighter text-center px-1 ${
              isDone ? 'text-emerald-400' : 'text-slate-500'
            } ${isCurrent ? 'text-primary' : ''}`}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TrackParcelPage() {
  const [searchParams] = useSearchParams();
  const [trackingNum, setTrackingNum] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(false);
  const [parcel, setParcel] = useState<ParcelData | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) handleSearchWithNum(q);
  }, []);

  const handleSearchWithNum = async (num: string) => {
    if (!num) return;
    setLoading(true); setSearched(true);
    try {
      const { data: p, error } = await supabase
        .from('parcels')
        .select(`
          *, 
          company:companies(name), 
          from:cities!from_id(name), 
          to:cities!to_id(name),
          trip:trips(type, vehicle:vehicles(registration))
        `)
        .eq('tracking_number', num.trim().toUpperCase())
        .maybeSingle();

      if (p && !error) {
        const statusLabel: Record<string, string> = {
          COLIS_ENREGISTRE: 'En attente',
          EN_ATTENTE_DEPART: 'Pris en charge',
          EN_COURS_DE_TRANSPORT: 'En transit',
          ARRIVE_A_DESTINATION: 'Arrivé',
          LIVRE: 'Livré',
          RETOURNE: 'Retourné'
        };

        setParcel({
          id: p.id,
          trackingNumber: p.tracking_number,
          status: statusLabel[p.status] || p.status,
          departureCity: p.from?.name || '—',
          arrivalCity: p.to?.name || '—',
          senderName: p.sender_name,
          receiverName: p.receiver_name,
          companyName: p.company?.name || '—',
          parcelType: p.parcel_type || 'Marchandise',
          weightKg: p.weight,
          description: p.description,
          date: new Date(p.created_at).toLocaleDateString('fr-FR'),
          price: p.price,
          paymentStatus: p.is_paid ? 'Réglé' : 'À régler en agence',
          transportType: p.trip?.type || 'BUS',
          registration: p.trip?.vehicle?.registration || '—'
        });
      } else {
        setParcel(null);
      }
    } catch {
      setParcel(null);
      toast.error("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-left space-y-10 animate-in fade-in duration-500">
      
      {/* HEADER DE LA PAGE */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2.5rem] bg-primary/10 shadow-inner">
          <Truck className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Suivi de Fret</h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Gabon Mobilité • Logistique Nationale</p>
      </div>

      {/* ZONE DE RECHERCHE */}
      <div className="bg-white border-2 border-slate-100 p-2 rounded-[2rem] shadow-2xl flex gap-2">
        <Input
          placeholder="RÉFÉRENCE (EX: TG-XXXX)"
          value={trackingNum}
          onChange={e => setTrackingNum(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearchWithNum(trackingNum)}
          className="text-lg h-14 border-none bg-transparent font-mono font-black uppercase tracking-widest px-6 focus-visible:ring-0"
        />
        <Button 
          onClick={() => handleSearchWithNum(trackingNum)} 
          disabled={loading || !trackingNum} 
          className="h-14 rounded-2xl px-8 font-black gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95"
        >
          {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
          RECHERCHER
        </Button>
      </div>

      {/* RÉSULTAT DU SUIVI */}
      {searched && !parcel && !loading && (
        <div className="bg-slate-50 border-2 border-dashed rounded-[3rem] py-20 text-center animate-in zoom-in-95">
           <Package size={48} className="mx-auto mb-4 text-slate-200" />
           <p className="font-black uppercase text-[10px] tracking-widest text-slate-400 px-10">Aucun colis correspondant à cette référence n'a été trouvé.</p>
        </div>
      )}

      {parcel && (
        <div className="bg-white border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
          
          {/* HEADER DU TICKET DE SUIVI */}
          <div className="p-8 bg-slate-900 text-white">
            <div className="flex justify-between items-start mb-8">
               <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary mb-2">Bordereau de suivi</p>
                  <p className="text-4xl font-mono font-black tracking-tighter">{parcel.trackingNumber}</p>
               </div>
               <div className={`p-4 rounded-2xl border border-white/10 backdrop-blur-md ${parcel.transportType === 'BOAT' ? 'bg-blue-600/20' : 'bg-primary/20'}`}>
                  {parcel.transportType === 'BOAT' ? <Ship size={28} /> : parcel.transportType === 'TRAIN' ? <Train size={28} /> : <Bus size={28} />}
               </div>
            </div>
            
            <div className="flex items-center gap-4 text-xl font-black italic uppercase tracking-tighter">
               <span className="truncate">{parcel.departureCity}</span>
               <div className="flex-1 h-px bg-white/20 relative mx-2">
                  <ArrowRight size={16} className="absolute -top-2 left-1/2 -translate-x-1/2 text-primary" />
               </div>
               <span className="truncate">{parcel.arrivalCity}</span>
            </div>
            
            {/* PROGRESSION VISUELLE */}
            <StatusTimeline current={parcel.status} />
          </div>

          {/* DÉTAILS COMPLETS */}
          <div className="p-8 space-y-8 bg-white">
             <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                <InfoRow label="Expéditeur" value={parcel.senderName} />
                <InfoRow label="Destinataire" value={parcel.receiverName} />
                
                <div className="col-span-2 h-px bg-slate-100 border-t border-dashed" />

                <InfoRow label="Description Fret" value={parcel.description} isItalic />
                <InfoRow label="Type / Poids" value={`${parcel.parcelType} • ${parcel.weightKg} KG`} isBold />
                
                <InfoRow label="Date Dépôt" value={parcel.date} icon={<Calendar size={10}/>} />
                
                <div className="space-y-1.5">
                   <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Transporteur / Appareil</p>
                   <div className="flex items-center gap-2">
                      <p className="font-bold text-xs text-slate-700 uppercase">{parcel.companyName}</p>
                      <Badge variant="outline" className="font-mono text-[9px] font-black text-primary border-primary/20 bg-primary/5 uppercase">
                         <Hash size={10} className="mr-1" /> {parcel.registration}
                      </Badge>
                   </div>
                </div>
             </div>

             {/* PIED DE TICKET (PAIEMENT) */}
             <div className="pt-8 border-t-2 border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Montant à régler au retrait</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">{parcel.price.toLocaleString()} <span className="text-xs">FCFA</span></p>
                </div>
                <Badge className={`rounded-xl px-5 py-2 font-black text-[10px] uppercase border-2 shadow-sm ${
                  parcel.paymentStatus === 'Réglé' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {parcel.paymentStatus}
                </Badge>
             </div>
          </div>
        </div>
      )}

      {/* FOOTER DISCRET */}
      <div className="text-center py-6 opacity-30">
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">
           Système de Tracking TransGabon Connect • © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

/**
 * COMPOSANT : LIGNE D'INFORMATION STYLISÉE
 */
function InfoRow({ label, value, isBold = false, isItalic = false, icon }: { label: string; value: string; isBold?: boolean; isItalic?: boolean; icon?: any }) {
  return (
    <div className="space-y-1.5 text-left">
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 leading-none">
        {icon}{label}
      </p>
      <p className={`text-sm leading-tight uppercase ${isBold ? 'font-black text-primary' : 'font-bold text-slate-800'} ${isItalic ? 'italic text-slate-500 font-medium normal-case' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}