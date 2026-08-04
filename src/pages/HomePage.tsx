"use client"

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  Train, 
  Bus, 
  ArrowRightLeft, 
  Calendar as CalendarIcon, 
  MapPin, 
  Ship, 
  ShieldCheck, 
  CheckCircle2, 
  Package,
  ArrowRight,
  Gem,
  Plane,
  Clock,
  Hash,
  Check
} from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge'; 
import { Skeleton } from '@/components/ui/skeleton';

import heroBg from '@/assets/hero-gabon.png';

const TRANSPORT_TYPES = [
  { icon: Plane, label: 'Vols (Aérien)', color: 'bg-indigo-600' },
  { icon: Train, label: 'Train (SETRAG)', color: 'bg-slate-950 border-slate-800' },
  { icon: Ship, label: 'Navires (Maritime)', color: 'bg-blue-600' },
  { icon: Bus, label: 'Autocars & Bus', color: 'bg-primary' },
];

const GABON_CITIES_FALLBACK = [
  "Libreville", "Port-Gentil", "Franceville", "Oyem", "Moanda", 
  "Lambaréné", "Mouila", "Tchibanga", "Makokou", "Booué", "Ndjolé", "Lastoursville"
];

export default function HomePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  // États de recherche
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(today); // Date du jour par défaut
  
  // États pour les suggestions
  const [dbCities, setDbCities] = useState<string[]>([]);
  const [showFromSuggest, setShowFromSuggest] = useState(false);
  const [showToSuggest, setShowToSuggest] = useState(false);

  // États pour les départs à venir
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const tripsPerPage = 6;

  useEffect(() => {
    fetchCities();
    fetchUpcomingTrips();
  }, []);

  const fetchCities = async () => {
    try {
      const { data } = await supabase.from('cities').select('name').order('name');
      if (data) setDbCities(data.map(c => c.name));
    } catch (err) { console.error(err); }
  };

  const fetchUpcomingTrips = async () => {
    setTripsLoading(true);
    try {
      const { data } = await supabase
        .from('trips')
        .select(`*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name), vehicle:vehicles(registration)`)
        .gte('departure_date', today)
        .order('departure_date', { ascending: true })
        .limit(24);
      if (data) setUpcomingTrips(data);
    } catch (err) { console.error(err); }
    finally { setTripsLoading(false); }
  };

  // Filtrage des suggestions
  const suggestionsFrom = useMemo(() => 
    dbCities.filter(c => c.toLowerCase().includes(from.toLowerCase()) && c !== to),
  [from, dbCities, to]);

  const suggestionsTo = useMemo(() => 
    dbCities.filter(c => c.toLowerCase().includes(to.toLowerCase()) && c !== from),
  [to, dbCities, from]);

  const handleSearch = () => {
    if (!from || !to || !date) return;
    navigate(`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`);
  };

  const currentTrips = upcomingTrips.slice((currentPage - 1) * tripsPerPage, currentPage * tripsPerPage);
  const totalPages = Math.ceil(upcomingTrips.length / tripsPerPage);

  return (
    <div className="bg-background text-foreground font-sans">
      
      {/* --- HERO SECTION --- */}
      <section className="relative text-white overflow-hidden min-h-[700px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="Voyage Gabon" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-background" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge className="mb-4 bg-primary text-white border-none px-4 py-1 font-black uppercase text-[10px] tracking-[0.2em]">
                Plateforme Officielle • Gabon
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-[1.1] tracking-tighter italic uppercase">
              Voyagez et expédiez <br /> <span className="text-primary">en toute simplicité </span>
            </h1>
          </div>

          {/* BARRE DE RECHERCHE AMÉLIORÉE */}
          <div className="max-w-4xl mx-auto bg-slate-900/80 backdrop-blur-2xl text-white rounded-[3rem] p-6 md:p-10 shadow-2xl border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start mb-8 relative">
              
              {/* VILLE DE DÉPART AVEC SUGGESTIONS */}
              <div className="relative space-y-2 group">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 italic">Départ</Label>
                <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary z-10" />
                    <Input 
                        placeholder="D'où partez-vous ?"
                        value={from}
                        onChange={(e) => { setFrom(e.target.value); setShowFromSuggest(true); }}
                        onFocus={() => setShowFromSuggest(true)}
                        onBlur={() => setTimeout(() => setShowFromSuggest(false), 200)}
                        className="h-14 pl-12 rounded-2xl border-none bg-slate-950/50 text-white font-bold placeholder:text-slate-600 shadow-inner"
                    />
                </div>
                {showFromSuggest && from.length > 0 && suggestionsFrom.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[100] max-h-60 overflow-y-auto backdrop-blur-xl">
                        {suggestionsFrom.map(city => (
                            <button key={city} onClick={() => { setFrom(city); setShowFromSuggest(false); }} className="w-full text-left px-6 py-3 hover:bg-primary/20 transition-colors font-bold text-sm border-b border-white/5 last:border-none">
                                {city}
                            </button>
                        ))}
                    </div>
                )}
              </div>

              <button type="button" onClick={() => { setFrom(to); setTo(from); }} className="hidden md:flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-all border-4 border-slate-900 self-center mt-6">
                <ArrowRightLeft className="h-5 w-5" />
              </button>

              {/* DESTINATION AVEC SUGGESTIONS */}
              <div className="relative space-y-2 group">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 italic">Destination</Label>
                <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary z-10" />
                    <Input 
                        placeholder="Où allez-vous ?"
                        value={to}
                        onChange={(e) => { setTo(e.target.value); setShowToSuggest(true); }}
                        onFocus={() => setShowToSuggest(true)}
                        onBlur={() => setTimeout(() => setShowToSuggest(false), 200)}
                        className="h-14 pl-12 rounded-2xl border-none bg-slate-950/50 text-white font-bold placeholder:text-slate-600 shadow-inner"
                    />
                </div>
                {showToSuggest && to.length > 0 && suggestionsTo.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[100] max-h-60 overflow-y-auto backdrop-blur-xl">
                        {suggestionsTo.map(city => (
                            <button key={city} onClick={() => { setTo(city); setShowToSuggest(false); }} className="w-full text-left px-6 py-3 hover:bg-primary/20 transition-colors font-bold text-sm border-b border-white/5 last:border-none">
                                {city}
                            </button>
                        ))}
                    </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end">
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 italic">Date du voyage</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Bouton Date du Jour Rapide */}
                    <Button 
                        type="button" 
                        variant={date === today ? "default" : "outline"}
                        onClick={() => setDate(today)}
                        className={`h-14 rounded-2xl px-6 font-black uppercase text-[10px] tracking-widest border-none transition-all ${date === today ? 'bg-primary text-white' : 'bg-slate-950/50 text-slate-400 hover:bg-slate-800'}`}
                    >
                        <Check className={`mr-2 h-4 w-4 ${date === today ? 'opacity-100' : 'opacity-0'}`} />
                        Aujourd'hui
                    </Button>

                    <div className="relative flex-1">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
                        <Input 
                            type="date" 
                            value={date} 
                            min={today}
                            onChange={e => setDate(e.target.value)} 
                            className="h-14 pl-12 rounded-2xl border-none bg-slate-950/50 text-white font-black shadow-inner appearance-none cursor-pointer" 
                        />
                    </div>
                </div>
              </div>
              
              <Button size="lg" className="w-full md:w-auto h-14 px-12 gap-3 font-black italic uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-xl active:scale-95 transition-all" onClick={handleSearch} disabled={!from || !to || !date}>
                <Search className="h-5 w-5" /> Trouver mon trajet
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION PROCHAINS DÉPARTS (Pagination 6) --- */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="text-left">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none mb-3">Départs Imminents</h2>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Disponibilités en temps réel
              </p>
            </div>
            
            {totalPages > 1 && (
              <div className="flex gap-3 bg-slate-900 p-2 rounded-2xl border border-white/5 shadow-xl">
                <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-12 w-12 hover:bg-slate-800 text-white">
                  <ChevronLeft size={24} />
                </Button>
                <div className="flex items-center px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Page {currentPage} / {totalPages}
                </div>
                <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-12 w-12 hover:bg-slate-800 text-white">
                  <ChevronRight size={24} />
                </Button>
              </div>
            )}
          </div>

          {tripsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-[3rem] bg-slate-900" />)}
            </div>
          ) : upcomingTrips.length === 0 ? (
            <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[4rem] bg-slate-900/20">
               <p className="text-slate-600 font-black uppercase tracking-[0.3em] italic">Aucun voyage pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              {currentTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* --- SERVICES & NETWORK (GARDÉS POUR LA COHÉRENCE) --- */}
      <section className="py-24 bg-slate-950 border-y border-white/5">
        <div className="container mx-auto px-4 max-w-6xl">
           <div className="grid md:grid-cols-2 gap-12">
              <div className="p-10 bg-slate-900/40 rounded-[3.5rem] border border-white/10 hover:border-primary/40 transition-all group">
                <div className="h-16 w-16 bg-primary rounded-3xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-primary/20 group-hover:scale-110 transition-transform">
                    <Plane size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase text-white mb-4 italic tracking-tighter">Mobilité Nationale</h3>
                <p className="text-slate-400 font-medium leading-relaxed mb-6">Comparez les tarifs et réservez votre place en quelques secondes.</p>
                <Link to="/search" className="inline-flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest hover:gap-4 transition-all">Découvrir les trajets <ArrowRight size={14} /></Link>
              </div>

              <div className="p-10 bg-slate-900/40 rounded-[3.5rem] border border-white/10 hover:border-emerald-500/40 transition-all group">
                <div className="h-16 w-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-emerald-900/20 group-hover:scale-110 transition-transform">
                    <Package size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase text-white mb-4 italic tracking-tighter">Expédition Fret</h3>
                <p className="text-slate-400 font-medium leading-relaxed mb-6">Un service de messagerie fiable pour vos colis de Libreville à l'intérieur du pays.</p>
                <Link to="/send-parcel" className="inline-flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-widest hover:gap-4 transition-all">Envoyer un colis <ArrowRight size={14} /></Link>
              </div>
           </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-24 bg-background border-t border-white/5 text-center">
        <div className="container mx-auto px-4">
          <div className="flex justify-center gap-12 mb-16 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Link to="/privacy" className="hover:text-primary transition-colors">Confidentialité</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Conditions</Link>
            <a href="mailto:support@transgabon.ga" className="hover:text-primary transition-colors">Support</a>
          </div>
          <p className="text-[10px] text-slate-700 uppercase tracking-[0.5em] font-black">TransGabon Connect • Mobilité Gabonaise 2026</p>
        </div>
      </footer>
    </div>
  );
}

