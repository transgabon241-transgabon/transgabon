"use client"

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Ship, Crown, Gem, ArrowRight, Bus, Train, MapPin, Hash, Plane } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type SeatData = {
  totalSeats: number;
  rows: number;
  seatsPerRow: number;
  vehicleName: string;
  registration: string;
  takenSeats: string[]; 
  type: string;
  basePrice: number;
  businessPrice: number;
  vipPrice: number;
  isStop: boolean;
  destinationName: string;
};

export default function SeatSelectionPage() {
  const { departureId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlPrice = searchParams.get('price');
  const isStop = searchParams.get('isStop') === 'true';
  const destinationName = searchParams.get('to') || 'Destination';

  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [data, setData] = useState<SeatData | null>(null);

  useEffect(() => {
    if (!departureId) return;
    setLoading(true);

    const loadConfiguration = async () => {
      try {
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('*, company:companies(name), vehicle:vehicles(*)')
          .eq('id', departureId)
          .single();

        if (tripError || !trip) {
          setData(null);
          return;
        }

        const { data: activeBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('trip_id', departureId)
          .not('status', 'in', '("ANNULE", "REMBOURSE")');

        const activeBookingIds = activeBookings?.map(b => b.id) || [];
        let takenSeats: string[] = [];
        
        if (activeBookingIds.length > 0) {
          const { data: passengers } = await supabase
            .from('passengers')
            .select('seat_number')
            .in('booking_id', activeBookingIds);
          
          takenSeats = passengers?.map(p => p.seat_number).filter((s): s is string => !!s) || [];
        }

        const basePrice = urlPrice ? Number(urlPrice) : trip.price;
        const businessPrice = isStop 
          ? Math.round(basePrice * 1.5) 
          : (trip.class_business_price || Math.round(basePrice * 1.5));
          
        const vipPrice = isStop 
          ? Math.round(basePrice * 2) 
          : (trip.class_vip_price || Math.round(basePrice * 2));

        setData({
          totalSeats: trip.seats_total,
          rows: trip.vehicle?.rows || Math.ceil(trip.seats_total / 4),
          seatsPerRow: trip.vehicle?.seats_per_row || 4,
          vehicleName: trip.vehicle?.name || trip.company?.name,
          registration: trip.vehicle?.registration || '—',
          type: trip.type,
          basePrice,
          businessPrice,
          vipPrice,
          isStop,
          destinationName,
          takenSeats: takenSeats
        });

        // Seul le Bus n'a pas de choix de classe par défaut
        if (trip.type !== 'BOAT' && trip.type !== 'TRAIN' && trip.type !== 'PLANE') {
          setSelectedClass('STANDARD');
        }

      } catch (err) {
        console.error("Crash configuration:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadConfiguration();
  }, [departureId, urlPrice, isStop, destinationName]);

  if (loading) return <div className="max-w-lg mx-auto p-10"><Skeleton className="h-80 w-full rounded-[3rem] bg-slate-900" /></div>;
  if (!data) return <div className="p-20 text-center font-black uppercase text-red-500">Erreur système.</div>;

  // MISE À JOUR : Inclure PLANE dans la sélection de classe
  const needsClassSelection = (data.type === 'BOAT' || data.type === 'TRAIN' || data.type === 'PLANE') && !selectedClass;

  if (needsClassSelection) {
    const isTrain = data.type === 'TRAIN';
    const isPlane = data.type === 'PLANE';
    
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-left animate-in fade-in duration-500 bg-background">
        <div className="flex items-center gap-2 mb-2">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white">Le Confort</h1>
            {data.isStop && <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] uppercase font-black px-2 py-0.5">Tarif Escale</Badge>}
        </div>
        <p className="text-slate-400 mb-10 text-xs font-bold uppercase tracking-widest leading-relaxed flex items-center gap-2">
          {isPlane ? 'Voyage Aérien' : isTrain ? 'Voyage Ferroviaire' : 'Trajet Maritime'} • {data.vehicleName} 
          <ArrowRight size={12} className="text-primary" /> <MapPin size={12} className="text-primary"/> {data.destinationName}
        </p>

        <div className="space-y-4">
          <ClassCard 
            title={isTrain ? "2ème Classe" : "Économique"} 
            price={data.basePrice} 
            desc={isPlane ? "Classe standard" : isTrain ? "Voyage classique" : "Salon climatisé"} 
            icon={isPlane ? <Plane className="h-6 w-6" /> : isTrain ? <Train className="h-6 w-6" /> : <Ship className="h-6 w-6" />}
            onClick={() => setSelectedClass(isTrain ? '2EME_CLASSE' : 'ECO')}
          />
          <ClassCard 
            title={isTrain ? "1ère Classe" : "Business"} 
            price={data.businessPrice} 
            desc="Service & Confort" 
            icon={<Crown className="h-6 w-6" />}
            onClick={() => setSelectedClass(isTrain ? '1ERE_CLASSE' : 'BUSINESS')}
            color="bg-blue-600"
          />
          <ClassCard 
            title="Salon VIP" 
            price={data.vipPrice} 
            desc="Espace prestige" 
            icon={<Gem className="h-6 w-6" />}
            onClick={() => setSelectedClass('VIP')}
            color="bg-slate-800"
          />
        </div>
      </div>
    );
  }

  const seatLabels: string[][] = [];
  for (let r = 0; r < data.rows; r++) {
    const row: string[] = [];
    for (let s = 0; s < data.seatsPerRow; s++) {
      row.push(`${r + 1}${String.fromCharCode(65 + s)}`);
    }
    seatLabels.push(row);
  }

  // MISE À JOUR : Mapping icône avec support PLANE
  const TransportIcon = data.type === 'BOAT' ? Ship : data.type === 'TRAIN' ? Train : data.type === 'PLANE' ? Plane : Bus;

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg text-left animate-in slide-in-from-bottom-4 duration-500 bg-background text-foreground">
      <div className="flex justify-between items-start mb-8">
        <div className="text-left">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">Choisir un siège</h1>
          <div className="flex items-center gap-3 mt-3">
             <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
                <TransportIcon size={16} />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">
                  {selectedClass?.replace('_', ' ')} • {data.vehicleName}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-1 flex items-center gap-1">
                  Réf: {data.registration} • Vers: {data.destinationName}
                </p>
             </div>
          </div>
        </div>
        {(data.type === 'BOAT' || data.type === 'TRAIN' || data.type === 'PLANE') && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedClass(null)} className="text-[10px] font-black text-slate-500 hover:text-primary underline uppercase transition-all">
            Changer Classe
          </Button>
        )}
      </div>

      <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl mb-10 relative overflow-hidden">
        <div className="text-center text-[9px] font-black text-slate-700 mb-8 tracking-[1em] uppercase leading-none">Cabine Avant</div>
        
        <div className="space-y-4">
          {seatLabels.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-3 sm:gap-4">
              {row.map((seat, si) => {
                const taken = (data?.takenSeats || []).includes(seat);
                const isSelected = selectedSeat === seat;
                const showGap = data.seatsPerRow >= 4 && si === Math.floor(data.seatsPerRow / 2) - 1;

                return (
                  <div key={seat} className="flex items-center">
                    <button
                      disabled={taken}
                      onClick={() => setSelectedSeat(isSelected ? null : seat)}
                      className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl text-[10px] font-black transition-all duration-200 flex items-center justify-center ${
                        taken ? 'bg-slate-800 text-slate-600 cursor-not-allowed border-none shadow-inner opacity-50' :
                        isSelected ? 'bg-primary text-white shadow-xl shadow-primary/40 scale-110 rotate-3 z-10' :
                        'border-2 border-slate-800 bg-slate-950 text-slate-400 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {seat}
                    </button>
                    {showGap && <div className="w-6 sm:w-8 h-8 flex items-center justify-center opacity-20"><div className="w-0.5 h-full bg-slate-500 border-dashed border-l"></div></div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="text-center text-[9px] font-black text-slate-700 mt-10 tracking-[1em] uppercase leading-none">Cabine Arrière</div>
      </div>

      {/* LÉGENDE SOMBRE */}
      <div className="flex justify-center gap-6 mb-10 text-[9px] font-black uppercase tracking-widest text-slate-500">
         <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-slate-950 border border-slate-800" /> Libre</div>
         <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-primary" /> Choisi</div>
         <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-slate-800 opacity-50" /> Occupé</div>
      </div>

      <Button
        className="w-full h-16 rounded-2xl font-black text-lg shadow-2xl bg-primary text-white hover:bg-primary/90 uppercase tracking-widest active:scale-95 transition-all border-none"
        disabled={!selectedSeat}
        onClick={() => {
            const finalPrice = selectedClass === 'VIP' ? data.vipPrice : (selectedClass === 'BUSINESS' || selectedClass === '1ERE_CLASSE' ? data.businessPrice : data.basePrice);
            navigate(`/confirm/${departureId}?seat=${selectedSeat}&class=${selectedClass}&price=${finalPrice}&to=${data.destinationName}`);
        }}
      >
        {selectedSeat ? `CONFIRMER LE SIÈGE ${selectedSeat}` : 'SÉLECTIONNEZ UNE PLACE'}
      </Button>
    </div>
  );
}

function ClassCard({ title, price, desc, icon, onClick, color = "bg-emerald-600" }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-slate-900 border-2 border-slate-800 p-6 rounded-[2rem] flex items-center justify-between group hover:border-primary transition-all text-left shadow-lg"
    >
      <div className="flex items-center gap-5">
        <div className={`h-14 w-14 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="font-black text-xl text-white leading-tight uppercase italic">{title}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{desc}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black text-xl text-primary tracking-tighter">{price.toLocaleString()} <span className="text-[10px]">F</span></p>
        <div className="flex items-center justify-end gap-1 text-[9px] font-black text-emerald-500 uppercase mt-1 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
           Choisir <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </button>
  );
}