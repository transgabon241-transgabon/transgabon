"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Plus, Trash2, RefreshCw, Calculator, Info } from 'lucide-react';
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
    if (!error) { setTariffs([...tariffs, data]); setNewItem({ label: '', price: '', is_weight_based: false }); toast.success("Tarif ajouté"); }
  };

  const deleteTariff = async (id: string) => {
    const { error } = await supabase.from('company_parcel_tariffs').delete().eq('id', id);
    if (!error) { setTariffs(tariffs.filter(t => t.id !== id)); toast.success("Tarif supprimé"); }
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" /></div>;

  return (
    <div className="max-w-3xl mx-auto p-6 pb-20 text-left">
      <header className="flex items-center gap-4 mb-10 border-b pb-8">
        <div className="p-4 bg-emerald-600 rounded-3xl shadow-lg shadow-emerald-100">
          <Truck className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Tarification Fret</h1>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-[0.2em]">Grille des colis & marchandises</p>
        </div>
      </header>

      <Tabs defaultValue="flat" className="w-full">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl mb-8 h-14 flex w-full">
          <TabsTrigger value="flat" className="flex-1 rounded-xl font-bold transition-all"><Package className="h-4 w-4 mr-2"/> Articles Forfaitaires</TabsTrigger>
          <TabsTrigger value="weight" className="flex-1 rounded-xl font-bold transition-all"><Calculator className="h-4 w-4 mr-2"/> Facturation au Poids</TabsTrigger>
        </TabsList>

        {/* --- SECTION COMMUNE : FORMULAIRE EN HAUT --- */}
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-50 mb-12">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-600" /> Ajouter un tarif
          </h3>
          
          <TabsContent value="flat" className="m-0 grid grid-cols-1 sm:grid-cols-12 gap-4">
             <div className="sm:col-span-7 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom de l'article</Label>
                <Input placeholder="Ex: Enveloppe, Petit Carton" className="h-12 rounded-xl" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
             </div>
             <div className="sm:col-span-3 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prix Fixe (F)</Label>
                <Input type="number" className="h-12 rounded-xl font-bold" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
             </div>
             <div className="sm:col-span-2 flex items-end">
                <Button onClick={() => addTariff(false)} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-100">Ajouter</Button>
             </div>
          </TabsContent>

          <TabsContent value="weight" className="m-0 grid grid-cols-1 sm:grid-cols-12 gap-4">
             <div className="sm:col-span-7 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Désignation marchandise</Label>
                <Input placeholder="Ex: Ciment, Farine, Matériel" className="h-12 rounded-xl" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
             </div>
             <div className="sm:col-span-3 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prix / KG (F)</Label>
                <Input type="number" className="h-12 rounded-xl font-bold" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
             </div>
             <div className="sm:col-span-2 flex items-end">
                <Button onClick={() => addTariff(true)} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100">Activer</Button>
             </div>
          </TabsContent>
        </div>

        {/* --- LISTE EN DESSOUS --- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Tarifs enregistrés</h3>
            <Badge variant="outline" className="rounded-full font-bold">{tariffs.length} au total</Badge>
          </div>

          <TabsContent value="flat" className="m-0 space-y-3">
             {tariffs.filter(t => !t.is_weight_based).map(t => <TariffCard key={t.id} t={t} onDelete={deleteTariff} />)}
             {tariffs.filter(t => !t.is_weight_based).length === 0 && <EmptyState />}
          </TabsContent>

          <TabsContent value="weight" className="m-0 space-y-3">
             {tariffs.filter(t => t.is_weight_based).map(t => <TariffCard key={t.id} t={t} onDelete={deleteTariff} suffix="/ Kg" />)}
             {tariffs.filter(t => t.is_weight_based).length === 0 && <EmptyState />}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function TariffCard({ t, onDelete, suffix = "" }: any) {
  return (
    <div className="flex items-center justify-between bg-white border-2 border-slate-50 p-6 rounded-[2rem] hover:border-emerald-200 transition-all group">
      <div className="flex items-center gap-4 text-left">
        <div className={`p-3 rounded-2xl ${t.is_weight_based ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {t.is_weight_based ? <Calculator className="h-5 w-5" /> : <Package className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-bold text-slate-800 text-lg leading-tight">{t.label}</p>
          <p className="text-sm font-black text-emerald-600 uppercase mt-1 tracking-tighter">{t.price.toLocaleString()} FCFA {suffix}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)} className="text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
}

function EmptyState() {
  return <div className="py-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-center text-slate-400 italic text-sm">Aucun tarif pour le moment</div>;
}