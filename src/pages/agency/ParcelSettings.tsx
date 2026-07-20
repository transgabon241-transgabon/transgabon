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
  X,
  Edit3,
  Scale
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
    try {
      const { data, error } = await supabase
        .from('company_parcel_tariffs')
        .select('*')
        .eq('company_id', user?.companyId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (data) setTariffs(data);
    } catch (e) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isWeight: boolean) => {
    if (!newItem.label || !newItem.price) return toast.error("Champs incomplets");
    
    const payload = {
      company_id: user?.companyId,
      label: newItem.label.trim(),
      price: parseFloat(newItem.price),
      is_weight_based: isWeight
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('company_parcel_tariffs')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success("Tarif mis à jour");
      } else {
        const { data, error } = await supabase
          .from('company_parcel_tariffs')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        setTariffs([...tariffs, data]);
        toast.success("Nouveau tarif ajouté");
      }
      setNewItem({ label: '', price: '', is_weight_based: false });
      setEditingId(null);
      loadTariffs();
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const deleteTariff = async (id: string) => {
    const { error } = await supabase.from('company_parcel_tariffs').delete().eq('id', id);
    if (!error) {
      setTariffs(tariffs.filter(t => t.id !== id));
      toast.success("Tarif supprimé");
    } else {
      toast.error("Suppression impossible");
    }
  };

  if (loading && tariffs.length === 0) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <RefreshCw className="animate-spin h-10 w-10 text-emerald-500" />
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Chargement des grilles...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto w-full p-4 pb-20 space-y-8 text-left animate-in fade-in duration-500">
      
      {/* HEADER PROFESSIONNEL */}
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm w-full">
        <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100 text-white">
          <Scale className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">Grille Tarifaire Fret</h1>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Configuration des prix colis & marchandises</p>
        </div>
      </header>

      <Tabs defaultValue="flat" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-14 flex w-full border-2 border-white shadow-sm">
          <TabsTrigger 
            value="flat" 
            className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm"
            onClick={() => { setEditingId(null); setNewItem({label:'', price:'', is_weight_based:false}) }}
          >
            <Package className="h-4 w-4 mr-2"/> Forfaits Fixes
          </TabsTrigger>
          <TabsTrigger 
            value="weight" 
            className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
            onClick={() => { setEditingId(null); setNewItem({label:'', price:'', is_weight_based:true}) }}
          >
            <Calculator className="h-4 w-4 mr-2"/> Prix au KG
          </TabsTrigger>
        </TabsList>

        {/* ZONE DE SAISIE */}
        <div className={`bg-white border-2 rounded-[2.5rem] p-8 shadow-xl transition-all duration-300 ${editingId ? 'border-amber-200 bg-amber-50/5' : 'border-slate-100 shadow-slate-200/50'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase flex items-center gap-2 text-slate-400 tracking-[0.2em]">
              {editingId ? <Edit3 size={14} className="text-amber-500" /> : <Plus size={14} className="text-emerald-500" />}
              {editingId ? "Modification du tarif" : "Nouveau paramètre"}
            </h3>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setNewItem({label:'', price:'', is_weight_based:false}) }} className="text-[9px] font-black text-red-500 uppercase h-7 gap-1 hover:bg-red-50 rounded-lg">
                <X size={12}/> Annuler
              </Button>
            )}
          </div>
          
          {/* Contenu commun pour les deux onglets mais avec des labels adaptés */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
            <div className="sm:col-span-7 space-y-1.5 text-left">
                <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Désignation du colis / marchandise</Label>
                <Input 
                  placeholder={newItem.is_weight_based ? "Ex: Sac de riz, Ciment..." : "Ex: Enveloppe, Petit Carton..."} 
                  className="h-12 rounded-xl bg-white border-2 border-slate-100 px-5 text-sm font-bold focus:border-primary transition-all shadow-inner" 
                  value={newItem.label} 
                  onChange={e => setNewItem({...newItem, label: e.target.value})} 
                />
            </div>
            <div className="sm:col-span-3 space-y-1.5 text-left">
                <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Prix (FCFA)</Label>
                <Input 
                  type="number" 
                  className="h-12 rounded-xl bg-white border-2 border-slate-100 px-5 font-black text-lg text-slate-900 focus:border-primary transition-all shadow-inner" 
                  value={newItem.price} 
                  onChange={e => setNewItem({...newItem, price: e.target.value})} 
                />
            </div>
            <div className="sm:col-span-2 flex items-end">
                <Button 
                  onClick={() => handleSave(newItem.is_weight_based)} 
                  className={`w-full h-12 rounded-xl font-black shadow-lg transition-all active:scale-95 ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-black text-white'}`}
                >
                    {editingId ? <Save size={18}/> : <Plus size={18}/>}
                </Button>
            </div>
          </div>
        </div>

        {/* LISTE DES TARIFS ACTIFS */}
        <div className="space-y-4 w-full">
          <div className="flex items-center justify-between px-6">
             <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 italic">Tarifs actifs en agence</h3>
             <Badge variant="outline" className="text-[8px] font-black uppercase">{tariffs.length} Tarifs</Badge>
          </div>
          
          <div className="space-y-3 w-full">
             {tariffs.map(t => (
               <div key={t.id} className={`flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all group w-full ${editingId === t.id ? 'bg-amber-50 border-amber-200 shadow-inner scale-[0.98]' : 'bg-white border-slate-100 hover:shadow-xl hover:border-emerald-100'}`}>
                  <div className="flex items-center gap-5 text-left">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${t.is_weight_based ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {t.is_weight_based ? <Calculator className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-base leading-tight uppercase tracking-tight">{t.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-sm font-black text-primary tracking-tighter">{t.price.toLocaleString()} F</span>
                         <Badge className={`border-none text-[7px] font-black h-4 px-1.5 uppercase ${t.is_weight_based ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {t.is_weight_based ? 'par KG' : 'à l’unité'}
                         </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setEditingId(t.id); 
                        setNewItem({label:t.label, price:t.price.toString(), is_weight_based:t.is_weight_based})
                      }} 
                      className="text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-full h-9 w-9"
                    >
                        <Edit3 size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteTariff(t.id)} 
                      className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full h-9 w-9"
                    >
                        <Trash2 size={16} />
                    </Button>
                  </div>
               </div>
             ))}
             
             {tariffs.length === 0 && !loading && (
               <div className="p-20 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50">
                  <Truck className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Aucun tarif fret enregistré</p>
               </div>
             )}
          </div>
        </div>
      </Tabs>

      <footer className="text-center pt-4 opacity-30">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">TransGabon Connect • Configuration Logistique</p>
      </footer>
    </div>
  );
}