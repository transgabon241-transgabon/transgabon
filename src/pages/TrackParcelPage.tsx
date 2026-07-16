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
  Truck
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
  registration: string; // Pour rassurer le client sur le véhicule
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
      <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold mt-6">
        <AlertCircle size={20} /> Colis retourné à l'expéditeur
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mt-10 mb-6 px-2 overflow-x-auto pb-4">
      {STATUS_STEPS.map((step, i) => {
        const isDone = i <= idx;
        const isCurrent = i === idx;
        return (
          <div key={step} className="flex flex-col items-center flex-1 min-w-[80px] relative">
            {/* Ligne de connexion */}
            {i > 0 && (
              <div className={`absolute top-4 -left-1/2 w-full h-1 z-0 ${i <= idx ? 'bg-emerald-500' : 'bg-slate-100'}`} />
            )}
            
            <div className={`h-9 w-9 rounded-full flex items-center justify-center z-10 border-4 ${
              isDone ? 'bg-emerald-500 border-white text-white shadow-lg shadow-emerald-200' : 'bg-white border-slate-100 text-slate-300'
            }`}>
              {isDone ? <CheckCircle2 size={18} strokeWidth={3} /> : <span className="text-xs font-black">{i + 1}</span>}
            </div>
            
            <span className={`text-[9px] mt-3 font-black uppercase tracking-tighter text-center ${
              isDone ? 'text-emerald-700' : 'text-slate-400'
            } ${isCurrent ? 'scale-110' : ''}`}>
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
    setLoading(true); setSearched(true);
    try {
      // JOINTURE : On récupère aussi le type de trajet et l'immatriculation du véhicule
      const { data: p, error } = await supabase
        .from('parcels')
        .select(`
          *, 
          company:companies(name), 
          from:cities!from_id(name), 
          to:cities!to_id(name),
          trip:trips(type, vehicle:vehicles(registration))
        `)
        .eq('tracking_number', num.toUpperCase())
        .single();

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
          departureCity: p.from.name,
          arrivalCity: p.to.name,
          senderName: p.sender_name,
          receiverName: p.receiver_name,
          companyName: p.company.name,
          parcelType: p.parcel_type || 'Colis',
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-left space-y-10">
      
      {/* HEADER */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2rem] bg-primary/10 shadow-inner">
          <Truck className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Suivre mon colis</h1>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Localisation en temps réel • Gabon Mobilité</p>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="bg-white border-2 border-primary/10 p-2 rounded-3xl shadow-xl flex gap-2">
        <Input
          placeholder="Entrez votre numéro de suivi..."
          value={trackingNum}
          onChange={e => setTrackingNum(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearchWithNum(trackingNum)}
          className="text-lg h-14 border-none bg-transparent font-black uppercase tracking-widest px-6 focus-visible:ring-0"
        />
        <Button 
          onClick={() => handleSearchWithNum(trackingNum)} 
          disabled={loading || !trackingNum} 
          className="h-14 rounded-2xl px-8 font-black gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform"
        >
          {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
          SUIVRE
        </Button>
      </div>

      {/* RÉSULTATS */}
      {searched && !parcel && !loading && (
        <div className="bg-white border-2 border-dashed rounded-[2.5rem] py-16 text-center text-slate-400 italic animate-in fade-in duration-500">
           <Package size={48} className="mx-auto mb-4 opacity-10" />
           <p className="font-bold uppercase text-xs tracking-widest">Aucun colis trouvé avec cette référence</p>
        </div>
      )}

      {parcel && (
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-700">
          
          {/* HEADER RÉSULTAT */}
          <div className="p-8 bg-slate-900 text-white relative">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Numéro de suivi</p>
                  <p className="text-3xl font-mono font-black tracking-tighter">{parcel.trackingNumber}</p>
               </div>
               <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                  {parcel.transportType === 'BOAT' ? <Ship size={24} /> : parcel.transportType === 'TRAIN' ? <Train size={24} /> : <Bus size={24} />}
               </div>
            </div>
            
            <div className="flex items-center gap-3 text-lg font-black italic">
               <span>{parcel.departureCity}</span>
               <ArrowRight className="text-primary" />
               <span>{parcel.arrivalCity}</span>
            </div>
            
            <StatusTimeline current={parcel.status} />
          </div>

          {/* DÉTAILS TECHNIQUES */}
          <div className="p-8 space-y-8">
             <div className="grid grid-cols-2 gap-6 border-b border-dashed pb-8">
                <InfoRow label="Expéditeur" value={parcel.senderName} />
                <InfoRow label="Destinataire" value={parcel.receiverName} />
                <InfoRow label="Agence responsable" value={parcel.companyName} />
                <InfoRow label="Désignation" value={parcel.description} isItalic />
                <InfoRow label="Type d'envoi" value={parcel.parcelType} />
                <InfoRow label="Poids total" value={`${parcel.weightKg} KG`} isBold />
                <InfoRow label="Date d'enregistrement" value={parcel.date} />
                
                {/* INFO VÉHICULE (IMMATRICULATION) */}
                <div className="space-y-1">
                   <p className="text-[9px] font-black uppercase text-slate-400">Véhicule assigné</p>
                   <p className="flex items-center gap-1.5 font-mono text-xs font-black text-primary uppercase">
                      <Hash size={12} /> {parcel.registration}
                   </p>
                </div>
             </div>

             {/* SECTION PAIEMENT */}
             <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Montant de l'expédition</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">{parcel.price.toLocaleString()} <span className="text-xs">FCFA</span></p>
                </div>
                <Badge className={`rounded-full px-4 py-1 font-black text-[10px] uppercase border-2 ${
                  parcel.paymentStatus === 'Réglé' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                }`}>
                  {parcel.paymentStatus}
                </Badge>
             </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="text-center opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
           Gabon Mobilité • Système de Suivi Logistique Certifié
        </p>
      </div>
    </div>
  );
}

/**
 * COMPOSANT : LIGNE D'INFORMATION
 */
function InfoRow({ label, value, isBold = false, isItalic = false }: { label: string; value: string; isBold?: boolean; isItalic?: boolean }) {
  return (
    <div className="space-y-1 text-left">
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">{label}</p>
      <p className={`text-sm leading-tight truncate ${isBold ? 'font-black text-primary' : 'font-bold text-slate-800'} ${isItalic ? 'italic italic font-medium' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}