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
  isStop: boolean;
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
        // 1. On cherche les IDs des villes avec 'ilike' (insensible à la casse)
        const { data: fromData } = await supabase.from('cities').select('id').ilike('name', from).maybeSingle();
        const { data: toData } = await supabase.from('cities').select('id').ilike('name', to).maybeSingle();

        if (!fromData || !toData) {
          console.warn("Villes non trouvées dans la base");
          setTrips([]);
          setLoading(false);
          return;
        }

        // 2. Recherche des trajets
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
              // On garde le trajet s'il va au terminus ou s'il a une escale à 'toData.id'
              const arrivesAtTerminus = t.to_id === toData.id;
              const hasStopAtDestination = t.trip_stops?.some((s: any) => s.city_id === toData.id);
              return arrivesAtTerminus || hasStopAtDestination;
            })
            .map(t => {
              const stopAtDestination = t.trip_stops?.find((s: any) => s.city_id === toData.id);
              const isStop = !!stopAtDestination;

              let typeLabel = 'Bus';
              if (t.type === 'TRAIN') typeLabel = 'Train';
              if (t.type === 'BOAT') typeLabel = 'Bateau';
              if (t.type === 'PLANE') typeLabel = 'Avion';

              const adultPrice = isStop ? stopAtDestination.price_from_start : t.price;
              const finalChildPrice = t.child_price || Math.round(adultPrice * 0.5);

              return {
                departureId: t.id,
                companyName: t.company?.name || 'Opérateur',
                transportType: typeLabel,
                vehicleNumber: t.vehicle_number,
                registration: t.vehicle?.registration || '—',
                departureTime: t.departure_time,
                arrivalTime: isStop ? stopAtDestination.arrival_time : t.arrival_time,
                price: adultPrice,
                childPrice: isStop ? Math.round(adultPrice * 0.5) : finalChildPrice,
                availableSeats: t.seats_left,
                isStop: isStop
              };
            });

          setTrips(formatted);
        }
      } catch (err: any) {
        console.error("Erreur recherche:", err.message);
        toast.error("Erreur lors de la récupération des trajets");
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [from, to, date]);

  const groupedTrips = useMemo(() => {
    const groups = { 'Avion': [] as Trip[], 'Train': [] as Trip[], 'Bateau': [] as Trip[], 'Bus': [] as Trip[] };
    trips.forEach(trip => {
      if (groups[trip.transportType as keyof typeof groups]) {
        groups[trip.transportType as keyof typeof groups].push(trip);
      }
    });
    Object.keys(groups).forEach(key => {
      groups[key as keyof typeof groups].sort((a, b) =>
        sortBy === 'price' ? a.price - b.price : a.departureTime.localeCompare(b.departureTime)
      );
    });
    return groups;
  }, [trips, sortBy]);

  const formattedDate = date ? new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl text-left animate-in fade-in duration-500 bg-background text-foreground">
      
      {/* Header Itinéraire */}
      <div className="mb-10 bg-card border-2 border-border p-6 md:p-8 rounded-[2rem] shadow-2xl">
        <div className="flex items-center gap-3 text-2xl md:text-3xl font-black italic tracking-tighter text-white mb-2">
          <span>{from}</span>
          <ArrowRight className="h-6 w-6 text-primary stroke-[3px]" />
          <span>{to}</span>
        </div>
        <p className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-widest">{formattedDate}</p>
      </div>

      {/* Barre de tri */}
      <div className="flex items-center gap-4 mb-8 px-2">
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Trier par :</span>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-border shadow-inner">
            <button onClick={() => setSortBy('time')} className={`rounded-lg font-black text-[10px] uppercase px-4 py-2 transition-all ${sortBy === 'time' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Horaire</button>
            <button onClick={() => setSortBy('price')} className={`rounded-lg font-black text-[10px] uppercase px-4 py-2 transition-all ${sortBy === 'price' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Prix</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-[2rem] bg-slate-900 border border-slate-800" />)}
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-border">
          <MapPin className="h-16 w-16 mx-auto text-slate-700 mb-6" />
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Aucun voyage trouvé</h3>
          <p className="text-slate-500 mt-2">Vérifiez l'orthographe des villes ou changez de date.</p>
          <Button variant="default" className="mt-8 rounded-2xl font-black px-10 h-14 bg-primary text-white" onClick={() => navigate('/')}>REFAIRE UNE RECHERCHE</Button>
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
                    <TripCard key={trip.departureId} trip={trip} from={from} to={to} navigate={navigate} />
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

function TripCard({ trip, from, to, navigate }: { trip: Trip, from: string, to: string, navigate: any }) {
  const TransportIcon = trip.transportType === 'Train' ? Train : trip.transportType === 'Bateau' ? Ship : trip.transportType === 'Avion' ? Plane : Bus;

  return (
    <div className="bg-card border-2 border-border rounded-[2rem] p-6 md:p-8 hover:shadow-2xl hover:border-primary/30 transition-all duration-300 group overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        
        <div className="flex items-center gap-5 min-w-[240px] text-left">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform ${
              trip.transportType === 'Bateau' ? 'bg-blue-600' : 
              trip.transportType === 'Train' ? 'bg-slate-950 border border-slate-800' : 
              trip.transportType === 'Avion' ? 'bg-indigo-600' : 'bg-primary'
          } text-white`}>
            <TransportIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-xl text-white leading-none mb-3 truncate uppercase tracking-tight">{trip.companyName}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-slate-700 text-slate-400 bg-slate-950/50 px-2 py-0.5">
                  {trip.transportType}
              </Badge>
              <span className="flex items-center gap-1 text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 uppercase italic">
                 <Hash size={10} /> {trip.registration}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 md:gap-10 flex-1 border-y lg:border-y-0 lg:border-x border-slate-800/50 py-6 lg:py-0">
          <div className="text-center min-w-[80px]">
            <div className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none">{trip.departureTime}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 truncate">{from}</div>
          </div>
          <div className="flex flex-col items-center opacity-30 text-primary">
            <ArrowRight className="h-5 w-5" />
          </div>
          <div className="text-center min-w-[80px]">
            <div className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none">{trip.arrivalTime || '--:--'}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 flex items-center justify-center gap-1">
              {to} {trip.isStop && <Badge className="h-3 px-1 text-[7px] bg-amber-500/10 text-amber-500 border-none uppercase font-black">Escale</Badge>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-6">
          <div className="text-left lg:text-right">
            <div className="text-2xl md:text-3xl font-black text-primary tracking-tighter leading-none">
              {trip.price.toLocaleString()} 
              <span className="text-[9px] ml-1 font-black text-slate-500">FCFA</span>
            </div>
            <div className="flex items-center lg:justify-end gap-1.5 text-[10px] font-black text-blue-400 uppercase mt-1 tracking-tighter">
              <Baby size={12} />
              Enfant : {trip.childPrice.toLocaleString()} F
            </div>
            <div className="flex items-center lg:justify-end gap-1 text-[10px] font-black text-emerald-500 uppercase mt-1 tracking-tighter">
              <Users className="h-3 w-3" />
              {trip.availableSeats} places libres
            </div>
          </div>
          <Button
            size="lg"
            className="rounded-2xl font-black h-14 px-8 shadow-xl bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all uppercase tracking-widest text-[10px] border-none"
            onClick={() => navigate(`/seats/${trip.departureId}?from=${from}&to=${to}&price=${trip.price}&isStop=${trip.isStop}`)}
            disabled={trip.availableSeats <= 0}
          >
            {trip.availableSeats > 0 ? 'Réserver' : 'Complet'}
          </Button>
        </div>
      </div>
    </div>
  );
}