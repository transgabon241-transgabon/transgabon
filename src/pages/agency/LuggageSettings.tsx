"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  X
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
        .select('*')
        .eq('company_id', user?.companyId)
        .order('created_at', { ascending: true });
      if (items) setBusItems(items);
    } finally {
      setLoading(false);
    }
  };

  const handleUpsertBusItem = async () => {
    if (!newItem.label || !newItem.price) return toast.error("Champs requis");
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('company_luggage_settings')
          .update({ label: newItem.label, price: parseFloat(newItem.price) })
          .eq('id', editingId);
        if (error) throw error;
        toast.success("Tarif mis à jour");
      } else {
        const { data, error } = await supabase.from('company_luggage_settings')
          .insert([{ company_id: user?.companyId, label: newItem.label, price: parseFloat(newItem.price) }])
          .select().single();
        if (error) throw error;
        setBusItems([...busItems, data]);
        toast.success("Ajouté");
      }
      setEditingId(null);
      setNewItem({ label: '', price: '' });
      loadSettings();
    } catch (e) {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: any) => {
    setNewItem({ label: item.label, price: item.price.toString() });
    setEditingId(item.id);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('company_luggage_settings').delete().eq('id', id);
    if (!error) {
      setBusItems(busItems.filter(i => i.id !== id));
      toast.success("Supprimé");
    }
  };

  const saveTrainSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from('companies').update({ 
      default_free_weight_limit: trainSettings.free_limit, 
      default_excess_weight_price: trainSettings.price_per_kg 
    }).eq('id', user?.companyId);
    if (!error) toast.success("Politique enregistrée");
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" /></div>;

  return (
    <div className="max-w-2xl mx-auto w-full p-4 pb-20 space-y-8 text-left">
      
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm w-full">
        <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
          <Settings2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tight text-slate-900">Règles Bagages</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gestion des suppléments passagers</p>
        </div>
      </header>

      <Tabs defaultValue="bus" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-14 flex w-full">
          <TabsTrigger value="bus" className="flex-1 rounded-xl font-bold"><Package className="h-4 w-4 mr-2"/> Agence Bus</TabsTrigger>
          <TabsTrigger value="train" className="flex-1 rounded-xl font-bold"><Scale className="h-4 w-4 mr-2"/> Train (SETRAG)</TabsTrigger>
        </TabsList>

        <TabsContent value="bus" className="space-y-10 focus-visible:outline-none">
          {/* FORMULAIRE - ESPACES DE SAISIE AGRANDIS */}
          <div className={`bg-white border-2 rounded-[2.5rem] p-8 shadow-xl transition-all ${editingId ? 'border-orange-200 shadow-orange-50' : 'border-slate-100'}`}>
            <h3 className="text-sm font-black uppercase mb-6 flex items-center gap-2 text-slate-500">
                {editingId ? <Edit2 className="h-4 w-4 text-orange-500" /> : <Zap className="h-4 w-4 text-orange-400" />}
                {editingId ? "Modifier le tarif" : "Nouveau forfait bagage"}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
              <div className="sm:col-span-7 space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Nom de l'article</Label>
                <Input 
                  placeholder="Ex: Sac de Riz, Valise moyenne..." 
                  className="h-14 rounded-2xl border-2 border-slate-100 bg-white px-5 text-base font-medium focus:border-primary transition-all" 
                  value={newItem.label} 
                  onChange={e => setNewItem({...newItem, label: e.target.value})} 
                />
              </div>
              <div className="sm:col-span-3 space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Prix (F)</Label>
                <Input 
                  type="number" 
                  className="h-14 rounded-2xl border-2 border-slate-100 bg-white px-5 text-lg font-black text-primary focus:border-primary transition-all" 
                  value={newItem.price} 
                  onChange={e => setNewItem({...newItem, price: e.target.value})} 
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button onClick={handleUpsertBusItem} disabled={saving} className={`w-full h-14 rounded-2xl shadow-lg ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900'}`}>
                  {saving ? <RefreshCw className="animate-spin h-5 w-5" /> : (editingId ? <Save className="h-5 w-5"/> : <Plus className="h-6 w-6" />)}
                </Button>
              </div>
            </div>
            {editingId && <button onClick={() => {setEditingId(null); setNewItem({label:'', price:''})}} className="text-[10px] font-bold text-red-500 mt-4 uppercase hover:underline">Annuler la modification</button>}
          </div>

          <div className="space-y-3">
             <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 px-6 italic">Tarifs enregistrés</h3>
             {busItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white border border-slate-100 p-6 rounded-[2rem] hover:shadow-lg transition-all group">
                  <div className="flex items-center gap-4 text-left">
                    <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-black text-xl">{item.label.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg leading-tight">{item.label}</p>
                      <p className="text-sm font-black text-orange-600 uppercase mt-1 tracking-widest">{item.price.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-full"><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="train" className="focus-visible:outline-none">
          <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-2xl shadow-slate-100/50 space-y-10 w-full">
            <div className="text-center">
               <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Scale className="h-10 w-10" /></div>
               <h3 className="text-2xl font-black">Politique Ferroviaire</h3>
               <p className="text-sm text-muted-foreground font-medium italic">Règles de pesée officielles</p>
            </div>

            <div className="space-y-8 text-left">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-400 ml-4">Franchise (Poids gratuit)</Label>
                <div className="relative">
                   <Input type="number" value={trainSettings.free_limit} onChange={e => setTrainSettings({...trainSettings, free_limit: parseFloat(e.target.value)})} className="h-16 pl-8 pr-20 font-black text-2xl rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 transition-all" />
                   <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">KG</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-400 ml-4">Prix par KG de surplus</Label>
                <div className="relative">
                   <Input type="number" value={trainSettings.price_per_kg} onChange={e => setTrainSettings({...trainSettings, price_per_kg: parseFloat(e.target.value)})} className="h-16 pl-8 pr-32 font-black text-2xl rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 transition-all" />
                   <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm">FCFA / KG</span>
                </div>
              </div>

              <Button onClick={saveTrainSettings} disabled={saving} className="w-full h-16 font-black text-xl gap-3 rounded-[1.5rem] shadow-xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98]">
                {saving ? <RefreshCw className="animate-spin h-6 w-6"/> : <ShieldCheck className="h-6 w-6" />}
                SAUVEGARDER LA POLITIQUE
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}