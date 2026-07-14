"use client"

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input' ;
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRightLeft, Plus, Trash2, Search, ArrowRight, Route, Info } from 'lucide-react';
import { toast } from 'sonner';

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

  // Form states
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Chargement simultané des liaisons (routes) et des gares actives (cities)
      const [rRes, cRes] = await Promise.all([
        supabase.from('routes').select('*').order('departure_city', { ascending: true }),
        supabase.from('cities').select('id, name').order('name', { ascending: true })
      ]);

      if (rRes.error) throw new Error(rRes.error.message);
      if (cRes.error) throw new Error(cRes.error.message);

      const formattedRoutes: DBRoute[] = (rRes.data || []).map(r => ({
        id: r.id,
        departureCity: r.departure_city,
        arrivalCity: r.arrival_city
      }));

      setRoutes(formattedRoutes);
      setCities(cRes.data || []);
    } catch (e: any) {
      toast.error(e.message || "Erreur de chargement des itinéraires");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!fromCity || !toCity) {
      toast.error("Veuillez sélectionner une gare de départ et de destination.");
      return;
    }
    if (fromCity === toCity) {
      toast.error("La ville de départ et de destination doivent être différentes.");
      return;
    }
    setSaving(true);

    try {
      // Enregistrement de la liaison d'itinéraire dans Supabase
      const { error } = await supabase
        .from('routes')
        .insert([{
          departure_city: fromCity,
          arrival_city: toCity
        }]);

      if (error) throw new Error(error.message);

      toast.success("Itinéraire ajouté avec succès à la liste d'agences !");
      setShowForm(false);
      setFromCity('');
      setToCity('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Erreur d'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('routes').delete().eq('id', id);
      if (error) throw new Error(error.message);

      setRoutes(prev => prev.filter(r => r.id !== id));
      toast.success("Itinéraire supprimé de la liste.");
    } catch (e: any) {
      toast.error(e.message || "Erreur de suppression.");
    }
  };

  const filtered = routes.filter(r => 
    r.departureCity.toLowerCase().includes(search.toLowerCase()) || 
    r.arrivalCity.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="text-foreground text-left">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Route className="h-6 w-6 text-primary" /> Gestion des Itinéraires</h1>
          <p className="text-sm text-muted-foreground">Pilotez le catalogue d&apos;itinéraires autorisés de la billetterie et du fret.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une liaison, gare..." className="pl-9" />
      </div>

      {/* Grille principale */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        
        {/* Liste des itinéraires */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold border-b border-border pb-2">Liaisons autorisées ({filtered.length})</h2>
          
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl bg-card">
              <ArrowRightLeft className="mx-auto h-10 w-10 text-muted-foreground/60 mb-2 animate-pulse" />
              <p>Aucun itinéraire trouvé.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                      Ligne
                    </span>
                    <div className="flex items-center gap-2 font-bold text-sm text-foreground pt-1">
                      <span>{r.departureCity}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{r.arrivalCity}</span>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0 rounded-full hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader className="text-left">
                        <AlertDialogTitle>Supprimer cette liaison ?</AlertDialogTitle>
                        <AlertDialogDescription>Itinéraire {r.departureCity} → {r.arrivalCity}. Les gares elles-mêmes resteront enregistrées en base.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aide d'administration à droite */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/10 p-4 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Note d&apos;Intégrité</p>
            <p>Créer un itinéraire permet aux gérants de guichets d&apos;agence de planifier des départs sur cet axe. Si vous supprimez une liaison, les trajets et billets déjà vendus sur cet axe ne seront pas supprimés, mais les agents ne pourront plus planifier de nouveaux départs sur cette ligne.</p>
          </div>
        </div>

      </div>

      {/* MODAL DE CRÉATION DE LIAISON */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-left">Programmer un nouvel itinéraire</DialogTitle></DialogHeader>
          <div className="space-y-4 text-left">
            <div>
              <Label>Gare de départ</Label>
              <Select value={fromCity} onValueChange={setFromCity}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionnez le départ" /></SelectTrigger>
                <SelectContent>
                  {cities.filter(c => c.name !== toCity).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Gare de destination</Label>
              <Select value={toCity} onValueChange={setToCity}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionnez la destination" /></SelectTrigger>
                <SelectContent>
                  {cities.filter(c => c.name !== fromCity).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !fromCity || !toCity}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}