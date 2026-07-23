"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Trash2, 
  Building2, 
  Search, 
  Ship, 
  Train, 
  Bus, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Mail, 
  Phone, 
  Save,
  ShieldCheck,
  Globe
} from 'lucide-react'; 
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

      setCompanies((data || []).map(c => ({
        id: c.id,
        name: c.name,
        transportType: c.transport_type === 'BOAT' ? 'Bateau' : c.transport_type === 'TRAIN' ? 'Train' : 'Bus',
        phone: c.phone || '',
        contactEmail: c.contact_email || '',
        description: c.description || '',
        active: c.active ?? true,
        commissionRate: c.commission_rate ?? 0.10,
      })));
    } catch (e) { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    return companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [companies, search]);

  const paginatedCompanies = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

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
        toast.success('Partenaire mis à jour');
      } else {
        await supabase.from('companies').insert([payload]);
        toast.success('Nouveau partenaire enregistré');
      }
      setShowForm(false); resetForm(); loadData();
    } catch (e) { toast.error('Erreur de sauvegarde'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const { count } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('company_id', id);
    if (count && count > 0) {
      toast.error("Suppression bloquée : agence active.");
      return;
    }
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (!error) {
      setCompanies(prev => prev.filter(c => c.id !== id));
      toast.success('Partenaire retiré');
    }
  };

  const openEdit = (c: Company) => {
    setEditId(c.id); setName(c.name); setTransportType(c.transportType);
    setPhone(c.phone); setContactEmail(c.contactEmail); setDescription(c.description);
    setActive(c.active); setCommissionRate(String(Math.round(c.commissionRate * 100)));
    setShowForm(true);
  };

  const resetForm = () => {
    setName(''); setTransportType('Bus'); setPhone(''); setContactEmail('');
    setDescription(''); setActive(true); setCommissionRate('10'); setEditId(null);
  };

  if (loading && companies.length === 0) return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 bg-background min-h-screen">
        <Skeleton className="h-12 w-64 rounded-xl bg-card" />
        <Skeleton className="h-64 w-full rounded-[2.5rem] bg-card" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500 bg-background text-foreground pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
             <Building2 className="text-primary h-8 w-8" /> Réseau Partenaires
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Supervision des agences de transport</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-2xl font-black gap-2 h-14 px-8 shadow-xl bg-primary text-white border-none hover:bg-primary/90 active:scale-95 transition-all uppercase tracking-widest text-xs">
          <Plus size={20} /> Ajouter un partenaire
        </Button>
      </div>

      {/* RECHERCHE */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-primary transition-colors" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Rechercher une agence..." 
          className="pl-12 h-14 rounded-2xl border-none bg-slate-900 text-white font-medium text-base shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50" 
        />
      </div>

      {/* LISTE DES AGENCES SOMBRE */}
      <div className="space-y-4">
        {paginatedCompanies.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-border rounded-[3rem] bg-card/40">
            <Globe className="h-12 w-12 mx-auto mb-4 text-slate-800 opacity-20" />
            <p className="font-bold text-slate-600 uppercase text-[10px] tracking-widest italic">Aucun partenaire trouvé</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedCompanies.map(c => (
                <div key={c.id} className="bg-card border border-border rounded-[2.5rem] p-6 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-primary/20 transition-all group flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-6 flex-1 w-full overflow-hidden text-left">
                    <div className={`h-16 w-16 md:h-20 md:w-20 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${
                      c.transportType === 'Bateau' ? 'bg-blue-600' : c.transportType === 'Train' ? 'bg-slate-950 border border-slate-800' : 'bg-primary'
                    }`}>
                      {c.transportType === 'Bateau' ? <Ship size={32} /> : c.transportType === 'Train' ? <Train size={32} /> : <Bus size={32} />}
                    </div>
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-3">
                        <h2 className="font-black text-xl md:text-2xl text-white uppercase tracking-tighter leading-none truncate">{c.name}</h2>
                        <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase border ${c.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {c.active ? 'Actif' : 'Suspendu'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Mail size={12} className="text-primary/50" /> {c.contactEmail}</span>
                        <span className="flex items-center gap-1.5"><Phone size={12} className="text-primary/50" /> {c.phone}</span>
                        <span className="flex items-center gap-1.5 text-primary"><ShieldCheck size={12} /> {Math.round(c.commissionRate * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <Button variant="outline" className="flex-1 md:flex-none font-black rounded-xl border-border bg-slate-950 text-slate-300 h-11 px-5 text-[10px] uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all" onClick={() => openEdit(c)}>
                       Paramètres
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="flex items-center justify-center border border-border bg-slate-950 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 h-11 w-11 transition-all shadow-sm"><Trash2 size={18} /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2.5rem] bg-slate-900 border border-border text-white shadow-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-black italic text-xl uppercase text-white">Retirer {c.name} ?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400 font-medium">
                            La suppression n'est possible que si l'agence n'a plus de données actives (trajets, ventes).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 gap-2">
                          <AlertDialogCancel className="rounded-xl font-bold bg-slate-800 border-none text-white hover:bg-slate-700">ANNULER</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-red-600 rounded-xl font-bold uppercase text-white hover:bg-red-700 border-none">SUPPRIMER</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-10 bg-card p-2 rounded-2xl w-fit mx-auto border border-border shadow-2xl">
                <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 text-slate-500 hover:bg-slate-800 hover:text-white"><ChevronLeft size={18} /></Button>
                <div className="flex items-center gap-1 font-black text-[10px] uppercase tracking-widest text-slate-500 px-4">
                  <span className="text-primary">Page {currentPage}</span>
                  <span className="mx-1">/</span>
                  <span>{totalPages}</span>
                </div>
                <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 text-slate-500 hover:bg-slate-800 hover:text-white"><ChevronRight size={18} /></Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* DIALOG DE MODIFICATION SOMBRE */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-8 md:p-10 max-w-xl border-border bg-slate-900 text-white shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-left leading-none text-white">
                {editId ? 'Fiche Partenaire' : 'Nouveau Transporteur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-8">
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Raison Sociale</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-2xl bg-slate-950 border-none font-black text-lg px-6 shadow-inner text-white placeholder:text-slate-700" placeholder="Ex: SETRAG" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Secteur</Label>
                    <Select value={transportType} onValueChange={setTransportType}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-950 border-none font-bold text-slate-200 px-5"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-border text-white">
                            {['Bus', 'Train', 'Bateau', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t} className="font-bold focus:bg-primary/20">{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Commission (%)</Label>
                    <div className="relative group">
                        <Input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className="h-12 rounded-xl bg-primary/5 border-2 border-primary/20 font-black text-primary px-5 shadow-sm" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-primary/30">%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-6">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Téléphone</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl border-none bg-slate-950 text-white font-bold px-5" />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Email Gestion</Label>
                    <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="h-12 rounded-xl border-none bg-slate-950 text-white font-bold px-5" />
                </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-6 rounded-3xl border border-border shadow-inner">
              <div className="space-y-1 text-left">
                 <p className="text-[10px] font-black uppercase text-primary tracking-widest">État du contrat</p>
                 <p className="text-xs font-medium text-slate-500 italic">Autoriser les ventes en ligne</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <Button onClick={handleSave} disabled={saving || !name} className="w-full h-16 rounded-[2rem] font-black text-lg md:text-xl shadow-2xl bg-primary text-white border-none hover:bg-primary/90 transition-all active:scale-95">
                {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
                {editId ? 'METTRE À JOUR' : 'VALIDER L’INSCRIPTION'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <footer className="text-center opacity-10 pt-10">
         <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white leading-none">TransGabon Connect • Console Admin Centrale</p>
      </footer>
    </div>
  );
}