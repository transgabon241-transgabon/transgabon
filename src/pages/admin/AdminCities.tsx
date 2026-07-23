"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Plus, Trash2, Search, Info, Globe, Navigation, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

type City = {
  id: string;
  name: string;
  province: string;
};

const PROVINCES_GABON = [
  "Estuaire", "Haut-Ogooué", "Moyen-Ogooué", "Ngounié", "Nyanga", 
  "Ogooué-Ivindo", "Ogooué-Lolo", "Ogooué-Maritime", "Woleu-Ntem"
];

export default function AdminCities() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- ÉTATS POUR LA PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // Format 3x3 idéal

  const [name, setName] = useState('');
  const [province, setProvince] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCities(data || []);
    } catch (e: any) {
      toast.error('Erreur de chargement du réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!name.trim() || !province) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cities')
        .insert([{
          name: name.trim(),
          province: province
        }]);

      if (error) throw error;

      toast.success('Nouvelle gare enregistrée !');
      setShowForm(false);
      setName('');
      setProvince('');
      loadData();
    } catch (e: any) {
      toast.error("Cette gare existe peut-être déjà.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, cityName: string) => {
    try {
      const { count: tripsFrom } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('from_id', id);
      const { count: tripsTo } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('to_id', id);
      const { count: parcelsFrom } = await supabase.from('parcels').select('*', { count: 'exact', head: true }).eq('from_id', id);
      const { count: parcelsTo } = await supabase.from('parcels').select('*', { count: 'exact', head: true }).eq('to_id', id);

      const totalDeps = (tripsFrom || 0) + (tripsTo || 0) + (parcelsFrom || 0) + (parcelsTo || 0);

      if (totalDeps > 0) {
        toast.error(`Action impossible : "${cityName}" est liée à ${totalDeps} opération(s) active(s).`);
        return;
      }

      const { error } = await supabase.from('cities').delete().eq('id', id);
      if (error) throw error;

      setCities(prev => prev.filter(c => c.id !== id));
      toast.success('Gare retirée du réseau national.');
    } catch (e: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // --- LOGIQUE DE FILTRAGE ET PAGINATION ---
  const filtered = useMemo(() => {
    return cities.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.province.toLowerCase().includes(search.toLowerCase())
    );
  }, [cities, search]);

  // Réinitialiser la page à 1 lors d'une recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  
  const paginatedCities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  if (loading && cities.length === 0) return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <Skeleton className="h-12 w-64 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-[2rem]" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER PROFESSIONNEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-slate-100 uppercase tracking-tighter flex items-center gap-3">
            <Globe className="h-8 w-8 text-primary" /> Maillage National
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Référentiel officiel des gares et agences</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-2xl font-black gap-2 h-14 px-8 shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest text-xs">
          <Plus size={20} /> Ajouter une gare
        </Button>
      </div>

      {/* BARRE DE RECHERCHE & KPI RAPIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Rechercher une ville, une province (ex: Ogooué)..." 
            className="pl-12 h-14 rounded-2xl border-2 border-slate-100 bg-white font-medium text-base shadow-sm focus:border-primary transition-all" 
          />
        </div>
        <div className="bg-slate-900 rounded-2xl p-4 text-white flex items-center justify-between shadow-lg">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                 <Navigation size={18} className="text-primary" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest">Total Gares</p>
           </div>
           <span className="text-2xl font-black">{filtered.length}</span>
        </div>
      </div>

      {/* GRILLE DES GARES PAGINÉE */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-[3rem] bg-slate-50/50">
          <MapPin className="mx-auto h-12 w-12 text-slate-200 mb-4" />
          <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">Aucune gare répertoriée</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedCities.map(c => (
              <div key={c.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:shadow-xl hover:border-primary/20 transition-all group relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-black uppercase text-[8px] tracking-widest px-2 py-0.5">
                      {c.province}
                    </Badge>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary border border-slate-100 shadow-inner">
                          <MapPin size={20} />
                      </div>
                      <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">
                        {c.name}
                      </h3>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-full h-10 w-10 transition-all shadow-sm">
                          <Trash2 size={18} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-black italic text-xl uppercase">Retirer {c.name} ?</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-slate-600 leading-relaxed italic">
                          Attention : Vous ne pouvez supprimer une gare que si elle n'est rattachée à aucun voyage ou colis existant dans le système.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl font-bold">ANNULER</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(c.id, c.name)} className="bg-red-600 rounded-xl font-bold uppercase text-white">SUPPRIMER</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                <div className="mt-6 pt-4 border-t border-dashed border-slate-50 flex items-center justify-between">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Localisation active</p>
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* --- CONTRÔLES DE PAGINATION --- */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 bg-white p-2 rounded-2xl border-2 w-fit mx-auto shadow-sm">
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)} 
                className="rounded-xl h-10 w-10 border hover:bg-slate-50 transition-all"
              >
                <ChevronLeft size={18}/>
              </Button>
              <div className="flex items-center gap-1 font-black text-[10px] uppercase text-slate-400 px-4">
                 <span className="text-primary">Page {currentPage}</span>
                 <span>/</span>
                 <span>{totalPages}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)} 
                className="rounded-xl h-10 w-10 border hover:bg-slate-50 transition-all"
              >
                <ChevronRight size={18}/>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* MODAL D'AJOUT RÉÉCRITE */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-10 max-w-md border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-left">Nouvelle Étape</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-8">
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom de la Gare / Ville</Label>
                <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="h-14 rounded-2xl bg-slate-50 border-none font-black text-xl px-6 shadow-inner focus:ring-primary" 
                    placeholder="Ex: Lastoursville" 
                />
            </div>
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Province administrative</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-inner">
                    <SelectValue placeholder="Choisir la province" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl">
                  {PROVINCES_GABON.map(p => (
                    <SelectItem key={p} value={p} className="font-bold uppercase text-xs">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
                onClick={handleSave} 
                disabled={saving || !name || !province} 
                className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest mt-4 transition-all active:scale-95"
            >
              {saving ? <RefreshCw className="animate-spin mr-2" /> : <Plus className="mr-2" />}
              {saving ? 'ENREGISTREMENT...' : 'VALIDER LA GARE'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="text-center pt-10 opacity-30">
          <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">Infrastructure TransGabon Connect • Module G01</p>
      </footer>
    </div>
  );
}