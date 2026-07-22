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
  ArrowRight,
  Truck,
  Gem
} from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge'; 

import heroBg from '@/assets/hero-gabon.png';

const FEATURES = [
  { icon: Search, title: 'Comparez', desc: 'Comparez les prix et horaires de toutes les compagnies (Bus, Train, Bateau) en temps réel.' },
  { icon: Gem, title: 'Confort Premium', desc: 'Choisissez votre classe de voyage : VIP, 1ère Classe ou Économique selon vos besoins.' },
  { icon: Package, title: 'Fret & Colis', desc: 'Expédiez vos marchandises et suivez leur acheminement du dépôt à la livraison.' },
];

const TRANSPORT_TYPES = [
  { icon: Train, label: 'Train (SETRAG)', color: 'bg-slate-900' },
  { icon: Ship, label: 'Navires (Maritime)', color: 'bg-blue-600' },
  { icon: Bus, label: 'Autocars & Bus', color: 'bg-primary' },
  { icon: Truck, label: 'Logistique Fret', color: 'bg-emerald-600' },
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
        console.error("Erreur gares :", err);
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
    <div className="text-foreground font-sans">
      {/* --- HERO SECTION : HAUTE VISIBILITÉ --- */}
      <section className="relative text-primary-foreground overflow-hidden min-h-[750px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="Voyage Gabon" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-slate-900/95" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10 mt-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <Badge className="mb-6 bg-primary text-white border-none px-6 py-2 font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl">
                Plateforme Officielle • République Gabonaise
            </Badge>
            {/* Titre Massivement Agrandi */}
            <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[1.05] tracking-tighter italic uppercase text-white drop-shadow-2xl">
              Le voyage <br />
              <span className="text-primary">en un clic.</span>
            </h1>
            <p className="text-xl md:text-3xl opacity-90 leading-relaxed font-medium mb-12 text-slate-200 max-w-3xl mx-auto">
              Réservez vos billets et suivez vos colis en toute simplicité.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
                <Button onClick={() => navigate('/track')} variant="outline" size="lg" className="rounded-2xl font-black bg-white/10 border-white/20 text-white hover:bg-white/20 uppercase tracking-widest shadow-2xl">
                    SUIVRE UN COLIS
                </Button>
            </div>
          </div>

          {/* BARRE DE RECHERCHE ULTRA-ACCESSIBLE */}
          <div className="max-w-5xl mx-auto bg-slate-900/95 backdrop-blur-xl text-white rounded-[3rem] p-6 md:p-12 shadow-[0_30px_100px_rgba(0,0,0,0.6)] border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-end mb-10 text-left">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary ml-4 italic">Gare de Départ</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="h-20 rounded-[1.5rem] border-none !bg-white/10 !text-white text-xl font-black focus:ring-4 focus:ring-primary shadow-2xl">
                    <SelectValue placeholder="D'où partez-vous ?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-3xl bg-white text-slate-900">
                    {citiesList.filter(c => c !== to).map(c => (
                      <SelectItem key={c} value={c} className="font-black uppercase text-sm py-4">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button 
                type="button" 
                onClick={swap} 
                className="hidden md:flex items-center justify-center h-16 w-16 rounded-full bg-primary text-white shadow-2xl hover:rotate-180 transition-all duration-700 self-end mb-1 border-8 border-slate-900"
              >
                <ArrowRightLeft size={24} strokeWidth={3} />
              </button>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary ml-4 italic">Destination</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="h-20 rounded-[1.5rem] border-none !bg-white/10 !text-white text-xl font-black focus:ring-4 focus:ring-primary shadow-2xl">
                    <SelectValue placeholder="Où allez-vous ?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-3xl bg-white text-slate-900">
                    {citiesList.filter(c => c !== from).map(c => (
                      <SelectItem key={c} value={c} className="font-black uppercase text-sm py-4">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-end text-left">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary ml-4 italic">Date du voyage</Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  min={today} 
                  className="h-20 rounded-[1.5rem] border-none !bg-white/10 !text-white font-black text-2xl px-8 focus-visible:ring-4 focus-visible:ring-primary shadow-2xl color-scheme-dark" 
                />
              </div>
              <Button 
                size="lg" 
                className="w-full md:w-auto h-20 px-16 gap-4 font-black italic uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 text-white transition-all active:scale-95 text-lg" 
                onClick={handleSearch} 
                disabled={!from || !to || !date}
              >
                <Search size={24} strokeWidth={3} /> RECHERCHER
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION SERVICES : TEXTE PLUS GROS --- */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-black italic uppercase tracking-tight mb-6 text-slate-900 leading-none">Services & Logistique</h2>
            <p className="text-slate-400 font-bold uppercase text-sm tracking-[0.4em]">Le réseau national accessible à tous</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-16 text-left">
            <div className="p-12 bg-slate-50 rounded-[4rem] border-2 border-slate-100 hover:border-primary/20 transition-all group shadow-sm">
              <div className="h-20 w-20 bg-primary rounded-3xl flex items-center justify-center text-white mb-10 shadow-xl group-hover:scale-110 transition-transform">
                <Train size={40} />
              </div>
              <h3 className="text-3xl font-black uppercase mb-6 tracking-tighter text-slate-900">Billetterie</h3>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                Accédez aux horaires de la SETRAG, des navires et des bus. Réservez en <strong>VIP ou 1ère Classe</strong> et recevez votre ticket instantanément.
              </p>
            </div>
            
            <div className="p-12 bg-slate-50 rounded-[4rem] border-2 border-slate-100 hover:border-emerald-200 transition-all group shadow-sm">
              <div className="h-20 w-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mb-10 shadow-xl group-hover:scale-110 transition-transform">
                <Package size={40} />
              </div>
              <h3 className="text-3xl font-black uppercase mb-6 tracking-tighter text-slate-900">Fret & Colis</h3>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                Envoyez vos marchandises partout au Gabon. Obtenez un <strong>bordereau de suivi</strong> et suivez l'acheminement en temps réel.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* --- TRANSPORT TYPES --- */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-black text-center uppercase italic mb-12 tracking-widest text-slate-900">Notre Réseau Multimodal</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRANSPORT_TYPES.map((t, i) => (
              <div key={i} className="bg-white rounded-[2rem] p-8 text-center shadow-xl shadow-slate-200/50 border-2 border-transparent hover:border-primary transition-all group">
                <div className={`h-16 w-16 mx-auto mb-6 rounded-2xl flex items-center justify-center text-white ${t.color} shadow-lg`}>
                    <t.icon size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER FINAL --- */}
      <footer className="py-20 bg-white border-t-2 border-slate-50">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-10 mb-12">
            <Link to="/privacy" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors text-slate-500">Confidentialité</Link>
            <Link to="/terms" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors text-slate-500">Conditions Générales</Link>
            <a href="mailto:transgabon241@gmail.com" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors text-slate-500">Support Technique</a>
          </div>
          <div className="h-px w-24 bg-primary mx-auto mb-10" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.5em] font-black mb-2">
            TransGabon-Connect • Logistique & Transport National
          </p>
          <p className="text-[8px] text-slate-300 font-bold uppercase">
             © {new Date().getFullYear()} Tous droits réservés • Plateforme certifiée
          </p>
        </div>
      </footer>
    </div>
  );
}