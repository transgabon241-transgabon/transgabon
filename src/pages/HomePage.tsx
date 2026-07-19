"use client"

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Ajout de Link
import { supabase } from '@/lib/supabase';
import { Search, Train, Bus, ArrowRightLeft, Calendar, MapPin, Ship, ShieldCheck, Mail } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";

import heroBg from '@/assets/hero-gabon.png';

const FEATURES = [
  { icon: Search, title: 'Comparez', desc: 'Comparez les prix et horaires de toutes les compagnies' },
  { icon: MapPin, title: 'Réservez', desc: 'Choisissez votre siège et réservez en quelques clics' },
  { icon: Calendar, title: 'Voyagez', desc: 'Recevez votre billet électronique avec QR Code' },
];

const TRANSPORT_TYPES = [
  { icon: Train, label: 'Train (SETRAG)' },
  { icon: Ship, label: 'Bateau (Maritime)' },
  { icon: Bus, label: 'Bus' },
  { icon: Bus, label: 'Coaster / MiniBus' },
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

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const { data, error } = await supabase
          .from('cities')
          .select('name')
          .order('name', { ascending: true });
        if (data && !error) setDbCities(data.map(c => c.name));
      } catch (err) {
        console.error("Erreur :", err);
      }
    };
    fetchCities();
  }, []);

  const handleSearch = () => {
    if (!from || !to || !date) return;
    navigate(`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const today = new Date().toISOString().split('T')[0];
  const citiesList = dbCities.length > 0 ? dbCities : GABON_CITIES_FALLBACK;

  return (
    <div className="text-foreground">
      {/* Hero Section */}
      <section className="relative text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="Fond Gabon" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              Voyagez à travers le Gabon en toute simplicité
            </h1>
            <p className="text-lg md:text-xl opacity-90 leading-relaxed">
              Réservez vos billets de train, bateau et bus en ligne. Comparez, réservez, payez — sans vous déplacer.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-card text-foreground rounded-2xl p-6 shadow-lg">
             {/* ... (Ton formulaire de recherche reste identique ici) ... */}
             <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end mb-4 text-left">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Départ</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger><SelectValue placeholder="Ville de départ" /></SelectTrigger>
                  <SelectContent>
                    {citiesList.filter(c => c !== to).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button type="button" onClick={swap} className="hidden md:flex items-center justify-center h-10 w-10 rounded-full border border-border hover:bg-muted transition-colors self-end mb-0.5">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Destination</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger><SelectValue placeholder="Ville d&apos;arrivée" /></SelectTrigger>
                  <SelectContent>
                    {citiesList.filter(c => c !== from).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end text-left">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date de voyage</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={today} className="bg-card" />
              </div>
              <Button size="lg" className="w-full md:w-auto gap-2 font-semibold" onClick={handleSearch} disabled={!from || !to || !date}>
                <Search className="h-4 w-4" /> Rechercher
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION TRANSPARENCE DES DONNÉES (EXIGENCE GOOGLE) --- */}
      <section className="py-16 bg-slate-50 border-b">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Pourquoi utiliser votre compte Google ?</h2>
          <p className="text-muted-foreground leading-relaxed">
            TransGabon Connect utilise l'authentification Google uniquement pour vous identifier de manière sécurisée. 
            Nous récupérons votre <strong>nom et votre adresse email</strong> pour vous envoyer vos billets électroniques, 
            vos bordereaux de suivi de colis et pour sécuriser l'accès à votre historique de voyage. 
            Aucune autre donnée privée n'est collectée ou partagée.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {FEATURES.map((f, i) => (
              <div key={i} className="text-center p-6 bg-card border rounded-2xl">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-accent text-accent-foreground mb-4">
                  <f.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer (EXIGENCE GOOGLE) */}
      <footer className="py-12 bg-white border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <Link to="/privacy" className="text-sm font-medium hover:text-primary transition-colors">Politique de Confidentialité</Link>
            <Link to="/terms" className="text-sm font-medium hover:text-primary transition-colors">Conditions d'Utilisation</Link>
            <a href="mailto:transgabon241@gmail.com" className="text-sm font-medium hover:text-primary transition-colors">Contact</a>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            © {new Date().getFullYear()} TransGabon-Connect • Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}