"use client"

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Clock, MapPin, Users, Train, Bus, Ship, ArrowRight, Hash, Info, Plane, Baby } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Trip = {
  departureId: string;
  companyName: string;
  transportType: string;
  vehicleNumber: string;
  registration: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  childPrice: number;
  availableSeats: number;
  isStop: boolean; // Pour savoir si c'est une escale
};

export default function SearchResultsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const from = params.get('from')?.trim() || '';
  const to = params.get('to')?.trim() || '';
  const date = params.get('date') || '';

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'price' | 'time'>('time');

  useEffect(() => {
    if (!from || !to || !date) return;
    setLoading(true);

    const fetchTrips = async () => {
      try {
        // 1. Trouver les IDs des villes
        const { data: fromData } = await supabase.from('cities').select('id').ilike('name', from).maybeSingle();
        const { data: toData } = await supabase.from('cities').select('id').ilike('name', to).maybeSingle();

        if (!fromData || !toData) {
          setTrips([]);
          setLoading(false);
          return;
        }

        // 2. Recherche complexe : terminus OU escales
        const { data, error } = await supabase
          .from('trips')
          .select(`
            *, 
            company:companies(name), 
            vehicle:vehicles(registration),
            trip_stops(*) 
          `)
          .eq('from_id', fromData.id)
          .eq('departure_date', date);

        if (error) throw error;

        if (data) {
          const formatted: Trip[] = data
            .filter(t => {
              // On garde le trajet si la destination est le terminus 
              // OU si la destination figure dans la liste des escales
              const arrivesAtTerminus = t.to_id === toData.id;
              const hasStopAtDestination = t.trip_stops?.some((s: any) => s.city_id === toData.id);
              return arrivesAtTerminus || hasStopAtDestination;
            })
            .map(t => {
              // Vérifier si c'est une escale pour ce trajet précis
              const stopAtDestination = t.trip_stops?.find((s: any) => s.city_id === toData.id);
              const isStop = !!stopAtDestination;

              let typeLabel = 'Bus';
              if (t.type === 'TRAIN') typeLabel = 'Train';
              if (t.type === 'BOAT') typeLabel = 'Bateau';
              if (t.type === 'PLANE') typeLabel = 'Avion';

              // AJUSTEMENT DU PRIX ET DE L'HEURE SI C'EST UNE ESCALE
              const finalPrice = isStop ? stopAtDestination.price_from_start : t.price;
              const finalArrival = isStop ? stopAtDestination.arrival_time : t.arrival_time;
              
              // Calcul tarif enfant (50% par défaut ou prix spécifique si défini)
              const finalChildPrice = t.child_price 
                ? (isStop ? Math.round(finalPrice * 0.5) : t.child_price) 
                : Math.round(finalPrice * 0.5);

              return {
                departureId: t.id,
                companyName: t.company?.name || 'Opérateur',
                transportType: typeLabel,
                vehicleNumber: t.vehicle_number,
                registration: t.vehicle?.registration || '—',
                departureTime: t.departure_time,
                arrivalTime: finalArrival || '--:--',
                price: finalPrice,
                childPrice: finalChildPrice,
                availableSeats: t.seats_left,
                isStop: isStop
              };
            });

          setTrips(formatted);
        }
      } catch (err: any) {
        toast.error("Erreur lors de la recherche");
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [from, to, date, sortBy]);

  // Regroupement par type (Avion, Train, etc.)
  const groupedTrips = useMemo(() => {
    const groups = { 'Avion': [] as Trip[], 'Train': [] as Trip[], 'Bateau': [] as Trip[], 'Bus': [] as Trip[] };
    trips.forEach(trip => {
      if (groups[trip.transportType as keyof typeof groups]) {
        groups[trip.transportType as keyof typeof groups].push(trip);
      }
    });
    // Tri
    Object.keys(groups).forEach(key => {
      groups[key as keyof typeof groups].sort((a, b) =>
        sortBy === 'price' ? a.price - b.price : a.departureTime.localeCompare(b.departureTime)
      );
    });
    return groups;
  }, [trips, sortBy]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl text-left bg-background text-foreground min-h-screen">
      
      {/* HEADER RECAP */}
      <div className="mb-10 bg-card border-2 border-border p-6 rounded-[2rem] shadow-2xl">
        <div className="flex items-center gap-3 text-2xl md:text-3xl font-black italic tracking-tighter text-white mb-2">
          <span>{from}</span>
          <ArrowRight className="h-6 w-6 text-primary stroke-[3px]" />
          <span>{to}</span>
        </div>
        <p className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-widest">
            {date ? new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
        </p>
      </div>

      {/* FILTRES */}
      <div className="flex items-center gap-4 mb-8 px-2">
        <span className="text-[10px] font-black uppercase text-slate-500">Trier par :</span>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-border shadow-inner">
            <button onClick={() => setSortBy('time')} className={`rounded-lg font-black text-[10px] uppercase px-4 py-2 transition-all ${sortBy === 'time' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Horaire</button>
            <button onClick={() => setSortBy('price')} className={`rounded-lg font-black text-[10px] uppercase px-4 py-2 transition-all ${sortBy === 'price' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Prix</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-full rounded-[2.5rem] bg-slate-900" />)}
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-border">
          <MapPin className="h-16 w-16 mx-auto text-slate-700 mb-6" />
          <h3 className="text-2xl font-black text-white uppercase italic">Aucun voyage trouvé</h3>
          <Button variant="default" className="mt-8 rounded-2xl font-black px-10 h-14 bg-primary text-white" onClick={() => navigate('/')}>NOUVELLE RECHERCHE</Button>
        </div>
      ) : (
        <div className="space-y-12">
          {(['Avion', 'Train', 'Bateau', 'Bus'] as const).map(type => {
            const list = groupedTrips[type];
            if (list.length === 0) return null;
            const SectionIcon = type === 'Avion' ? Plane : type === 'Train' ? Train : type === 'Bateau' ? Ship : Bus;

            return (
              <div key={type} className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
                    <SectionIcon size={18} />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                    {type} <span className="text-primary ml-1">({list.length})</span>
                  </h2>
                  <div className="h-px bg-slate-800 flex-1 ml-4" />
                </div>

                <div className="grid gap-5">
                  {list.map(trip => (
                    <div key={trip.departureId} className="bg-card border-2 border-border rounded-[2rem] p-6 md:p-8 hover:shadow-2xl transition-all group overflow-hidden">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex items-center gap-5 min-w-[240px] text-left">
                          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white ${
                              trip.transportType === 'Bateau' ? 'bg-blue-600' : 
                              trip.transportType === 'Train' ? 'bg-slate-950 border border-slate-800' : 
                              trip.transportType === 'Avion' ? 'bg-indigo-600' : 'bg-primary'
                          }`}>
                            {trip.transportType === 'Train' ? <Train size={32}/> : trip.transportType === 'Bateau' ? <Ship size={32}/> : trip.transportType === 'Avion' ? <Plane size={32}/> : <Bus size={32}/>}
                          </div>
                          <div>
                            <div className="font-black text-xl text-white uppercase truncate mb-1">{trip.companyName}</div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-700 text-slate-400">{trip.transportType}</Badge>
                                <span className="text-[9px] font-bold text-slate-600 uppercase"><Hash size={10} className="inline mr-1"/>{trip.registration}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-6 md:gap-10 flex-1 border-y lg:border-y-0 lg:border-x border-slate-800/50 py-6 lg:py-0">
                          <div className="text-center">
                            <div className="text-2xl md:text-3xl font-black text-white tracking-tighter">{trip.departureTime}</div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase mt-1">{from}</div>
                          </div>
                          <ArrowRight className="text-primary opacity-30" />
                          <div className="text-center">
                            <div className="text-2xl md:text-3xl font-black text-white tracking-tighter">{trip.arrivalTime}</div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 flex items-center gap-1">
                                {to} {trip.isStop && <Badge className="bg-amber-500/10 text-amber-500 border-none text-[7px] uppercase px-1">Escale</Badge>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-8">
                          <div className="text-left lg:text-right">
                            <div className="text-2xl md:text-3xl font-black text-primary tracking-tighter">{trip.price.toLocaleString()} F</div>
                            <div className="flex items-center lg:justify-end gap-1.5 text-[10px] font-black text-blue-400 uppercase mt-1">
                                <Baby size={12} /> Enfant : {trip.childPrice.toLocaleString()} F
                            </div>
                          </div>
                          <Button
                            className="rounded-2xl font-black h-14 px-8 shadow-xl bg-primary text-white border-none active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                            onClick={() => navigate(`/seats/${trip.departureId}?from=${from}&to=${to}&price=${trip.price}&isStop=${trip.isStop}`)}
                            disabled={trip.availableSeats <= 0}
                          >
                            {trip.availableSeats > 0 ? 'Réserver' : 'Complet'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}