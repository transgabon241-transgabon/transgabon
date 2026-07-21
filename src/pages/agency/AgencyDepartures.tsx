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
import { Plus, Pencil, Trash2, Users, ArrowRight, ChevronLeft, ChevronRight, Ship, Train, Bus, Save, RefreshCw, Hash, MapPin, Clock, X, Gem } from 'lucide-react';
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

type Route = { id: string; departureCity: string; arrivalCity: string; };
type Vehicle = { id: string; vehicleNumber: string; vehicleType: string; typeCode: string; totalSeats: number; };

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
          trip_stops(city_id, arrival_time, price_from_start, stop_order, cities(name)) -- AJOUTÉ : stop_order ici
        `)
        .eq('company_id', user.companyId)
        .order('departure_date', { ascending: true });

      setDepartures((tripsData || []).map(t => ({
        id: t.id,
        departureCode: t.vehicle_number,
        registration: t.vehicle?.registration || '—',
        departureCity: t.from.name,
        arrivalCity: t.to.name,
        departureDate: t.departure_date,
        departureTime: t.departure_time,
        arrivalTime: t.arrival_time,
        price: t.price,
        vipPrice: t.class_vip_price || 0,
        businessPrice: t.class_business_price || 0,
        totalSeats: t.seats_total,
        bookingCount: t.seats_total - t.seats_left,
        status: t.status || 'Programmé',
        type: t.type,
        stops: (t.trip_stops || []).map((s: any) => ({
            cityId: s.city_id,
            cityName: s.cities?.name,
            arrivalTime: s.arrival_time,
            priceFromStart: s.price_from_start,
            stop_order: s.stop_order // AJOUTÉ : Pour le tri correct
        })).sort((a:any, b:any) => a.stop_order - b.stop_order)
      })));

      // ... (reste de loadData identique)
    } catch (e) { toast.error('Erreur réseau'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!user?.companyId) return;
    setSaving(true);
    try {
      const tripData = {
        departure_date: depDate,
        departure_time: depTime,
        arrival_time: arrTime || null,
        price: Number(price),
        class_vip_price: vipPrice ? Number(vipPrice) : null,
        class_business_price: businessPrice ? Number(businessPrice) : null,
        status: status || 'Programmé',
        duration_min: 0 -- AJOUTÉ : Évite l'erreur "violates not-null constraint"
      };

      let tripId = editId;

      if (editId) {
        const { error: tripErr } = await supabase.from('trips').update(tripData).eq('id', editId);
        if (tripErr) throw tripErr;
        await supabase.from('trip_stops').delete().eq('trip_id', editId);
      } else {
        const route = routes.find(r => r.id === routeId);
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const { data: fC } = await supabase.from('cities').select('id').ilike('name', route!.departureCity).single();
        const { data: tC } = await supabase.from('cities').select('id').ilike('name', route!.arrivalCity).single();

        const { data: newTrip, error: tripErr } = await supabase.from('trips').insert([{
          ...tripData,
          company_id: user.companyId,
          type: vehicle!.typeCode,
          vehicle_number: vehicle!.vehicleNumber,
          vehicle_id: vehicle!.id,
          from_id: fC!.id,
          to_id: tC!.id,
          seats_total: vehicle!.totalSeats,
          seats_left: vehicle!.totalSeats,
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

        const { error: stopsErr } = await supabase.from('trip_stops').insert(stopsToInsert);
        if (stopsErr) throw stopsErr;
      }

      setShowForm(false);
      resetForm();
      await loadData();
      toast.success('Voyage enregistré avec succès');
    } catch (e: any) { 
      console.error(e);
      toast.error(e.message || "Erreur lors de la sauvegarde"); 
    }
    finally { setSaving(false); }
  };

  const resetForm = () => {
    setEditId(null); setRouteId(''); setVehicleId(''); setDepDate(''); setDepTime(''); setArrTime('');
    setPrice(''); setVipPrice(''); setBusinessPrice(''); setStops([]); setStatus('');
  };

  const currentVehicleType = editId ? departures.find(d => d.id === editId)?.type : vehicles.find(v => v.id === vehicleId)?.typeCode;
  const currentItems = useMemo(() => departures.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [departures, currentPage]);
  const totalPages = Math.ceil(departures.length / itemsPerPage);

  if (loading && departures.length === 0) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48"/><Skeleton className="h-64 w-full"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-primary uppercase tracking-tighter">Gestion des départs</h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Planification trajets & escales</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-2xl font-black gap-2 h-12 shadow-lg">
          <Plus size={20} /> NOUVEAU DÉPART
        </Button>
      </div>

      <div className="space-y-4">
        {currentItems.map(dep => (
          <div key={dep.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all group overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-5 flex-1 w-full">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${dep.type === 'BOAT' ? 'bg-blue-600' : dep.type === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'}`}>
                  {dep.type === 'BOAT' ? <Ship size={24} /> : dep.type === 'TRAIN' ? <Train size={24} /> : <Bus size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 font-black text-lg text-slate-800 uppercase tracking-tighter">
                    {dep.departureCity} <ArrowRight size={16} className="text-primary opacity-30" /> {dep.arrivalCity}
                    <StatusBadge status={dep.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-primary font-black px-2 py-0.5 bg-primary/5 rounded border border-primary/10 text-[10px] uppercase">{dep.registration}</span>
                    <span className="text-xs font-bold text-muted-foreground">{new Date(dep.departureDate).toLocaleDateString('fr-FR')} • {dep.departureTime}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right mr-4">
                    <p className="font-black text-primary text-xl leading-none">{dep.price.toLocaleString()} F</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase mt-1">{dep.bookingCount}/{dep.totalSeats} PLACES PRISES</p>
                 </div>
                 <Button variant="outline" size="icon" onClick={() => { 
                     setEditId(dep.id); setDepDate(dep.departureDate); setDepTime(dep.departureTime);
                     setArrTime(dep.arrivalTime || ''); setPrice(String(dep.price)); setVipPrice(String(dep.vipPrice));
                     setBusinessPrice(String(dep.businessPrice)); setStops(dep.stops || []); setStatus(dep.status); setShowForm(true);
                 }} className="rounded-xl border-2"><Pencil size={18} /></Button>
                 <Link to={`/agency/passengers/${dep.id}`}><Button variant="outline" size="icon" className="rounded-xl border-2"><Users size={18} /></Button></Link>
              </div>
            </div>

            {dep.stops && dep.stops.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {dep.stops.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 shrink-0 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <MapPin size={10} className="text-primary" />
                    <div className="leading-none">
                      <p className="text-[10px] font-black uppercase text-slate-700">{s.cityName}</p>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5">{s.arrivalTime} • {s.priceFromStart}F</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={(o) => { if(!o) resetForm(); setShowForm(o); }}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-2xl border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">{editId ? 'Modifier' : 'Programmer'} Voyage</DialogTitle></DialogHeader>
          
          <div className="space-y-6 mt-6">
            {!editId && (
                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Itinéraire Principal</Label>
                    <Select value={routeId} onValueChange={setRouteId}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold shadow-inner"><SelectValue placeholder="Trajet" /></SelectTrigger>
                        <SelectContent>{routes.map(r => <SelectItem key={r.id} value={r.id} className="font-bold">{r.departureCity} → {r.arrivalCity}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Véhicule</Label>
                    <Select value={vehicleId} onValueChange={setVehicleId}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold shadow-inner"><SelectValue placeholder="Véhicule" /></SelectTrigger>
                        <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id} className="font-bold">{v.vehicleNumber} ({v.vehicleType})</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                </div>
            )}

            <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase flex items-center gap-2 text-slate-600"><Clock size={16}/> Escales intermédiaires</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addStop} className="h-8 rounded-xl font-bold border-2 text-[10px] px-3 bg-white">
                    <Plus size={14} className="mr-1" /> AJOUTER ARRÊT
                  </Button>
               </div>
               <div className="space-y-3">
                  {stops.map((stop, index) => (
                    <div key={index} className="grid grid-cols-[1.5fr_1fr_1fr_40px] gap-2 items-end animate-in fade-in slide-in-from-right-2">
                      <div className="space-y-1 text-left">
                        <Select value={stop.cityId} onValueChange={(v) => updateStop(index, 'cityId', v)}>
                          <SelectTrigger className="h-10 rounded-xl bg-white border-none text-xs font-bold shadow-sm"><SelectValue placeholder="Ville" /></SelectTrigger>
                          <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Input type="time" value={stop.arrivalTime} onChange={e => updateStop(index, 'arrivalTime', e.target.value)} className="h-10 rounded-xl border-none shadow-sm font-bold text-xs" />
                      <Input type="number" placeholder="Prix" value={stop.priceFromStart} onChange={e => updateStop(index, 'priceFromStart', e.target.value)} className="h-10 rounded-xl border-none shadow-sm font-bold text-xs" />
                      <Button variant="ghost" size="icon" onClick={() => removeStop(index)} className="h-10 w-10 text-red-400 hover:bg-red-50 rounded-full transition-colors"><X size={16}/></Button>
                    </div>
                  ))}
                  {stops.length === 0 && <p className="text-[10px] text-center text-slate-400 font-bold uppercase italic py-2">Aucun arrêt intermédiaire configuré</p>}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prix Standard / 2ème Cl.</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-black text-primary text-lg" />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date Départ</Label>
                <Input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Heure de départ</Label>
                    <Input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Heure d'arrivée terminus</Label>
                    <Input type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-400" />
                </div>
            </div>

            {(currentVehicleType === 'BOAT' || currentVehicleType === 'TRAIN') && (
              <div className="grid grid-cols-2 gap-4 p-5 bg-primary/5 rounded-3xl border-2 border-primary/10">
                <div className="space-y-1.5 text-left">
                  <Label className="text-[10px] font-black uppercase text-primary ml-1">{currentVehicleType === 'TRAIN' ? 'Prix 1ère Classe' : 'Prix Business'}</Label>
                  <Input type="number" value={businessPrice} onChange={e => setBusinessPrice(e.target.value)} className="h-11 rounded-xl bg-white border-primary/10 font-bold" />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-[10px] font-black uppercase text-primary ml-1">{currentVehicleType === 'TRAIN' ? 'Prix Prestige' : 'Prix Salon VIP'}</Label>
                  <Input type="number" value={vipPrice} onChange={e => setVipPrice(e.target.value)} className="h-11 rounded-xl bg-white border-primary/10 font-bold" />
                </div>
              </div>
            )}

            {editId && (
              <div className="space-y-1.5 border-t pt-4 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">État actuel du trajet</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold shadow-inner"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl">
                    {['Programmé', 'Embarquement', 'Parti', 'Arrivé', 'Annulé'].map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full h-16 rounded-3xl font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest active:scale-95 transition-all">
              {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
              {editId ? 'METTRE À JOUR LE VOYAGE' : 'VALIDER LA PROGRAMMATION'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
      'Programmé': 'bg-blue-100 text-blue-800 border-blue-200',
      'Embarquement': 'bg-orange-100 text-orange-800 border-orange-200',
      'Parti': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Arrivé': 'bg-green-100 text-green-800 border-green-200',
      'Annulé': 'bg-red-100 text-red-800 border-red-200',
    };
    return <span className={`inline-block px-3 py-0.5 rounded-full text-[9px] font-black uppercase border ml-2 ${colors[status] || 'bg-muted'}`}>{status}</span>;
}