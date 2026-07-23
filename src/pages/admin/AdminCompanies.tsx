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
  Pencil, 
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
      toast.error("Suppression bloquée : Cette agence possède des trajets actifs.");
      return;
    }
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (!error) {
      setCompanies(prev => prev.filter(c => c.id !== id));
      toast.success('Partenaire retiré du réseau');
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

  if (loading && companies.length === 0) return <div className="max-w-6xl mx-auto p-8 space-y-6"><Skeleton className="h-12 w-64 rounded-xl" /><Skeleton className="h-64 w-full rounded-[2.5rem]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black italic text-slate-100 uppercase tracking-tighter flex items-center gap-3">
             <Building2 className="text-primary h-8 w-8" /> Réseau Partenaires
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Supervision des agences de transport gabonaises</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-2xl font-black gap-2 h-14 px-8 shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest text-xs">
          <Plus size={20} /> Ajouter un partenaire
        </Button>
      </div>

      {/* RECHERCHE */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Rechercher une agence..." 
          className="pl-12 h-14 rounded-2xl border-2 border-slate-100 bg-white font-medium text-base shadow-sm focus:border-primary transition-all" 
        />
      </div>

      {/* LISTE DES AGENCES */}
      <div className="space-y-4">
        {paginatedCompanies.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50">
            <Globe className="h-12 w-12 mx-auto mb-4 text-slate-200" />
            <p className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Aucun partenaire ne correspond à la recherche</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedCompanies.map(c => (
                <div key={c.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 hover:shadow-xl hover:border-primary/20 transition-all group flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-6 flex-1 w-full">
                    <div className={`h-20 w-20 rounded-3xl flex items-center justify-center text-white shadow-lg shrink-0 ${
                      c.transportType === 'Bateau' ? 'bg-blue-600' : c.transportType === 'Train' ? 'bg-slate-900' : 'bg-primary'
                    }`}>
                      {c.transportType === 'Bateau' ? <Ship size={32} /> : c.transportType === 'Train' ? <Train size={32} /> : <Bus size={32} />}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h2 className="font-black text-2xl text-slate-100 uppercase tracking-tighter leading-none">{c.name}</h2>
                        <Badge className={`rounded-full px-3 py-0.5 text-[8px] font-black uppercase border-2 ${c.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                          {c.active ? 'Opérationnel' : 'Désactivé'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Mail size={12} className="text-slate-300" /> {c.contactEmail}</span>
                        <span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-300" /> {c.phone}</span>
                        <span className="flex items-center gap-1.5 text-primary"><ShieldCheck size={12} /> Frais plateforme: {Math.round(c.commissionRate * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button variant="outline" className="flex-1 md:flex-none font-black rounded-xl border-2 h-12 px-6 text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all" onClick={() => openEdit(c)}>
                       Paramètres
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="flex items-center justify-center border-2 rounded-xl text-red-300 hover:text-red-600 hover:bg-red-50 h-12 w-12 transition-all shadow-sm"><Trash2 size={20} /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-black italic text-2xl uppercase">Supprimer {c.name} ?</AlertDialogTitle>
                          <AlertDialogDescription className="font-medium text-slate-600 leading-relaxed italic">
                            Attention : Cette action est définitive. Vous ne pourrez retirer ce partenaire que s'il n'a plus aucun trajet programmé en base de données.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl font-bold">RETOUR</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-red-600 rounded-xl font-bold uppercase">CONFIRMER LA SUPPRESSION</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12 bg-white p-2 rounded-2xl w-fit mx-auto border-2 border-slate-50 shadow-sm">
                <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10"><ChevronLeft size={18} /></Button>
                <div className="flex items-center gap-1 font-black text-[10px] uppercase tracking-widest text-slate-400 px-4">
                  <span className="text-primary">Page {currentPage}</span>
                  <span>/</span>
                  <span>{totalPages}</span>
                </div>
                <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10"><ChevronRight size={18} /></Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-10 max-w-xl border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-left leading-none">
                {editId ? 'Fiche Partenaire' : 'Nouveau Transporteur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-8 mt-8">
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Raison Sociale (Nom Agence)</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-black text-xl px-6 shadow-inner" placeholder="Ex: SETRAG" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Secteur Principal</Label>
                    <Select value={transportType} onValueChange={setTransportType}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold px-5"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-2xl">
                            {['Bus', 'Train', 'Bateau', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Commission Platforme (%)</Label>
                    <div className="relative group">
                        <Input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className="h-12 rounded-xl bg-primary/5 border-2 border-primary/10 font-black text-primary px-5 shadow-sm" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-primary/30">%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-dashed pt-8">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact Téléphonique</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email de gestion</Label>
                    <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
            </div>

            <div className="flex items-center justify-between bg-slate-900 p-6 rounded-3xl text-white shadow-lg">
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase text-primary tracking-widest">État du contrat</p>
                 <p className="text-xs font-medium text-slate-400 italic">Autoriser les ventes immédiates</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <Button onClick={handleSave} disabled={saving || !name} className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest mt-4 transition-all active:scale-95">
                {saving ? <RefreshCw className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
                {editId ? 'VALIDER LES MODIFICATIONS' : 'FINALISER L’INSCRIPTION'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}