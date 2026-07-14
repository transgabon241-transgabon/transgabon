"use client"

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Clock, MapPin, Users, Train, Bus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type Trip = {
  departureId: string;
  companyName: string;
  transportType: string;
  vehicleNumber: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
};

export default function SearchResultsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const date = params.get('date') || '';

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'price' | 'time'>('time');

  useEffect(() => {
    if (!from || !to || !date) return;
    setLoading(true);

    const fetchTrips = async () => {
      try {
        // 1. Récupération des IDs réels de la gare de départ et d'arrivée dans Supabase
        const { data: fromCity } = await supabase.from('cities').select('id').eq('name', from).single();
        const { data: toCity } = await supabase.from('cities').select('id').eq('name', to).single();

        if (fromCity && toCity) {
          // 2. Requête en base sur la table 'trips' liée à la table 'companies'
          const { data, error } = await supabase
            .from('trips')
            .select('*, company:companies(name)')
            .eq('from_id', fromCity.id)
            .eq('to_id', toCity.id)
            .eq('departure_date', date);

          if (data && !error) {
            // 3. Mappage fluide vers les propriétés attendues par l'interface d'origine
            const formatted: Trip[] = data.map(t => ({
              departureId: t.id,
              companyName: (t.company as any)?.name || 'Opérateur',
              transportType: t.type === 'TRAIN' ? 'Train' : 'Bus',
              vehicleNumber: t.vehicle_number,
              departureTime: t.departure_time,
              arrivalTime: t.arrival_time,
              price: t.price,
              availableSeats: t.seats_left
            }));
            setTrips(formatted);
          } else {
            setTrips([]);
          }
        } else {
          setTrips([]);
        }
      } catch (err) {
        console.error("Erreur de récupération des trajets :", err);
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [from, to, date]);

  const sorted = [...trips].sort((a, b) =>
    sortBy === 'price' ? a.price - b.price : a.departureTime.localeCompare(b.departureTime)
  );

  const formattedDate = date ? new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const TransportIcon = (type: string) => type === 'Train' ? Train : Bus;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-2xl font-bold mb-1">
          <span>{from}</span>
          <ArrowRight className="h-5 w-5 text-primary" />
          <span>{to}</span>
        </div>
        <p className="text-muted-foreground capitalize">{formattedDate}</p>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground">Trier par :</span>
        <Button variant={sortBy === 'time' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('time')}>Horaire</Button>
        <Button variant={sortBy === 'price' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('price')}>Prix</Button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun trajet disponible</h3>
          <p className="text-muted-foreground mb-4">Essayez une autre date ou un autre itinéraire</p>
          <Button variant="outline" onClick={() => navigate('/')}>Nouvelle recherche</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(trip => {
            const Icon = TransportIcon(trip.transportType);
            return (
              <div key={trip.departureId} className="border rounded-xl bg-card p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                      <Icon className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{trip.companyName}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Badge variant="secondary" className="text-xs">{trip.transportType}</Badge>
                        <span>{trip.vehicleNumber}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-xl font-bold">{trip.departureTime}</div>
                      <div className="text-xs text-muted-foreground">{from}</div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">{trip.arrivalTime}</div>
                      <div className="text-xs text-muted-foreground">{to}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{trip.price.toLocaleString()} <span className="text-sm font-normal">FCFA</span></div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {trip.availableSeats} places
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/seats/${trip.departureId}?from=${from}&to=${to}`)}
                      disabled={trip.availableSeats <= 0}
                    >
                      {trip.availableSeats > 0 ? 'Choisir' : 'Complet'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}