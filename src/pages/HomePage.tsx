"use client"

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  Train, 
  Bus, 
  ArrowRightLeft, 
  Calendar, 
  MapPin, 
  Ship, 
  ShieldCheck, 
  CheckCircle2, 
  Package,
  ArrowRight,
  Truck,
  Gem,
  Plane,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hash
} from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [dbCities, setDbCities] = useState<string[]>([]);
  
  // États pour les départs à venir
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const tripsPerPage = 6;

  const today = new Date().toISOString().split('T')[0];

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
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          company:companies(name),
          from:cities!from_id(name),
          to:cities!to_id(name),
          vehicle:vehicles(registration)
        `)
        .gte('departure_date', today)
        .order('departure_date', { ascending: true })
        .order('departure_time', { ascending: true })
        .limit(24); // On en récupère 24 pour la pagination

      if (data) setUpcomingTrips(data);
    } catch (err) { console.error(err); }
    finally { setTripsLoading(false); }
  };

  // Logique de pagination
  const totalPages = Math.ceil(upcomingTrips.length / tripsPerPage);
  const currentTrips = upcomingTrips.slice((currentPage - 1) * tripsPerPage, currentPage * tripsPerPage);

  const handleSearch = () => {
    if (!from || !to || !date) return;
    navigate(`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`);
  };

  const swap = () => { setFrom(to); setTo(from); };

  const citiesList = dbCities.length > 0 ? dbCities : GABON_CITIES_FALLBACK;

  return (
    <div className="bg-background text-foreground font-sans">
      
      {/* --- HERO SECTION --- */}
      <section className="relative text-white overflow-hidden min-h-[650px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="Voyage Gabon" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-background" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge className="mb-4 bg-primary text-white border-none px-4 py-1 font-black uppercase text-[10px] tracking-[0.2em] animate-pulse">
                Plateforme Officielle • Gabon
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tighter italic uppercase">
              Voyagez et expédiez vos colis <span className="text-primary">en un clic </span>
            </h1>
            <p className="text-lg md:text-xl font-medium mb-8 text-slate-300">
              Réservez vos vols, trains, bateaux et bus à travers tout le Gabon. Simple, sécurisé et rapide.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
                <Button onClick={() => navigate('/track')} variant="outline" className="rounded-2xl font-black bg-white/5 border-white/10 text-white h-12 px-8 hover:bg-white/10 uppercase text-[10px] tracking-widest">
                    SUIVRE UN COLIS
                </Button>
            </div>
          </div>

          {/* BARRE DE RECHERCHE */}
          <div className="max-w-4xl mx-auto bg-slate-900/90 backdrop-blur-xl text-white rounded-[2.5rem] p-5 md:p-10 shadow-2xl border border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-end mb-8 text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 italic">Départ</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="h-14 rounded-2xl border-none !bg-slate-950 !text-white font-bold shadow-inner">
                    <SelectValue placeholder="Ville de départ" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-slate-900 border-border text-white">
                    {citiesList.filter(c => c !== to).map(c => (
                      <SelectItem key={c} value={c} className="font-bold uppercase text-xs focus:bg-primary/20">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button type="button" onClick={swap} className="hidden md:flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white shadow-lg hover:rotate-180 transition-all duration-500 border-4 border-slate-900 self-end mb-1">
                <ArrowRightLeft className="h-5 w-5" />
              </button>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 italic">Destination</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="h-14 rounded-2xl border-none !bg-slate-950 !text-white font-bold shadow-inner">
                    <SelectValue placeholder="Ville d'arrivée" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-slate-900 border-slate-800 text-white">
                    {citiesList.filter(c => c !== from).map(c => (
                      <SelectItem key={c} value={c} className="font-bold uppercase text-xs focus:bg-primary/20">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 italic">Date du voyage</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={today} className="h-14 rounded-2xl border-none !bg-slate-950 !text-white font-black px-6 shadow-inner appearance-none" />
              </div>
              <Button size="lg" className="w-full md:w-auto h-14 px-12 gap-3 font-black italic uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-xl active:scale-95" onClick={handleSearch} disabled={!from || !to || !date}>
                <Search className="h-5 w-5" /> Rechercher
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION PROCHAINS DÉPARTS --- */}
      <section className="py-20 bg-background relative">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="text-left">
              <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter leading-none mb-2">Prochains Départs</h2>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Disponibilités en temps réel sur le réseau national</p>
            </div>
            
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl border-slate-800 bg-slate-900 text-white hover:bg-slate-800 h-12 w-12">
                  <ChevronLeft size={24} />
                </Button>
                <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl border-slate-800 bg-slate-900 text-white hover:bg-slate-800 h-12 w-12">
                  <ChevronRight size={24} />
                </Button>
              </div>
            )}
          </div>

          {tripsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-[2.5rem] bg-slate-900" />)}
            </div>
          ) : upcomingTrips.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/20">
               <Clock className="mx-auto h-12 w-12 text-slate-700 mb-4" />
               <p className="text-slate-500 font-black uppercase tracking-widest italic">Aucun départ prévu prochainement</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700">
              {currentTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* --- SERVICES SECTION --- */}
      <section className="py-24 bg-slate-950 border-y border-slate-900">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight mb-4 text-white">Services & Logistique</h2>
            <div className="h-1.5 w-20 bg-primary mx-auto rounded-full" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="p-8 md:p-10 bg-slate-900/40 rounded-[2.5rem] border-2 border-slate-800 hover:border-primary/30 transition-all group">
              <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl group-hover:scale-110 transition-transform">
                <Plane size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter text-white">Voyages Nationaux</h3>
              <p className="text-slate-400 leading-relaxed font-medium">
                Consultez les horaires de toutes les compagnies. Choisissez votre confort <strong>VIP ou Business</strong> et recevez votre billet numérique sécurisé.
              </p>
            </div>
            
            <div className="p-8 md:p-10 bg-slate-900/40 rounded-[2.5rem] border-2 border-slate-800 hover:border-emerald-500/30 transition-all group">
              <div className="h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl group-hover:scale-110 transition-transform">
                <Package size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter text-white">Expédition Fret</h3>
              <p className="text-slate-400 leading-relaxed font-medium">
                Envoyez vos colis partout au Gabon. <strong>Enregistrez votre envoi</strong>, obtenez votre bordereau et suivez son acheminement en temps réel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- NETWORK SECTION --- */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h2 className="text-2xl font-black uppercase italic mb-12 tracking-widest text-slate-500">Réseau Multimodal National</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRANSPORT_TYPES.map((t, i) => (
              <div key={i} className="bg-slate-900/40 rounded-[2rem] p-8 border-2 border-slate-800 hover:border-primary/40 transition-all group text-center flex flex-col items-center">
                <div className={`h-14 w-14 mb-6 rounded-xl flex items-center justify-center text-white ${t.color} shadow-lg shadow-black/40`}>
                    <t.icon size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-20 bg-slate-950 border-t border-slate-900">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 mb-12">
            <Link to="/privacy" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors text-slate-500">Confidentialité</Link>
            <Link to="/terms" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors text-slate-500">Conditions</Link>
            <a href="mailto:transgabon241@gmail.com" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors text-slate-500">Support</a>
          </div>
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em] font-black mb-2 text-center">
             TransGabon-Connect • République Gabonaise 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

// --- SOUS-COMPOSANT CARTE DE VOYAGE ---
function TripCard({ trip, navigate }: { trip: any, navigate: any }) {
  const Icon = trip.type === 'BOAT' ? Ship : trip.type === 'TRAIN' ? Train : trip.type === 'PLANE' ? Plane : Bus;
  
  return (
    <div className="bg-slate-900/60 border-2 border-slate-800 rounded-[2.5rem] overflow-hidden hover:border-primary/50 transition-all group shadow-xl flex flex-col text-left">
      <div className="p-6 sm:p-8 flex-1">
        <div className="flex justify-between items-start mb-6">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
            trip.type === 'BOAT' ? 'bg-blue-600' : trip.type === 'PLANE' ? 'bg-indigo-600' : 'bg-primary'
          }`}>
            <Icon size={24} />
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">À partir de</p>
             <p className="text-2xl font-black text-primary tracking-tighter leading-none">{trip.price.toLocaleString()} F</p>
          </div>
        </div>

        <div className="mb-6">
           <h3 className="text-xl font-black text-white uppercase truncate mb-1">{trip.company.name}</h3>
           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <Hash size={12} className="text-primary" /> {trip.vehicle?.registration || '—'}
           </div>
        </div>

        <div className="space-y-4 py-6 border-y border-white/5">
           <div className="flex items-center justify-between">
              <div className="min-w-0">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Départ</p>
                 <p className="font-bold text-white text-sm truncate uppercase">{trip.from.name}</p>
                 <p className="text-primary font-black text-lg leading-none mt-1">{trip.departure_time}</p>
              </div>
              <ArrowRight className="text-slate-800 shrink-0 mx-2" />
              <div className="text-right min-w-0">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Destination</p>
                 <p className="font-bold text-white text-sm truncate uppercase">{trip.to.name}</p>
                 <p className="text-slate-400 font-black text-lg leading-none mt-1">{trip.arrival_time}</p>
              </div>
           </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
           <div className="flex items-center gap-2">
              <Calendar size={14} className="text-primary" />
              <span className="text-[10px] font-black text-slate-300 uppercase">
                {new Date(trip.departure_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </span>
           </div>
           <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black uppercase px-2 h-5">
              {trip.seats_left} places libres
           </Badge>
        </div>
      </div>

      <Button 
        onClick={() => navigate(`/seats/${trip.id}?from=${trip.from.name}&to=${trip.to.name}&price=${trip.price}`)}
        className="w-full h-14 rounded-none bg-slate-800 hover:bg-primary text-white font-black uppercase tracking-widest text-[10px] border-none group-hover:h-16 transition-all"
      >
        Réserver maintenant
      </Button>
    </div>
  );
}