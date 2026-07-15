"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Plus, Trash2, RefreshCw, Calculator, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ParcelSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ label: '', price: '', is_weight_based: false });

  useEffect(() => { if (user?.companyId) loadTariffs(); }, [user]);

  const loadTariffs = async () => {
    setLoading(true);
    const { data } = await supabase.from('company_parcel_tariffs').select('*')
      .eq('company_id', user?.companyId).order('created_at', { ascending: true });
    if (data) setTariffs(data);
    setLoading(false);
  };

  const addTariff = async (isWeight: boolean) => {
    if (!newItem.label || !newItem.price) return toast.error("Remplissez tous les champs");
    const { data, error } = await supabase.from('company_parcel_tariffs').insert([{
      company_id: user?.companyId, label: newItem.label, price: parseFloat(newItem.price), is_weight_based: isWeight
    }]).select().single();
    if (!error) { 
      setTariffs([...tariffs, data]); 
      setNewItem({ label: '', price: '', is_weight_based: false }); 
      toast.success("Tarif ajouté"); 
    }
  };

  const deleteTariff = async (id: string) => {
    const { error } = await supabase.from('company_parcel_tariffs').delete().eq('id', id);
    if (!error) { setTariffs(tariffs.filter(t => t.id !== id)); toast.success("Supprimé"); }
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left">
      {/* HEADER STYLE PARCEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-primary flex items-center gap-3">
            <Truck className="h-8 w-8" /> Tarification Fret
          </h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Grille des envois de marchandises</p>
        </div>
        <Button variant="outline" onClick={loadTariffs} className="rounded-xl font-bold border-2 gap-2">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </Button>
      </div>

      <Tabs defaultValue="flat" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 flex w-full md:w-[400px]">
          <TabsTrigger value="flat" className="flex-1 rounded-xl font-bold transition-all">Forfaits</TabsTrigger>
          <TabsTrigger value="weight" className="flex-1 rounded-xl font-bold transition-all">Au Poids</TabsTrigger>
        </TabsList>

        {/* FORMULAIRE - CARD STYLE */}
        <div className="bg-card border-2 rounded-3xl p-6 shadow-sm mb-8">
          <h3 className="font-black text-sm uppercase mb-6 flex items-center gap-2 text-primary">
            <Plus className="h-4 w-4" /> Nouveau réglage
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2 md:col-span-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Désignation</Label>
                <Input placeholder="Ex: Enveloppe, Sac de Riz" className="h-12 rounded-2xl border-2 shadow-sm font-medium" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Prix (FCFA)</Label>
                <Input type="number" className="h-12 rounded-2xl border-2 shadow-sm font-bold" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            </div>
            <TabsContent value="flat" className="m-0">
               <Button onClick={() => addTariff(false)} className="w-full h-12 rounded-2xl font-black shadow-sm">ENREGISTRER</Button>
            </TabsContent>
            <TabsContent value="weight" className="m-0">
               <Button onClick={() => addTariff(true)} className="w-full h-12 rounded-2xl font-black shadow-sm bg-blue-600 hover:bg-blue-700">ACTIVER AU KG</Button>
            </TabsContent>
          </div>
        </div>

        {/* LISTE - CARD STYLE */}
        <div className="grid gap-4">
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-4">Tarifs enregistrés</h3>
          {tariffs.map(t => (
            <div key={t.id} className="bg-card border-2 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${t.is_weight_based ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {t.is_weight_based ? <Calculator className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{t.label}</p>
                    <Badge variant="outline" className="border-2 font-black uppercase text-[10px] px-2.5 mt-1">
                      {t.price.toLocaleString()} FCFA {t.is_weight_based ? '/ KG' : ''}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteTariff(t.id)} className="text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl">
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Tabs>
    </div>
  );
}