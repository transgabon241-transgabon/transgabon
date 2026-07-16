"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
// AJOUT DE "Save" DANS LA LISTE CI-DESSOUS
import { Plus, Pencil, Trash2, Building2, Search, Ship, Train, Bus, ChevronLeft, ChevronRight, RefreshCw, Mail, Phone, Save } from 'lucide-react'; 
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form state
  const [name, setName] = useState('');
  const [transportType, setTransportType] = useState('Bus');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [commissionRate, setCommissionRate] = useState('10');

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const formatted: Company[] = (data || []).map(c => ({
        id: c.id,
        name: c.name,
        transportType: c.transport_type === 'BOAT' ? 'Bateau' : c.transport_type === 'TRAIN' ? 'Train' : 'Bus',
        phone: c.phone || '',
        contactEmail: c.contact_email || '',
        description: c.description || '',
        active: c.active ?? true,
        commissionRate: c.commission_rate ?? 0.10,
      }));

      setCompanies(formatted);
    } catch (e: any) { 
      toast.error('Erreur lors du chargement'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    return companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [companies, search]);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const resetForm = () => {
    setName(''); setTransportType('Bus'); setPhone(''); setContactEmail('');
    setDescription(''); setActive(true); setCommissionRate('10'); setEditId(null);
  };

  const openEdit = (c: Company) => {
    setEditId(c.id);
    setName(c.name);
    setTransportType(c.transportType);
    setPhone(c.phone);
    setContactEmail(c.contactEmail);
    setDescription(c.description);
    setActive(c.active);
    setCommissionRate(String(Math.round((c.commissionRate || 0) * 100)));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const dbType = transportType === 'Bateau' ? 'BOAT' : transportType === 'Train' ? 'TRAIN' : 'BUS';
      const payload = {
        name,
        transport_type: dbType,
        phone,
        contact_email: contactEmail,
        description,
        active,
        commission_rate: Number(commissionRate) / 100
      };

      if (editId) {
        await supabase.from('companies').update(payload).eq('id', editId);
        toast.success('Compagnie mise à jour');
      } else {
        await supabase.from('companies').insert([payload]);
        toast.success('Compagnie enregistrée');
      }
      setShowForm(false); resetForm(); loadData();
    } catch (e: any) { 
      toast.error('Erreur de sauvegarde'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string) => {
    const { count } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('company_id', id);
    if (count && count > 0) {
      toast.error("Impossible : Des départs sont encore programmés pour cette compagnie.");
      return;
    }
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (!error) {
      setCompanies(prev => prev.filter(c => c.id !== id));
      toast.success('Compagnie supprimée');
    }
  };

  if (loading) return <div className="max-w-6xl mx-auto p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full rounded-[2rem]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-primary tracking-tighter uppercase">Partenaires de Transport</h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Gestion des agences et compagnies</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary text-white rounded-2xl font-black flex items-center gap-2 h-12 px-6 shadow-lg transition-all active:scale-95">
          <Plus size={20} /> AJOUTER UNE AGENCE
        </button>
      </div>

      <div className="relative mb-8 max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Rechercher une agence..." 
          className="pl-12 h-12 rounded-2xl border-2 shadow-sm font-medium" 
        />
      </div>

      {paginatedCompanies.length === 0 ? (
        <div className="p-20 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Aucune agence trouvée</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {paginatedCompanies.map(c => (
            <div key={c.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all group flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-5 flex-1 w-full">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                  c.transportType === 'Bateau' ? 'bg-blue-600' : 
                  c.transportType === 'Train' ? 'bg-slate-900' : 
                  'bg-primary'
                }`}>
                  {c.transportType === 'Bateau' ? <Ship size={28} /> : c.transportType === 'Train' ? <Train size={28} /> : <Bus size={28} />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="font-black text-xl text-slate-800 tracking-tight uppercase leading-none">{c.name}</h2>
                    <Badge className={`rounded-full px-3 text-[8px] font-black uppercase border ${c.active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                      {c.active ? 'Active' : 'Hors-ligne'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Mail size={12}/> {c.contactEmail}</span>
                    <span className="flex items-center gap-1.5"><Phone size={12}/> {c.phone}</span>
                    <span className="text-primary font-black">Commission: {Math.round(c.commissionRate * 100)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button variant="outline" className="flex-1 md:flex-none font-black rounded-xl border-2 hover:bg-slate-50 gap-2 h-11 px-6" onClick={() => openEdit(c)}>
                   MODIFIER
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center justify-center border-2 rounded-xl text-red-400 hover:text-red-600 h-11 w-11 transition-all"><Trash2 size={18} /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-black italic text-2xl uppercase">Supprimer {c.name} ?</AlertDialogTitle>
                      <AlertDialogDescription className="font-medium text-slate-600 leading-relaxed">
                        Cette action est définitive. Vous ne pourrez pas supprimer la compagnie si elle possède encore des historiques de trajets.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl font-bold">ANNULER</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-red-600 rounded-xl font-bold">SUPPRIMER DÉFINITIVEMENT</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 bg-slate-100 p-2 rounded-2xl w-fit mx-auto border-2 border-white shadow-sm">
              <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10"><ChevronLeft /></Button>
              <div className="flex items-center gap-1 font-black text-xs uppercase tracking-widest text-slate-400 px-2">
                <span className="text-primary">{currentPage}</span>
                <span>/</span>
                <span>{totalPages}</span>
              </div>
              <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10"><ChevronRight /></Button>
            </div>
          )}
        </div>
      )}

      {/* FORMULAIRE DIALOG */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-lg border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-left">
                {editId ? 'Modifier Agence' : 'Nouveau Partenaire'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom commercial</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-black text-lg px-5 shadow-inner" placeholder="Ex: SETRAG, Major Transport..." />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Type de transport principal</Label>
                <Select value={transportType} onValueChange={setTransportType}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold px-5"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                        {['Bus', 'Train', 'Bateau', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Téléphone Agence</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email de contact</Label>
                    <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 items-end border-t pt-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Commission Platforme (%)</Label>
                <Input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-black text-primary text-xl" />
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 h-12">
                <Label className="text-[10px] font-black uppercase">Statut Partenariat</Label>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 uppercase tracking-widest mt-4">
                {saving ? <RefreshCw className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
                {editId ? 'METTRE À JOUR' : 'VALIDER L’AGENCE'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}