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

const TRANSPORT_TYPES = [
  { icon: Train, label: 'Train (SETRAG)', color: 'bg-slate-950 border-slate-800' },
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
    <div className="bg-background text-foreground font-sans">
      
      {/* --- HERO SECTION --- */}
      <section className="relative text-white overflow-hidden min-h-[600px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="Voyage Gabon" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-background" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge className="mb-4 bg-primary text-white border-none px-4 py-1 font-black uppercase text-[10px] tracking-[0.2em] animate-pulse">
                Plateforme Officielle • Gabon
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tighter italic uppercase text-white">
              Le voyage et le fret <span className="text-primary">en un clic.</span>
            </h1>
            <p className="text-lg md:text-xl leading-relaxed font-medium mb-8 text-slate-300">
              Réservez vos billets et gérez vos expéditions de colis à travers tout le Gabon. Simple, sécurisé et rapide.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
                <Button onClick={() => navigate('/track')} variant="outline" className="rounded-2xl font-black bg-white/5 border-white/10 text-white h-12 px-8 hover:bg-white/10 uppercase text-[10px] tracking-widest transition-all">
                    SUIVRE UN COLIS
                </Button>
            </div>
          </div>

          {/* BARRE DE RECHERCHE SOMBRE */}
          <div className="max-w-4xl mx-auto bg-slate-900/90 backdrop-blur-xl text-white rounded-[2.5rem] p-5 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-end mb-8 text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 italic">Départ</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="h-14 rounded-2xl border-none !bg-slate-950 !text-white font-bold focus:ring-2 focus:ring-primary shadow-inner">
                    <SelectValue placeholder="Ville de départ" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-slate-900 border-slate-800 text-white">
                    {citiesList.filter(c => c !== to).map(c => (
                      <SelectItem key={c} value={c} className="font-bold uppercase text-xs focus:bg-primary/20">{c}</SelectItem>
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
                  <SelectTrigger className="h-14 rounded-2xl border-none !bg-slate-950 !text-white font-bold focus:ring-2 focus:ring-primary shadow-inner">
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
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  min={today} 
                  className="h-14 rounded-2xl border-none !bg-slate-950 !text-white font-black px-6 focus-visible:ring-2 focus-visible:ring-primary shadow-inner appearance-none invert-calendar" 
                />
              </div>
              <Button 
                size="lg" 
                className="w-full md:w-auto h-14 px-12 gap-3 font-black italic uppercase tracking-widest shadow-xl bg-primary hover:bg-primary/90 text-white transition-all active:scale-95" 
                onClick={handleSearch} 
                disabled={!from || !to || !date}
              >
                <Search className="h-5 w-5" /> Rechercher départs
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* --- SERVICES SECTION --- */}
      <section className="py-24 bg-background border-t border-slate-900">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight mb-4 text-white">Services Mobilité & Logistique</h2>
            <div className="h-1.5 w-20 bg-primary mx-auto rounded-full" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="p-8 md:p-10 bg-slate-900/40 rounded-[2.5rem] border-2 border-slate-800 hover:border-primary/30 transition-all group">
              <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl group-hover:scale-110 transition-transform">
                <Train size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter text-white">Billetterie Multimodale</h3>
              <p className="text-slate-400 leading-relaxed font-medium">
                Accédez aux horaires de la SETRAG, des navires maritimes et des bus. 
                Réservez vos places en <strong>VIP ou 1ère Classe</strong> et recevez votre ticket numérique sécurisé instantanément.
              </p>
            </div>
            
            <div className="p-8 md:p-10 bg-slate-900/40 rounded-[2.5rem] border-2 border-slate-800 hover:border-emerald-500/30 transition-all group">
              <div className="h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl group-hover:scale-110 transition-transform">
                <Package size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter text-white">Expédition Fret & Colis</h3>
              <p className="text-slate-400 leading-relaxed font-medium">
                Envoyez des marchandises partout au Gabon. Enregistrez vos colis, obtenez un <strong>bordereau de suivi (Tracking)</strong> et surveillez chaque étape du transport.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- GOOGLE OAUTH SECURITY SECTION --- */}
      <section className="py-24 bg-slate-900/50 border-y border-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none">
            <ShieldCheck size={400} />
        </div>
        
        <div className="container mx-auto px-4 max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-6 py-2 rounded-full mb-8">
            <ShieldCheck size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Confiance & Sécurité</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black italic uppercase mb-12">Authentification Google Sécurisée</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <SecurityCard title="Zéro Mot de Passe" desc="Utilisez votre compte Google pour une connexion instantanée sans risque d'oubli." />
            <SecurityCard title="Notifications" desc="Recevez vos billets et reçus directement sur votre adresse email Gmail vérifiée." />
            <SecurityCard title="Manifeste Légal" desc="Vos informations officielles permettent de générer le manifeste de bord obligatoire." />
          </div>
        </div>
      </section>

      {/* --- NETWORK SECTION --- */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h2 className="text-2xl font-black uppercase italic mb-12 tracking-widest text-slate-500">Notre Réseau Multimodal</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRANSPORT_TYPES.map((t, i) => (
              <div key={i} className="bg-slate-900/40 rounded-[2rem] p-8 border-2 border-slate-800 hover:border-primary/40 transition-all group">
                <div className={`h-14 w-14 mx-auto mb-6 rounded-xl flex items-center justify-center text-white ${t.color} shadow-lg shadow-black/40`}>
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
          <div className="h-px w-20 bg-slate-800 mx-auto mb-10" />
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em] font-black mb-2">
             TransGabon-Connect • Logistique & Transport National 2026 SHOOL TECH
          </p>
          <p className="text-[8px] text-slate-700 font-bold uppercase">
             © {new Date().getFullYear()} • République Gabonaise
          </p>
        </div>
      </footer>
    </div>
  );
}

function SecurityCard({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="space-y-3 p-6 bg-slate-950/50 rounded-3xl border border-slate-800">
            <CheckCircle2 className="text-primary h-6 w-6" />
            <h4 className="font-black text-white uppercase text-xs tracking-tight">{title}</h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{desc}</p>
        </div>
    );
}