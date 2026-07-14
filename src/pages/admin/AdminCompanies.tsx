"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Building2, Search } from 'lucide-react';
import { toast } from 'sonner';

type Company = {
  id: string;
  name: string;
  transportType: string;
  phone: string;
  contactEmail: string;
  description: string;
  active: boolean;
  commissionRate: number;
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [transportType, setTransportType] = useState('Bus');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [commissionRate, setCommissionRate] = useState('10');

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);

      // Mappage des colonnes PostgreSQL snake_case vers l'UI camelCase
      const formatted: Company[] = (data || []).map(c => ({
        id: c.id,
        name: c.name,
        transportType: c.transport_type || 'Bus',
        phone: c.phone || '',
        contactEmail: c.contact_email || '',
        description: c.description || '',
        active: c.active ?? true,
        commissionRate: c.commission_rate ?? 0.10,
      }));

      setCompanies(formatted);
    } catch (e: any) { 
      toast.error(e.message || 'Erreur lors du chargement des compagnies'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setName(''); setTransportType('Bus'); setPhone(''); setContactEmail('');
    setDescription(''); setActive(true); setCommissionRate('10'); setEditId(null);
  };

  const openEdit = (c: Company) => {
    setEditId(c.id);
    setName(c.name);
    setTransportType(c.transportType || 'Bus');
    setPhone(c.phone);
    setContactEmail(c.contactEmail);
    setDescription(c.description);
    setActive(c.active);
    setCommissionRate(String(Math.round((c.commissionRate || 0) * 100)));
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rate = Number(commissionRate) / 100;
      
      const payload = {
        name,
        transport_type: transportType,
        phone,
        contact_email: contactEmail,
        description,
        active,
        commission_rate: rate
      };

      if (editId) {
        // Mise à jour de la compagnie existante
        const { error } = await supabase.from('companies').update(payload).eq('id', editId);
        if (error) throw new Error(error.message);
        toast.success('Compagnie mise à jour avec succès !');
      } else {
        // Enregistrement d'une nouvelle compagnie
        const { error } = await supabase.from('companies').insert([payload]);
        if (error) throw new Error(error.message);
        toast.success('Compagnie enregistrée avec succès !');
      }
      setShowForm(false); resetForm(); loadData();
    } catch (e: any) { 
      toast.error(e.message || 'Erreur lors de la sauvegarde'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Sécurité d'intégrité : Empêche la suppression si des trajets y sont rattachés
      const { count } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', id);

      if (count && count > 0) {
        toast.error("Impossible de supprimer cette compagnie. Des départs y sont encore programmés.");
        return;
      }

      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw new Error(error.message);

      setCompanies(prev => prev.filter(c => c.id !== id));
      toast.success('Compagnie supprimée avec succès.');
    } catch (e: any) { 
      toast.error(e.message || 'Erreur de suppression'); 
    }
  };

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 text-left">
        <h1 className="text-2xl font-bold">Gestion des compagnies</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>
      </div>

      <div className="relative mb-6 max-w-sm text-left">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une compagnie…" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4" />
          <p>Aucune compagnie{search ? ' trouvée' : ''}</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Compagnie</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Type</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Contact</th>
                <th className="text-left p-3 font-medium">Commission</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t hover:bg-muted/30 text-left">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{c.transportType}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{c.contactEmail || c.phone}</td>
                  <td className="p-3">{Math.round((c.commissionRate || 0) * 100)}%</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader className="text-left">
                            <AlertDialogTitle>Supprimer {c.name} ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-left">{editId ? 'Modifier la compagnie' : 'Nouvelle compagnie'}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-left">
            <div><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Type de transport</Label>
              <Select value={transportType} onValueChange={setTransportType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Train', 'Bus', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" /></div>
              <div><Label>Email de contact</Label><Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="mt-1" /></div>
            </div>
            <div><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div><Label>Commission (%)</Label><Input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className="mt-1" min="0" max="100" /></div>
              <div className="flex items-center gap-2">
                <Switch checked={active} onCheckedChange={setActive} />
                <Label>{active ? 'Active' : 'Inactive'}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !name}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}