"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, List, TabsTrigger } from "@/components/ui/tabs";
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
  
  // États pour le mode TRAIN (Poids)
  const [trainSettings, setTrainSettings] = useState({
    free_limit: 30,
    price_per_kg: 500
  });

  // États pour le mode BUS (Articles)
  const [busItems, setBusItems] = useState<{id: string, label: string, price: number}[]>([]);
  const [newItem, setNewItem] = useState({ label: '', price: '' });

  useEffect(() => {
    if (user?.companyId) loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // 1. Charger les infos de la compagnie (Mode Train)
      const { data: comp } = await supabase
        .from('companies')
        .select('default_free_weight_limit, default_excess_weight_price')
        .eq('id', user?.companyId)
        .single();
      
      if (comp) {
        setTrainSettings({
          free_limit: comp.default_free_weight_limit,
          price_per_kg: comp.default_excess_weight_price
        });
      }

      // 2. Charger les articles (Mode Bus)
      const { data: items } = await supabase
        .from('company_luggage_settings')
        .select('*')
        .eq('company_id', user?.companyId)
        .order('created_at', { ascending: true });

      if (items) setBusItems(items);
    } finally {
      setLoading(false);
    }
  };

  const saveTrainSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('companies')
      .update({
        default_free_weight_limit: trainSettings.free_limit,
        default_excess_weight_price: trainSettings.price_per_kg
      })
      .eq('id', user?.companyId);

    if (!error) toast.success("Paramètres Train mis à jour");
    setSaving(false);
  };

  const addItem = async () => {
    if (!newItem.label || !newItem.price) return;
    const { data, error } = await supabase
      .from('company_luggage_settings')
      .insert([{
        company_id: user?.companyId,
        label: newItem.label,
        price: parseFloat(newItem.price)
      }])
      .select()
      .single();

    if (!error) {
      setBusItems([...busItems, data]);
      setNewItem({ label: '', price: '' });
      toast.success("Type de bagage ajouté");
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('company_luggage_settings').delete().eq('id', id);
    if (!error) setBusItems(busItems.filter(i => i.id !== id));
  };

  if (loading) return <div className="p-20 text-center"><RefreshCw className="animate-spin mx-auto text-primary" /></div>;

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

      <Tabs defaultValue="bus" className="space-y-6">
        <div className="bg-muted/50 p-1 rounded-xl inline-flex w-full">
            <TabsTrigger value="bus" className="flex-1 gap-2 font-bold"><Package className="h-4 w-4"/> Mode Bus (Articles)</TabsTrigger>
            <TabsTrigger value="train" className="flex-1 gap-2 font-bold"><Scale className="h-4 w-4"/> Mode Train (Poids)</TabsTrigger>
        </div>

        {/* CONTENU MODE BUS */}
        <TabsContent value="bus" className="space-y-6">
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-sm uppercase mb-4 text-primary">Ajouter un nouveau forfait</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black ml-1 uppercase">Désignation</Label>
                <Input placeholder="Ex: Sac de riz 50kg" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black ml-1 uppercase">Prix (FCFA)</Label>
                <Input type="number" placeholder="Ex: 2000" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
            </div>
            <Button onClick={addItem} className="w-full font-black gap-2 h-11">
              <Plus className="h-4 w-4" /> Enregistrer ce type
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-sm uppercase ml-1">Tarifs enregistrés</h3>
            {busItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white border-2 border-primary/5 p-4 rounded-2xl shadow-xs group">
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

        {/* CONTENU MODE TRAIN */}
        <TabsContent value="train">
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-tighter">Franchise Gratuite (kg)</Label>
                <Input 
                   type="number" 
                   value={trainSettings.free_limit} 
                   onChange={e => setTrainSettings({...trainSettings, free_limit: parseFloat(e.target.value)})}
                   className="h-12 font-bold text-lg"
                />
                <p className="text-[10px] text-muted-foreground font-medium">Poids maximum autorisé sans frais supplémentaire.</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-dashed">
                <Label className="font-black text-xs uppercase tracking-tighter">Prix de l'excédent (FCFA / kg)</Label>
                <Input 
                   type="number" 
                   value={trainSettings.price_per_kg} 
                   onChange={e => setTrainSettings({...trainSettings, price_per_kg: parseFloat(e.target.value)})}
                   className="h-12 font-bold text-lg"
                />
                <p className="text-[10px] text-muted-foreground font-medium">Tarif appliqué pour chaque kilo dépassant la franchise.</p>
              </div>
            </div>

            <Button onClick={saveTrainSettings} disabled={saving} className="w-full h-12 font-black gap-2 rounded-2xl shadow-lg">
              {saving ? <RefreshCw className="animate-spin h-4 w-4"/> : <Save className="h-4 w-4" />}
              Appliquer les nouveaux tarifs
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}