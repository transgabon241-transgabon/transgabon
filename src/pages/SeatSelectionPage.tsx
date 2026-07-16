"use client"

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Armchair, AlertCircle, Ship, Crown, Gem, Check, ArrowRight } from 'lucide-react';

type SeatData = {
  totalSeats: number;
  rows: number;
  seatsPerRow: number;
  vehicleType: string;
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
          .select('*, company:companies(name)')
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

        let seatsPerRow = 4;
        if (trip.type === 'MINIBUS') seatsPerRow = 3;

        setData({
          totalSeats: trip.seats_total,
          rows: Math.ceil(trip.seats_total / seatsPerRow),
          seatsPerRow,
          vehicleType: trip.company?.name,
          type: trip.type,
          basePrice: trip.price,
          businessPrice: trip.class_business_price || trip.price * 1.5,
          vipPrice: trip.class_vip_price || trip.price * 2,
          takenSeats
        });

        // Si ce n'est pas un bateau, on sélectionne la classe ECO par défaut
        if (trip.type !== 'BOAT') setSelectedClass('ECO');

      } catch (err) {
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadConfiguration();
  }, [departureId]);

  if (loading) return <div className="p-10"><Skeleton className="h-64 w-full rounded-3xl" /></div>;

  if (!data) return <div className="p-20 text-center text-red-500">Erreur de chargement.</div>;

  // --- ÉTAPE 1 : CHOIX DE LA CLASSE (UNIQUEMENT POUR BATEAU) ---
  if (data.type === 'BOAT' && !selectedClass) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg text-left">
        <h1 className="text-3xl font-black italic mb-2">Choisir mon confort</h1>
        <p className="text-muted-foreground mb-8 text-sm uppercase font-bold tracking-widest">Trajet Maritime · {data.vehicleType}</p>

        <div className="space-y-4">
          <ClassCard 
            title="Économique" 
            price={data.basePrice} 
            desc="Salon climatisé standard" 
            icon={<Ship className="h-6 w-6" />}
            onClick={() => setSelectedClass('ECO')}
          />
          <ClassCard 
            title="Business" 
            price={data.businessPrice} 
            desc="Sièges en cuir, boissons incluses" 
            icon={<Crown className="h-6 w-6" />}
            onClick={() => setSelectedClass('BUSINESS')}
            color="bg-blue-600"
          />
          <ClassCard 
            title="VIP" 
            price={data.vipPrice} 
            desc="Cabine privée, service premium" 
            icon={<Gem className="h-6 w-6" />}
            onClick={() => setSelectedClass('VIP')}
            color="bg-amber-500"
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg text-left">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-black italic uppercase">Choisir un siège</h1>
          <p className="text-xs font-bold text-primary uppercase tracking-tighter">
            {selectedClass} • {data.vehicleType}
          </p>
        </div>
        {data.type === 'BOAT' && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedClass(null)} className="text-[10px] font-black underline">CHANGER DE CLASSE</Button>
        )}
      </div>

      <div className="bg-card border-2 rounded-[2.5rem] p-8 shadow-xl mb-8">
        <div className="text-center text-[10px] font-black text-slate-300 mb-6 tracking-[0.5em]">AVANT DU VÉHICULE</div>
        <div className="space-y-3">
          {seatLabels.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-3">
              {row.map((seat, si) => {
                const taken = data.takenSeats.includes(seat);
                const isSelected = selectedSeat === seat;
                const showGap = data.seatsPerRow >= 4 && si === Math.floor(data.seatsPerRow / 2) - 1;

                return (
                  <div key={seat} className="flex items-center">
                    <button
                      disabled={taken}
                      onClick={() => setSelectedSeat(isSelected ? null : seat)}
                      className={`h-12 w-12 rounded-xl text-xs font-black transition-all ${
                        taken ? 'bg-slate-100 text-slate-300 cursor-not-allowed border-none' :
                        isSelected ? 'bg-primary text-white shadow-lg scale-110' :
                        'border-2 border-primary/20 bg-white text-slate-700 hover:border-primary'
                      }`}
                    >
                      {seat}
                    </button>
                    {showGap && <div className="w-8" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="text-center text-[10px] font-black text-slate-300 mt-8 tracking-[0.5em]">ARRIÈRE</div>
      </div>

      <Button
        className="w-full h-14 rounded-2xl font-black text-lg shadow-xl uppercase tracking-tighter"
        disabled={!selectedSeat}
        onClick={() => navigate(`/confirm/${departureId}?seat=${selectedSeat}&class=${selectedClass}`)}
      >
        {selectedSeat ? `CONFIRMER LE SIÈGE ${selectedSeat}` : 'SÉLECTIONNEZ UN SIÈGE'}
      </Button>
    </div>
  );
}

// --- COMPOSANT : CARTE DE CLASSE ---
function ClassCard({ title, price, desc, icon, onClick, color = "bg-emerald-600" }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white border-2 border-slate-100 p-5 rounded-[2rem] flex items-center justify-between group hover:border-primary transition-all text-left shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className={`h-14 w-14 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div>
          <p className="font-black text-lg text-slate-900 leading-tight">{title}</p>
          <p className="text-xs font-medium text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black text-lg text-primary">{price.toLocaleString()} F</p>
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
          <ArrowRight className="h-3 w-3" /> Choisir
        </div>
      </div>
    </button>
  );
}