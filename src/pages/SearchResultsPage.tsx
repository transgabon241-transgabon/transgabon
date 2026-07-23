"use client"

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Clock, MapPin, Users, Train, Bus, Ship, ArrowRight, Hash, Info } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type Trip = {
  departureId: string;
  companyName: string;
  transportType: string;
  vehicleNumber: string;
  registration: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
  isStop: boolean; // Pour savoir si c'est une escale ou le terminus
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
        // 1. Récupérer les IDs des villes
        const { data: fromCity } = await supabase.from('cities').select('id').eq('name', from).single();
        const { data: toCity } = await supabase.from('cities').select('id').eq('name', to).single();

        if (fromCity && toCity) {
          /**
           * 2. REQUÊTE COMPLEXE :
           * On cherche les voyages qui partent de la ville "from"
           * ET qui arrivent soit au terminus (to_id)
           * SOIT qui ont une escale (trip_stops) correspondant à la ville "to"
           */
          const { data, error } = await supabase
            .from('trips')
            .select(`
              *, 
              company:companies(name), 
              vehicle:vehicles(registration),
              trip_stops(*)
            `)
            .eq('from_id', fromCity.id)
            .eq('departure_date', date);

          if (data && !error) {
            // 3. Filtrage et formatage dynamique
            const formatted: Trip[] = data
              .filter(t => {
                const arrivesAtTerminus = t.to_id === toCity.id;
                const hasStopAtDestination = t.trip_stops?.some((s: any) => s.city_id === toCity.id);
                return arrivesAtTerminus || hasStopAtDestination;
              })
              .map(t => {
                const stopAtDestination = t.trip_stops?.find((s: any) => s.city_id === toCity.id);
                const isStop = !!stopAtDestination;

                let typeLabel = 'Bus';
                if (t.type === 'TRAIN') typeLabel = 'Train';
                if (t.type === 'BOAT') typeLabel = 'Bateau';

                return {
                  departureId: t.id,
                  companyName: t.company?.name || 'Opérateur',
                  transportType: typeLabel,
                  vehicleNumber: t.vehicle_number,
                  registration: t.vehicle?.registration || '—',
                  departureTime: t.departure_time,
                  // SI c'est une escale, on prend l'heure de l'escale, sinon l'heure du terminus
                  arrivalTime: isStop ? stopAtDestination.arrival_time : t.arrival_time,
                  // SI c'est une escale, on prend le prix de l'escale, sinon le prix plein
                  price: isStop ? stopAtDestination.price_from_start : t.price,
                  availableSeats: t.seats_left,
                  isStop: isStop
                };
              });

            setTrips(formatted);
          }
        }
      } catch (err) {
        console.error("Erreur recherche:", err);
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

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl text-left">
      {/* Header Itinéraire */}
      <div className="mb-10 bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm">
        <div className="flex items-center gap-3 text-3xl font-black italic tracking-tighter text-slate-100 mb-2">
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
            <Button variant={sortBy === 'time' ? 'default' : 'ghost'} size="sm" onClick={() => setSortBy('time')} className="rounded-lg font-bold text-xs">Horaire</Button>
            <Button variant={sortBy === 'price' ? 'default' : 'ghost'} size="sm" onClick={() => setSortBy('price')} className="rounded-lg font-bold text-xs">Prix</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-[2rem]" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <MapPin className="h-16 w-16 mx-auto text-slate-300 mb-6" />
          <h3 className="text-2xl font-black text-slate-800">Aucun trajet trouvé</h3>
          <p className="text-muted-foreground font-medium mb-8">Essayez une autre date ou une autre destination.</p>
          <Button variant="default" className="rounded-2xl font-black px-8 h-12 shadow-xl" onClick={() => navigate('/')}>REFAIRE UNE RECHERCHE</Button>
        </div>
      ) : (
        <div className="grid gap-5">
          {sorted.map(trip => {
            const TransportIcon = trip.transportType === 'Train' ? Train : trip.transportType === 'Bateau' ? Ship : Bus;
            return (
              <div key={trip.departureId} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 md:p-8 hover:shadow-2xl hover:border-primary/20 transition-all duration-300 group">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  
                  <div className="flex items-center gap-5 min-w-[240px]">
                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform ${
                        trip.transportType === 'Bateau' ? 'bg-blue-600 text-white' : 
                        trip.transportType === 'Train' ? 'bg-slate-900 text-white' : 'bg-primary text-white'
                    }`}>
                      <TransportIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="font-black text-xl text-slate-100 leading-none mb-3">{trip.companyName}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-tighter rounded-md px-2 h-5">
                            {trip.transportType}
                        </Badge>
                        <span className="flex items-center gap-1 text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 uppercase italic">
                           <Hash size={10} /> {trip.registration}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-10 flex-1 border-y lg:border-y-0 lg:border-x border-slate-50 py-6 lg:py-0">
                    <div className="text-center">
                      <div className="text-3xl font-black text-slate-100 tracking-tighter">{trip.departureTime}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{from}</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <ArrowRight className="h-5 w-5 text-primary opacity-30" />
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-slate-100 tracking-tighter">{trip.arrivalTime || '--:--'}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                        {to} {trip.isStop && <Badge className="h-3 px-1 text-[7px] bg-amber-100 text-amber-700 border-none uppercase">Escale</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-6">
                    <div className="text-right">
                      <div className="text-3xl font-black text-primary tracking-tighter leading-none">
                        {trip.price.toLocaleString()} 
                        <span className="text-[10px] ml-1 font-black text-slate-400">FCFA</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] font-black text-emerald-600 uppercase mt-2 tracking-tighter">
                        <Users className="h-3 w-3" />
                        {trip.availableSeats} places
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="rounded-2xl font-black h-14 px-8 shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest"
                      onClick={() => navigate(`/seats/${trip.departureId}?from=${from}&to=${to}&price=${trip.price}&isStop=${trip.isStop}`)}
                      disabled={trip.availableSeats <= 0}
                    >
                      {trip.availableSeats > 0 ? 'Réserver' : 'Complet'}
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