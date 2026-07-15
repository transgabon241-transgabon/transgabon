"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // CORRIGÉ : TabsList ajouté
import { 
  Package, 
  Scale, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw,
  Settings2
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
      toast.success("Paramètres Train mis à jour");
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
      <RefreshCw className="animate-spin h-8 w-8 text-primary" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 text-left">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <Settings2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic">Configuration Bagages</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Réglages de votre agence</p>
        </div>
      </div>

      <Tabs defaultValue="bus" className="w-full">
        {/* CORRECTION ICI : Utilisation obligatoire de TabsList */}
        <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="bus" className="font-bold gap-2 rounded-lg data-[state=active]:shadow-sm">
            <Package className="h-4 w-4"/> Mode Bus
          </TabsTrigger>
          <TabsTrigger value="train" className="font-bold gap-2 rounded-lg data-[state=active]:shadow-sm">
            <Scale className="h-4 w-4"/> Mode Train
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bus" className="space-y-6 focus-visible:outline-none">
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-sm uppercase mb-4 text-primary">Ajouter un nouveau tarif</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black ml-1 uppercase">Désignation</Label>
                <Input placeholder="Ex: Sac de riz" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black ml-1 uppercase">Prix (FCFA)</Label>
                <Input type="number" placeholder="Ex: 1500" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
            </div>
            <Button onClick={addItem} className="w-full font-black gap-2 h-11 shadow-sm">
              <Plus className="h-4 w-4" /> Enregistrer ce forfait
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-sm uppercase ml-1">Tarifs actuels</h3>
            {busItems.length === 0 && <p className="text-xs italic text-muted-foreground p-4">Aucun tarif configuré.</p>}
            {busItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white border-2 border-primary/5 p-4 rounded-2xl hover:border-primary/20 transition-all">
                <div>
                  <p className="font-bold text-slate-800">{item.label}</p>
                  <p className="text-xs font-black text-primary uppercase">{item.price.toLocaleString()} FCFA</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="train" className="focus-visible:outline-none">
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase text-slate-500">Franchise Gratuite (kg)</Label>
                <Input 
                   type="number" 
                   value={trainSettings.free_limit} 
                   onChange={e => setTrainSettings({...trainSettings, free_limit: parseFloat(e.target.value)})}
                   className="h-12 font-bold text-lg rounded-xl"
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-dashed">
                <Label className="font-black text-xs uppercase text-slate-500">Prix de l'excédent (FCFA / kg)</Label>
                <Input 
                   type="number" 
                   value={trainSettings.price_per_kg} 
                   onChange={e => setTrainSettings({...trainSettings, price_per_kg: parseFloat(e.target.value)})}
                   className="h-12 font-bold text-lg rounded-xl"
                />
              </div>
            </div>

            <Button onClick={saveTrainSettings} disabled={saving} className="w-full h-12 font-black gap-2 rounded-2xl shadow-lg mt-4">
              {saving ? <RefreshCw className="animate-spin h-4 w-4"/> : <Save className="h-4 w-4" />}
              Mettre à jour la politique de poids
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}