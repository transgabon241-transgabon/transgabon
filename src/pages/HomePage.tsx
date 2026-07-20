"use client"

import { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react'; 
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
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight italic uppercase tracking-tighter">
              Voyagez - Expédiez - Suivez
            </h1>
            <p className="text-lg md:text-xl opacity-90 leading-relaxed font-medium">
              TransGabon-Connect simplifie vos déplacements et l'envoi de vos colis à travers tout le Gabon. Réservez vos billets, expédiez vos colis et suivez leur acheminement en temps réel, le tout depuis une seule application.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-card text-foreground rounded-[2rem] p-8 shadow-2xl border-4 border-white/10 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end mb-6 text-left">
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Ville de Départ</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue placeholder="D'où partez-vous ?" /></SelectTrigger>
                  <SelectContent>
                    {citiesList.filter(c => c !== to).map(c => (
                      <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button type="button" onClick={swap} className="hidden md:flex items-center justify-center h-12 w-12 rounded-full border-2 border-slate-100 hover:bg-primary hover:text-white transition-all self-end mb-0.5">
                <ArrowRightLeft className="h-5 w-5" />
              </button>
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Destination</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue placeholder="Où allez-vous ?" /></SelectTrigger>
                  <SelectContent>
                    {citiesList.filter(c => c !== from).map(c => (
                      <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end text-left">
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Date de voyage souhaitée</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={today} className="h-12 rounded-xl border-2 font-bold" />
              </div>
              <Button size="lg" className="w-full md:w-auto h-12 px-10 gap-2 font-black italic uppercase tracking-widest shadow-xl shadow-primary/20" onClick={handleSearch} disabled={!from || !to || !date}>
                <Search className="h-5 w-5" /> Trouver mon trajet
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 1 : DESCRIPTION DES SERVICES (EXIGENCE GOOGLE) --- */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black italic uppercase tracking-tight mb-4">Nos Services de Transport & Logistique</h2>
            <div className="h-1.5 w-24 bg-primary mx-auto rounded-full" />
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 hover:border-primary/20 transition-all">
              <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20">
                <Bus size={30} />
              </div>
              <h3 className="text-xl font-black uppercase mb-4 tracking-tight">Réservation Multimodale</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                TransGabon-Connect centralise les offres de transport majeures du pays (Bus, Train SETRAG, Navires). 
                Recherchez, comparez les prix et horaires, et réservez votre place en quelques secondes sans vous déplacer en agence physique.
              </p>
            </div>
            <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 hover:border-primary/20 transition-all">
              <div className="h-14 w-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-200">
                <Package size={30} />
              </div>
              <h3 className="text-xl font-black uppercase mb-4 tracking-tight">Expédition de Fret & Colis</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Envoyez vos marchandises dans tout le Gabon. Notre plateforme vous permet d'enregistrer vos expéditions, 
                de calculer les tarifs de fret et de suivre l'état de livraison de vos colis en temps réel grâce à un numéro de suivi unique.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 2 : TRANSPARENCE DONNÉES GOOGLE (EXIGENCE GOOGLE) --- */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-full mb-8">
            <ShieldCheck size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Confidentialité & Sécurité</span>
          </div>
          <h2 className="text-3xl font-black italic uppercase mb-8 leading-tight">Pourquoi utilisons-nous votre compte Google ?</h2>
          <div className="space-y-8 text-slate-300 text-lg leading-relaxed">
            <p>
              TransGabon Connect utilise l'authentification Google (OAuth) pour simplifier et sécuriser votre expérience utilisateur. 
              <strong> Voici comment vos données sont exploitées :</strong>
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="space-y-3">
                <CheckCircle2 className="text-primary h-8 w-8" />
                <h4 className="font-black text-white uppercase text-sm">Identification</h4>
                <p className="text-xs">Nous utilisons votre nom et email pour créer votre espace personnel sécurisé.</p>
              </div>
              <div className="space-y-3">
                <CheckCircle2 className="text-primary h-8 w-8" />
                <h4 className="font-black text-white uppercase text-sm">Communication</h4>
                <p className="text-xs">Votre Gmail nous sert à vous envoyer vos bordereaux de colis et reçus de paiement.</p>
              </div>
              <div className="space-y-3">
                <CheckCircle2 className="text-primary h-8 w-8" />
                <h4 className="font-black text-white uppercase text-sm">Historique</h4>
                <p className="text-xs">L'authentification lie vos réservations passées à votre compte pour un suivi à vie.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-black text-center uppercase italic mb-12 tracking-tight">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {FEATURES.map((f, i) => (
              <div key={i} className="text-center p-8 bg-card border-2 rounded-[2rem] hover:shadow-xl transition-all">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent text-accent-foreground mb-6">
                  <f.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-black text-lg mb-3 uppercase tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transport types */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-black text-center uppercase italic mb-12 tracking-tight">Transporteurs Partenaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {TRANSPORT_TYPES.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 text-center shadow-sm border-2 border-slate-100 transition-all hover:border-primary">
                <t.icon className="h-10 w-10 mx-auto mb-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer (EXIGENCE GOOGLE) */}
      <footer className="py-16 bg-white border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            <Link to="/privacy" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">Politique de Confidentialité</Link>
            <Link to="/terms" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">Conditions d'Utilisation</Link>
            <a href="mailto:transgabon241@gmail.com" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">Support & Contact</a>
          </div>
          <div className="h-[1px] w-48 bg-slate-100 mx-auto mb-8" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-black">
            © {new Date().getFullYear()} TransGabon-Connect • Logistique & Transport
          </p>
        </div>
      </footer>
    </div>
  );
}