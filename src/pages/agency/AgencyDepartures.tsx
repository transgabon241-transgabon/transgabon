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
import { Plus, Pencil, Trash2, Users, ArrowRight, ChevronLeft, ChevronRight, Ship, Train, Bus, Plane, Save, RefreshCw, Hash, MapPin, Clock, X } from 'lucide-react';
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

  const currentVehicleType = useMemo(() => {
    if (editId) return departures.find(d => d.id === editId)?.type;
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
        departure_date: depDate, departure_time: depTime, arrival_time: arrTime || null,
        price: Number(price) || 0, class_vip_price: vipPrice ? Number(vipPrice) : null,
        class_business_price: businessPrice ? Number(businessPrice) : null,
        status: status || 'Programmé', duration_min: 0
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
          ...tripData, company_id: user.companyId, type: vehicle!.type,
          vehicle_number: vehicle!.name, vehicle_id: vehicle!.id,
          from_id: fC!.id, to_id: tC!.id, seats_total: vehicle!.capacity, seats_left: vehicle!.capacity,
        }]).select().single();
        if (tripErr) throw tripErr;
        tripId = newTrip.id;
      }
      const validStops = stops.filter(s => s.cityId && s.cityId !== "");
      if (validStops.length > 0 && tripId) {
        const stopsToInsert = validStops.map((s, index) => ({
          trip_id: tripId, city_id: s.cityId, arrival_time: s.arrivalTime || null, 
          price_from_start: Number(s.priceFromStart) || 0, stop_order: index + 1
        }));
        await supabase.from('trip_stops').insert(stopsToInsert);
      }
      setShowForm(false); resetForm(); await loadData();
      toast.success('Voyage enregistré');
    } catch (e: any) { toast.error("Erreur de sauvegarde"); }
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

  if (loading && departures.length === 0) return (
    <div className="p-4 space-y-4 bg-background min-h-screen">
      <Skeleton className="h-12 w-48 bg-card" />
      <Skeleton className="h-64 w-full bg-card" />
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-2 md:p-4 text-left space-y-8 animate-in fade-in duration-500 bg-background text-foreground pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-2">
        <div className="text-left">
          <h1 className="text-3xl md:text-4xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
             <Clock className="text-primary h-8 w-8 md:h-10 md:w-10" /> Gestion départs
          </h1>
          <p className="text-[11px] md:text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Planning Agence</p>
        </div>
        {canEdit && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full sm:w-auto rounded-xl font-black gap-2 h-14 md:h-16 px-8 shadow-xl bg-primary text-white border-none hover:bg-primary/90 transition-all">
            <Plus size={24} /> NOUVEAU DÉPART
          </Button>
        )}
      </div>

      {/* LISTE DES DÉPARTS */}
      <div className="space-y-4 md:space-y-6">
        {currentItems.map(dep => {
          const TransportIcon = dep.type === 'BOAT' ? Ship : dep.type === 'TRAIN' ? Train : dep.type === 'PLANE' ? Plane : Bus;
          
          return (
            <div key={dep.id} className="bg-card border border-border rounded-[1.5rem] md:rounded-[3rem] p-5 md:p-8 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all group overflow-visible">
              <div className="flex flex-col space-y-6">
                
                <div className="flex items-start md:items-center gap-4 md:gap-6">
                  <div className={`h-14 w-14 md:h-20 md:w-20 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shrink-0 ${
                    dep.type === 'BOAT' ? 'bg-blue-600' : 
                    dep.type === 'TRAIN' ? 'bg-slate-950 border border-slate-800' : 
                    dep.type === 'PLANE' ? 'bg-indigo-600' : 'bg-primary'
                  }`}>
                    <TransportIcon className="h-6 w-6 md:h-10 md:w-10" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2 font-black text-xl md:text-3xl text-white uppercase tracking-tighter leading-tight">
                      <span className="truncate">{dep.departureCity}</span> 
                      <ArrowRight size={18} className="text-primary opacity-30 shrink-0" /> 
                      <span className="truncate">{dep.arrivalCity}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
                      <span className="text-primary font-black px-2 py-0.5 bg-primary/10 rounded-lg border border-primary/20 text-[9px] md:text-xs uppercase tracking-widest">{dep.registration}</span>
                      <span className="text-[10px] md:text-sm font-bold text-slate-500 uppercase">{new Date(dep.departureDate).toLocaleDateString('fr-FR')} • {dep.departureTime}</span>
                      <StatusBadge status={dep.status} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-dashed border-border text-left">
                   <div className="flex items-end justify-between w-full sm:w-auto gap-4">
                      <div className="text-left">
                         <p className="font-black text-primary text-3xl md:text-4xl tracking-tighter">{(dep.price || 0).toLocaleString()} F</p>
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{dep.bookingCount}/{dep.totalSeats} PLACES VENDUES</p>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                      <Link to={`/agency/passengers/${dep.id}`} className="col-span-1 flex-1">
                          <Button variant="outline" className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl border border-border bg-slate-950 text-slate-300 font-black text-[10px] md:text-xs uppercase gap-2 px-4 hover:bg-slate-800 hover:text-white transition-colors">
                              <Users size={18} /> Manifeste
                          </Button>
                      </Link>

                      {canEdit && (
                        <div className="col-span-1 flex gap-2 flex-1">
                            <Button variant="outline" onClick={() => openEdit(dep)} className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl border border-border bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white p-0 shadow-sm transition-colors"><Pencil size={20} /></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button className="flex-1 flex items-center justify-center h-12 md:h-14 rounded-xl md:rounded-2xl border border-border bg-slate-950 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-0 shadow-sm transition-colors"><Trash2 size={20} /></button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2rem] bg-slate-900 border border-border text-white w-[90vw] max-w-md mx-auto">
                                    <AlertDialogHeader className="text-left"><AlertDialogTitle className="font-black uppercase italic text-xl">Supprimer ?</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogDescription className="text-slate-400">Cette action supprimera toutes les programmations liées à ce trajet.</AlertDialogDescription>
                                    <AlertDialogFooter className="flex-row gap-2 mt-6">
                                        <AlertDialogCancel className="rounded-xl flex-1 m-0 bg-slate-800 border-none text-white hover:bg-slate-700">NON</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => supabase.from('trips').delete().eq('id', dep.id).then(()=>loadData())} className="bg-red-600 rounded-xl text-white flex-1 m-0 hover:bg-red-700">OUI</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      )}
                   </div>
                </div>

            {dep.stops.length > 0 ? (
              <div className="pt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {dep.stops.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 shrink-0 bg-slate-950 px-4 py-2.5 rounded-2xl border border-border shadow-inner">
                    <MapPin size={10} className="text-primary" />
                    <div className="leading-tight text-left">
                      <p className="text-[10px] font-black uppercase text-white">{s.cityName}</p>
                      <p className="text-[8px] font-bold text-slate-600 mt-0.5">Arrêt: {s.arrivalTime} • {(s.priceFromStart || 0).toLocaleString()}F</p>
                    </div>
                </div>
              ))}
            </div>
      ) : (
        <div className="pt-4 px-1">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950 border border-dashed border-primary/30">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[9px] md:text-[10px] font-black text-primary/70 uppercase tracking-widest italic">
                Trajet Direct — Aucune escale
              </p>
          </div>
        </div>
      )}
      
      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-card p-3 rounded-2xl border border-border w-fit mx-auto shadow-2xl">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border border-border bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"><ChevronLeft size={24}/></Button>
          <div className="flex items-center gap-1 font-black text-[10px] uppercase text-slate-500 px-4">
             <span className="text-primary">Page {currentPage}</span>
             <span className="opacity-20">/</span>
             <span>{totalPages}</span>
          </div>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border border-border bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"><ChevronRight size={24}/></Button>
        </div>
      )}

      {/* DIALOG FORMULAIRE */}
      <Dialog open={showForm} onOpenChange={(o) => { if(!o) resetForm(); setShowForm(o); }}>
        <DialogContent className="rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 w-[95vw] max-w-2xl border-border bg-slate-900 text-white shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[90vh]">
          <DialogHeader className="text-left"><DialogTitle className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white leading-none">{editId ? 'Modifier' : 'Programmer'} Voyage</DialogTitle></DialogHeader>
          
          <div className="space-y-6 md:space-y-8 mt-6 text-left">
            {!editId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic">Trajet Principal</Label>
                        <Select value={routeId} onValueChange={setRouteId}>
                            <SelectTrigger className="h-12 md:h-14 rounded-xl bg-slate-950 border-none font-black text-xs px-6 shadow-inner text-white outline-none"><SelectValue placeholder="Choisir trajet" /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-border text-white rounded-xl">
                                {routes.map(r => <SelectItem key={r.id} value={r.id} className="font-bold py-3 text-xs focus:bg-primary/20">{r.departure_city} ➔ {r.arrival_city}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic">Véhicule Assigné</Label>
                        <Select value={vehicleId} onValueChange={setVehicleId}>
                            <SelectTrigger className="h-12 md:h-14 rounded-xl bg-slate-950 border-none font-black text-xs px-6 shadow-inner text-white outline-none"><SelectValue placeholder="Sélect. véhicule" /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-border text-white rounded-xl">
                                {vehicles.map(v => <SelectItem key={v.id} value={v.id} className="font-bold py-3 text-xs focus:bg-primary/20">{v.name} ({v.capacity} pl. • {v.type})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* HORAIRES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic leading-none">Date Départ</Label>
                <Input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} className="h-12 md:h-14 rounded-xl bg-slate-950 border-none font-black text-xs px-6 shadow-inner text-white appearance-none outline-none" />
              </div>
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic leading-none">Heure Départ</Label>
                <Input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} className="h-12 md:h-14 rounded-xl bg-slate-950 border-none font-black text-xs px-6 shadow-inner text-white appearance-none outline-none" />
              </div>
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic leading-none">Heure Arrivée</Label>
                <Input type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} className="h-12 md:h-14 rounded-xl bg-slate-950 border-none font-black text-xs px-6 shadow-inner text-white appearance-none outline-none" />
              </div>
            </div>

            {/* TARIFS PAR CLASSE */}
            <div className="p-5 md:p-8 bg-slate-950 rounded-[2rem] border border-border shadow-inner space-y-6">
               <h3 className="text-[10px] font-black uppercase flex items-center gap-2 text-slate-400 tracking-widest leading-none italic"><Hash size={16} className="text-primary"/> Tarification par classe (FCFA)</h3>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Classe Économie</Label>
                    <Input type="number" placeholder="Prix" value={price} onChange={e => setPrice(e.target.value)} className="h-12 rounded-xl border-none bg-slate-900 text-primary font-black text-lg px-4 outline-none" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Classe Business</Label>
                    <Input type="number" placeholder="Optionnel" value={businessPrice} onChange={e => setBusinessPrice(e.target.value)} className="h-12 rounded-xl border-none bg-slate-900 text-white font-black text-lg px-4 outline-none" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Classe VIP</Label>
                    <Input type="number" placeholder="Optionnel" value={vipPrice} onChange={e => setVipPrice(e.target.value)} className="h-12 rounded-xl border-none bg-slate-900 text-white font-black text-lg px-4 outline-none" />
                  </div>
               </div>
            </div>

            {/* ESCALES */}
            <div className="p-5 md:p-8 bg-slate-950 rounded-[2rem] border border-border shadow-inner">
               <div className="flex justify-between items-center mb-6 px-1">
                  <h3 className="text-[10px] font-black uppercase flex items-center gap-2 text-slate-400 tracking-widest leading-none italic"><MapPin size={16} className="text-primary"/> Escales</h3>
                  <Button type="button" variant="outline" onClick={addStop} className="h-8 rounded-lg font-black border border-border text-[9px] px-4 bg-slate-900 text-slate-300 hover:bg-slate-800">
                    <Plus size={14} className="mr-1" /> AJOUTER
                  </Button>
               </div>
               <div className="space-y-3">
                  {stops.map((stop, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 items-end">
                      <Select value={stop.cityId} onValueChange={(v) => updateStop(index, 'cityId', v)}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-900 border-none text-[9px] font-black uppercase text-white shadow-inner outline-none"><SelectValue placeholder="Ville" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-border text-white rounded-xl">{cities.map(c => <SelectItem key={c.id} value={c.id} className="font-bold text-[10px]">{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="time" value={stop.arrivalTime} onChange={e => updateStop(index, 'arrivalTime', e.target.value)} className="h-11 rounded-xl border-none bg-slate-900 text-white font-black text-xs text-center outline-none" />
                      <Input type="number" placeholder="Prix F" value={stop.priceFromStart} onChange={e => updateStop(index, 'priceFromStart', e.target.value)} className="h-11 rounded-xl border-none bg-slate-900 text-white font-black text-xs text-center outline-none" />
                      <Button variant="ghost" size="icon" onClick={() => removeStop(index)} className="h-11 w-11 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><X size={18}/></Button>
                    </div>
                  ))}
               </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full h-16 md:h-20 rounded-xl md:rounded-[2rem] font-black text-lg md:text-xl shadow-2xl bg-primary text-white hover:bg-primary/90 uppercase tracking-widest transition-all active:scale-95 border-none mt-4">
              {saving ? <RefreshCw className="animate-spin h-8 w-8" /> : <Save className="mr-3 h-6 w-6 md:h-8 md:w-8" />}
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
      'Programmé': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'Embarquement': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'Parti': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'Arrivé': 'bg-slate-800 text-slate-500 border-slate-700',
      'Annulé': 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return <span className={`inline-block px-3 py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase border-2 shadow-sm ${colors[status] || 'bg-slate-900 border-slate-800 text-slate-600'}`}>{status}</span>;
}