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

  if (loading) return <div className="flex flex-col items-center justify-center p-20 gap-4"><RefreshCw className="animate-spin h-10 w-10 text-primary" /><p className="text-[10px] font-black uppercase text-slate-100 tracking-widest">Initialisation...</p></div>;

  return (
    <div className="max-w-2xl mx-auto w-full p-2 md:p-4 pb-20 space-y-8 text-left animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm w-full">
        <div className="p-3 bg-slate-900 rounded-2xl shadow-lg text-white shrink-0">
          <Settings2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-slate-100 uppercase leading-none">Règles Bagages</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic">Suppléments passagers</p>
        </div>
      </header>

      <Tabs defaultValue="bus" className="w-full space-y-8">
        {/* TAB LIST : AJOUT D'UN WRAPPER POUR ÉVITER LES COUPURES MOBILE */}
        <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-auto min-h-[3.5rem] flex w-full border-2 border-white shadow-sm">
            <TabsTrigger value="bus" className="flex-1 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest py-3 px-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <Bus className="h-4 w-4 mr-1 md:mr-2 shrink-0" /> <span className="truncate">Forfaits (Bus)</span>
            </TabsTrigger>
            <TabsTrigger value="train" className="flex-1 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest py-3 px-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                <Train className="h-4 w-4 mr-1 md:mr-2 shrink-0" /> <span className="truncate">Pesée (Train)</span>
            </TabsTrigger>
            </TabsList>
        </div>

        {/* SECTION BUS / FORFAITS */}
        <TabsContent value="bus" className="space-y-10 focus-visible:outline-none animate-in slide-in-from-bottom-2">
          <div className={`border-2 rounded-[2.5rem] p-6 md:p-8 shadow-xl transition-all duration-300 ${editingId ? 'bg-amber-50/20 border-amber-200' : 'bg-white border-slate-100 shadow-slate-100/50'}`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className={`text-[10px] font-black uppercase flex items-center gap-2 tracking-[0.2em] ${editingId ? 'text-amber-600' : 'text-slate-100 opacity-70'}`}>
                    {editingId ? <Edit2 size={14}/> : <Zap size={14} className="text-amber-400" />}
                    {editingId ? "Édition" : "Nouveau forfait"}
                </h3>
                {editingId && (
                  <Button variant="ghost" size="sm" onClick={() => {setEditingId(null); setNewItem({label:'', price:''})}} className="h-7 text-[9px] font-black text-red-500 uppercase gap-1 hover:bg-red-50 rounded-lg">
                    <X size={12}/> Annuler
                  </Button>
                )}
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-100 opacity-70 ml-1">Désignation (Ex: Glacière, Sac...)</Label>
                <Input placeholder="Nom du bagage..." className="h-14 rounded-2xl border-2 border-slate-100 bg-white px-5 text-sm font-bold focus:border-primary shadow-inner" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-100 opacity-70 ml-1">Prix Fixe (F)</Label>
                    <Input type="number" className="h-14 rounded-2xl border-2 border-slate-100 bg-white px-5 font-black text-lg text-primary focus:border-primary shadow-inner" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
                <div className="flex items-end">
                    <Button onClick={handleUpsertBusItem} disabled={saving} className={`w-full h-14 rounded-2xl font-black shadow-lg transition-all active:scale-95 ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-black text-white'}`}>
                    {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : (editingId ? <Save size={20}/> : <Plus size={20} />)}
                    <span className="ml-2 uppercase tracking-widest text-[10px]">{editingId ? 'Mettre à jour' : 'Ajouter'}</span>
                    </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between px-6">
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-100 opacity-60 italic text-left">Tarifs en agence</h3>
                <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200">{busItems.length} Articles</Badge>
             </div>
             
             <div className="space-y-3">
               {busItems.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all group ${editingId === item.id ? 'bg-amber-50 border-amber-200 shadow-inner' : 'bg-white border-slate-100 hover:shadow-xl'}`}>
                    <div className="flex items-center gap-5 text-left">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${editingId === item.id ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {item.label.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-base uppercase leading-tight tracking-tight">{item.label}</p>
                        <p className="text-sm font-black text-primary mt-1 tracking-tighter">{item.price.toLocaleString()} FCFA</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-full h-10 w-10"><Edit2 size={16} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if(confirm('Supprimer ce tarif ?')) supabase.from('company_luggage_settings').delete().eq('id', item.id).then(()=>loadSettings()) }} className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full h-10 w-10"><Trash2 size={16} /></Button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </TabsContent>

        {/* SECTION TRAIN / POIDS */}
        <TabsContent value="train" className="focus-visible:outline-none animate-in slide-in-from-bottom-2">
          <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-6 md:p-10 shadow-2xl shadow-slate-100/50 space-y-10 w-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Train size={120} />
            </div>

            <div className="text-center relative z-10">
               <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100"><Scale className="h-8 w-8" /></div>
               <h3 className="text-2xl font-black text-slate-100 uppercase italic tracking-tighter">Politique de Pesée</h3>
               <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Applicable au Train et Transport Maritime</p>
            </div>

            <div className="space-y-8 text-left relative z-10">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-100 opacity-70 ml-6 tracking-widest">Franchise (Poids gratuit inclus)</Label>
                <div className="relative group">
                   <Input type="number" value={trainSettings.free_limit} onChange={e => setTrainSettings({...trainSettings, free_limit: parseFloat(e.target.value)})} className="h-20 pl-10 pr-20 font-black text-4xl rounded-[2.5rem] border-none bg-slate-50 group-focus-within:bg-white transition-all shadow-inner" />
                   <span className="absolute right-10 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl tracking-tighter uppercase">KG</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-100 opacity-70 ml-6 tracking-widest">Prix du KG supplémentaire</Label>
                <div className="relative group">
                   <Input type="number" value={trainSettings.price_per_kg} onChange={e => setTrainSettings({...trainSettings, price_per_kg: parseFloat(e.target.value)})} className="h-20 pl-10 pr-36 font-black text-4xl rounded-[2.5rem] border-none bg-slate-50 group-focus-within:bg-white transition-all shadow-inner" />
                   <span className="absolute right-10 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xs tracking-widest uppercase">FCFA / KG</span>
                </div>
              </div>

              <Button onClick={saveTrainSettings} disabled={saving} className="w-full h-20 font-black text-xl gap-3 rounded-[2rem] shadow-xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98] uppercase tracking-widest">
                {saving ? <RefreshCw className="animate-spin h-6 w-6"/> : <ShieldCheck className="h-7 w-7" />}
                Enregistrer la politique
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <footer className="text-center pt-4 opacity-30">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">TransGabon Connect • Module Gestion Bagages</p>
      </footer>
    </div>
  );
}