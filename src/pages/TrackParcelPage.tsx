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
 * COMPOSANT : BARRE DE PROGRESSION DU COLIS (Version Sombre)
 */
function StatusTimeline({ current }: { current: string }) {
  const idx = STATUS_STEPS.indexOf(current);
  const isReturned = current === 'Retourné';

  if (isReturned) {
    return (
      <div className="bg-red-500/10 border-2 border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 font-bold mt-8 shadow-sm">
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
              <div className={`absolute top-4 -left-1/2 w-full h-1 z-0 ${i <= idx ? 'bg-emerald-500' : 'bg-slate-800'}`} />
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
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-2xl text-left space-y-10 animate-in fade-in duration-500">
      
      {/* HEADER DE LA PAGE */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2.5rem] bg-primary/10 border border-primary/20 shadow-inner">
          <Truck className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-white leading-none">Suivi de Fret</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Logistique Nationale • Temps Réel</p>
      </div>

      {/* ZONE DE RECHERCHE SOMBRE */}
      <div className="bg-slate-900 border-2 border-slate-800 p-2 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="RÉFÉRENCE (EX: TG-XXXX)"
          value={trackingNum}
          onChange={e => setTrackingNum(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearchWithNum(trackingNum)}
          className="text-lg h-14 border-none bg-transparent font-mono font-black uppercase tracking-widest px-6 focus-visible:ring-0 text-white placeholder:text-slate-600"
        />
        <Button 
          onClick={() => handleSearchWithNum(trackingNum)} 
          disabled={loading || !trackingNum} 
          className="h-14 rounded-xl md:rounded-2xl px-8 font-black gap-2 shadow-xl bg-primary text-white hover:bg-primary/90 transition-all shrink-0"
        >
          {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
          RECHERCHER
        </Button>
      </div>

      {/* RÉSULTAT VIDE */}
      {searched && !parcel && !loading && (
        <div className="bg-slate-900/50 border-2 border-slate-800 border-dashed rounded-[2.5rem] py-20 text-center animate-in zoom-in-95">
           <Package size={48} className="mx-auto mb-4 text-slate-700" />
           <p className="font-black uppercase text-[10px] tracking-widest text-slate-500 px-10 leading-relaxed">Aucun fret correspondant à cette référence n'a été localisé.</p>
        </div>
      )}

      {parcel && (
        <div className="bg-slate-900 border-2 border-slate-800 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-8 duration-700">
          
          {/* HEADER DU TICKET (Midnight) */}
          <div className="p-6 md:p-8 bg-slate-950 border-b border-slate-800">
            <div className="flex justify-between items-start mb-8">
               <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary mb-2 opacity-80">Bordereau Numérique</p>
                  <p className="text-3xl md:text-4xl font-mono font-black tracking-tighter text-white">{parcel.trackingNumber}</p>
               </div>
               <div className={`p-4 rounded-2xl border border-white/5 backdrop-blur-md ${parcel.transportType === 'BOAT' ? 'bg-blue-500/10 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                  {parcel.transportType === 'BOAT' ? <Ship size={28} /> : parcel.transportType === 'TRAIN' ? <Train size={28} /> : <Bus size={28} />}
               </div>
            </div>
            
            <div className="flex items-center gap-4 text-lg md:text-xl font-black italic uppercase tracking-tighter text-slate-100">
               <span className="truncate">{parcel.departureCity}</span>
               <div className="flex-1 h-px bg-slate-800 relative mx-2">
                  <ArrowRight size={16} className="absolute -top-2 left-1/2 -translate-x-1/2 text-primary" />
               </div>
               <span className="truncate">{parcel.arrivalCity}</span>
            </div>
            
            <StatusTimeline current={parcel.status} />
          </div>

          {/* DÉTAILS (Sombre Confortable) */}
          <div className="p-6 md:p-8 space-y-8">
             <div className="grid grid-cols-2 gap-y-8 gap-x-4 md:gap-x-10">
                <InfoRow label="Expéditeur" value={parcel.senderName} />
                <InfoRow label="Destinataire" value={parcel.receiverName} />
                
                <div className="col-span-2 h-px bg-slate-800 border-t border-dashed" />

                <InfoRow label="Description Fret" value={parcel.description} isItalic />
                <InfoRow label="Type / Poids" value={`${parcel.parcelType} • ${parcel.weightKg} KG`} isBold />
                
                <InfoRow label="Date Dépôt" value={parcel.date} icon={<Calendar size={10} className="text-primary"/>} />
                
                <div className="space-y-1.5">
                   <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Transporteur / Appareil</p>
                   <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-xs text-slate-200 uppercase">{parcel.companyName}</p>
                      <Badge variant="outline" className="font-mono text-[9px] font-black text-primary border-primary/20 bg-primary/5 uppercase">
                         <Hash size={10} className="mr-1" /> {parcel.registration}
                      </Badge>
                   </div>
                </div>
             </div>

             {/* PIED DE TICKET (Paiement Sombre) */}
             <div className="pt-8 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1 leading-none">Montant au retrait</p>
                  <p className="text-3xl font-black text-white tracking-tighter">
                    {parcel.price.toLocaleString()} <span className="text-xs text-slate-400">FCFA</span>
                  </p>
                </div>
                <Badge className={`rounded-xl px-6 py-2.5 font-black text-[10px] uppercase border shadow-lg ${
                  parcel.paymentStatus === 'Réglé' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {parcel.paymentStatus}
                </Badge>
             </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="text-center py-6 opacity-20">
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-400 leading-none">
           TransGabon Connect • Tracking System v2.0
        </p>
      </div>
    </div>
  );
}

/**
 * COMPOSANT : LIGNE D'INFORMATION
 */
function InfoRow({ label, value, isBold = false, isItalic = false, icon }: { label: string; value: string; isBold?: boolean; isItalic?: boolean; icon?: any }) {
  return (
    <div className="space-y-1.5 text-left min-w-0">
      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5 leading-none">
        {icon}{label}
      </p>
      <p className={`text-sm leading-tight uppercase truncate ${
        isBold ? 'font-black text-primary' : 'font-bold text-slate-100'
      } ${isItalic ? 'italic text-slate-400 font-medium normal-case whitespace-normal' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}