"use client"

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Users, ArrowRight, ChevronLeft, ChevronRight, Ship, Train, Bus, Save, RefreshCw, Hash, MapPin, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

type TripStop = {
  cityId: string;
  cityName?: string;
  arrivalTime: string;
  priceFromStart: number;
};

type Departure = {
  id: string;
  departureCode: string;
  registration: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  vipPrice: number;
  businessPrice: number;
  totalSeats: number;
  bookingCount: number;
  status: string;
  type: string;
  stops: TripStop[];
};

export default function AgencyDepartures() {
  const { user } = useAuth();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [cities, setCities] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [stops, setStops] = useState<TripStop[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form states
  const [routeId, setRouteId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [depDate, setDepDate] = useState('');
  const [depTime, setDepTime] = useState('');
  const [arrTime, setArrTime] = useState('');
  const [price, setPrice] = useState('');
  const [vipPrice, setVipPrice] = useState('');
  const [businessPrice, setBusinessPrice] = useState('');
  const [status, setStatus] = useState('');

  // VERIFICATION DES ROLES
  const isBoardingAgent = user?.role === 'Agent Embarquement';
  const canEdit = user?.role === 'Agent' || user?.role === 'Administrateur';

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data: citiesData } = await supabase.from('cities').select('id, name').order('name');
      if (citiesData) setCities(citiesData);

      const { data: tripsData } = await supabase
        .from('trips')
        .select(`
          *, 
          from:cities!from_id(name), 
          to:cities!to_id(name), 
          vehicle:vehicles(registration),
          trip_stops(city_id, arrival_time, price_from_start, stop_order, cities(name))
        `)
        .eq('company_id', user.companyId)
        .order('departure_date', { ascending: true });

      setDepartures((tripsData || []).map(t => ({
        id: t.id,
        departureCode: t.vehicle_number,
        registration: t.vehicle?.registration || '—',
        departureCity: t.from?.name || 'Inconnu',
        arrivalCity: t.to?.name || 'Inconnu',
        departureDate: t.departure_date,
        departureTime: t.departure_time,
        arrivalTime: t.arrival_time,
        price: Number(t.price) || 0,
        vipPrice: Number(t.class_vip_price) || 0,
        businessPrice: Number(t.class_business_price) || 0,
        totalSeats: t.seats_total || 0,
        bookingCount: (t.seats_total || 0) - (t.seats_left || 0),
        status: t.status || 'Programmé',
        type: t.type,
        stops: (t.trip_stops || []).map((s: any) => ({
            cityId: s.city_id,
            cityName: s.cities?.name || 'Escale',
            arrivalTime: s.arrival_time || '--:--',
            priceFromStart: Number(s.price_from_start) || 0,
            stop_order: s.stop_order
        })).sort((a:any, b:any) => a.stop_order - b.stop_order)
      })));

      const { data: rD } = await supabase.from('routes').select('*');
      if (rD) setRoutes(rD);
      
      const { data: vD } = await supabase.from('vehicles').select('*').eq('company_id', user.companyId);
      if (vD) setVehicles(vD);

    } catch (e) { toast.error('Erreur réseau'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleSave = async () => {
    if (!user?.companyId) return;
    setSaving(true);
    try {
      const tripData = {
        departure_date: depDate,
        departure_time: depTime,
        arrival_time: arrTime || null,
        price: Number(price) || 0,
        class_vip_price: vipPrice ? Number(vipPrice) : null,
        class_business_price: businessPrice ? Number(businessPrice) : null,
        status: status || 'Programmé',
        duration_min: 0
      };

      let tripId = editId;

      if (editId) {
        await supabase.from('trips').update(tripData).eq('id', editId);
        await supabase.from('trip_stops').delete().eq('trip_id', editId);
      } else {
        const route = routes.find(r => r.id === routeId);
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const { data: fC } = await supabase.from('cities').select('id').ilike('name', route!.departure_city).single();
        const { data: tC } = await supabase.from('cities').select('id').ilike('name', route!.arrival_city).single();

        const { data: newTrip, error: tripErr } = await supabase.from('trips').insert([{
          ...tripData,
          company_id: user.companyId,
          type: vehicle!.type,
          vehicle_number: vehicle!.name,
          vehicle_id: vehicle!.id,
          from_id: fC!.id,
          to_id: tC!.id,
          seats_total: vehicle!.capacity,
          seats_left: vehicle!.capacity,
        }]).select().single();

        if (tripErr) throw tripErr;
        tripId = newTrip.id;
      }

      const validStops = stops.filter(s => s.cityId && s.cityId !== "");
      if (validStops.length > 0 && tripId) {
        const stopsToInsert = validStops.map((s, index) => ({
          trip_id: tripId,
          city_id: s.cityId,
          arrival_time: s.arrivalTime || null, 
          price_from_start: Number(s.priceFromStart) || 0,
          stop_order: index + 1
        }));
        await supabase.from('trip_stops').insert(stopsToInsert);
      }

      setShowForm(false);
      loadData();
      toast.success('Voyage enregistré');
    } catch (e: any) { toast.error("Erreur de sauvegarde"); }
    finally { setSaving(false); }
  };

  const currentItems = useMemo(() => departures.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [departures, currentPage]);
  const totalPages = Math.ceil(departures.length / itemsPerPage);

  const addStop = () => setStops([...stops, { cityId: '', arrivalTime: '', priceFromStart: 0 }]);
  const removeStop = (idx: number) => setStops(stops.filter((_, i) => i !== idx));
  const updateStop = (idx: number, field: keyof TripStop, val: any) => {
    const newStops = [...stops];
    (newStops[idx] as any)[field] = val;
    setStops(newStops);
  };

  const openEdit = (dep: Departure) => {
    setEditId(dep.id); setDepDate(dep.departureDate); setDepTime(dep.departureTime);
    setArrTime(dep.arrivalTime || ''); setPrice(String(dep.price)); setVipPrice(String(dep.vipPrice));
    setBusinessPrice(String(dep.businessPrice)); setStops(dep.stops || []); setStatus(dep.status); setShowForm(true);
  };

  const resetForm = () => {
    setEditId(null); setRouteId(''); setVehicleId(''); setDepDate(''); setDepTime(''); setArrTime('');
    setPrice(''); setVipPrice(''); setBusinessPrice(''); setStops([]); setStatus('');
  };

  if (loading && departures.length === 0) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48"/><Skeleton className="h-64 w-full"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter flex items-center gap-3">
             <Clock className="text-primary h-8 w-8" /> Gestion départs
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic">Planning des voyages agence</p>
        </div>
        {canEdit && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-2xl font-black gap-2 h-12 px-6 shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest text-xs">
            <Plus size={20} /> Nouveau Départ
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {currentItems.map(dep => (
          <div key={dep.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 hover:shadow-xl transition-all group overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              
              <div className="flex items-center gap-5 flex-1 w-full text-left">
                <div className={`h-16 w-16 rounded-3xl flex items-center justify-center text-white shadow-lg shrink-0 ${dep.type === 'BOAT' ? 'bg-blue-600' : dep.type === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'}`}>
                  {dep.type === 'BOAT' ? <Ship size={28} /> : dep.type === 'TRAIN' ? <Train size={28} /> : <Bus size={28} />}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2 font-black text-xl text-slate-900 uppercase tracking-tighter truncate">
                    {dep.departureCity} <ArrowRight size={18} className="text-primary opacity-30" /> {dep.arrivalCity}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <span className="text-primary font-black px-2 py-0.5 bg-primary/5 rounded border border-primary/10 text-[10px] uppercase tracking-widest">{dep.registration}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(dep.departureDate).toLocaleDateString('fr-FR')} • {dep.departureTime}</span>
                    <StatusBadge status={dep.status} />
                  </div>
                </div>
              </div>

              {/* SECTION ACTIONS - FIXÉ POUR ÊTRE TOUJOURS VISIBLE */}
              <div className="flex items-center justify-between w-full lg:w-auto gap-6 border-t lg:border-none pt-4 lg:pt-0">
                 <div className="text-left lg:text-right">
                    <p className="font-black text-primary text-2xl leading-none">{dep.price.toLocaleString()} F</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-tighter">{dep.bookingCount}/{dep.totalSeats} PLACES RÉSERVÉES</p>
                 </div>
                 
                 <div className="flex items-center gap-2">
                    {/* BOUTON MANIFESTE : Toujours visible pour le personnel */}
                    <Link to={`/agency/passengers/${dep.id}`}>
                        <Button variant="outline" className="h-11 rounded-xl border-2 font-black text-[10px] uppercase gap-2 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">
                            <Users size={16} /> <span className="hidden sm:inline">Manifeste</span>
                        </Button>
                    </Link>

                    {/* BOUTON MODIFIER : Visible uniquement pour Agent/Admin */}
                    {canEdit && (
                        <Button variant="outline" onClick={() => openEdit(dep)} className="h-11 w-11 rounded-xl border-2 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all p-0 shadow-sm">
                            <Pencil size={18} />
                        </Button>
                    )}

                    {canEdit && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="h-11 w-11 rounded-xl border-2 text-red-300 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all p-0 shadow-sm">
                                    <Trash2 size={18} />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="font-black italic text-xl uppercase">Annuler le voyage ?</AlertDialogTitle>
                                    <AlertDialogDescription className="font-medium text-slate-600">Cette action retirera le voyage de la vente et des manifestes.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl font-bold">RETOUR</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => supabase.from('trips').delete().eq('id', dep.id).then(()=>loadData())} className="bg-red-600 rounded-xl font-bold uppercase text-white">SUPPRIMER</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                 </div>
              </div>
            </div>

            {/* ESCALES DANS LA LISTE */}
            {dep.stops.length > 0 && (
              <div className="mt-6 pt-5 border-t border-dashed border-slate-100 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {dep.stops.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 shrink-0 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
                    <MapPin size={12} className="text-primary" />
                    <div className="leading-tight text-left">
                      <p className="text-[10px] font-black uppercase text-slate-900">{s.cityName}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">{s.arrivalTime} • {s.priceFromStart.toLocaleString()}F</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-white p-2 rounded-2xl border-2 w-fit mx-auto shadow-sm">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border hover:bg-slate-50 transition-all"><ChevronLeft size={18}/></Button>
          <div className="flex items-center gap-1 font-black text-[10px] uppercase text-slate-400 px-4">
             <span className="text-primary">Page {currentPage}</span>
             <span>/</span>
             <span>{totalPages}</span>
          </div>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border hover:bg-slate-50 transition-all"><ChevronRight size={18}/></Button>
        </div>
      )}

      {/* DIALOG FORMULAIRE */}
      <Dialog open={showForm} onOpenChange={(o) => { if(!o) resetForm(); setShowForm(o); }}>
        <DialogContent className="rounded-[2.5rem] p-10 max-w-2xl border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-left">{editId ? 'Modifier' : 'Programmer'} Voyage</DialogTitle></DialogHeader>
          
          <div className="space-y-8 mt-8">
            {!editId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Itinéraire Autorisé</Label>
                        <Select value={routeId} onValueChange={setRouteId}>
                            <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-black text-xs px-6 shadow-inner focus:ring-primary"><SelectValue placeholder="Choisir trajet" /></SelectTrigger>
                            <SelectContent className="rounded-2xl shadow-2xl">
                                {routes.map(r => <SelectItem key={r.id} value={r.id} className="font-bold">{r.departure_city} → {r.arrival_city}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Matériel Roulant</Label>
                        <Select value={vehicleId} onValueChange={setVehicleId}>
                            <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-black text-xs px-6 shadow-inner focus:ring-primary"><SelectValue placeholder="Choisir véhicule" /></SelectTrigger>
                            <SelectContent className="rounded-2xl shadow-2xl">
                                {vehicles.map(v => <SelectItem key={v.id} value={v.id} className="font-bold">{v.name} ({v.capacity} pl.)</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <div className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase flex items-center gap-2 text-slate-900 italic tracking-widest"><Clock size={16} className="text-primary"/> Escales intermédiaires</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addStop} className="h-9 rounded-xl font-black border-2 text-[9px] px-4 bg-white shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all">
                    <Plus size={14} className="mr-1" /> AJOUTER ARRÊT
                  </Button>
               </div>
               <div className="space-y-4">
                  {stops.map((stop, index) => (
                    <div key={index} className="grid grid-cols-[1.5fr_1fr_1fr_45px] gap-3 items-end animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-1.5 text-left text-slate-900">
                        <Select value={stop.cityId} onValueChange={(v) => updateStop(index, 'cityId', v)}>
                          <SelectTrigger className="h-11 rounded-xl bg-white border-none text-[10px] font-black uppercase shadow-sm px-4"><SelectValue placeholder="Ville" /></SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">{cities.map(c => <SelectItem key={c.id} value={c.id} className="font-bold text-xs">{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Input type="time" value={stop.arrivalTime} onChange={e => updateStop(index, 'arrivalTime', e.target.value)} className="h-11 rounded-xl border-none shadow-sm font-black text-xs bg-white text-center" />
                      <Input type="number" placeholder="Prix" value={stop.priceFromStart} onChange={e => updateStop(index, 'priceFromStart', e.target.value)} className="h-11 rounded-xl border-none shadow-sm font-black text-xs bg-white text-center" />
                      <Button variant="ghost" size="icon" onClick={() => removeStop(index)} className="h-11 w-11 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={20}/></Button>
                    </div>
                  ))}
                  {stops.length === 0 && <p className="text-[10px] text-center text-slate-400 font-bold uppercase italic py-6 tracking-widest opacity-60">Aucune escale configurée</p>}
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-dashed border-slate-100 pt-8">
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Tarif Standard / 2ème Cl.</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-black text-primary text-xl px-6 shadow-inner" />
              </div>
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Date du départ</Label>
                <Input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-black text-sm px-6 shadow-inner" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1 italic">Heure de départ</Label>
                    <Input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-black px-6 shadow-inner" />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1 italic">Arrivée au Terminus</Label>
                    <Input type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-black px-6 shadow-inner text-slate-400" />
                </div>
            </div>

            {(currentVehicleType === 'BOAT' || currentVehicleType === 'TRAIN') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10 animate-in zoom-in-95 text-left">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary ml-1">{currentVehicleType === 'TRAIN' ? 'Tarif 1ère Classe' : 'Tarif Business'}</Label>
                  <Input type="number" value={businessPrice} onChange={e => setBusinessPrice(e.target.value)} className="h-12 rounded-xl bg-white border-primary/10 font-black text-primary px-5 shadow-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary ml-1">Tarif Prestige / VIP</Label>
                  <Input type="number" value={vipPrice} onChange={e => setVipPrice(e.target.value)} className="h-12 rounded-xl bg-white border-primary/10 font-black text-primary px-5 shadow-sm" />
                </div>
              </div>
            )}

            {editId && (
              <div className="space-y-2 text-left border-t border-dashed border-slate-100 pt-6">
                <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Statut du voyage</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-black px-6 shadow-inner"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-2xl">
                    {['Programmé', 'Embarquement', 'Parti', 'Arrivé', 'Annulé'].map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest active:scale-95 transition-all mt-4 bg-primary text-white">
              {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : <Save className="mr-3 h-6 w-6" />}
              {editId ? 'METTRE À JOUR LE TRAJET' : 'VALIDER LA PROGRAMMATION'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
      'Programmé': 'bg-blue-50 text-blue-600 border-blue-100',
      'Embarquement': 'bg-orange-50 text-orange-600 border-orange-100',
      'Parti': 'bg-emerald-50 text-emerald-600 border-emerald-100',
      'Arrivé': 'bg-slate-50 text-slate-600 border-slate-200',
      'Annulé': 'bg-red-50 text-red-600 border-red-100',
    };
    return <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase border-2 ${colors[status] || 'bg-muted'}`}>{status}</span>;
}