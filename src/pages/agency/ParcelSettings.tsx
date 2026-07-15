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
    if (!newItem.label || !newItem.price) return toast.error("Veuillez remplir les champs");
    const { data, error } = await supabase.from('company_parcel_tariffs').insert([{
      company_id: user?.companyId, label: newItem.label, price: parseFloat(newItem.price), is_weight_based: isWeight
    }]).select().single();
    if (!error) { setTariffs([...tariffs, data]); setNewItem({ label: '', price: '', is_weight_based: false }); toast.success("Tarif ajouté"); }
  };

  const deleteTariff = async (id: string) => {
    const { error } = await supabase.from('company_parcel_tariffs').delete().eq('id', id);
    if (!error) { setTariffs(tariffs.filter(t => t.id !== id)); toast.success("Supprimé"); }
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" /></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 text-left">
      {/* HEADER */}
      <header className="flex items-center gap-4 mb-8 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Tarification Fret</h1>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Grille des colis & marchandises</p>
        </div>
      </header>

      <Tabs defaultValue="flat" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-12 flex w-full">
          <TabsTrigger value="flat" className="flex-1 rounded-lg font-bold"><Package className="h-4 w-4 mr-2"/> Forfaits</TabsTrigger>
          <TabsTrigger value="weight" className="flex-1 rounded-lg font-bold"><Calculator className="h-4 w-4 mr-2"/> Au Poids</TabsTrigger>
        </TabsList>

        {/* --- FORMULAIRE (Empilé en haut) --- */}
        <div className="bg-white border-2 border-primary/5 rounded-[3rem] p-10 shadow-2xl shadow-slate-100/50">
          <h3 className="text-sm font-black uppercase mb-6 flex items-center gap-2 text-slate-400">
            <Plus className="h-4 w-4" /> Nouveau tarif
          </h3>
          
          <TabsContent value="flat" className="m-0 space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase ml-1">Nom de l'article</Label>
                    <Input placeholder="Ex: Enveloppe, Petit Carton" className="h-12 rounded-2xl bg-slate-50 border-none" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase ml-1">Prix Fixe (FCFA)</Label>
                    <Input type="number" className="h-12 rounded-2xl bg-slate-50 border-none font-bold" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
             </div>
             <Button onClick={() => addTariff(false)} className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black shadow-lg">ENREGISTRER L'ARTICLE</Button>
          </TabsContent>

          <TabsContent value="weight" className="m-0 space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase ml-1">Désignation</Label>
                    <Input placeholder="Ex: Ciment, Farine, Matériel" className="h-12 rounded-2xl bg-slate-50 border-none" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase ml-1">Prix / KG (FCFA)</Label>
                    <Input type="number" className="h-12 rounded-2xl bg-slate-50 border-none font-bold" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
             </div>
             <Button onClick={() => addTariff(true)} className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black shadow-lg">ACTIVER LE TARIF AU KG</Button>
          </TabsContent>
        </div>

        {/* --- LISTE (Empilée en bas) --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Tarifs enregistrés</h3>
            <Badge className="bg-slate-100 text-slate-600 border-none font-bold">{tariffs.length} Tarifs</Badge>
          </div>

          <TabsContent value="flat" className="m-0 space-y-3">
             {tariffs.filter(t => !t.is_weight_based).map(t => <TariffCard key={t.id} t={t} onDelete={deleteTariff} />)}
             {tariffs.filter(t => !t.is_weight_based).length === 0 && <div className="p-10 text-center text-slate-300 italic border-2 border-dashed rounded-[2rem]">Aucun article forfaitaire</div>}
          </TabsContent>

          <TabsContent value="weight" className="m-0 space-y-3">
             {tariffs.filter(t => t.is_weight_based).map(t => <TariffCard key={t.id} t={t} onDelete={deleteTariff} suffix="/ Kg" />)}
             {tariffs.filter(t => t.is_weight_based).length === 0 && <div className="p-10 text-center text-slate-300 italic border-2 border-dashed rounded-[2rem]">Aucun tarif au poids</div>}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function TariffCard({ t, onDelete, suffix = "" }: any) {
  return (
    <div className="flex items-center justify-between bg-white border p-5 rounded-[1.5rem] hover:shadow-md transition-all group">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${t.is_weight_based ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {t.is_weight_based ? <Calculator className="h-5 w-5" /> : <Package className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-bold text-slate-800">{t.label}</p>
          <p className="text-sm font-black text-primary uppercase">{t.price.toLocaleString()} FCFA {suffix}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)} className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}