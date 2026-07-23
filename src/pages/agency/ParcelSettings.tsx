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
  Scale,
  Plane // AJOUT DE L'ICÔNE AVION
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
    <div className="flex flex-col items-center justify-center p-20 gap-4 bg-background min-h-screen">
      <RefreshCw className="animate-spin h-10 w-10 text-primary" />
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">Chargement des grilles...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto w-full p-2 sm:p-4 pb-20 space-y-6 sm:space-y-8 text-left animate-in fade-in duration-500 bg-background text-foreground">
      
      {/* HEADER PROFESSIONNEL SOMBRE */}
      <header className="flex items-center gap-3 sm:gap-4 bg-card p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-border shadow-2xl w-full">
        <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl border border-primary/20 text-primary shrink-0">
          <Scale className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter text-white uppercase leading-none truncate">Grille Tarifaire Fret</h1>
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Configuration des prix colis & fret</p>
        </div>
      </header>

      <Tabs defaultValue="flat" className="w-full space-y-6">
        <TabsList className="bg-slate-900 border-2 border-border p-1 sm:p-1.5 rounded-xl sm:rounded-2xl h-12 sm:h-14 flex w-full shadow-inner">
          <TabsTrigger 
            value="flat" 
            className="flex-1 rounded-lg sm:rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest transition-all data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 data-[state=active]:shadow-lg"
            onClick={() => { setEditingId(null); setNewItem({label:'', price:'', is_weight_based:false}) }}
          >
            <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2"/> Forfaits
          </TabsTrigger>
          <TabsTrigger 
            value="weight" 
            className="flex-1 rounded-lg sm:rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest transition-all data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400 data-[state=active]:shadow-lg"
            onClick={() => { setEditingId(null); setNewItem({label:'', price:'', is_weight_based:true}) }}
          >
            <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2"/> Prix KG
          </TabsTrigger>
        </TabsList>

        {/* ZONE DE SAISIE SOMBRE */}
        <div className={`bg-card border-2 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.4)] transition-all duration-300 ${editingId ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}>
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3 className="text-[9px] sm:text-[10px] font-black uppercase flex items-center gap-2 text-slate-500 tracking-widest">
              {editingId ? <Edit3 size={14} className="text-amber-500" /> : <Plus size={14} className="text-primary" />}
              {editingId ? "Modification du tarif" : "Nouveau paramètre"}
            </h3>
            {editingId && (
              <button onClick={() => { setEditingId(null); setNewItem({label:'', price:'', is_weight_based:false}) }} className="text-[8px] sm:text-[9px] font-black text-red-400 uppercase flex items-center gap-1 hover:text-red-300 transition-colors">
                <X size={12}/> Annuler
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-5 text-left">
            <div className="sm:col-span-7 space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Désignation de la marchandise</Label>
                <Input 
                  placeholder={newItem.is_weight_based ? "Ex: Sac de riz, Ciment..." : "Ex: Enveloppe, Petit Carton..."} 
                  className="h-11 sm:h-12 rounded-xl bg-slate-950 border-none px-4 sm:px-5 text-sm font-bold text-white shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50" 
                  value={newItem.label} 
                  onChange={e => setNewItem({...newItem, label: e.target.value})} 
                />
            </div>
            <div className="sm:col-span-3 space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Prix (FCFA)</Label>
                <Input 
                  type="number" 
                  className="h-11 sm:h-12 rounded-xl bg-slate-950 border-none px-4 sm:px-5 font-black text-lg text-primary shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50" 
                  value={newItem.price} 
                  onChange={e => setNewItem({...newItem, price: e.target.value})} 
                />
            </div>
            <div className="sm:col-span-2 flex items-end">
                <Button 
                  onClick={() => handleSave(newItem.is_weight_based)} 
                  className={`w-full h-11 sm:h-12 rounded-xl font-black shadow-lg transition-all active:scale-95 border-none ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'} text-white`}
                >
                    {editingId ? <Save size={18}/> : <Plus size={18}/>}
                </Button>
            </div>
          </div>
        </div>

        {/* LISTE DES TARIFS ACTIFS SOMBRE */}
        <div className="space-y-4 w-full">
          <div className="flex items-center justify-between px-2 sm:px-6">
             <h3 className="font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-slate-500 italic">Tarifs actifs</h3>
             <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-800 text-slate-600">{tariffs.length} Tarifs</Badge>
          </div>
          
          <div className="space-y-3 w-full">
             {tariffs.map(t => (
               <div key={t.id} className={`flex items-center justify-between p-3 sm:p-5 rounded-[1.5rem] sm:rounded-[2.2rem] border-2 transition-all group w-full ${editingId === t.id ? 'bg-amber-500/5 border-amber-500/30 shadow-inner' : 'bg-slate-900 border-border hover:shadow-2xl hover:border-primary/20'}`}>
                  <div className="flex items-center gap-3 sm:gap-5 text-left overflow-hidden min-w-0">
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${t.is_weight_based ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {t.is_weight_based ? <Calculator className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="font-black text-white text-sm sm:text-base leading-tight uppercase tracking-tight truncate">{t.label}</p>
                      <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                         <span className="text-xs sm:text-sm font-black text-primary tracking-tighter">{t.price.toLocaleString()} F</span>
                         <Badge variant="outline" className={`border-none text-[6px] sm:text-[7px] font-black h-4 px-1.5 uppercase ${t.is_weight_based ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                            {t.is_weight_based ? 'par KG' : 'unité'}
                         </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-0.5 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setEditingId(t.id); 
                        setNewItem({label:t.label, price:t.price.toString(), is_weight_based:t.is_weight_based})
                      }} 
                      className="text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 rounded-full h-8 w-8 sm:h-9 sm:w-9"
                    >
                        <Edit3 size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteTariff(t.id)} 
                      className="text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-full h-8 w-8 sm:h-9 sm:w-9"
                    >
                        <Trash2 size={16} />
                    </Button>
                  </div>
               </div>
             ))}
             
             {tariffs.length === 0 && !loading && (
               <div className="p-10 sm:p-20 text-center border-2 border-dashed border-border rounded-[2rem] sm:rounded-[3rem] bg-slate-900/40">
                  <div className="relative mx-auto h-12 w-12 mb-4 text-slate-700 opacity-20">
                    <Truck className="absolute inset-0 h-full w-full" />
                    <Plane className="absolute inset-0 h-full w-full rotate-45 translate-x-2" />
                  </div>
                  <p className="text-slate-600 font-bold uppercase tracking-widest text-[8px] sm:text-[9px] italic leading-none">Aucun tarif fret enregistré</p>
               </div>
             )}
          </div>
        </div>
      </Tabs>

      <footer className="text-center pt-4 opacity-10">
          <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.4em] text-white">TransGabon Connect • Configuration Fret</p>
      </footer>
    </div>
  );
}