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
  X,
  Ship
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
      if (editingId) {
        await supabase.from('company_luggage_settings').update({ label: newItem.label, price: parseFloat(newItem.price) }).eq('id', editingId);
        toast.success("Tarif modifié");
      } else {
        const { data } = await supabase.from('company_luggage_settings').insert([{ company_id: user?.companyId, label: newItem.label, price: parseFloat(newItem.price) }]).select().single();
        setBusItems([...busItems, data]);
        toast.success("Ajouté");
      }
      setEditingId(null);
      setNewItem({ label: '', price: '' });
      loadSettings();
    } finally { setSaving(false); }
  };

  const saveTrainSettings = async () => {
    setSaving(true);
    await supabase.from('companies').update({ 
      default_free_weight_limit: trainSettings.free_limit, 
      default_excess_weight_price: trainSettings.price_per_kg 
    }).eq('id', user?.companyId);
    toast.success("Politique enregistrée");
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" /></div>;

  return (
    <div className="max-w-2xl mx-auto w-full p-4 pb-20 space-y-8 text-left">
      
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm w-full">
        <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
          <Settings2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tight text-slate-900 uppercase">Règles Bagages</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Suppléments pour les passagers</p>
        </div>
      </header>

      <Tabs defaultValue="bus" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-14 flex w-full">
          <TabsTrigger value="bus" className="flex-1 rounded-xl font-bold transition-all">Bus / Bateau (Forfait)</TabsTrigger>
          <TabsTrigger value="train" className="flex-1 rounded-xl font-bold transition-all">Train / Bateau (Poids)</TabsTrigger>
        </TabsList>

        <TabsContent value="bus" className="space-y-10 focus-visible:outline-none">
          {/* FORMULAIRE XL */}
          <div className={`border-2 rounded-[2.5rem] p-8 shadow-xl transition-all ${editingId ? 'bg-orange-50/20 border-orange-200' : 'bg-white border-slate-50 shadow-slate-100/50'}`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className={`text-sm font-black uppercase flex items-center gap-2 ${editingId ? 'text-orange-600' : 'text-slate-400'}`}>
                    {editingId ? <Edit2 size={16}/> : <Zap size={16} className="fill-orange-400 text-orange-400" />}
                    {editingId ? "Modifier le bagage" : "Nouveau bagage standard"}
                </h3>
                {editingId && <Button variant="ghost" size="sm" onClick={() => {setEditingId(null); setNewItem({label:'', price:''})}} className="h-7 text-[10px] font-bold text-red-500 uppercase gap-1 hover:bg-red-50"><X size={14}/> Annuler</Button>}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
              <div className="sm:col-span-7 space-y-1.5 text-left">
                <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Type de bagage (Ex: Glacière, Sac...)</Label>
                <Input placeholder="Désignation..." className="h-14 rounded-2xl border-2 border-slate-100 bg-white px-5 text-base font-bold focus:border-primary transition-all shadow-sm" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
              </div>
              <div className="sm:col-span-3 space-y-1.5 text-left">
                <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Prix (F)</Label>
                <Input type="number" className="h-14 rounded-2xl border-2 border-slate-100 bg-white px-5 font-black text-lg text-primary focus:border-primary transition-all shadow-sm" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button onClick={handleUpsertBusItem} disabled={saving} className={`w-full h-14 rounded-2xl font-bold shadow-lg transition-all ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900'}`}>
                  {saving ? <RefreshCw className="animate-spin h-5 w-5" /> : (editingId ? <Save size={20}/> : <Plus size={20} />)}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
             <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 px-6 italic">Tarifs enregistrés</h3>
             {busItems.map((item) => (
                <div key={item.id} className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all group ${editingId === item.id ? 'bg-orange-50 border-orange-200 shadow-inner' : 'bg-white border-slate-50 hover:shadow-lg'}`}>
                  <div className="flex items-center gap-4 text-left">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${editingId === item.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.label.charAt(0)}</div>
                    <div>
                      <p className="font-black text-slate-800 text-lg uppercase leading-tight tracking-tight">{item.label}</p>
                      <p className="text-sm font-black text-primary uppercase mt-1 tracking-widest">{item.price.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="text-slate-200 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all"><Edit2 size={18} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if(confirm('Supprimer ?')) supabase.from('company_luggage_settings').delete().eq('id', item.id).then(()=>loadSettings()) }} className="text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"><Trash2 size={18} /></Button>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="train" className="focus-visible:outline-none">
          <div className="bg-white border-2 border-slate-50 rounded-[3rem] p-10 shadow-2xl shadow-slate-100/50 space-y-10 w-full">
            <div className="text-center">
               <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Scale className="h-10 w-10" /></div>
               <h3 className="text-2xl font-black text-slate-900 uppercase italic">Politique de Pesée</h3>
               <p className="text-sm text-muted-foreground font-medium italic">Règles applicables au train et navires</p>
            </div>

            <div className="space-y-8 text-left">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-400 ml-4 tracking-widest">Franchise (Poids gratuit par personne)</Label>
                <div className="relative group">
                   <Input type="number" value={trainSettings.free_limit} onChange={e => setTrainSettings({...trainSettings, free_limit: parseFloat(e.target.value)})} className="h-20 pl-8 pr-20 font-black text-4xl rounded-[2rem] border-none bg-slate-50 group-focus-within:bg-white transition-all shadow-inner" />
                   <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl tracking-tighter">KG</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-400 ml-4 tracking-widest">Prix du kilo supplémentaire</Label>
                <div className="relative group">
                   <Input type="number" value={trainSettings.price_per_kg} onChange={e => setTrainSettings({...trainSettings, price_per_kg: parseFloat(e.target.value)})} className="h-20 pl-8 pr-32 font-black text-4xl rounded-[2rem] border-none bg-slate-50 group-focus-within:bg-white transition-all shadow-inner" />
                   <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm tracking-widest uppercase">FCFA / KG</span>
                </div>
              </div>

              <Button onClick={saveTrainSettings} disabled={saving} className="w-full h-16 font-black text-xl gap-3 rounded-[1.5rem] shadow-xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98]">
                {saving ? <RefreshCw className="animate-spin h-6 w-6"/> : <ShieldCheck className="h-6 w-6" />}
                SAUVEGARDER LES RÉGLAGES
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}