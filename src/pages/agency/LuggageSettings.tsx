"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Scale, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  Settings2, 
  ShieldCheck, 
  Zap, 
  Edit2,
  X,
  Bus,
  Train
} from 'lucide-react';
import { toast } from 'sonner';

export default function LuggageSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [trainSettings, setTrainSettings] = useState({ free_limit: 30, price_per_kg: 500 });
  const [busItems, setBusItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ label: '', price: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { if (user?.companyId) loadSettings(); }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: comp } = await supabase.from('companies').select('*').eq('id', user?.companyId).single();
      if (comp) setTrainSettings({ 
        free_limit: comp.default_free_weight_limit || 30, 
        price_per_kg: comp.default_excess_weight_price || 500 
      });

      const { data: items } = await supabase.from('company_luggage_settings')
        .select('*').eq('company_id', user?.companyId).order('created_at', { ascending: true });
      if (items) setBusItems(items);
    } finally { setLoading(false); }
  };

  const handleUpsertBusItem = async () => {
    if (!newItem.label || !newItem.price) return toast.error("Champs requis");
    setSaving(true);
    try {
      const payload = { 
        company_id: user?.companyId, 
        label: newItem.label.trim(), 
        price: parseFloat(newItem.price) 
      };

      if (editingId) {
        await supabase.from('company_luggage_settings').update(payload).eq('id', editingId);
        toast.success("Tarif bagage mis à jour");
      } else {
        const { data, error } = await supabase.from('company_luggage_settings').insert([payload]).select().single();
        if (error) throw error;
        setBusItems([...busItems, data]);
        toast.success("Nouveau type de bagage ajouté");
      }
      setEditingId(null);
      setNewItem({ label: '', price: '' });
      loadSettings();
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement");
    } finally { setSaving(false); }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setNewItem({ label: item.label, price: item.price.toString() });
  };

  const saveTrainSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('companies').update({ 
        default_free_weight_limit: trainSettings.free_limit, 
        default_excess_weight_price: trainSettings.price_per_kg 
      }).eq('id', user?.companyId);
      
      if (error) throw error;
      toast.success("Politique de poids mise à jour");
    } catch (e) {
      toast.error("Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center p-20 gap-4 bg-background min-h-screen text-slate-100"><RefreshCw className="animate-spin h-10 w-10 text-primary" /><p className="text-[10px] font-black uppercase tracking-widest">Initialisation...</p></div>;

  return (
    <div className="max-w-2xl mx-auto w-full p-2 md:p-4 pb-20 space-y-6 md:space-y-8 text-left animate-in fade-in duration-500 text-foreground bg-background">
      
      {/* HEADER SOMBRE */}
      <header className="flex items-center gap-4 bg-slate-900 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-800 shadow-2xl w-full">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shrink-0">
          <Settings2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black italic tracking-tighter text-white uppercase leading-none">Règles Bagages</h1>
          <p className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Gestion des suppléments</p>
        </div>
      </header>

      <Tabs defaultValue="bus" className="w-full space-y-6 md:space-y-8">
        <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="bg-slate-900 border-2 border-slate-800 p-1.5 rounded-2xl h-auto min-h-[3.5rem] flex w-full shadow-inner">
            <TabsTrigger value="bus" className="flex-1 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest py-3 px-2 data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-lg">
                <Bus className="h-4 w-4 mr-1 md:mr-2 shrink-0" /> <span className="truncate">Forfaits (Bus)</span>
            </TabsTrigger>
            <TabsTrigger value="train" className="flex-1 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest py-3 px-2 data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400 data-[state=active]:shadow-lg">
                <Train className="h-4 w-4 mr-1 md:mr-2 shrink-0" /> <span className="truncate">Pesée (Train)</span>
            </TabsTrigger>
            </TabsList>
        </div>

        {/* SECTION BUS / FORFAITS */}
        <TabsContent value="bus" className="space-y-8 md:space-y-10 focus-visible:outline-none animate-in slide-in-from-bottom-2">
          <div className={`border-2 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl transition-all duration-300 ${editingId ? 'bg-amber-500/5 border-amber-500/50' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className={`text-[10px] font-black uppercase flex items-center gap-2 tracking-[0.2em] ${editingId ? 'text-amber-400' : 'text-slate-500'}`}>
                    {editingId ? <Edit2 size={14}/> : <Zap size={14} className="text-amber-500" />}
                    {editingId ? "Édition du tarif" : "Nouveau forfait"}
                </h3>
                {editingId && (
                  <Button variant="ghost" size="sm" onClick={() => {setEditingId(null); setNewItem({label:'', price:''})}} className="h-7 text-[9px] font-black text-red-400 uppercase gap-1 hover:bg-red-500/10 rounded-lg">
                    <X size={12}/> Annuler
                  </Button>
                )}
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Désignation (Ex: Glacière, Sac de voyage...)</Label>
                <Input placeholder="Entrez le nom du bagage..." className="h-14 rounded-2xl border-none bg-slate-950 text-white font-bold px-5 shadow-inner" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Prix Fixe (FCFA)</Label>
                    <Input type="number" className="h-14 rounded-2xl border-none bg-slate-950 text-primary font-black text-lg px-5 shadow-inner" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
                <div className="flex items-end">
                    <Button onClick={handleUpsertBusItem} disabled={saving} className={`w-full h-14 rounded-2xl font-black shadow-xl transition-all active:scale-95 ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'} text-white`}>
                    {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : (editingId ? <Save size={20}/> : <Plus size={20} />)}
                    <span className="ml-2 uppercase tracking-widest text-[10px]">{editingId ? 'Mettre à jour' : 'Ajouter au catalogue'}</span>
                    </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between px-4 md:px-6">
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 italic text-left">Catalogue des tarifs</h3>
                <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-800 text-slate-400">{busItems.length} Articles</Badge>
             </div>
             
             <div className="space-y-3">
               {busItems.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all group ${editingId === item.id ? 'bg-amber-500/5 border-amber-500/50 shadow-inner' : 'bg-slate-900 border-slate-800 hover:shadow-2xl hover:border-slate-700'}`}>
                    <div className="flex items-center gap-4 md:gap-5 text-left overflow-hidden">
                      <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl shrink-0 flex items-center justify-center font-black text-lg shadow-lg ${editingId === item.id ? 'bg-amber-500 text-white' : 'bg-slate-950 text-slate-600 border border-slate-800'}`}>
                        {item.label.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-white text-sm md:text-base uppercase leading-tight tracking-tight truncate">{item.label}</p>
                        <p className="text-xs font-black text-primary mt-1 tracking-tighter">{item.price.toLocaleString()} F</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 rounded-full h-9 w-9"><Edit2 size={16} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if(confirm('Supprimer ce tarif ?')) supabase.from('company_luggage_settings').delete().eq('id', item.id).then(()=>loadSettings()) }} className="text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-full h-9 w-9"><Trash2 size={16} /></Button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </TabsContent>

        {/* SECTION TRAIN / POIDS */}
        <TabsContent value="train" className="focus-visible:outline-none animate-in slide-in-from-bottom-2">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl space-y-10 w-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-white">
                <Train size={120} />
            </div>

            <div className="text-center relative z-10">
               <div className="h-16 w-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-lg"><Scale className="h-8 w-8" /></div>
               <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Politique de Pesée</h3>
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">Applicable au Train et Transport Maritime</p>
            </div>

            <div className="space-y-8 text-left relative z-10">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-500 ml-6 tracking-widest">Franchise (Poids gratuit inclus)</Label>
                <div className="relative group">
                   <Input type="number" value={trainSettings.free_limit} onChange={e => setTrainSettings({...trainSettings, free_limit: parseFloat(e.target.value)})} className="h-16 md:h-20 pl-8 md:pl-10 pr-20 font-black text-3xl md:text-4xl rounded-[1.5rem] md:rounded-[2.5rem] border-none bg-slate-950 text-white focus:bg-slate-950 transition-all shadow-inner" />
                   <span className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 font-black text-slate-700 text-xl md:text-2xl tracking-tighter uppercase">KG</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-500 ml-6 tracking-widest">Prix du KG supplémentaire</Label>
                <div className="relative group">
                   <Input type="number" value={trainSettings.price_per_kg} onChange={e => setTrainSettings({...trainSettings, price_per_kg: parseFloat(e.target.value)})} className="h-16 md:h-20 pl-8 md:pl-10 pr-32 md:pr-36 font-black text-3xl md:text-4xl rounded-[1.5rem] md:rounded-[2.5rem] border-none bg-slate-950 text-white focus:bg-slate-950 transition-all shadow-inner" />
                   <span className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 font-black text-slate-700 text-[10px] md:text-xs tracking-widest uppercase">FCFA / KG</span>
                </div>
              </div>

              <Button onClick={saveTrainSettings} disabled={saving} className="w-full h-16 md:h-20 font-black text-lg md:text-xl gap-3 rounded-[1.5rem] md:rounded-[2rem] shadow-xl bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-[0.98] uppercase tracking-widest border-none">
                {saving ? <RefreshCw className="animate-spin h-6 w-6"/> : <ShieldCheck className="h-7 w-7" />}
                Enregistrer la politique
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <footer className="text-center pt-4 opacity-10">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white">TransGabon Connect • Module Gestion Bagages</p>
      </footer>
    </div>
  );
}