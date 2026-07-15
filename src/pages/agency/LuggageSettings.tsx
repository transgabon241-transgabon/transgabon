"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
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
    if (!error) toast.success("Politique mise à jour");
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left">
      {/* HEADER STYLE PARCEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-primary flex items-center gap-3">
            <Settings2 className="h-8 w-8" /> Règles Bagages
          </h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Configuration des suppléments voyageurs</p>
        </div>
        <Button variant="outline" onClick={loadSettings} className="rounded-xl font-bold border-2 gap-2">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </Button>
      </div>

      <Tabs defaultValue="bus" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 flex w-full md:w-[400px]">
          <TabsTrigger value="bus" className="flex-1 rounded-xl font-bold transition-all"><Package className="h-4 w-4 mr-2 text-orange-500"/> Agence Bus</TabsTrigger>
          <TabsTrigger value="train" className="flex-1 rounded-xl font-bold transition-all"><Scale className="h-4 w-4 mr-2 text-blue-500"/> Train (SETRAG)</TabsTrigger>
        </TabsList>

        <TabsContent value="bus" className="space-y-6 focus-visible:outline-none">
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-sm uppercase mb-6 flex items-center gap-2 text-primary">
                <Zap className="h-4 w-4 fill-primary/20" /> Ajouter un forfait
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7 space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Désignation</Label>
                <Input placeholder="Ex: Valise, Ballot, Sac de riz" className="h-12 rounded-2xl border-2" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Prix (F)</Label>
                <Input type="number" className="h-12 rounded-2xl border-2 font-bold" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button onClick={addItem} className="w-full h-12 rounded-2xl font-black">AJOUTER</Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
             {busItems.map((item) => (
                <div key={item.id} className="bg-card border-2 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xl">{item.label.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg">{item.label}</p>
                      <Badge variant="outline" className="border-2 font-black text-orange-600 text-[10px] px-2.5 mt-1 uppercase italic">{item.price.toLocaleString()} FCFA</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-red-300 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 className="h-5 w-5" /></Button>
                </div>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="train" className="focus-visible:outline-none">
          <div className="max-w-2xl mx-auto bg-card border-2 rounded-[3rem] p-10 shadow-xl space-y-10">
            <div className="text-center">
               <div className="h-20 w-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Scale className="h-10 w-10" /></div>
               <h3 className="text-2xl font-black italic">Politique Ferroviaire</h3>
               <p className="text-sm text-muted-foreground font-medium italic">Paramètres officiels de la SETRAG</p>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="font-black text-xs uppercase text-muted-foreground ml-1">Franchise (Poids gratuit)</Label>
                <div className="relative">
                   <Input type="number" value={trainSettings.free_limit} onChange={e => setTrainSettings({...trainSettings, free_limit: parseFloat(e.target.value)})} className="h-20 pl-8 pr-20 font-black text-4xl rounded-[2rem] border-2 bg-slate-50 focus:bg-white transition-all shadow-inner" />
                   <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl">KG</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-black text-xs uppercase text-muted-foreground ml-1">Coût par KG supplémentaire</Label>
                <div className="relative">
                   <Input type="number" value={trainSettings.price_per_kg} onChange={e => setTrainSettings({...trainSettings, price_per_kg: parseFloat(e.target.value)})} className="h-20 pl-8 pr-32 font-black text-4xl rounded-[2rem] border-2 bg-slate-50 focus:bg-white transition-all shadow-inner" />
                   <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm">FCFA / KG</span>
                </div>
              </div>

              <Button onClick={saveTrainSettings} disabled={saving} className="w-full h-16 font-black text-xl gap-3 rounded-[1.5rem] shadow-xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98]">
                {saving ? <RefreshCw className="animate-spin h-6 w-6"/> : <ShieldCheck className="h-6 w-6" />}
                ENREGISTRER LA POLITIQUE
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}