"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck, Plus, Trash2, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function ParcelSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ label: '', price: '', is_weight_based: false });

  useEffect(() => {
    if (user?.companyId) loadTariffs();
  }, [user]);

  const loadTariffs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('company_parcel_tariffs')
      .select('*')
      .eq('company_id', user?.companyId)
      .order('created_at', { ascending: true });
    if (data) setTariffs(data);
    setLoading(false);
  };

  const addTariff = async (isWeight: boolean) => {
    if (!newItem.label || !newItem.price) return;
    const { data, error } = await supabase
      .from('company_parcel_tariffs')
      .insert([{
        company_id: user?.companyId,
        label: newItem.label,
        price: parseFloat(newItem.price),
        is_weight_based: isWeight
      }])
      .select().single();

    if (!error) {
      setTariffs([...tariffs, data]);
      setNewItem({ label: '', price: '', is_weight_based: false });
      toast.success("Tarif ajouté");
    }
  };

  const deleteTariff = async (id: string) => {
    await supabase.from('company_parcel_tariffs').delete().eq('id', id);
    setTariffs(tariffs.filter(t => t.id !== id));
    toast.success("Supprimé");
  };

  if (loading) return <div className="p-20 text-center"><RefreshCw className="animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 text-left">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-emerald-500/10 rounded-2xl">
          <Truck className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic">Tarification Colis (Fret)</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Réglages des envois de marchandises</p>
        </div>
      </div>

      <Tabs defaultValue="flat" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="flat" className="font-bold gap-2"><Package className="h-4 w-4"/> Forfaits (Articles)</TabsTrigger>
          <TabsTrigger value="weight" className="font-bold gap-2"><Settings className="h-4 w-4"/> Par Poids (Kg)</TabsTrigger>
        </TabsList>

        {/* FORFAITS (Ex: Enveloppe, Petit Carton) */}
        <TabsContent value="flat" className="space-y-6">
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-xs uppercase mb-4 text-emerald-700">Ajouter un article forfaitaire</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Input placeholder="Ex: Enveloppe A4" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
              <Input type="number" placeholder="Prix fixe (FCFA)" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            </div>
            <Button onClick={() => addTariff(false)} className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold">Ajouter l'article</Button>
          </div>

          <div className="space-y-3">
             {tariffs.filter(t => !t.is_weight_based).map(t => (
               <TariffCard key={t.id} t={t} onDelete={deleteTariff} />
             ))}
          </div>
        </TabsContent>

        {/* PAR POIDS (Ex: Marchandise au KG) */}
        <TabsContent value="weight" className="space-y-6">
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-xs uppercase mb-4 text-blue-700">Ajouter une règle au poids</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Input placeholder="Ex: Sac de ciment / Farine" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
              <Input type="number" placeholder="Prix par KG (FCFA)" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            </div>
            <Button onClick={() => addTariff(true)} className="w-full bg-blue-600 hover:bg-blue-700 font-bold">Ajouter la règle au KG</Button>
          </div>

          <div className="space-y-3">
             {tariffs.filter(t => t.is_weight_based).map(t => (
               <TariffCard key={t.id} t={t} onDelete={deleteTariff} suffix="/ Kg" />
             ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TariffCard({ t, onDelete, suffix = "" }: any) {
  return (
    <div className="flex items-center justify-between bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-xs transition-all hover:border-emerald-200">
      <div>
        <p className="font-bold text-slate-800">{t.label}</p>
        <p className="text-xs font-black text-emerald-600 uppercase">{t.price.toLocaleString()} FCFA {suffix}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}