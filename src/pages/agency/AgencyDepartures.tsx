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
import { Badge } from '@/components/ui/badge';

type TripStop = {
  cityId: string;
  cityName?: string;
  arrivalTime: string;
  priceFromStart: number;
  stop_order?: number;
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

type Route = { id: string; departure_city: string; arrival_city: string; };
type Vehicle = { id: string; name: string; type: string; capacity: number; };

export default function AgencyDepartures() {
  const { user } = useAuth();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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

  const canEdit = user?.role === 'Agent' || user?.role === 'Administrateur';

  // CALCUL DYNAMIQUE DU TYPE DE VEHICULE
  const currentVehicleType = useMemo(() => {
    if (editId) {
      return departures.find(d => d.id === editId)?.type;
    }
    return vehicles.find(v => v.id === vehicleId)?.type;
  }, [editId, vehicleId, departures, vehicles]);

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
        const { error: tripErr } = await supabase.from('trips').update(tripData).eq('id', editId);
        if (tripErr) throw tripErr;
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
      resetForm();
      await loadData();
      toast.success('Voyage enregistré');
    } catch (e: any) { 
      console.error(e);
      toast.error(e.message || "Erreur sauvegarde"); 
    }
    finally { setSaving(false); }
  };

  const resetForm = () => {
    setEditId(null); setRouteId(''); setVehicleId(''); setDepDate(''); setDepTime(''); setArrTime('');
    setPrice(''); setVipPrice(''); setBusinessPrice(''); setStops([]); setStatus('');
  };

  const openEdit = (dep: Departure) => {
    setEditId(dep.id); setDepDate(dep.departureDate); setDepTime(dep.departureTime);
    setArrTime(dep.arrivalTime || ''); setPrice(String(dep.price)); setVipPrice(String(dep.vipPrice));
    setBusinessPrice(String(dep.businessPrice)); setStops(dep.stops || []); setStatus(dep.status); setShowForm(true);
  };

  const addStop = () => setStops([...stops, { cityId: '', arrivalTime: '', priceFromStart: 0 }]);
  const removeStop = (idx: number) => setStops(stops.filter((_, i) => i !== idx));
  const updateStop = (idx: number, field: keyof TripStop, val: any) => {
    const newStops = [...stops];
    (newStops[idx] as any)[field] = val;
    setStops(newStops);
  };

  const currentItems = useMemo(() => departures.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [departures, currentPage]);
  const totalPages = Math.ceil(departures.length / itemsPerPage);

  if (loading && departures.length === 0) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48"/><Skeleton className="h-64 w-full"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-10 animate-in fade-in duration-500">
      
      {/* HEADER HAUTE VISIBILITÉ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black italic text-slate-900 uppercase tracking-tighter flex items-center gap-3 leading-none">
             <Clock className="text-primary h-10 w-10" /> Gestion départs
          </h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-2 italic">Planning des voyages et escales</p>
        </div>
        {canEdit && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="lg" className="rounded-[1.5rem] font-black gap-3 h-20 px-10 shadow-2xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest">
            <Plus size={28} /> Nouveau Départ
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {currentItems.map(dep => {
          const TransportIcon = dep.type === 'BOAT' ? Ship : dep.type === 'TRAIN' ? Train : Bus;
          return (
            <div key={dep.id} className="bg-white border-2 border-slate-100 rounded-[3rem] p-8 hover:shadow-2xl transition-all group overflow-hidden">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                
                <div className="flex items-center gap-6 flex-1 w-full text-left">
                  <div className={`h-24 w-24 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shrink-0 ${dep.type === 'BOAT' ? 'bg-blue-600' : dep.type === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'}`}>
                    <TransportIcon size={44} />
                  </div>
                  <div className="overflow-hidden text-left flex-1">
                    <div className="flex items-center gap-3 font-black text-2xl md:text-3xl text-slate-900 uppercase tracking-tighter truncate leading-none">
                      {dep.departureCity} <ArrowRight size={24} className="text-primary opacity-30" /> {dep.arrivalCity}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      <span className="text-primary font-black px-4 py-1.5 bg-primary/5 rounded-2xl border-2 border-primary/10 text-xs uppercase tracking-widest shadow-sm">{dep.registration}</span>
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{new Date(dep.departureDate).toLocaleDateString('fr-FR')} • {dep.departureTime}</span>
                      <StatusBadge status={dep.status} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full lg:w-auto gap-10 border-t lg:border-none pt-8 lg:pt-0">
                   <div className="text-left lg:text-right">
                      <p className="font-black text-primary text-4xl tracking-tighter">{(dep.price || 0).toLocaleString()} F</p>
                      <p className="text-xs font-black text-slate-400 uppercase mt-2 tracking-[0.2em]">{dep.bookingCount}/{dep.totalSeats} PLACES RÉSERVÉES</p>
                   </div>
                   
                   <div className="flex items-center gap-3">
                      <Link to={`/agency/passengers/${dep.id}`}>
                          <Button variant="outline" className="h-16 rounded-2xl border-2 font-black text-xs uppercase gap-3 px-8 shadow-sm">
                              <Users size={20} /> <span className="hidden sm:inline">Manifeste</span>
                          </Button>
                      </Link>

                      {canEdit && (
                          <>
                              <Button variant="outline" onClick={() => openEdit(dep)} className="h-16 w-16 rounded-2xl border-2 hover:bg-slate-900 hover:text-white p-0 shadow-sm transition-all">
                                  <Pencil size={24} />
                              </Button>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="outline" className="h-16 w-16 rounded-2xl border-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-0 shadow-sm transition-all">
                                          <Trash2 size={24} />
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-[3rem] border-none shadow-2xl p-12">
                                      <AlertDialogHeader>
                                          <AlertDialogTitle className="font-black italic text-4xl uppercase tracking-tighter leading-none">Annuler le voyage ?</AlertDialogTitle>
                                          <AlertDialogDescription className="text-lg font-medium mt-6">Cette action est irréversible et supprimera le trajet de la vente publique.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="mt-10 gap-4">
                                          <AlertDialogCancel className="rounded-2xl font-black h-16 px-8 uppercase tracking-widest text-xs">RETOUR</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => supabase.from('trips').delete().eq('id', dep.id).then(()=>loadData())} className="bg-red-600 rounded-2xl font-black h-16 px-8 uppercase tracking-widest text-xs text-white">OUI, SUPPRIMER</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </>
                      )}
                   </div>
                </div>
              </div>

              {/* ESCALES DANS LA LISTE : HAUTE DÉFINITION */}
              {dep.stops.length > 0 && (
                <div className="mt-10 pt-8 border-t-2 border-dashed border-slate-100 flex gap-5 overflow-x-auto pb-6 scrollbar-hide">
                  {dep.stops.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-4 shrink-0 bg-slate-50 px-6 py-4 rounded-[1.5rem] border-2 border-slate-100 shadow-sm">
                      <MapPin size={20} className="text-primary" />
                      <div className="leading-tight text-left">
                        <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{s.cityName}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{s.arrivalTime} • {(s.priceFromStart || 0).toLocaleString()}F</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PAGINATION XXL */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-8 mt-16 bg-white p-4 rounded-[2rem] border-2 border-slate-50 w-fit mx-auto shadow-2xl">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-2xl h-14 w-14 border-2 bg-white hover:bg-slate-50 transition-all"><ChevronLeft size={28}/></Button>
          <div className="flex items-center gap-3 font-black text-base uppercase tracking-widest text-slate-400 px-8">
             <span className="text-primary">Page {currentPage}</span>
             <span className="opacity-20 text-2xl">/</span>
             <span>{totalPages}</span>
          </div>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-2xl h-14 w-14 border-2 bg-white hover:bg-slate-50 transition-all"><ChevronRight size={28}/></Button>
        </div>
      )}

      {/* FORMULAIRE XXL */}
      <Dialog open={showForm} onOpenChange={(o) => { if(!o) resetForm(); setShowForm(o); }}>
        <DialogContent className="rounded-[3rem] p-12 max-w-2xl border-none shadow-2xl overflow-y-auto max-h-[95vh] animate-in zoom-in-95">
          <DialogHeader><DialogTitle className="text-4xl font-black italic uppercase tracking-tighter text-left leading-none text-slate-900 mb-8">{editId ? 'Modifier' : 'Programmer'} Voyage</DialogTitle></DialogHeader>
          
          <div className="space-y-10">
            {!editId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3 text-left">
                        <Label className="text-xs font-black uppercase text-slate-900 ml-4 tracking-[0.2em] opacity-70 italic">Itinéraire Autorisé</Label>
                        <Select value={routeId} onValueChange={setRouteId}>
                            <SelectTrigger className="h-20 rounded-[1.5rem] bg-slate-50 border-none font-black text-sm px-8 shadow-inner focus:ring-4 focus:ring-primary/20"><SelectValue placeholder="Choisir trajet" /></SelectTrigger>
                            <SelectContent className="rounded-[1.5rem] shadow-2xl border-none">
                                {routes.map(r => <SelectItem key={r.id} value={r.id} className="font-bold py-4 text-xs">{r.departure_city} ➔ {r.arrival_city}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-3 text-left">
                        <Label className="text-xs font-black uppercase text-slate-900 ml-4 tracking-[0.2em] opacity-70 italic">Matériel Roulant</Label>
                        <Select value={vehicleId} onValueChange={setVehicleId}>
                            <SelectTrigger className="h-20 rounded-[1.5rem] bg-slate-50 border-none font-black text-sm px-8 shadow-inner focus:ring-4 focus:ring-primary/20"><SelectValue placeholder="Choisir véhicule" /></SelectTrigger>
                            <SelectContent className="rounded-[1.5rem] shadow-2xl border-none">
                                {vehicles.map(v => <SelectItem key={v.id} value={v.id} className="font-bold py-4 text-xs">{v.name} ({v.capacity} pl.)</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* SECTION ESCALES INTERMÉDIAIRES XXL */}
            <div className="p-8 bg-slate-50 rounded-[3rem] border-2 border-slate-100 shadow-inner">
               <div className="flex justify-between items-center mb-8 px-2">
                  <h3 className="text-sm font-black uppercase flex items-center gap-3 text-slate-900 italic tracking-widest"><Clock size={24} className="text-primary"/> Escales intermédiaires</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addStop} className="h-11 rounded-xl font-black border-2 text-[10px] px-6 bg-white shadow-sm hover:scale-105 active:scale-95 uppercase tracking-widest">
                    <Plus size={18} className="mr-2" /> Ajouter Arrêt
                  </Button>
               </div>
               <div className="space-y-6">
                  {stops.map((stop, index) => (
                    <div key={index} className="grid grid-cols-[1.5fr_1fr_1fr_50px] gap-4 items-end animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-2 text-left">
                        <Select value={stop.cityId} onValueChange={(v) => updateStop(index, 'cityId', v)}>
                          <SelectTrigger className="h-14 rounded-xl bg-white border-none text-[10px] font-black uppercase shadow-sm px-5"><SelectValue placeholder="Ville" /></SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">{cities.map(c => <SelectItem key={c.id} value={c.id} className="font-bold text-xs py-3">{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Input type="time" value={stop.arrivalTime} onChange={e => updateStop(index, 'arrivalTime', e.target.value)} className="h-14 rounded-xl border-none shadow-sm font-black text-sm bg-white text-center" />
                      <Input type="number" placeholder="Prix" value={stop.priceFromStart} onChange={e => updateStop(index, 'priceFromStart', e.target.value)} className="h-14 rounded-xl border-none shadow-sm font-black text-sm bg-white text-center" />
                      <Button variant="ghost" size="icon" onClick={() => removeStop(index)} className="h-14 w-14 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"><X size={28}/></Button>
                    </div>
                  ))}
                  {stops.length === 0 && <p className="text-xs text-center text-slate-400 font-bold uppercase italic py-10 tracking-[0.3em] opacity-40">Aucune escale configurée</p>}
               </div>
            </div>

            {/* PRIX ET DATE : TRÈS IMPACTANT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 border-t border-dashed border-slate-100 pt-12 text-left">
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase text-slate-900 opacity-70 ml-4 tracking-[0.2em]">Tarif Standard / 2ème Cl.</Label>
                <div className="relative">
                    <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="h-20 rounded-[1.5rem] bg-slate-50 border-none font-black text-primary text-4xl px-8 shadow-inner focus:ring-4 focus:ring-primary/10" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-primary/20 text-2xl uppercase tracking-tighter">FCFA</span>
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase text-slate-900 opacity-70 ml-4 tracking-[0.2em]">Date du départ</Label>
                <Input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} className="h-20 rounded-[1.5rem] bg-slate-50 border-none font-black text-xl px-8 shadow-inner" />
              </div>
            </div>

            {/* HORAIRES XXL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 text-left">
                <div className="space-y-4">
                    <Label className="text-xs font-black uppercase text-slate-900 opacity-70 ml-4 italic tracking-[0.2em]">Heure Départ</Label>
                    <Input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} className="h-20 rounded-[1.5rem] bg-slate-50 border-none font-black text-3xl px-10 shadow-inner" />
                </div>
                <div className="space-y-4">
                    <Label className="text-xs font-black uppercase text-slate-900 opacity-70 ml-4 italic tracking-[0.2em]">Arrivée Terminus</Label>
                    <Input type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} className="h-20 rounded-[1.5rem] bg-slate-50 border-none font-black text-3xl px-10 shadow-inner text-slate-400" />
                </div>
            </div>

            {/* CLASSES SPÉCIFIQUES : DESIGN PREMIUM SOMBRE */}
            {(currentVehicleType === 'BOAT' || currentVehicleType === 'TRAIN') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-10 bg-slate-900 rounded-[3.5rem] shadow-2xl text-left animate-in zoom-in-95">
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase text-primary ml-6 tracking-widest">{currentVehicleType === 'TRAIN' ? 'Tarif 1ère Classe' : 'Tarif Business'}</Label>
                  <Input type="number" value={businessPrice} onChange={e => setBusinessPrice(e.target.value)} className="h-16 rounded-2xl bg-white/5 border-2 border-white/10 font-black text-white text-2xl px-8 shadow-inner" placeholder="0 F" />
                </div>
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase text-primary ml-6 tracking-widest">{currentVehicleType === 'TRAIN' ? 'Tarif Prestige' : 'Tarif Salon VIP'}</Label>
                  <Input type="number" value={vipPrice} onChange={e => setVipPrice(e.target.value)} className="h-16 rounded-2xl bg-white/5 border-2 border-white/10 font-black text-white text-2xl px-8 shadow-inner" placeholder="0 F" />
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full h-24 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-primary/20 uppercase tracking-[0.3em] active:scale-95 transition-all mt-8 bg-primary text-white border-b-8 border-primary-foreground/20">
              {saving ? <RefreshCw className="animate-spin h-10 w-10" /> : <Save className="mr-4 h-10 w-10" />}
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
    return <span className={`inline-block px-5 py-2 rounded-full text-[11px] font-black uppercase border-2 shadow-sm ${colors[status] || 'bg-muted'}`}>{status}</span>;
}