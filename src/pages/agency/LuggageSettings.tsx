"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import { 
  Package, 
  Scale, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw,
  Settings2,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function LuggageSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [trainSettings, setTrainSettings] = useState({
    free_limit: 30,
    price_per_kg: 500
  });

  const [busItems, setBusItems] = useState<{id: string, label: string, price: number}[]>([]);
  const [newItem, setNewItem] = useState({ label: '', price: '' });

  useEffect(() => {
    if (user?.companyId) loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: comp } = await supabase
        .from('companies')
        .select('default_free_weight_limit, default_excess_weight_price')
        .eq('id', user?.companyId)
        .single();
      
      if (comp) {
        setTrainSettings({
          free_limit: comp.default_free_weight_limit || 30,
          price_per_kg: comp.default_excess_weight_price || 500
        });
      }

      const { data: items } = await supabase
        .from('company_luggage_settings')
        .select('*')
        .eq('company_id', user?.companyId)
        .order('created_at', { ascending: true });

      if (items) setBusItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveTrainSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          default_free_weight_limit: trainSettings.free_limit,
          default_excess_weight_price: trainSettings.price_per_kg
        })
        .eq('id', user?.companyId);

      if (error) throw error;
      toast.success("Politique de poids mise à jour");
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const addItem = async () => {
    if (!newItem.label || !newItem.price) return;
    try {
      const { data, error } = await supabase
        .from('company_luggage_settings')
        .insert([{
          company_id: user?.companyId,
          label: newItem.label,
          price: parseFloat(newItem.price)
        }])
        .select()
        .single();

      if (error) throw error;
      setBusItems([...busItems, data]);
      setNewItem({ label: '', price: '' });
      toast.success("Type de bagage ajouté");
    } catch (err) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('company_luggage_settings').delete().eq('id', id);
      if (error) throw error;
      setBusItems(busItems.filter(i => i.id !== id));
      toast.success("Supprimé");
    } catch (err) {
      toast.error("Erreur de suppression");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20 text-left">
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <Settings2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 italic">Paramètres Bagages</h1>
        </div>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] ml-[52px]">Configuration par trajet</p>
      </header>

      <Tabs defaultValue="bus" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-2xl mb-10 h-14 w-full md:w-fit">
          <TabsTrigger value="bus" className="rounded-xl px-10 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Package className="h-4 w-4 mr-2 text-orange-500"/> Agence de Bus
          </TabsTrigger>
          <TabsTrigger value="train" className="rounded-xl px-10 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Scale className="h-4 w-4 mr-2 text-blue-500"/> Transport Ferroviaire
          </TabsTrigger>
        </TabsList>

        {/* MODE BUS : GESTION DES ARTICLES */}
        <TabsContent value="bus" className="space-y-10 focus-visible:outline-none">
          <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100">
            <div className="flex items-center gap-3 mb-8">
               <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />
               <h3 className="text-xl font-bold">Nouveaux tarifs bagages</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7 space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400 ml-1">Type de bagage</Label>
                <Input placeholder="Ex: Petit Sac, Valise 23kg..." className="h-12 rounded-xl" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
              </div>
              <div className="sm:col-span-3 space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400 ml-1">Prix (FCFA)</Label>
                <Input type="number" placeholder="0" className="h-12 rounded-xl font-bold" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button onClick={addItem} className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black font-bold">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {busItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white border-2 border-slate-50 p-6 rounded-[2rem] hover:border-orange-200 transition-all group">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold">
                      {item.label.substring(0,1).toUpperCase()}
                   </div>
                   <div>
                     <p className="font-bold text-slate-800">{item.label}</p>
                     <p className="text-sm font-black text-orange-600 uppercase tracking-tighter">{item.price.toLocaleString()} FCFA</p>
                   </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-full">
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* MODE TRAIN : GESTION DU POIDS */}
        <TabsContent value="train" className="focus-visible:outline-none">
          <div className="max-w-xl mx-auto bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-2xl shadow-slate-100">
            <div className="flex flex-col items-center text-center mb-10">
               <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                  <Scale className="h-10 w-10" />
               </div>
               <h3 className="text-2xl font-black text-slate-900">Règles du Transgabonais</h3>
               <p className="text-sm text-muted-foreground font-medium mt-2">Définissez les limites de poids pour les passagers du train</p>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <Label className="font-black text-xs uppercase text-slate-500">Franchise Gratuite</Label>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Inclus dans le billet</span>
                </div>
                <div className="relative">
                   <Input 
                      type="number" 
                      value={trainSettings.free_limit} 
                      onChange={e => setTrainSettings({...trainSettings, free_limit: parseFloat(e.target.value)})}
                      className="h-16 pl-6 pr-16 font-black text-2xl rounded-2xl border-2 border-slate-100 focus:border-blue-500 transition-all shadow-inner bg-slate-50/30"
                   />
                   <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-400">KG</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t-2 border-dashed border-slate-100">
                <div className="flex justify-between items-center px-1">
                  <Label className="font-black text-xs uppercase text-slate-500">Coût du surplus</Label>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Par kilo supp.</span>
                </div>
                <div className="relative">
                   <Input 
                      type="number" 
                      value={trainSettings.price_per_kg} 
                      onChange={e => setTrainSettings({...trainSettings, price_per_kg: parseFloat(e.target.value)})}
                      className="h-16 pl-6 pr-20 font-black text-2xl rounded-2xl border-2 border-slate-100 focus:border-blue-500 transition-all shadow-inner bg-slate-50/30"
                   />
                   <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">FCFA / KG</span>
                </div>
              </div>

              <Button onClick={saveTrainSettings} disabled={saving} className="w-full h-16 font-black text-lg gap-3 rounded-2xl shadow-xl shadow-blue-200 bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98]">
                {saving ? <RefreshCw className="animate-spin h-6 w-6"/> : <ShieldCheck className="h-6 w-6" />}
                Enregistrer la politique
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}