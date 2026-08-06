"use client"

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  Clock, MapPin, Users, Train, Bus, Ship, ArrowRight, Hash, 
  Info, Plane, Baby, Search, ArrowRightLeft, Calendar as CalendarIcon, Check 
} from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  
  // États pour les paramètres de l'URL
  const fromParam = params.get('from') || '';
  const toParam = params.get('to') || '';
  const dateParam = params.get('date') || '';

  // États de saisie locale pour la barre de recherche
  const [fromInput, setFromInput] = useState(fromParam);
  const [toInput, setToInput] = useState(toParam);
  const [dateInput, setDateInput] = useState(dateParam);
  
  // États pour les suggestions
  const [allCities, setAllCities] = useState<string[]>([]);
  const [showFromSuggest, setShowFromSuggest] = useState(false);
  const [showToSuggest, setShowToSuggest] = useState(false);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'price' | 'time'>('time');

  // Charger toutes les villes pour l'autocomplétion
  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase.from('cities').select('name').order('name');
      if (data) setAllCities(data.map(c => c.name));
    };
    fetchCities();
  }, []);

  // Charger les trajets basés sur l'URL
  useEffect(() => {
    if (!fromParam || !toParam || !dateParam) return;
    fetchTrips();
  }, [fromParam, toParam, dateParam]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const { data: fromData } = await supabase.from('cities').select('id').ilike('name', fromParam).maybeSingle();
      const { data: toData } = await supabase.from('cities').select('id').ilike('name', toParam).maybeSingle();

      if (!fromData || !toData) {
        setTrips([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('trips')
        .select(`*, company:companies(name), vehicle:vehicles(registration), trip_stops(*)`)
        .eq('from_id', fromData.id)
        .eq('departure_date', dateParam);

      if (error) throw error;

      if (data) {
        const formatted: Trip[] = data
          .filter(t => (t.to_id === toData.id || t.trip_stops?.some((s: any) => s.city_id === toData.id)))
          .map(t => {
            const stopAtDestination = t.trip_stops?.find((s: any) => s.city_id === toData.id);
            const isStop = !!stopAtDestination;
            const finalPrice = isStop ? stopAtDestination.price_from_start : t.price;
            const finalChildPrice = t.child_price ? (isStop ? Math.round(finalPrice * 0.5) : t.child_price) : Math.round(finalPrice * 0.5);

            return {
              departureId: t.id,
              companyName: t.company?.name || 'Opérateur',
              transportType: t.type === 'TRAIN' ? 'Train' : t.type === 'BOAT' ? 'Bateau' : t.type === 'PLANE' ? 'Avion' : 'Bus',
              vehicleNumber: t.vehicle_number,
              registration: t.vehicle?.registration || '—',
              departureTime: t.departure_time,
              arrivalTime: isStop ? stopAtDestination.arrival_time : t.arrival_time,
              price: finalPrice,
              childPrice: isStop ? Math.round(finalPrice * 0.5) : finalChildPrice,
              availableSeats: t.seats_left,
              isStop: isStop
            };
          });
        setTrips(formatted);
      }
    } catch (err) {
      toast.error("Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  // Filtrage des suggestions en temps réel
  const filteredFrom = useMemo(() => 
    allCities.filter(c => c.toLowerCase().includes(fromInput.toLowerCase()) && c !== toInput),
  [fromInput, allCities, toInput]);

  const filteredTo = useMemo(() => 
    allCities.filter(c => c.toLowerCase().includes(toInput.toLowerCase()) && c !== fromInput),
  [toInput, allCities, fromInput]);

  const handleNewSearch = () => {
    if (!fromInput || !toInput || !dateInput) return;
    navigate(`/search?from=${encodeURIComponent(fromInput)}&to=${encodeURIComponent(toInput)}&date=${dateInput}`);
  };

  const groupedTrips = useMemo(() => {
    const groups = { 'Avion': [] as Trip[], 'Train': [] as Trip[], 'Bateau': [] as Trip[], 'Bus': [] as Trip[] };
    trips.forEach(trip => {
      if (groups[trip.transportType as keyof typeof groups]) {
        groups[trip.transportType as keyof typeof groups].push(trip);
      }
    });
    return groups;
  }, [trips]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl text-left bg-background text-foreground min-h-screen">
      
      {/* BARRE DE RECHERCHE DYNAMIQUE (REMPLACE LE HEADER FIXE) */}
      <div className="mb-10 bg-slate-900/80 backdrop-blur-xl border-2 border-white/5 p-4 md:p-6 rounded-[2.5rem] shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          {/* DEPART */}
          <div className="relative space-y-2">
            <Label className="text-[10px] font-black uppercase text-primary ml-2 italic">Départ</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary z-10" />
              <Input 
                value={fromInput}
                onChange={(e) => { setFromInput(e.target.value); setShowFromSuggest(true); }}
                onFocus={() => setShowFromSuggest(true)}
                onBlur={() => setTimeout(() => setShowFromSuggest(false), 200)}
                className="h-12 pl-10 bg-slate-950 border-none rounded-xl text-white font-bold text-xs"
              />
            </div>
            {showFromSuggest && fromInput.length > 0 && filteredFrom.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[100] max-h-48 overflow-y-auto">
                {filteredFrom.map(city => (
                  <button key={city} onClick={() => { setFromInput(city); setShowFromSuggest(false); }} className="w-full text-left px-4 py-2 hover:bg-primary/20 text-white text-xs font-bold border-b border-white/5">
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DESTINATION */}
          <div className="relative space-y-2">
            <Label className="text-[10px] font-black uppercase text-primary ml-2 italic">Destination</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary z-10" />
              <Input 
                value={toInput}
                onChange={(e) => { setToInput(e.target.value); setShowToSuggest(true); }}
                onFocus={() => setShowToSuggest(true)}
                onBlur={() => setTimeout(() => setShowToSuggest(false), 200)}
                className="h-12 pl-10 bg-slate-950 border-none rounded-xl text-white font-bold text-xs"
              />
            </div>
            {showToSuggest && toInput.length > 0 && filteredTo.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[100] max-h-48 overflow-y-auto">
                {filteredTo.map(city => (
                  <button key={city} onClick={() => { setToInput(city); setShowToSuggest(false); }} className="w-full text-left px-4 py-2 hover:bg-primary/20 text-white text-xs font-bold border-b border-white/5">
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DATE */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-primary ml-2 italic">Date</Label>
            <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary z-10" />
                <Input 
                  type="date" 
                  value={dateInput} 
                  onChange={e => setDateInput(e.target.value)} 
                  className="h-12 pl-10 bg-slate-950 border-none rounded-xl text-white font-bold text-xs"
                />
            </div>
          </div>

          {/* BUTTON */}
          <Button onClick={handleNewSearch} className="h-12 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
            Actualiser
          </Button>
        </div>
      </div>

      {/* TRI ET FILTRES */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase text-slate-500">Trier par :</span>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5">
                <button onClick={() => setSortBy('time')} className={`rounded-lg font-black text-[10px] uppercase px-4 py-2 transition-all ${sortBy === 'time' ? 'bg-primary text-white' : 'text-slate-500'}`}>Horaire</button>
                <button onClick={() => setSortBy('price')} className={`rounded-lg font-black text-[10px] uppercase px-4 py-2 transition-all ${sortBy === 'price' ? 'bg-primary text-white' : 'text-slate-500'}`}>Prix</button>
            </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-full rounded-[2.5rem] bg-slate-900" />)}
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-white/5">
          <MapPin className="h-16 w-16 mx-auto text-slate-800 mb-6" />
          <h3 className="text-2xl font-black text-white uppercase italic">Aucun voyage pour cet itinéraire</h3>
          <p className="text-slate-500 text-sm mt-2">Essayez une autre date ou changez de destination.</p>
        </div>
      ) : (
        <div className="space-y-12 pb-20">
          {(['Avion', 'Train', 'Bateau', 'Bus'] as const).map(type => {
            const list = groupedTrips[type];
            if (list.length === 0) return null;
            const SectionIcon = type === 'Avion' ? Plane : type === 'Train' ? Train : type === 'Bateau' ? Ship : Bus;

            return (
              <div key={type} className="space-y-6">
                <div className="flex items-center gap-3 px-2 text-left">
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
                    <div key={trip.departureId} className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-6 md:p-8 hover:border-primary/40 transition-all group overflow-hidden shadow-xl backdrop-blur-sm">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex items-center gap-5 min-w-[240px] text-left">
                          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white ${
                              trip.transportType === 'Bateau' ? 'bg-blue-600' : 
                              trip.transportType === 'Train' ? 'bg-slate-950 border border-white/10' : 
                              trip.transportType === 'Avion' ? 'bg-indigo-600' : 'bg-primary'
                          }`}>
                            {trip.transportType === 'Train' ? <Train size={32}/> : trip.transportType === 'Bateau' ? <Ship size={32}/> : trip.transportType === 'Avion' ? <Plane size={32}/> : <Bus size={32}/>}
                          </div>
                          <div>
                            <div className="font-black text-xl text-white uppercase truncate mb-1 italic tracking-tighter">{trip.companyName}</div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[8px] font-black uppercase border-white/10 text-slate-500">{trip.transportType}</Badge>
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest"><Hash size={10} className="inline mr-1 text-primary"/>{trip.registration}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-6 md:gap-10 flex-1 border-y lg:border-y-0 lg:border-x border-white/5 py-6 lg:py-0">
                          <div className="text-center min-w-[70px]">
                            <div className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none">{trip.departureTime}</div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-widest">{fromParam}</div>
                          </div>
                          <ArrowRight className="text-primary opacity-20" size={24} />
                          <div className="text-center min-w-[70px]">
                            <div className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none">{trip.arrivalTime}</div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-widest flex items-center justify-center gap-1">
                                {toParam} {trip.isStop && <Badge className="bg-amber-500/10 text-amber-500 border-none text-[7px] uppercase px-1">Escale</Badge>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-8">
                          <div className="text-left lg:text-right">
                            <div className="text-2xl md:text-3xl font-black text-primary tracking-tighter">{trip.price.toLocaleString()} <span className="text-xs opacity-50">F</span></div>
                            <div className="flex items-center lg:justify-end gap-1.5 text-[10px] font-black text-blue-400 uppercase mt-1">
                                <Baby size={12} /> Enfant : {trip.childPrice.toLocaleString()} F
                            </div>
                          </div>
                          <Button
                            className="rounded-2xl font-black h-14 px-8 shadow-xl bg-primary text-white border-none active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                            onClick={() => navigate(`/seats/${trip.departureId}?from=${fromParam}&to=${toParam}&price=${trip.price}&isStop=${trip.isStop}`)}
                            disabled={trip.availableSeats <= 0}
                          >
                            {trip.availableSeats > 0 ? 'Choisir ma place' : 'Complet'}
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