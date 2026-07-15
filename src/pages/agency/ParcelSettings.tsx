"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Plus, Trash2, RefreshCw, Settings, Info, Calculator } from 'lucide-react';
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
    if (!newItem.label || !newItem.price) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
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
      toast.success("Nouveau tarif enregistré");
    }
  };

  const deleteTariff = async (id: string) => {
    const { error } = await supabase.from('company_parcel_tariffs').delete().eq('id', id);
    if (!error) {
      setTariffs(tariffs.filter(t => t.id !== id));
      toast.success("Tarif supprimé");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Chargement de la grille tarifaire...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20 text-left">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Tarification Fret</h1>
            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest">Gestion des colis & marchandises</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadTariffs} className="rounded-xl border-2 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
        </Button>
      </header>

      <Tabs defaultValue="flat" className="w-full">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl mb-8 h-14 flex w-full md:w-fit">
          <TabsTrigger value="flat" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            <Package className="h-4 w-4 mr-2"/> Articles Forfaitaires
          </TabsTrigger>
          <TabsTrigger value="weight" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            <Calculator className="h-4 w-4 mr-2"/> Facturation au Poids
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* FORMULAIRE AJOUT */}
          <div className="lg:col-span-5">
            <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-100 sticky top-24">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" /> 
                Nouveau Tarif
              </h3>
              
              <TabsContent value="flat" className="m-0 space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500 ml-1">Nom de l'article</Label>
                  <Input placeholder="Ex: Enveloppe A4, Petit Carton..." className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500 ml-1">Prix Fixe (FCFA)</Label>
                  <Input type="number" placeholder="0" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold text-lg" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
                <Button onClick={() => addTariff(false)} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-lg shadow-emerald-100 mt-2">
                  Ajouter à la liste
                </Button>
              </TabsContent>

              <TabsContent value="weight" className="m-0 space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500 ml-1">Désignation marchandise</Label>
                  <Input placeholder="Ex: Sac de ciment, Farine..." className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500 ml-1">Prix par Kilo (FCFA)</Label>
                  <Input type="number" placeholder="0" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold text-lg" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
                <Button onClick={() => addTariff(true)} className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold shadow-lg shadow-blue-100 mt-2">
                  Activer ce tarif au kg
                </Button>
              </TabsContent>
            </div>
          </div>

          {/* LISTE DES TARIFS */}
          <div className="lg:col-span-7 space-y-4">
            <TabsContent value="flat" className="m-0 space-y-4">
               {tariffs.filter(t => !t.is_weight_based).length === 0 ? (
                 <EmptyState message="Aucun article forfaitaire enregistré" />
               ) : (
                 tariffs.filter(t => !t.is_weight_based).map(t => (
                   <TariffCard key={t.id} t={t} onDelete={deleteTariff} />
                 ))
               )}
            </TabsContent>

            <TabsContent value="weight" className="m-0 space-y-4">
               {tariffs.filter(t => t.is_weight_based).length === 0 ? (
                 <EmptyState message="Aucun tarif au poids enregistré" />
               ) : (
                 tariffs.filter(t => t.is_weight_based).map(t => (
                   <TariffCard key={t.id} t={t} onDelete={deleteTariff} suffix="/ Kg" />
                 ))
               )}
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function TariffCard({ t, onDelete, suffix = "" }: any) {
  return (
    <div className="group flex items-center justify-between bg-white border-2 border-slate-50 p-5 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-emerald-100 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${t.is_weight_based ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {t.is_weight_based ? <Settings className="h-5 w-5" /> : <Package className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-bold text-slate-800 text-lg leading-tight">{t.label}</p>
          <div className="flex items-center gap-2 mt-1">
             <Badge variant="secondary" className="bg-slate-100 text-[10px] uppercase font-black tracking-tighter">
               {t.is_weight_based ? 'Tarif Poids' : 'Forfait'}
             </Badge>
             <span className="text-sm font-black text-emerald-600 tracking-tight">
               {t.price.toLocaleString()} FCFA{suffix}
             </span>
          </div>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onDelete(t.id)} 
        className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-2 border-dashed border-slate-200 rounded-[2rem] py-12 flex flex-col items-center text-muted-foreground bg-slate-50/50">
      <Info className="h-10 w-10 mb-3 opacity-20" />
      <p className="text-sm font-medium italic">{message}</p>
    </div>
  )
}