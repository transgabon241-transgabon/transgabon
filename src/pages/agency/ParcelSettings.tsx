"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Truck, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Calculator, 
  Save, 
  Ship,
  X,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';

export default function ParcelSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ label: '', price: '', is_weight_based: false });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { if (user?.companyId) loadTariffs(); }, [user]);

  const loadTariffs = async () => {
    setLoading(true);
    const { data } = await supabase.from('company_parcel_tariffs').select('*')
      .eq('company_id', user?.companyId).order('created_at', { ascending: true });
    if (data) setTariffs(data);
    setLoading(false);
  };

  const handleSave = async (isWeight: boolean) => {
    if (!newItem.label || !newItem.price) return toast.error("Veuillez remplir les champs");
    
    try {
      if (editingId) {
        await supabase.from('company_parcel_tariffs').update({
          label: newItem.label,
          price: parseFloat(newItem.price),
          is_weight_based: isWeight
        }).eq('id', editingId);
        toast.success("Tarif mis à jour");
      } else {
        const { data } = await supabase.from('company_parcel_tariffs').insert([{
          company_id: user?.companyId, label: newItem.label, price: parseFloat(newItem.price), is_weight_based: isWeight
        }]).select().single();
        setTariffs([...tariffs, data]);
        toast.success("Nouveau tarif ajouté");
      }
      setNewItem({ label: '', price: '', is_weight_based: false });
      setEditingId(null);
      loadTariffs();
    } catch (e) { toast.error("Erreur lors de l'opération"); }
  };

  const deleteTariff = async (id: string) => {
    const { error } = await supabase.from('company_parcel_tariffs').delete().eq('id', id);
    if (!error) { setTariffs(tariffs.filter(t => t.id !== id)); toast.success("Supprimé"); }
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" /></div>;

  return (
    <div className="max-w-2xl mx-auto w-full p-4 pb-20 space-y-8 text-left">
      
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm w-full">
        <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tight text-slate-900 uppercase leading-none">Tarification Fret</h1>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Gestion du transport de marchandises</p>
        </div>
      </header>

      <Tabs defaultValue="flat" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-14 flex w-full">
          <TabsTrigger value="flat" className="flex-1 rounded-xl font-bold transition-all" onClick={() => {setEditingId(null); setNewItem({label:'', price:'', is_weight_based:false})}}>
            <Package className="h-4 w-4 mr-2"/> Forfaits fixes
          </TabsTrigger>
          <TabsTrigger value="weight" className="flex-1 rounded-xl font-bold transition-all" onClick={() => {setEditingId(null); setNewItem({label:'', price:'', is_weight_based:true})}}>
            <Calculator className="h-4 w-4 mr-2"/> Prix au KG
          </TabsTrigger>
        </TabsList>

        <div className={`bg-white border-2 rounded-[2.5rem] p-8 shadow-xl transition-all ${editingId ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-50 shadow-slate-100/50'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black uppercase flex items-center gap-2 text-slate-400">
              {editingId ? <Edit3 size={16} className="text-emerald-600" /> : <Plus size={16} />}
              {editingId ? "Modifier le tarif sélectionné" : "Ajouter un nouveau tarif"}
            </h3>
            {editingId && <Button variant="ghost" size="sm" onClick={() => {setEditingId(null); setNewItem({label:'', price:'', is_weight_based:false})}} className="text-[10px] font-black text-red-500 uppercase h-7 gap-1 hover:bg-red-50"><X size={14}/> Annuler</Button>}
          </div>
          
          <TabsContent value="flat" className="m-0 space-y-6 focus-visible:outline-none">
             <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                <div className="sm:col-span-7 space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom de l'article (Ex: Enveloppe, Carton...)</Label>
                    <Input placeholder="Saisir le nom..." className="h-14 rounded-2xl bg-white border-2 border-slate-100 px-5 text-base font-bold focus:border-emerald-500 transition-all shadow-sm" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
                </div>
                <div className="sm:col-span-3 space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prix (FCFA)</Label>
                    <Input type="number" className="h-14 rounded-2xl bg-white border-2 border-slate-100 px-5 font-black text-xl text-emerald-600 focus:border-emerald-500 transition-all shadow-sm" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
                <div className="sm:col-span-2 flex items-end">
                    <Button onClick={() => handleSave(false)} className={`w-full h-14 rounded-2xl font-black shadow-lg transition-all active:scale-95 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        {editingId ? <Save size={20}/> : <Plus size={20}/>}
                    </Button>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="weight" className="m-0 space-y-6 focus-visible:outline-none">
             <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                <div className="sm:col-span-7 space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Marchandise (Ex: Sac de Riz, Ciment...)</Label>
                    <Input placeholder="Désignation..." className="h-14 rounded-2xl bg-white border-2 border-slate-100 px-5 text-base font-bold focus:border-blue-500 transition-all shadow-sm" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
                </div>
                <div className="sm:col-span-3 space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prix/KG (F)</Label>
                    <Input type="number" className="h-14 rounded-2xl bg-white border-2 border-slate-100 px-5 font-black text-xl text-blue-600 focus:border-blue-500 transition-all shadow-sm" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
                <div className="sm:col-span-2 flex items-end">
                    <Button onClick={() => handleSave(true)} className={`w-full h-14 rounded-2xl font-black shadow-lg transition-all active:scale-95 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {editingId ? <Save size={20}/> : <Plus size={20}/>}
                    </Button>
                </div>
             </div>
          </TabsContent>
        </div>

        <div className="space-y-4 w-full">
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 px-6 italic">Tarifs actifs en agence</h3>
          <div className="space-y-3 w-full">
             {tariffs.map(t => (
               <div key={t.id} className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all group w-full ${editingId === t.id ? 'bg-emerald-50 border-emerald-300 shadow-inner' : 'bg-white border-slate-100 hover:shadow-lg'}`}>
                  <div className="flex items-center gap-5 text-left">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-md ${t.is_weight_based ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {t.is_weight_based ? <Calculator className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">{t.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-xs font-bold text-primary italic">{t.price.toLocaleString()} FCFA</span>
                         <Badge className="bg-slate-100 text-slate-400 border-none text-[8px] font-black h-4 px-1.5">{t.is_weight_based ? 'Poids' : 'Unité'}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => {setEditingId(t.id); setNewItem({label:t.label, price:t.price.toString(), is_weight_based:t.is_weight_based})}} className="text-slate-200 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all">
                        <Edit3 size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteTariff(t.id)} className="text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
                        <Trash2 size={18} />
                    </Button>
                  </div>
               </div>
             ))}
             {tariffs.length === 0 && <div className="p-20 text-center border-2 border-dashed rounded-[3rem] text-slate-300 font-bold uppercase tracking-widest text-[10px]">Aucun tarif enregistré</div>}
          </div>
        </div>
      </Tabs>
    </div>
  );
}