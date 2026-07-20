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
        console.error("Erreur de synchronisation gares :", err);
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
      <section className="relative text-primary-foreground overflow-hidden min-h-[600px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="Voyage Gabon" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-900/90" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge className="mb-4 bg-primary text-white border-none px-4 py-1 font-black uppercase text-[10px] tracking-[0.2em] animate-pulse">
                Plateforme Officielle • Gabon
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-none tracking-tighter italic uppercase text-white">
              Le voyage et le fret <span className="text-primary">en un clic.</span>
            </h1>
            <p className="text-lg md:text-xl opacity-90 leading-relaxed font-medium mb-8 text-slate-200">
              Réservez vos billets (Bus, Train, Bateau) et gérez vos expéditions de colis à travers tout le Gabon. Simple, sécurisé et rapide.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
                <Button onClick={() => navigate('/track')} variant="outline" className="rounded-2xl font-black bg-white/10 border-white/20 text-white h-12 px-8 hover:bg-white/20 uppercase text-[10px] tracking-widest">
                    SUIVRE UN COLIS
                </Button>
            </div>
          </div>

          {/* BARRE DE RECHERCHE SaaS - FIXÉ POUR ÉVITER LE BLANC AU CLIC */}
          <div className="max-w-4xl mx-auto bg-slate-900/95 backdrop-blur-md text-white rounded-[2.5rem] p-5 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-end mb-8 text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 italic">Ville de Départ</Label>
                <Select value={from} onValueChange={setFrom}>
                  {/* !bg-white/10 et !text-white forcent le style même en focus */}
                  <SelectTrigger className="h-14 rounded-2xl border-none !bg-white/10 !text-white font-bold focus:ring-2 focus:ring-primary shadow-inner">
                    <SelectValue placeholder="Départ" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-white text-slate-900">
                    {citiesList.filter(c => c !== to).map(c => (
                      <SelectItem key={c} value={c} className="font-bold uppercase text-xs cursor-pointer">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button 
                type="button" 
                onClick={swap} 
                className="hidden md:flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white shadow-lg hover:rotate-180 transition-all duration-500 self-end mb-1 border-4 border-slate-900"
              >
                <ArrowRightLeft className="h-5 w-5" />
              </button>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 italic">Destination</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="h-14 rounded-2xl border-none !bg-white/10 !text-white font-bold focus:ring-2 focus:ring-primary shadow-inner">
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-white text-slate-900">
                    {citiesList.filter(c => c !== from).map(c => (
                      <SelectItem key={c} value={c} className="font-bold uppercase text-xs cursor-pointer">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 italic">Date du voyage</Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  min={today} 
                  className="h-14 rounded-2xl border-none !bg-white/10 !text-white font-black px-6 focus-visible:ring-2 focus-visible:ring-primary shadow-inner color-scheme-dark" 
                />
              </div>
              <Button 
                size="lg" 
                className="w-full md:w-auto h-14 px-12 gap-3 font-black italic uppercase tracking-widest shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 text-white transition-all active:scale-95" 
                onClick={handleSearch} 
                disabled={!from || !to || !date}
              >
                <Search className="h-5 w-5" /> Rechercher départs
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* --- LE RESTE DE LA PAGE --- */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black italic uppercase tracking-tight mb-4 text-slate-900">Services Mobilité & Logistique</h2>
            <div className="h-1.5 w-24 bg-primary mx-auto rounded-full" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 text-left">
            <div className="p-10 bg-slate-50 rounded-[3rem] border-2 border-slate-100 hover:border-primary/20 transition-all group">
              <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <Train size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter text-slate-900">Billetterie Multimodale</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Accédez aux horaires et tarifs de la SETRAG (Train), des navires maritimes et des agences de bus majeures. 
                Réservez vos places en <strong>1ère Classe, Business ou VIP</strong> et recevez votre ticket numérique sécurisé instantanément.
              </p>
            </div>
            
            <div className="p-10 bg-slate-50 rounded-[3rem] border-2 border-slate-100 hover:border-emerald-200 transition-all group">
              <div className="h-16 w-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                <Package size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter text-slate-900">Expédition Fret & Colis</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Notre solution de fret permet aux particuliers et entreprises d'envoyer des marchandises partout au Gabon. 
                Enregistrez vos colis, obtenez un <strong>bordereau de suivi (Tracking)</strong> et soyez notifié à chaque étape du transport.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION TRANSPARENCE GOOGLE --- */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none">
            <ShieldCheck size={400} />
        </div>
        
        <div className="container mx-auto px-4 max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-6 py-2 rounded-full mb-8">
            <ShieldCheck size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Confiance & Sécurité des données</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black italic uppercase mb-8 leading-tight">Pourquoi se connecter avec Google ?</h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/10">
              <CheckCircle2 className="text-primary h-8 w-8" />
              <h4 className="font-black text-white uppercase text-sm tracking-tight">Accès Sécurisé</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Google OAuth nous permet de créer votre compte sans mot de passe complexe, garantissant une sécurité maximale.
              </p>
            </div>
            <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/10">
              <CheckCircle2 className="text-primary h-8 w-8" />
              <h4 className="font-black text-white uppercase text-sm tracking-tight">Suivi Automatisé</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Nous utilisons votre email pour vous envoyer automatiquement vos <strong>billets de voyage</strong> et <strong>bordereaux de suivi</strong>.
              </p>
            </div>
            <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/10">
              <CheckCircle2 className="text-primary h-8 w-8" />
              <h4 className="font-black text-white uppercase text-sm tracking-tight">Historique Centralisé</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Votre profil Google lie vos réservations passées et futures, vous permettant de gérer vos trajets en un seul endroit.
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