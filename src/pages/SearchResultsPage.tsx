"use client"

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Clock, MapPin, Users, Train, Bus, Ship, ArrowRight } from 'lucide-react'; // Ajout de Ship
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
        const { data: fromCity } = await supabase.from('cities').select('id').eq('name', from).single();
        const { data: toCity } = await supabase.from('cities').select('id').eq('name', to).single();

        if (fromCity && toCity) {
          const { data, error } = await supabase
            .from('trips')
            .select('*, company:companies(name)')
            .eq('from_id', fromCity.id)
            .eq('to_id', toCity.id)
            .eq('departure_date', date);

          if (data && !error) {
            const formatted: Trip[] = data.map(t => {
              // LOGIQUE DE MAPPAGE DU TYPE DE TRANSPORT
              let typeLabel = 'Bus';
              if (t.type === 'TRAIN') typeLabel = 'Train';
              if (t.type === 'BOAT') typeLabel = 'Bateau';

              return {
                departureId: t.id,
                companyName: (t.company as any)?.name || 'Opérateur',
                transportType: typeLabel,
                vehicleNumber: t.vehicle_number,
                departureTime: t.departure_time,
                arrivalTime: t.arrival_time,
                price: t.price,
                availableSeats: t.seats_left
              };
            });
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

  // FONCTION POUR RÉCUPÉRER LA BONNE ICÔNE
  const getTransportIcon = (type: string) => {
    if (type === 'Train') return Train;
    if (type === 'Bateau') return Ship;
    return Bus;
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl text-left">
      {/* Header Itinéraire */}
      <div className="mb-10 bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm">
        <div className="flex items-center gap-3 text-3xl font-black italic tracking-tighter text-slate-900 mb-2">
          <span>{from}</span>
          <ArrowRight className="h-6 w-6 text-primary stroke-[3px]" />
          <span>{to}</span>
        </div>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{formattedDate}</p>
      </div>

      {/* Barre de tri */}
      <div className="flex items-center gap-4 mb-8 px-2">
        <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Trier par :</span>
        <div className="flex bg-slate-100 p-1 rounded-xl">
            <Button 
                variant={sortBy === 'time' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setSortBy('time')}
                className="rounded-lg font-bold text-xs"
            >
                Horaire
            </Button>
            <Button 
                variant={sortBy === 'price' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setSortBy('price')}
                className="rounded-lg font-bold text-xs"
            >
                Prix
            </Button>
        </div>
      </div>

      {/* Liste des résultats */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-[2rem]" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <MapPin className="h-16 w-16 mx-auto text-slate-300 mb-6" />
          <h3 className="text-2xl font-black text-slate-800">Aucun départ trouvé</h3>
          <p className="text-muted-foreground font-medium mb-8">Il n'y a pas de trajets disponibles pour cette date.</p>
          <Button variant="default" className="rounded-2xl font-black px-8 h-12 shadow-xl" onClick={() => navigate('/')}>REFAIRE UNE RECHERCHE</Button>
        </div>
      ) : (
        <div className="grid gap-5">
          {sorted.map(trip => {
            const Icon = getTransportIcon(trip.transportType);
            return (
              <div key={trip.departureId} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 md:p-8 hover:shadow-2xl hover:border-primary/20 transition-all duration-300 group">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  
                  {/* Compagnie & Type */}
                  <div className="flex items-center gap-5 min-w-[200px]">
                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform ${
                        trip.transportType === 'Bateau' ? 'bg-blue-600 text-white' : 
                        trip.transportType === 'Train' ? 'bg-slate-900 text-white' : 'bg-primary text-white'
                    }`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="font-black text-xl text-slate-900 leading-none mb-2">{trip.companyName}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-tighter rounded-md px-2">
                            {trip.transportType}
                        </Badge>
                        <span className="text-xs font-bold text-slate-400">N° {trip.vehicleNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Horaires */}
                  <div className="flex items-center justify-center gap-10 flex-1 border-y lg:border-y-0 lg:border-x border-slate-50 py-6 lg:py-0">
                    <div className="text-center">
                      <div className="text-3xl font-black text-slate-900 tracking-tighter">{trip.departureTime}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{from}</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <ArrowRight className="h-5 w-5 text-primary opacity-30" />
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-slate-900 tracking-tighter">{trip.arrivalTime}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{to}</div>
                    </div>
                  </div>

                  {/* Prix & Action */}
                  <div className="flex items-center justify-between lg:justify-end gap-6">
                    <div className="text-right">
                      <div className="text-3xl font-black text-primary tracking-tighter">
                        {trip.price.toLocaleString()} 
                        <span className="text-xs ml-1 font-bold text-slate-400">FCFA</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] font-black text-emerald-600 uppercase mt-1">
                        <Users className="h-3 w-3" />
                        {trip.availableSeats} places restantes
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="rounded-2xl font-black h-14 px-8 shadow-xl shadow-primary/20 active:scale-95 transition-all"
                      onClick={() => navigate(`/seats/${trip.departureId}?from=${from}&to=${to}`)}
                      disabled={trip.availableSeats <= 0}
                    >
                      {trip.availableSeats > 0 ? 'RÉSERVER' : 'COMPLET'}
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