// --- CARTE DE VOYAGE PREMIUM ---
function TripCard({ trip, navigate }: { trip: any, navigate: any }) {
  const Icon = trip.type === 'BOAT' ? Ship : trip.type === 'TRAIN' ? Train : trip.type === 'PLANE' ? Plane : Bus;
  
  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-[3rem] overflow-hidden hover:border-primary/50 transition-all group shadow-2xl flex flex-col text-left backdrop-blur-sm">
      <div className="p-8 flex-1">
        <div className="flex justify-between items-start mb-8">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-xl ${
            trip.type === 'BOAT' ? 'bg-blue-600' : trip.type === 'PLANE' ? 'bg-indigo-600' : 'bg-primary'
          }`}>
            <Icon size={28} />
          </div>
          <div className="text-right">
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Dès</p>
             <p className="text-3xl font-black text-primary tracking-tighter leading-none">{trip.price.toLocaleString()} <span className="text-[10px] ml-0.5 opacity-50">F</span></p>
          </div>
        </div>

        <div className="mb-8">
           <h3 className="text-2xl font-black text-white uppercase truncate mb-2 italic tracking-tighter">{trip.company.name}</h3>
           <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-white/10 text-slate-400 bg-white/5 px-2 py-0.5">
                  {trip.type === 'PLANE' ? 'Vol Aérien' : trip.type === 'TRAIN' ? 'Ligne Ferroviaire' : 'Route Directe'}
              </Badge>
              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600">
                 <Hash size={10} /> {trip.vehicle?.registration || '—'}
              </div>
           </div>
        </div>

        <div className="space-y-4 py-8 border-y border-white/5 relative">
           <div className="flex items-center justify-between">
              <div className="min-w-0">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Départ</p>
                 <p className="font-bold text-white text-base truncate uppercase">{trip.from.name}</p>
                 <p className="text-primary font-black text-xl mt-1 tracking-tighter">{trip.departure_time}</p>
              </div>
              <ArrowRight className="text-slate-800 shrink-0 mx-4 opacity-20" size={24} />
              <div className="text-right min-w-0">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Arrivée</p>
                 <p className="font-bold text-white text-base truncate uppercase">{trip.to.name}</p>
                 <p className="text-slate-400 font-black text-xl mt-1 tracking-tighter">{trip.arrival_time}</p>
              </div>
           </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
           <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <CalendarIcon size={12} className="text-primary" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-tight">
                {new Date(trip.departure_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
           </div>
           <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black uppercase px-3 py-1">
              {trip.seats_left} PLACES
           </Badge>
        </div>
      </div>

      <Button 
        onClick={() => navigate(`/seats/${trip.id}?from=${trip.from.name}&to=${trip.to.name}&price=${trip.price}`)}
        className="w-full h-16 rounded-none bg-slate-950/80 hover:bg-primary text-white font-black uppercase tracking-[0.2em] text-[10px] border-t border-white/5 transition-all group-hover:bg-primary"
      >
        Réserver ce trajet
      </Button>
    </div>
  );
}