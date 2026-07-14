"use client"

import { useEffect, useState } from 'react';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Bus, Train } from 'lucide-react';
import { toast } from 'sonner';

type Vehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  totalSeats: number;
  rows: number;
  seatsPerRow: number;
};

export default function AgencyVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Bus');
  const [totalSeats, setTotalSeats] = useState('30');
  const [rows, setRows] = useState('8');
  const [seatsPerRow, setSeatsPerRow] = useState('4');

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const companyId = user.companyId || null;
      if (!companyId) {
        setError("Ce compte agent n'est rattaché à aucune compagnie de transport.");
        setLoading(false);
        return;
      }

      // Lecture de la flotte de la compagnie
      const { data, error: dbError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (dbError) throw new Error(dbError.message);

      // Mappage PostgreSQL snake_case vers UI camelCase
      const formatted: Vehicle[] = (data || []).map(v => {
        let typeLabel = 'Bus';
        if (v.type === 'TRAIN') typeLabel = 'Train';
        else if (v.type === 'COASTER') typeLabel = 'Coaster';
        else if (v.type === 'MINIBUS') typeLabel = 'MiniBus';

        return {
          id: v.id,
          vehicleNumber: v.name,
          vehicleType: typeLabel,
          totalSeats: v.capacity,
          rows: v.rows ?? 12,
          seatsPerRow: v.seats_per_row ?? 4
        };
      });

      setVehicles(formatted);
    } catch (e: any) { 
      toast.error(e.message || 'Erreur réseau'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const resetForm = () => {
    setVehicleNumber(''); setVehicleType('Bus'); setTotalSeats('30'); setRows('8'); setSeatsPerRow('4'); setEditId(null);
  };

  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setVehicleNumber(v.vehicleNumber);
    setVehicleType(v.vehicleType);
    setTotalSeats(String(v.totalSeats));
    setRows(String(v.rows));
    setSeatsPerRow(String(v.seatsPerRow));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user?.companyId) return;
    setSaving(true);
    try {
      // Traduction des types UI vers Enums PostgreSQL
      let dbType = 'BUS';
      if (vehicleType === 'Train') dbType = 'TRAIN';
      else if (vehicleType === 'Coaster') dbType = 'COASTER';
      else if (vehicleType === 'MiniBus') dbType = 'MINIBUS';

      const payload = {
        name: vehicleNumber.trim(),
        type: dbType,
        capacity: Number(totalSeats),
        rows: Number(rows),
        seats_per_row: Number(seatsPerRow),
        company_id: user.companyId
      };

      if (editId) {
        // Mise à jour du véhicule existant
        const { error } = await supabase.from('vehicles').update(payload).eq('id', editId);
        if (error) throw new Error(error.message);
        toast.success('Véhicule mis à jour avec succès !');
      } else {
        // Création d'un nouveau véhicule
        const { error } = await supabase.from('vehicles').insert([payload]);
        if (error) throw new Error(error.message);
        toast.success('Véhicule ajouté à votre parc.');
      }
      setShowForm(false); resetForm(); loadData();
    } catch (e: any) { 
      toast.error(e.message || 'Erreur d’enregistrement'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Sécurité d'intégrité : Empêche la suppression s'il y a des départs programmés avec ce véhicule
      const { count } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_id', id);

      if (count && count > 0) {
        toast.error("Impossible de supprimer ce véhicule. Il est actuellement affecté à un départ planifié.");
        return;
      }

      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw new Error(error.message);

      setVehicles(prev => prev.filter(v => v.id !== id));
      toast.success('Véhicule supprimé de la flotte.');
    } catch (e: any) { 
      toast.error(e.message || 'Erreur lors de la suppression'); 
    }
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  if (error) return <div className="text-destructive p-8 text-left">{error}</div>;

  return (
    <div className="text-foreground text-left">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestion des véhicules</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bus className="h-12 w-12 mx-auto mb-4" />
          <p>Aucun véhicule enregistré</p>
          <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setShowForm(true); }}>Ajouter un véhicule</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map(v => {
            const Icon = v.vehicleType === 'Train' ? Train : Bus;
            return (
              <div key={v.id} className="border rounded-xl bg-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                    <Icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">{v.vehicleNumber}</div>
                    <div className="text-xs text-muted-foreground">{v.vehicleType} • {v.totalSeats} places</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 font-semibold" onClick={() => openEdit(v)}><Pencil className="h-3 w-3 mr-1" /> Modifier</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader className="text-left">
                        <AlertDialogTitle>Supprimer {v.vehicleNumber} ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible et supprimera le matériel de votre parc de flotte.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(v.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-left">{editId ? 'Modifier le véhicule' : 'Nouveau véhicule'}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-left">
            <div><Label>Numéro / Immatriculation</Label><Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Type</Label>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Train', 'Bus', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Places totales</Label><Input type="number" value={totalSeats} onChange={e => setTotalSeats(e.target.value)} className="mt-1" /></div>
              <div><Label>Rangées</Label><Input type="number" value={rows} onChange={e => setRows(e.target.value)} className="mt-1" /></div>
              <div><Label>Sièges/rangée</Label><Input type="number" value={seatsPerRow} onChange={e => setSeatsPerRow(e.target.value)} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !vehicleNumber}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}