"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Plus, Trash2, Search, Info } from 'lucide-react';
import { toast } from 'sonner';

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

  const [name, setName] = useState('');
  const [province, setProvince] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      setCities(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!name.trim() || !province) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSaving(true);
    try {
      // Insertion de la nouvelle gare dans Supabase
      const { error } = await supabase
        .from('cities')
        .insert([{
          name: name.trim(),
          province: province
        }]);

      if (error) throw new Error(error.message);

      toast.success('Gare ajoutée au réseau national !');
      setShowForm(false);
      setName('');
      setProvince('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Erreur de création");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, cityName: string) => {
    try {
      // Sécurité d'intégrité : Empêche la suppression si des trajets de bus/trains ou colis y sont rattachés
      const { count: tripsFrom } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('from_id', id);
      const { count: tripsTo } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('to_id', id);
      const { count: parcelsFrom } = await supabase.from('parcels').select('*', { count: 'exact', head: true }).eq('from_id', id);
      const { count: parcelsTo } = await supabase.from('parcels').select('*', { count: 'exact', head: true }).eq('to_id', id);

      const totalDeps = (tripsFrom || 0) + (tripsTo || 0) + (parcelsFrom || 0) + (parcelsTo || 0);

      if (totalDeps > 0) {
        toast.error(`Impossible de supprimer "${cityName}". Cette gare est liée à ${totalDeps} trajet(s) ou colis de fret actifs.`);
        return;
      }

      const { error } = await supabase.from('cities').delete().eq('id', id);
      if (error) throw new Error(error.message);

      setCities(prev => prev.filter(c => c.id !== id));
      toast.success('Gare supprimée du réseau national.');
    } catch (e: any) {
      toast.error(e.message || "Erreur de suppression");
    }
  };

  const filtered = cities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.province.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div className="text-foreground text-left">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestion des Gares &amp; Destinations</h1>
        <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une ville, une province…" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl bg-card">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
          <p>Aucune gare trouvée</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => (
            <div key={c.id} className="border rounded-2xl bg-card p-5 space-y-3 shadow-xs relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 rounded bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary uppercase">
                    {c.province}
                  </span>
                  <h3 className="font-extrabold text-base leading-tight mt-1 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    {c.name}
                  </h3>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0 rounded-full hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader className="text-left">
                      <AlertDialogTitle>Supprimer {c.name} ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible et retirera définitivement cette gare de la liste nationale.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(c.id, c.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire d'ajout de gare */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-left">Ajouter une gare au réseau</DialogTitle></DialogHeader>
          <div className="space-y-4 text-left">
            <div><Label>Nom de la ville / gare</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="Ex: Ndjolé, Booué..." /></div>
            <div>
              <Label>Province du Gabon</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionnez la province" /></SelectTrigger>
                <SelectContent>
                  {PROVINCES_GABON.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !name || !province}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}