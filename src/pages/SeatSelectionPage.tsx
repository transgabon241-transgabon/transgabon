"use client"

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Armchair, Ship, Crown, Gem, ArrowRight, Bus, Train, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type SeatData = {
  totalSeats: number;
  rows: number;
  seatsPerRow: number;
  vehicleName: string;
  registration: string;
  takenSeats: string[];
  type: string; // BUS, TRAIN, BOAT
  basePrice: number;
  businessPrice: number;
  vipPrice: number;
};

export default function SeatSelectionPage() {
  const { departureId } = useParams();
  const navigate = useNavigate();
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
          takenSeats = passengers?.map(p => p.seat_number).filter(Boolean) as string[] || [];
        }

        setData({
          totalSeats: trip.seats_total,
          rows: trip.vehicle?.rows || Math.ceil(trip.seats_total / 4),
          seatsPerRow: trip.vehicle?.seats_per_row || 4,
          vehicleName: trip.vehicle?.name || trip.company?.name,
          registration: trip.vehicle?.registration || '—',
          type: trip.type,
          basePrice: trip.price,
          businessPrice: trip.class_business_price || 0, 
          vipPrice: trip.class_vip_price || 0,
          takenSeats
        });

        // Modification ici : Seul le BUS est en STANDARD direct
        if (trip.type !== 'BOAT' && trip.type !== 'TRAIN') {
          setSelectedClass('STANDARD');
        }

      } catch (err) {
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadConfiguration();
  }, [departureId]);

  if (loading) return <div className="max-w-lg mx-auto p-10"><Skeleton className="h-80 w-full rounded-[3rem]" /></div>;
  if (!data) return <div className="p-20 text-center font-black uppercase text-red-500">Erreur système.</div>;

  // --- ÉTAPE 1 : SÉLECTION DE LA CLASSE (MARITIME & TRAIN) ---
  const needsClassSelection = (data.type === 'BOAT' || data.type === 'TRAIN') && !selectedClass;

  if (needsClassSelection) {
    const isTrain = data.type === 'TRAIN';
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-left animate-in fade-in duration-500">
        <h1 className="text-4xl font-black italic mb-2 tracking-tighter uppercase text-slate-900">Le Confort</h1>
        <p className="text-muted-foreground mb-10 text-xs font-bold uppercase tracking-widest leading-relaxed">
          {isTrain ? 'Voyage Ferroviaire' : 'Trajet Maritime'} • {data.vehicleName}
        </p>

        <div className="space-y-4">
          <ClassCard 
            title={isTrain ? "2ème Classe" : "Économique"} 
            price={data.basePrice} 
            desc={isTrain ? "Voyage standard optimisé" : "Salon climatisé grand public"} 
            icon={isTrain ? <Train className="h-6 w-6" /> : <Ship className="h-6 w-6" />}
            onClick={() => setSelectedClass(isTrain ? '2EME_CLASSE' : 'ECO')}
          />
          <ClassCard 
            title={isTrain ? "1ère Classe" : "Business"} 
            price={data.businessPrice} 
            desc={isTrain ? "Confort supérieur et calme" : "Sièges confort, priorité bagages"} 
            icon={<Crown className="h-6 w-6" />}
            onClick={() => setSelectedClass(isTrain ? '1ERE_CLASSE' : 'BUSINESS')}
            color="bg-blue-600 shadow-blue-100"
          />
          <ClassCard 
            title="Salon VIP" 
            price={data.vipPrice} 
            desc={isTrain ? "Espace prestige SETRAG" : "Espace privé, service à bord"} 
            icon={<Gem className="h-6 w-6" />}
            onClick={() => setSelectedClass('VIP')}
            color="bg-slate-900 shadow-slate-200"
          />
        </div>
      </div>
    );
  }

  // --- ÉTAPE 2 : PLAN DES SIÈGES ---
  const seatLabels: string[][] = [];
  for (let r = 0; r < data.rows; r++) {
    const row: string[] = [];
    for (let s = 0; s < data.seatsPerRow; s++) {
      row.push(`${r + 1}${String.fromCharCode(65 + s)}`);
    }
    seatLabels.push(row);
  }

  const TransportIcon = data.type === 'BOAT' ? Ship : data.type === 'TRAIN' ? Train : Bus;

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg text-left animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Choisir un siège</h1>
          <div className="flex items-center gap-3 mt-3">
             <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <TransportIcon size={16} />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">
                  {selectedClass?.replace('_', ' ')} • {data.vehicleName}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                  Immat: {data.registration}
                </p>
             </div>
          </div>
        </div>
        {(data.type === 'BOAT' || data.type === 'TRAIN') && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedClass(null)} className="text-[10px] font-black text-slate-400 hover:text-primary underline uppercase transition-all">
            Changer Classe
          </Button>
        )}
      </div>

      <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-2xl shadow-slate-100/50 mb-10">
        <div className="text-center text-[9px] font-black text-slate-300 mb-8 tracking-[1em] uppercase">Partie Avant</div>
        
        <div className="space-y-4">
          {seatLabels.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-4">
              {row.map((seat, si) => {
                const taken = data.takenSeats.includes(seat);
                const isSelected = selectedSeat === seat;
                const showGap = data.seatsPerRow >= 4 && si === Math.floor(data.seatsPerRow / 2) - 1;

                return (
                  <div key={seat} className="flex items-center">
                    <button
                      disabled={taken}
                      onClick={() => setSelectedSeat(isSelected ? null : seat)}
                      className={`h-11 w-11 rounded-xl text-[10px] font-black transition-all duration-200 flex items-center justify-center ${
                        taken ? 'bg-slate-50 text-slate-200 cursor-not-allowed border-none shadow-inner' :
                        isSelected ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-125 rotate-3' :
                        'border-2 border-slate-100 bg-white text-slate-700 hover:border-primary hover:text-primary hover:shadow-md'
                      }`}
                    >
                      {seat}
                    </button>
                    {showGap && <div className="w-8 h-8 flex items-center justify-center opacity-10"><div className="w-0.5 h-full bg-slate-400 border-dashed border-l"></div></div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="text-center text-[9px] font-black text-slate-300 mt-10 tracking-[1em] uppercase">Partie Arrière</div>
      </div>

      <div className="flex justify-center gap-6 mb-10 text-[9px] font-black uppercase tracking-widest text-slate-400">
         <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-white border-2 border-slate-100" /> Libre</div>
         <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-primary" /> Choisi</div>
         <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-slate-50" /> Occupé</div>
      </div>

      <Button
        className="w-full h-16 rounded-[1.5rem] font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-tighter hover:scale-[1.02] transition-transform"
        disabled={!selectedSeat}
        onClick={() => navigate(`/confirm/${departureId}?seat=${selectedSeat}&class=${selectedClass}`)}
      >
        {selectedSeat ? `RÉSERVER LE SIÈGE ${selectedSeat}` : 'SÉLECTIONNEZ UNE PLACE'}
      </Button>
    </div>
  );
}

function ClassCard({ title, price, desc, icon, onClick, color = "bg-emerald-600 shadow-emerald-100" }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white border-2 border-slate-50 p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-primary transition-all text-left shadow-sm hover:shadow-xl"
    >
      <div className="flex items-center gap-5">
        <div className={`h-16 w-16 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div>
          <p className="font-black text-xl text-slate-900 leading-tight uppercase italic">{title}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mt-1">{desc}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black text-xl text-primary tracking-tighter">{price.toLocaleString()} <span className="text-[10px]">F</span></p>
        <div className="flex items-center justify-end gap-1 text-[9px] font-black text-emerald-600 uppercase mt-1 tracking-widest">
           Choisir <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </button>
  );
}