"use client"

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Armchair, AlertCircle } from 'lucide-react';

type SeatData = {
  totalSeats: number;
  rows: number;
  seatsPerRow: number;
  vehicleType: string;
  takenSeats: string[];
};

export default function SeatSelectionPage() {
  const { departureId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<SeatData | null>(null);

  useEffect(() => {
    if (!departureId) return;
    setLoading(true);

    const loadSeatConfiguration = async () => {
      try {
        // 1. Récupère le trajet en base de données pour en connaître l'appareil
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('*, company:companies(name)')
          .eq('id', departureId)
          .single();

        if (tripError || !trip) {
          setData(null);
          return;
        }

        // 2. Récupère les réservations actives (non annulées, non remboursées) sur ce trajet
        const { data: activeBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('trip_id', departureId)
          .not('status', 'in', '("ANNULE", "REMBOURSE")');

        const activeBookingIds = activeBookings?.map(b => b.id) || [];

        // 3. Récupère la liste des sièges déjà occupés par des passagers
        let takenSeats: string[] = [];
        if (activeBookingIds.length > 0) {
          const { data: passengers } = await supabase
            .from('passengers')
            .select('seat_number')
            .in('booking_id', activeBookingIds);
          
          takenSeats = passengers?.map(p => p.seat_number).filter(Boolean) as string[] || [];
        }

        // 4. Détermination dynamique de l'arborescence visuelle du véhicule
        const totalSeats = trip.seats_total;
        let seatsPerRow = 4; // Configuration par défaut (Bus, Train)
        let rows = Math.ceil(totalSeats / seatsPerRow);
        let vehicleLabel = `${trip.company?.name || 'Compagnie'} (${trip.type})`;

        if (trip.type === 'MINIBUS') {
          seatsPerRow = 3; // 3 sièges par rangée pour les minibus
          rows = Math.ceil(totalSeats / seatsPerRow);
          vehicleLabel = `Minibus · ${trip.company?.name}`;
        } else if (trip.type === 'TRAIN') {
          vehicleLabel = `Rame Train · ${trip.company?.name}`;
        } else if (trip.type === 'BUS') {
          vehicleLabel = `Autocar Climatisé · ${trip.company?.name}`;
        } else if (trip.type === 'COASTER') {
          vehicleLabel = `Coaster · ${trip.company?.name}`;
        }

        setData({
          totalSeats,
          rows,
          seatsPerRow,
          vehicleType: vehicleLabel,
          takenSeats
        });

      } catch (err) {
        console.error("Erreur de chargement du plan de sièges :", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadSeatConfiguration();
  }, [departureId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {Array.from({ length: 32 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 text-center max-w-sm space-y-4">
        <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
        <h3 className="font-bold text-lg">Erreur de chargement</h3>
        <p className="text-xs text-muted-foreground">Impossible de générer le plan de sièges pour ce trajet.</p>
        <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  const { rows, seatsPerRow, takenSeats, vehicleType } = data;
  const seatLabels: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let s = 0; s < seatsPerRow; s++) {
      row.push(`${r + 1}${String.fromCharCode(65 + s)}`);
    }
    seatLabels.push(row);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Choisissez votre siège</h1>
      <p className="text-muted-foreground mb-6">{vehicleType} — {data.totalSeats} places</p>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border-2 border-primary bg-primary/10" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary" />
          <span>Sélectionné</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-muted" />
          <span>Occupé</span>
        </div>
      </div>

      {/* Seat grid */}
      <div className="bg-card border rounded-2xl p-6 mb-6">
        <div className="text-center text-xs text-muted-foreground mb-4 font-medium">AVANT</div>
        <div className="space-y-2">
          {seatLabels.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-2">
              {row.map((seat, si) => {
                const taken = takenSeats.includes(seat);
                const isSelected = selected === seat;
                // Ajout automatique du couloir central (aisle gap)
                const showGap = seatsPerRow >= 4 && si === Math.floor(seatsPerRow / 2) - 1;

                return (
                  <div key={seat} className="contents">
                    <button
                      disabled={taken}
                      onClick={() => setSelected(isSelected ? null : seat)}
                      className={`h-11 w-11 rounded-lg text-xs font-semibold transition-all ${
                        taken
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : isSelected
                          ? 'bg-primary text-primary-foreground shadow-md scale-105'
                          : 'border-2 border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10 text-foreground'
                      }`}
                    >
                      {seat}
                    </button>
                    {showGap && <div className="w-6" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-muted-foreground mt-4 font-medium">ARRIÈRE</div>
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={!selected}
        onClick={() => navigate(`/confirm/${departureId}?seat=${selected}`)}
      >
        {selected ? `Continuer avec le siège ${selected}` : 'Sélectionnez un siège'}
      </Button>
    </div>
  );
}