"use client"

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input' ;
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRightLeft, Plus, Trash2, Search, Route, Info, MapPin, Navigation, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

type DBRoute = {
  id: string;
  departureCity: string;
  arrivalCity: string;
};

type City = {
  id: string;
  name: string;
};

export default function AdminRoutes() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<DBRoute[]>([]);
  const [cities, setCities] = useState<City[]>([]);  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- ÉTATS POUR LA PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 2 colonnes x 4 lignes

  // Form states
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, cRes] = await Promise.all([
        supabase.from('routes').select('*').order('departure_city', { ascending: true }),
        supabase.from('cities').select('id, name').order('name', { ascending: true })
      ]);

      if (rRes.error) throw rRes.error;
      if (cRes.error) throw cRes.error;

      setRoutes((rRes.data || []).map(r => ({
        id: r.id,
        departureCity: r.departure_city,
        arrivalCity: r.arrival_city
      })));
      setCities(cRes.data || []);
    } catch (e: any) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!fromCity || !toCity) return toast.error("Sélectionnez les deux gares.");
    if (fromCity === toCity) return toast.error("Le départ et l'arrivée doivent être différents.");
    
    setSaving(true);
    try {
      const { error } = await supabase.from('routes').insert([{
        departure_city: fromCity,
        arrival_city: toCity
      }]);

      if (error) throw error;

      toast.success("Nouvel axe commercial ajouté !");
      setShowForm(false);
      setFromCity('');
      setToCity('');
      loadData();
    } catch (e: any) {
      toast.error("Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('routes').delete().eq('id', id);
      if (error) throw error;
      setRoutes(prev => prev.filter(r => r.id !== id));
      toast.success("Ligne supprimée");
    } catch (e: any) {
      toast.error("Suppression impossible");
    }
  };

  // --- LOGIQUE DE FILTRAGE ET PAGINATION ---
  const filtered = useMemo(() => routes.filter(r => 
    r.departureCity.toLowerCase().includes(search.toLowerCase()) || 
    r.arrivalCity.toLowerCase().includes(search.toLowerCase())
  ), [routes, search]);

  // Réinitialiser la page à 1 lors d'une recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  
  const paginatedRoutes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  if (loading && routes.length === 0) return (
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
          <h1 className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <Route className="h-8 w-8 text-primary" /> Axes Commerciaux
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Catalogue officiel des itinéraires TransGabon</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-2xl font-black gap-2 h-12 px-8 shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest text-xs">
          <Plus size={20} /> Nouvelle liaison
        </Button>
      </div>

      {/* BARRE DE RECHERCHE & AIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Filtrer par gare (ex: Libreville, Moanda...)" 
              className="pl-12 h-14 rounded-2xl border-2 border-slate-100 bg-white font-medium text-base shadow-sm focus:border-primary transition-all" 
            />
          </div>

          {/* LISTE DES ITINÉRAIRES PAGINÉE */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-4">
               <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Réseau Autorisé ({filtered.length})</h2>
               <RefreshCw size={14} className="text-slate-200 cursor-pointer hover:text-primary" onClick={loadData} />
            </div>
            
            {filtered.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-[3rem] bg-slate-50/50">
                <ArrowRightLeft className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">Aucune liaison trouvée</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {paginatedRoutes.map((r) => (
                    <div key={r.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:shadow-xl hover:border-primary/20 transition-all group relative overflow-hidden">
                      <div className="space-y-4">
                         <div className="flex items-center gap-2">
                            <span className="bg-primary/5 text-primary px-2 py-0.5 rounded text-[8px] font-black uppercase border border-primary/10">Liaison Active</span>
                         </div>
                         
                         <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-slate-300 uppercase leading-none">Départ</p>
                               <p className="font-black text-slate-800 uppercase text-sm">{r.departureCity}</p>
                            </div>
                            <div className="flex-1 h-px bg-slate-100 relative">
                               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                                  <Navigation size={12} className="text-primary rotate-90" />
                               </div>
                            </div>
                            <div className="space-y-1 text-right">
                               <p className="text-[9px] font-black text-slate-300 uppercase leading-none">Arrivée</p>
                               <p className="font-black text-slate-800 uppercase text-sm">{r.arrivalCity}</p>
                            </div>
                         </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-dashed border-slate-50 flex justify-end">
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                                      <Trash2 size={16} />
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                                  <AlertDialogHeader>
                                      <AlertDialogTitle className="font-black italic text-xl uppercase">Supprimer la liaison ?</AlertDialogTitle>
                                      <AlertDialogDescription className="font-medium text-slate-600">
                                          L'axe <strong>{r.departureCity} ➔ {r.arrivalCity}</strong> sera retiré du catalogue agence.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel className="rounded-xl font-bold">ANNULER</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-red-600 rounded-xl font-bold uppercase text-white">SUPPRIMER</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
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
          </div>
        </div>

        {/* SIDEBAR D'AIDE */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <Info className="absolute -top-4 -right-4 h-24 w-24 text-white/5" />
            <h3 className="font-black italic text-lg uppercase mb-4 flex items-center gap-2 text-primary">
               Note Admin
            </h3>
            <div className="space-y-4 text-xs font-medium text-slate-400 leading-relaxed">
              <p>La création d'un itinéraire définit les <strong>autorisations de vente</strong> pour vos gérants d'agences.</p>
              <p>Si un axe n'est pas créé ici, les agents ne pourront pas programmer de départs de bus ou de trains sur cette ligne.</p>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-slate-300 italic">
                La suppression d'une ligne n'affecte pas les billets déjà vendus.
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 flex flex-col items-center text-center gap-3">
             <MapPin className="text-primary h-8 w-8" />
             <p className="text-[10px] font-black uppercase text-slate-400">Total gares actives</p>
             <p className="text-3xl font-black text-slate-900">{cities.length}</p>
          </div>
        </div>
      </div>

      {/* MODAL DE CRÉATION */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-10 max-w-md border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-left">Nouvel Axe Commercial</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-6">
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gare de départ</Label>
              <Select value={fromCity} onValueChange={setFromCity}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold px-5 focus:ring-primary shadow-inner">
                    <SelectValue placeholder="Choisir origine" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl">
                  {cities.filter(c => c.name !== toCity).map(c => (
                    <SelectItem key={c.id} value={c.name} className="font-bold uppercase text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
               <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border-4 border-white">
                  <ArrowRightLeft size={16} />
               </div>
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gare de destination</Label>
              <Select value={toCity} onValueChange={setToCity}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold px-5 focus:ring-primary shadow-inner">
                    <SelectValue placeholder="Choisir arrivée" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl">
                  {cities.filter(c => c.name !== fromCity).map(c => (
                    <SelectItem key={c.id} value={c.name} className="font-bold uppercase text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
                onClick={handleSave} 
                disabled={saving || !fromCity || !toCity} 
                className="w-full h-16 rounded-3xl font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest mt-4 transition-all active:scale-95"
            >
              {saving ? <RefreshCw className="animate-spin mr-2" /> : <Plus className="mr-2" />}
              {saving ? 'ENREGISTREMENT...' : 'AJOUTER LA LIAISON'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}