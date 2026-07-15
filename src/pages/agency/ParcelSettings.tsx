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
      toast.success("Nouveau tarif ajouté"); 
    }
  };

  const deleteTariff = async (id: string) => {
    const { error } = await supabase.from('company_parcel_tariffs').delete().eq('id', id);
    if (!error) { setTariffs(tariffs.filter(t => t.id !== id)); toast.success("Supprimé"); }
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" /></div>;

  return (
    /* LE SECRET : On centre tout le contenu ici avec max-w-2xl et mx-auto */
    <div className="max-w-2xl mx-auto w-full p-4 pb-20 space-y-8 text-left">
      
      {/* 1. HEADER UNIFIÉ */}
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2.5rem] border shadow-sm w-full">
        <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight italic">Tarification Fret</h1>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Grille des envois marchandises</p>
        </div>
      </header>

      <Tabs defaultValue="flat" className="w-full space-y-8">
        {/* 2. ONGLETS UNIFIÉS */}
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-14 flex w-full">
          <TabsTrigger value="flat" className="flex-1 rounded-xl font-bold transition-all"><Package className="h-4 w-4 mr-2"/> Forfaits fixes</TabsTrigger>
          <TabsTrigger value="weight" className="flex-1 rounded-xl font-bold transition-all"><Calculator className="h-4 w-4 mr-2"/> Prix au Poids</TabsTrigger>
        </TabsList>

        {/* 3. CARTE DE SAISIE (Stacked) */}
        <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-100/50 w-full">
          <h3 className="text-sm font-black uppercase mb-6 flex items-center gap-2 text-slate-400">
            <Plus className="h-4 w-4" /> Nouveau réglage tarifaire
          </h3>
          
          <TabsContent value="flat" className="m-0 space-y-6 focus-visible:outline-none">
             <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7 space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom de l'article</Label>
                    <Input placeholder="Ex: Enveloppe A4" className="h-14 rounded-2xl bg-slate-50 border-none px-5" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prix (FCFA)</Label>
                    <Input type="number" className="h-14 rounded-2xl bg-slate-50 border-none px-5 font-black text-lg text-emerald-600" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
                <div className="sm:col-span-2 flex items-end">
                    <Button onClick={() => addTariff(false)} className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black shadow-lg shadow-emerald-100"><Plus className="h-5 w-5"/></Button>
                </div>
             </div>
             <p className="text-[10px] text-muted-foreground italic ml-1">Le prix sera fixe quel que soit le poids du colis.</p>
          </TabsContent>

          <TabsContent value="weight" className="m-0 space-y-6 focus-visible:outline-none">
             <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7 space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Désignation marchandise</Label>
                    <Input placeholder="Ex: Sac de Riz, Farine" className="h-14 rounded-2xl bg-slate-50 border-none px-5" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prix / KG</Label>
                    <Input type="number" className="h-14 rounded-2xl bg-slate-50 border-none px-5 font-black text-lg text-blue-600" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
                <div className="sm:col-span-2 flex items-end">
                    <Button onClick={() => addTariff(true)} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black shadow-lg shadow-blue-100"><Plus className="h-5 w-5"/></Button>
                </div>
             </div>
             <p className="text-[10px] text-muted-foreground italic ml-1">Le prix total sera multiplié par le nombre de kilos à l'enregistrement.</p>
          </TabsContent>
        </div>

        {/* 4. LISTE DES TARIFS (Stacked en dessous) */}
        <div className="space-y-4 w-full">
          <div className="flex items-center justify-between px-6">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Tarifs enregistrés</h3>
            <Badge className="bg-slate-100 text-slate-500 border-none font-bold rounded-full">{tariffs.length} Tarifs</Badge>
          </div>

          <div className="space-y-3 w-full">
             {tariffs.length === 0 && (
               <div className="p-16 text-center border-2 border-dashed rounded-[2.5rem] bg-slate-50/50">
                  <Package className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-slate-400 italic text-sm font-medium">Aucun tarif configuré pour le moment</p>
               </div>
             )}
             
             {tariffs.map(t => (
               <div key={t.id} className="flex items-center justify-between bg-white border border-slate-100 p-6 rounded-[2rem] hover:shadow-lg transition-all group w-full">
                  <div className="flex items-center gap-4 text-left">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${t.is_weight_based ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {t.is_weight_based ? <Calculator className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg leading-tight">{t.label}</p>
                      <p className="text-sm font-black text-emerald-600 uppercase mt-1 tracking-tighter italic">
                        {t.price.toLocaleString()} FCFA {t.is_weight_based ? '/ KG' : ''}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteTariff(t.id)} className="text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-5 w-5" />
                  </Button>
               </div>
             ))}
          </div>
        </div>
      </Tabs>
    </div>
  );
}