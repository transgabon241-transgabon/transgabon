"use client"

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  Search, Train, Bus, ArrowRightLeft, Calendar as CalendarIcon, 
  MapPin, Ship, Package, ArrowRight, Plane, Clock, Check, ChevronLeft, ChevronRight
} from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge'; 
import { Skeleton } from '@/components/ui/skeleton';

import heroBg from '@/assets/hero-gabon.png';

export default function HomePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(today);
  const [dbCities, setDbCities] = useState<string[]>([]);
  const [showFromSuggest, setShowFromSuggest] = useState(false);
  const [showToSuggest, setShowToSuggest] = useState(false);
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
        .select(`*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name)`)
        .gte('departure_date', today)
        .order('departure_date', { ascending: true })
        .limit(18);
      if (data) setUpcomingTrips(data);
    } catch (err) { console.error(err); }
    finally { setTripsLoading(false); }
  };

  const currentTrips = upcomingTrips.slice((currentPage - 1) * tripsPerPage, currentPage * tripsPerPage);
  const totalPages = Math.ceil(upcomingTrips.length / tripsPerPage);

  return (
    <div className="bg-[#020617] text-white font-sans selection:bg-emerald-500/30">
      
      {/* --- EFFETS DE LUMIÈRE D'ARRIÈRE-PLAN (Style School Tech) --- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="Gabon" className="w-full h-full object-cover opacity-10 scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617]" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full mb-8 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Réseau National Connecté</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter leading-[0.95] uppercase italic">
              Le futur du <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">voyage au Gabon</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
              Plateforme unifiée pour vos déplacements et expéditions à travers les 9 provinces.
            </p>
          </div>

          {/* BARRE DE RECHERCHE ULTRA-MODERNE */}
          <div className="max-w-5xl mx-auto glass-panel rounded-[3rem] p-4 md:p-8 shadow-2xl reveal">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              
              <div className="group relative space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 ml-4">Origine</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500 group-focus-within:scale-110 transition-transform" />
                  <Input 
                    placeholder="Ville de départ"
                    className="h-16 pl-12 rounded-2xl border-white/5 bg-slate-950/50 text-white font-bold placeholder:text-slate-600 focus:bg-slate-900 transition-all"
                    value={from} onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
              </div>

              <div className="group relative space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 ml-4">Destination</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500 group-focus-within:scale-110 transition-transform" />
                  <Input 
                    placeholder="Ville d'arrivée"
                    className="h-16 pl-12 rounded-2xl border-white/5 bg-slate-950/50 text-white font-bold placeholder:text-slate-600 focus:bg-slate-900 transition-all"
                    value={to} onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="group relative space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 ml-4">Date de départ</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                  <Input 
                    type="date"
                    className="h-16 pl-12 rounded-2xl border-white/5 bg-slate-950/50 text-white font-bold focus:bg-slate-900 transition-all cursor-pointer"
                    value={date} onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs italic shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]"
              onClick={() => navigate(`/search?from=${from}&to=${to}&date=${date}`)}
            >
              <Search className="mr-2 h-5 w-5" /> Explorer les trajets disponibles
            </Button>
          </div>
        </div>
      </section>

      {/* --- SECTION DÉPARTS --- */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
            <div className="text-left">
              <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-2">Départs en temps réel</h2>
              <div className="h-1.5 w-20 bg-emerald-500 rounded-full" />
            </div>
          </div>

          {tripsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-[3rem] bg-slate-900/50 border border-white/5" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {currentTrips.map((trip) => (
                <TripCardPremium key={trip.id} trip={trip} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* --- CTA SECTION (Style l'image 2 de School Tech) --- */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="glass-panel rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-8 relative z-10">
              Prêt à transformer vos <br/> <span className="text-emerald-500">habitudes de voyage ?</span>
            </h2>
            <div className="flex flex-wrap justify-center gap-6 relative z-10">
              <Button className="h-16 px-10 rounded-full bg-emerald-500 hover:bg-emerald-600 font-bold uppercase tracking-widest text-xs">Acheter un billet</Button>
              <Button variant="outline" className="h-16 px-10 rounded-full border-white/20 bg-white/5 hover:bg-white/10 font-bold uppercase tracking-widest text-xs">Suivre un colis</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TripCardPremium({ trip, navigate }: { trip: any, navigate: any }) {
  const Icon = trip.type === 'BOAT' ? Ship : trip.type === 'TRAIN' ? Train : trip.type === 'PLANE' ? Plane : Bus;
  
  return (
    <div className="glass-panel rounded-[3.5rem] overflow-hidden group hover:-translate-y-2 transition-all duration-500 border-white/5 hover:border-emerald-500/30">
      <div className="p-8">
        <div className="flex justify-between items-start mb-10">
          <div className="h-16 w-16 bg-slate-950/50 rounded-2xl flex items-center justify-center border border-white/10 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/50 transition-colors">
            <Icon className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarif</p>
             <p className="text-3xl font-black text-white">{trip.price.toLocaleString()} <span className="text-xs text-emerald-500">FCFA</span></p>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2 group-hover:text-emerald-400 transition-colors">{trip.company.name}</h3>
          <span className="text-[10px] font-bold bg-white/5 px-3 py-1 rounded-full border border-white/10 text-slate-400 uppercase tracking-widest">
            {trip.type}
          </span>
        </div>

        <div className="flex items-center gap-6 py-6 border-y border-white/5">
           <div className="flex-1">
             <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Dép.</p>
             <p className="text-lg font-black">{trip.from.name}</p>
             <p className="text-emerald-500 font-bold">{trip.departure_time}</p>
           </div>
           <ArrowRight className="text-slate-700 h-6 w-6 opacity-30" />
           <div className="flex-1 text-right">
             <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Arr.</p>
             <p className="text-lg font-black">{trip.to.name}</p>
             <p className="text-slate-400 font-bold">{trip.arrival_time}</p>
           </div>
        </div>
      </div>

      <button 
        onClick={() => navigate(`/seats/${trip.id}`)}
        className="w-full h-16 bg-slate-950/80 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] transition-all border-t border-white/5"
      >
        Réserver maintenant
      </button>
    </div>
  );
}