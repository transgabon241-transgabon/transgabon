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
  Globe,
  Plane 
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
        transportType: c.transport_type === 'PLANE' ? 'Avion' : c.transport_type === 'BOAT' ? 'Bateau' : c.transport_type === 'TRAIN' ? 'Train' : 'Bus',
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
      const dbType = transportType === 'Avion' ? 'PLANE' : transportType === 'Bateau' ? 'BOAT' : transportType === 'Train' ? 'TRAIN' : 'BUS';
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
    <div className="max-w-6xl mx-auto p-2 sm:p-4 text-left space-y-6 sm:space-y-8 animate-in fade-in duration-500 bg-background text-foreground pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="text-left">
          <h1 className="text-2xl sm:text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
             <Building2 className="text-primary h-7 w-7 sm:h-8 sm:w-8" /> Réseau Partenaires
          </h1>
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Supervision des agences</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full sm:w-auto rounded-xl font-black gap-2 h-12 sm:h-14 px-6 shadow-xl bg-primary text-white border-none active:scale-95 text-[10px] sm:text-xs">
          <Plus size={18} /> AJOUTER UNE AGENCE
        </Button>
      </div>

      {/* RECHERCHE */}
      <div className="relative group max-w-md px-2">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Rechercher une agence..." 
          className="pl-12 h-12 rounded-xl border-none bg-slate-900 text-white font-medium text-sm" 
        />
      </div>

      {/* LISTE DES AGENCES */}
      <div className="space-y-4 px-1">
        {paginatedCompanies.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-border rounded-[2rem] bg-card/40">
            <p className="font-bold text-slate-600 uppercase text-[10px] italic">Aucun partenaire trouvé</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {paginatedCompanies.map(c => (
                <div key={c.id} className="bg-card border border-border rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-6 hover:border-primary/20 transition-all flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 sm:gap-6 flex-1 w-full overflow-hidden text-left">
                    <div className={`h-12 w-12 sm:h-16 sm:w-16 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 ${
                      c.transportType === 'Avion' ? 'bg-indigo-600' : c.transportType === 'Bateau' ? 'bg-blue-600' : c.transportType === 'Train' ? 'bg-slate-950 border border-slate-800' : 'bg-primary'
                    }`}>
                      {c.transportType === 'Avion' ? <Plane size={24} /> : c.transportType === 'Bateau' ? <Ship size={24} /> : c.transportType === 'Train' ? <Train size={24} /> : <Bus size={24} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-black text-base sm:text-xl text-white uppercase truncate">{c.name}</h2>
                        <Badge className={`text-[7px] font-black uppercase ${c.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {c.active ? 'Actif' : 'Off'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-x-4 gap-y-1 text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 truncate max-w-full"><Mail size={10} className="text-primary/50" /> {c.contactEmail}</span>
                        <span className="flex items-center gap-1.5"><Phone size={10} className="text-primary/50" /> {c.phone}</span>
                        <span className="flex items-center gap-1.5 text-primary"><ShieldCheck size={10} /> Comm: {Math.round(c.commissionRate * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:flex items-center gap-2 w-full md:w-auto shrink-0">
                    <Button variant="outline" className="font-black rounded-lg border-border bg-slate-950 text-slate-300 h-10 px-3 text-[9px] uppercase tracking-widest hover:bg-slate-800" onClick={() => openEdit(c)}>
                       Détails
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="flex items-center justify-center border border-border bg-slate-950 rounded-lg text-red-400 h-10 w-full md:w-10 transition-all"><Trash2 size={16} /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2rem] bg-slate-900 border border-border text-white w-[95vw] max-w-sm mx-auto">
                        <AlertDialogHeader className="text-left">
                          <AlertDialogTitle className="font-black uppercase text-lg">Retirer {c.name} ?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400 text-xs font-bold uppercase">Action irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 flex-row gap-2">
                          <AlertDialogCancel className="rounded-xl flex-1 bg-slate-800 border-none text-white m-0">NON</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-red-600 rounded-xl flex-1 text-white m-0 border-none">OUI</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10 bg-slate-900 p-2 rounded-xl w-fit mx-auto border border-border shadow-xl">
                <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-9 w-9 text-slate-500"><ChevronLeft size={18} /></Button>
                <span className="text-[9px] font-black uppercase text-slate-400 px-2">Page {currentPage} / {totalPages}</span>
                <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-9 w-9 text-slate-500"><ChevronRight size={18} /></Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* DIALOG FORMULAIRE */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-none sm:rounded-[2.5rem] p-6 sm:p-10 w-full sm:max-w-xl h-full sm:h-auto border-border bg-slate-900 text-white shadow-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-left text-white leading-none">
                {editId ? 'Fiche Partenaire' : 'Nouveau Transporteur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-6">
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Raison Sociale</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-black text-base" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Secteur</Label>
                    <Select value={transportType} onValueChange={setTransportType}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-950 border-none font-bold text-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-border text-white">
                            {['Bus', 'Train', 'Bateau', 'Avion', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Commission (%)</Label>
                    <Input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className="h-12 rounded-xl bg-primary/5 border-2 border-primary/20 font-black text-primary" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Téléphone</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-bold text-white" />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Email Gestion</Label>
                    <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-bold text-white" />
                </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-border">
              <div className="space-y-1 text-left">
                 <p className="text-[10px] font-black uppercase text-primary">État du contrat</p>
                 <p className="text-[10px] font-medium text-slate-500 italic">Activer les réservations</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <Button onClick={handleSave} disabled={saving || !name} className="w-full h-14 rounded-2xl font-black text-base bg-primary text-white border-none active:scale-95">
                {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : <Save className="mr-2 h-5 w-5" />}
                {editId ? 'METTRE À JOUR' : 'VALIDER'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}