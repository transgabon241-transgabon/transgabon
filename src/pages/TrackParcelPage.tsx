"use client"

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, MapPin, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

type ParcelData = {
  id: string;
  trackingNumber: string;
  status: string;
  departureCity: string;
  arrivalCity: string;
  senderName: string;
  receiverName: string;
  receiverCity: string;
  companyName: string;
  parcelType: string;
  weightKg: number;
  description: string;
  departureDate: string;
  price: number;
  paymentStatus: string;
};

const STATUS_STEPS = ['En attente', 'Pris en charge', 'En transit', 'Arrivé', 'Livré'];

function StatusTimeline({ current }: { current: string }) {
  const idx = STATUS_STEPS.indexOf(current);
  const isReturned = current === 'Retourné';

  if (isReturned) {
    return (
      <div className="flex items-center gap-2 mt-4 justify-start">
        <Badge variant="destructive">Retourné</Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-6 overflow-x-auto pb-2 text-left justify-start">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= idx;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center min-w-[70px]">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[10px] mt-1 text-center whitespace-nowrap ${done ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{step}</span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 w-6 ${i < idx ? 'bg-primary' : 'bg-muted'}`} />
            )}
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
    if (q) { setTrackingNum(q); handleSearchWithNum(q); }
  }, []);

  const handleSearchWithNum = async (num: string) => {
    setLoading(true); setSearched(true);
    try {
      // Requête Supabase avec jointures SQL de relations
      const { data: p, error } = await supabase
        .from('parcels')
        .select('*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name)')
        .eq('tracking_number', num)
        .single();

      if (p && !error) {
        // Mappage du statut SQL vers l'UI
        const statusLabel: Record<string, string> = {
          COLIS_ENREGISTRE: 'En attente',
          EN_ATTENTE_DEPART: 'Pris en charge',
          EN_COURS_DE_TRANSPORT: 'En transit',
          ARRIVE_A_DESTINATION: 'Arrivé',
          DISPONIBLE_POUR_RETRAIT: 'Arrivé',
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
          receiverCity: p.to.name, // Destination
          companyName: p.company.name,
          parcelType: p.parcel_type || 'Colis',
          weightKg: p.weight,
          description: p.description,
          departureDate: p.created_at.slice(0, 10),
          price: p.price,
          paymentStatus: p.is_paid ? 'Payé' : 'À payer'
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

  const handleSearch = async () => {
    if (!trackingNum.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const num = trackingNum.trim().toUpperCase();
      const { data: p, error } = await supabase
        .from('parcels')
        .select('*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name)')
        .eq('tracking_number', num)
        .single();

      if (p && !error) {
        const statusLabel: Record<string, string> = {
          COLIS_ENREGISTRE: 'En attente',
          EN_ATTENTE_DEPART: 'Pris en charge',
          EN_COURS_DE_TRANSPORT: 'En transit',
          ARRIVE_A_DESTINATION: 'Arrivé',
          DISPONIBLE_POUR_RETRAIT: 'Arrivé',
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
          receiverCity: p.to.name,
          companyName: p.company.name,
          parcelType: p.parcel_type || 'Colis',
          weightKg: p.weight,
          description: p.description,
          departureDate: p.created_at.slice(0, 10),
          price: p.price,
          paymentStatus: p.is_paid ? 'Payé' : 'À payer'
        });
      } else {
        setParcel(null);
        toast.error('Aucun colis trouvé avec ce numéro');
      }
    } catch {
      toast.error('Erreur de recherche');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
            <Package className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Suivre mon colis</h1>
          <p className="text-muted-foreground mt-1">Entrez votre numéro de suivi pour localiser votre colis</p>
        </div>

        <div className="flex gap-2 mb-8">
          <Input
            placeholder="Ex: TRK-XXX-XXX"
            value={trackingNum}
            onChange={e => setTrackingNum(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="text-lg h-12 font-mono uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
          />
          <Button onClick={handleSearch} disabled={loading} size="lg" className="gap-2 shrink-0">
            <Search className="h-4 w-4" />
            {loading ? 'Recherche...' : 'Suivre'}
          </Button>
        </div>

        {searched && !parcel && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun colis trouvé avec ce numéro de suivi.</p>
          </div>
        )}

        {parcel && (
          <div className="border rounded-2xl bg-card overflow-hidden">
            <div className="p-6 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-xs text-muted-foreground mb-1">Numéro de suivi</p>
                  <p className="font-mono font-bold text-lg tracking-wider text-primary">{parcel.trackingNumber}</p>
                </div>
                <StatusBadge status={parcel.status} />
              </div>
              <StatusTimeline current={parcel.status} />
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm text-left">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium">{parcel.departureCity}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{parcel.arrivalCity}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-left">
                <InfoRow label="Expéditeur" value={parcel.senderName} />
                <InfoRow label="Destinataire" value={parcel.receiverName} />
                <InfoRow label="Ville destination" value={parcel.receiverCity} />
                <InfoRow label="Compagnie" value={parcel.companyName} />
                <InfoRow label="Type" value={parcel.parcelType} />
                <InfoRow label="Poids" value={`${parcel.weightKg} kg`} />
                <InfoRow label="Contenu" value={parcel.description} />
                <InfoRow label="Date départ" value={parcel.departureDate ? new Date(parcel.departureDate + 'T00:00:00').toLocaleDateString('fr-FR') : '-'} />
              </div>

              <div className="border-t pt-4 flex items-center justify-between text-left">
                <div>
                  <p className="text-xs text-muted-foreground">Montant</p>
                  <p className="font-bold text-lg">{parcel.price.toLocaleString()} FCFA</p>
                </div>
                <Badge variant={parcel.paymentStatus === 'Payé' ? 'default' : 'secondary'}>
                  {parcel.paymentStatus}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'En attente': 'bg-yellow-100 text-yellow-800',
    'Pris en charge': 'bg-blue-100 text-blue-800',
    'En transit': 'bg-orange-100 text-orange-800',
    'Arrivé': 'bg-emerald-100 text-emerald-800',
    'Livré': 'bg-green-100 text-green-800',
    'Retourné': 'bg-red-100 text-red-800',
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-muted'}`}>{status}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value || '-'}</p>
    </div>
  );
}