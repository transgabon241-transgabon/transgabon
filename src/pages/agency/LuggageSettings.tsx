"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Scale, Plus, Trash2, Save, RefreshCw, Settings2, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function LuggageSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trainSettings, setTrainSettings] = useState({ free_limit: 30, price_per_kg: 500 });
  const [busItems, setBusItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ label: '', price: '' });

  useEffect(() => { if (user?.companyId) loadSettings(); }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    const { data: comp } = await supabase.from('companies').select('*').eq('id', user?.companyId).single();
    if (comp) setTrainSettings({ free_limit: comp.default_free_weight_limit || 30, price_per_kg: comp.default_excess_weight_price || 500 });
    const { data: items } = await supabase.from('company_luggage_settings').select('*').eq('company_id', user?.companyId).order('created_at', { ascending: true });
    if (items) setBusItems(items);
    setLoading(false);
  };

  const addItem = async () => {
    if (!newItem.label || !newItem.price) return;
    const { data, error } = await supabase.from('company_luggage_settings').insert([{ company_id: user?.companyId, label: newItem.label, price: parseFloat(newItem.price) }]).select().single();
    if (!error) { setBusItems([...busItems, data]); setNewItem({ label: '', price: '' }); toast.success("Ajouté"); }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('company_luggage_settings').delete().eq('id', id);
    if (!error) { setBusItems(busItems.filter(i => i.id !== id)); toast.success("Supprimé"); }
  };

  const saveTrainSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from('companies').update({ default_free_weight_limit: trainSettings.free_limit, default_excess_weight_price: trainSettings.price_per_kg }).eq('id', user?.companyId);
    if (!error) toast.success("Paramètres enregistrés");
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" /></div>;

  return (
    /* LE SECRET : On centre tout le contenu ici avec max-w-2xl et mx-auto */
    <div className="max-w-2xl mx-auto w-full p-4 pb-20 space-y-8 text-left">
      
      {/* 1. HEADER (Maintenant aligné avec la carte) */}
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm w-full">
        <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
          <Settings2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tight">Règles Bagages</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Configuration des suppléments</p>
        </div>
      </header>

      {/* 2. TABS (Maintenant alignés avec la carte) */}
      <Tabs defaultValue="bus" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-14 flex w-full">
          <TabsTrigger value="bus" className="flex-1 rounded-xl font-bold transition-all"><Package className="h-4 w-4 mr-2 text-orange-500"/> Agence Bus</TabsTrigger>
          <TabsTrigger value="train" className="flex-1 rounded-xl font-bold transition-all"><Scale className="h-4 w-4 mr-2 text-blue-500"/> Train (SETRAG)</TabsTrigger>
        </TabsList>

        {/* --- MODE BUS --- */}
        <TabsContent value="bus" className="space-y-10 focus-visible:outline-none">
          <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50">
            <h3 className="text-sm font-black uppercase mb-6 flex items-center gap-2 text-orange-400"><Zap className="h-4 w-4 fill-orange-400" /> Nouveau forfait</h3>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7 space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Désignation</Label>
                <Input placeholder="Ex: Sac de Riz, Valise" className="h-14 rounded-2xl bg-slate-50 border-none px-5" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
              </div>
              <div className="sm:col-span-3 space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prix (F)</Label>
                <Input type="number" className="h-14 rounded-2xl bg-slate-50 border-none px-5 font-black text-lg" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button onClick={addItem} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black font-bold shadow-lg"><Plus className="h-5 w-5" /></Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
             <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-6">Tarifs enregistrés</h3>
             {busItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white border border-slate-100 p-6 rounded-[2rem] hover:shadow-lg transition-all group">
                  <div className="flex items-center gap-4 text-left">
                    <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-black text-xl">{item.label.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg leading-tight">{item.label}</p>
                      <p className="text-sm font-black text-orange-600 uppercase mt-1 italic">{item.price.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-5 w-5" /></Button>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* --- MODE TRAIN --- */}
        <TabsContent value="train" className="focus-visible:outline-none">
          <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-100/50 space-y-10 w-full">
            <div className="text-center">
               <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Scale className="h-10 w-10" /></div>
               <h3 className="text-2xl font-black">Politique Ferroviaire</h3>
               <p className="text-sm text-muted-foreground font-medium italic">Paramètres officiels de la SETRAG</p>
            </div>

            <div className="space-y-8 text-left">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-400 ml-4 tracking-widest">Franchise (Poids gratuit)</Label>
                <div className="relative">
                   <Input type="number" value={trainSettings.free_limit} onChange={e => setTrainSettings({...trainSettings, free_limit: parseFloat(e.target.value)})} className="h-20 pl-8 pr-20 font-black text-4xl rounded-[2rem] border-none bg-slate-50 focus:bg-white shadow-inner" />
                   <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl">KG</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-400 ml-4 tracking-widest">Coût du surplus (FCFA/KG)</Label>
                <div className="relative">
                   <Input type="number" value={trainSettings.price_per_kg} onChange={e => setTrainSettings({...trainSettings, price_per_kg: parseFloat(e.target.value)})} className="h-20 pl-8 pr-32 font-black text-4xl rounded-[2rem] border-none bg-slate-50 focus:bg-white shadow-inner" />
                   <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm">FCFA / KG</span>
                </div>
              </div>

              <Button onClick={saveTrainSettings} disabled={saving} className="w-full h-16 font-black text-xl gap-3 rounded-[1.5rem] shadow-xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98]">
                {saving ? <RefreshCw className="animate-spin h-6 w-6"/> : <ShieldCheck className="h-6 w-6" />}
                APPLIQUER LA POLITIQUE
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}