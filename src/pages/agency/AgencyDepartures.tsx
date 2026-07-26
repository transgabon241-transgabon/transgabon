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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Pencil, Trash2, Users, ArrowRight, ChevronLeft, ChevronRight, 
  Ship, Train, Bus, Plane, Save, RefreshCw, Hash, MapPin, Clock, X,
  BarChart3, Activity, Percent, TrendingUp, CalendarDays, Coins
} from 'lucide-react';
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
  const [stops, setStops] = useState<TripStop[]>([]);

  const canEdit = user?.role === 'Agent' || user?.role === 'Administrateur' || user?.role === 'Chef d\'agence';

  // --- LOGIQUE DE FILTRAGE ET STATISTIQUES ---
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const categorizedTrips = useMemo(() => {
    return {
      today: departures.filter(d => d.departureDate === todayStr),
      upcoming: departures.filter(d => d.departureDate > todayStr),
      past: departures.filter(d => d.departureDate < todayStr),
    };
  }, [departures, todayStr]);

  const stats = useMemo(() => {
    const totalSeats = departures.reduce((acc, d) => acc + d.totalSeats, 0);
    const soldSeats = departures.reduce((acc, d) => acc + d.bookingCount, 0);
    const revenue = departures.reduce((acc, d) => acc + (d.price * d.bookingCount), 0);

    return {
      total: departures.length,
      today: categorizedTrips.today.length,
      sold: soldSeats,
      occupancy: totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0,
      revenue: revenue
    };
  }, [departures, categorizedTrips]);

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

  // --- HANDLERS ---
  const resetForm = () => {
    setEditId(null); setRouteId(''); setVehicleId(''); setDepDate(''); setDepTime(''); setArrTime('');
    setPrice(''); setVipPrice(''); setBusinessPrice(''); setStops([]); setStatus('');
  };

  const openEdit = (dep: Departure) => {
    setEditId(dep.id); setDepDate(dep.departureDate); setDepTime(dep.departureTime);
    setArrTime(dep.arrivalTime || ''); setPrice(String(dep.price)); setVipPrice(String(dep.vipPrice));
    setBusinessPrice(String(dep.businessPrice)); setStops(dep.stops || []); setStatus(dep.status); setShowForm(true);
  };

  const handleSave = async () => {
    if (!user?.companyId) return;
    setSaving(true);
    try {
      const tripData = {
        departure_date: depDate, departure_time: depTime, arrival_time: arrTime || null,
        price: Number(price) || 0, class_vip_price: vipPrice ? Number(vipPrice) : null,
        class_business_price: businessPrice ? Number(businessPrice) : null,
        status: status || 'Programmé'
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
        const { data: newTrip } = await supabase.from('trips').insert([{
          ...tripData, company_id: user.companyId, type: vehicle!.type,
          vehicle_number: vehicle!.name, vehicle_id: vehicle!.id,
          from_id: fC!.id, to_id: tC!.id, seats_total: vehicle!.capacity, seats_left: vehicle!.capacity,
        }]).select().single();
        tripId = newTrip.id;
      }

      if (stops.length > 0 && tripId) {
        await supabase.from('trip_stops').insert(stops.map((s, i) => ({
          trip_id: tripId, city_id: s.cityId, arrival_time: s.arrivalTime, 
          price_from_start: Number(s.priceFromStart), stop_order: i + 1
        })));
      }

      setShowForm(false); resetForm(); await loadData();
      toast.success('Planning mis à jour');
    } catch (e: any) { toast.error("Erreur"); }
    finally { setSaving(false); }
  };

  if (loading && departures.length === 0) return <div className="p-10 text-center animate-pulse text-slate-500 font-black">CHARGEMENT...</div>;

  return (
    <div className="w-full max-w-6xl mx-auto p-2 md:p-4 text-left space-y-8 bg-background text-foreground pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-2 bg-card p-6 rounded-[2rem] border-2 border-border shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
            <CalendarDays size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black italic text-white uppercase tracking-tighter leading-none">Planning de vols</h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Organisation des départs</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full sm:w-auto rounded-xl font-black gap-2 h-14 px-8 shadow-2xl bg-primary text-white border-none active:scale-95 transition-all">
            <Plus size={20} /> PROGRAMMER
          </Button>
        )}
      </div>

      {/* DASHBOARD STATISTIQUE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={BarChart3} label="Total Voyages" value={stats.total} color="text-blue-400" bg="bg-blue-500/10" sub="Toutes périodes" />
          <StatCard icon={Clock} label="Départs Jour" value={stats.today} color="text-primary" bg="bg-primary/10" sub="Aujourd'hui" />
          <StatCard icon={Users} label="Passagers" value={stats.sold} color="text-emerald-400" bg="bg-emerald-500/10" sub="Billets vendus" />
          <StatCard icon={Percent} label="Occupation" value={`${stats.occupancy}%`} color="text-amber-400" bg="bg-amber-500/10" sub="Remplissage moyen" />
      </div>

      {/* TABS DE FILTRAGE */}
      <Tabs defaultValue="today" className="w-full space-y-6">
        <TabsList className="bg-slate-900 border-2 border-slate-800 p-1 rounded-2xl h-auto flex w-full md:w-fit mx-2">
            <TabsTrigger value="today" className="flex-1 md:w-44 rounded-xl font-black uppercase text-[10px] py-3 data-[state=active]:bg-slate-800 data-[state=active]:text-primary">
                Aujourd'hui ({categorizedTrips.today.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1 md:w-44 rounded-xl font-black uppercase text-[10px] py-3 data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
                À venir ({categorizedTrips.upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 md:w-44 rounded-xl font-black uppercase text-[10px] py-3 data-[state=active]:bg-slate-800 data-[state=active]:text-slate-500">
                Archives
            </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 outline-none">
            {categorizedTrips.today.length === 0 ? <EmptyDisplay message="Aucun départ aujourd'hui" /> : 
            categorizedTrips.today.map(dep => <DepartureCard key={dep.id} dep={dep} canEdit={canEdit} onEdit={openEdit} />)}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4 outline-none">
            {categorizedTrips.upcoming.length === 0 ? <EmptyDisplay message="Aucun départ futur programmé" /> : 
            categorizedTrips.upcoming.map(dep => <DepartureCard key={dep.id} dep={dep} canEdit={canEdit} onEdit={openEdit} />)}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 outline-none">
            {categorizedTrips.past.length === 0 ? <EmptyDisplay message="Aucun historique disponible" /> : 
            categorizedTrips.past.map(dep => <DepartureCard key={dep.id} dep={dep} canEdit={canEdit} onEdit={openEdit} />)}
        </TabsContent>
      </Tabs>

      {/* DIALOG FORMULAIRE (ÉDITION & CRÉATION) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2rem] p-6 md:p-10 w-[95vw] max-w-2xl bg-slate-900 text-white border-border overflow-y-auto max-h-[90vh]">
          <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
            {editId ? 'Modifier' : 'Programmer'} Voyage
          </DialogTitle>
          <div className="space-y-6 mt-6 text-left">
            {!editId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Itinéraire</Label>
                  <Select value={routeId} onValueChange={setRouteId}>
                    <SelectTrigger className="h-12 bg-slate-950 border-none rounded-xl text-white"><SelectValue placeholder="Choisir trajet" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-border text-white">
                      {routes.map(r => <SelectItem key={r.id} value={r.id}>{r.departure_city} ➔ {r.arrival_city}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Véhicule</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger className="h-12 bg-slate-950 border-none rounded-xl text-white"><SelectValue placeholder="Sélect. véhicule" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-border text-white">
                      {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name} ({v.capacity} pl.)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Date</Label><Input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} className="h-12 bg-slate-950 border-none rounded-xl text-white" /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Départ</Label><Input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} className="h-12 bg-slate-950 border-none rounded-xl text-white" /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Arrivée</Label><Input type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} className="h-12 bg-slate-950 border-none rounded-xl text-white" /></div>
            </div>
            
            <div className="p-6 bg-slate-950 rounded-2xl border border-border space-y-4">
               <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Grille tarifaire (FCFA)</Label>
               <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1"><Label className="text-[8px] uppercase text-slate-500">Eco</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="bg-slate-900 border-none text-white font-black" /></div>
                  <div className="space-y-1"><Label className="text-[8px] uppercase text-slate-500">Business</Label><Input type="number" value={businessPrice} onChange={e => setBusinessPrice(e.target.value)} className="bg-slate-900 border-none text-white font-black" /></div>
                  <div className="space-y-1"><Label className="text-[8px] uppercase text-slate-500">VIP</Label><Input type="number" value={vipPrice} onChange={e => setVipPrice(e.target.value)} className="bg-slate-900 border-none text-white font-black" /></div>
               </div>
            </div>

            {editId && (
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Statut du voyage</Label>
                 <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-12 bg-slate-950 border-none rounded-xl text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-border text-white">
                        <SelectItem value="Programmé">Programmé</SelectItem>
                        <SelectItem value="Embarquement">Embarquement</SelectItem>
                        <SelectItem value="Parti">Parti</SelectItem>
                        <SelectItem value="Arrivé">Arrivé</SelectItem>
                        <SelectItem value="Annulé">Annulé</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-xl">
               {saving ? <RefreshCw className="animate-spin" /> : <Save className="mr-2" />} Enregistrer la programmation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function DepartureCard({ dep, canEdit, onEdit }: any) {
    const TransportIcon = dep.type === 'BOAT' ? Ship : dep.type === 'TRAIN' ? Train : dep.type === 'PLANE' ? Plane : Bus;
    return (
        <div className="bg-card border border-border rounded-[1.5rem] p-5 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-left">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${
                    dep.type === 'BOAT' ? 'bg-blue-600' : dep.type === 'TRAIN' ? 'bg-slate-950 border border-slate-800' : dep.type === 'PLANE' ? 'bg-indigo-600' : 'bg-primary'
                }`}>
                    <TransportIcon size={24} />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 font-black text-lg text-white uppercase leading-none truncate">
                        {dep.departureCity} <ArrowRight size={14} className="text-primary" /> {dep.arrivalCity}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{dep.registration}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{dep.departureTime}</span>
                        <StatusBadge status={dep.status} />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-slate-800 pt-4 sm:pt-0">
                <div className="text-left sm:text-right">
                    <p className="text-xl font-black text-white leading-none">{(dep.price).toLocaleString()} F</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase mt-1">{dep.bookingCount}/{dep.totalSeats} Places vendues</p>
                </div>
                <div className="flex gap-2">
                    <Link to={`/agency/passengers/${dep.id}`}><Button variant="outline" size="sm" className="h-10 rounded-xl bg-slate-950 text-slate-300 font-black text-[9px] uppercase"><Users size={14} className="mr-2" /> Passagers</Button></Link>
                    {canEdit && <Button onClick={() => onEdit(dep)} variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-900 border border-border text-slate-400 hover:text-primary"><Pencil size={18} /></Button>}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, bg, sub }: any) {
    return (
        <div className="bg-card border-2 border-border rounded-[1.5rem] p-5 shadow-xl flex items-center gap-4 transition-all hover:border-primary/20 group">
            <div className={`h-12 w-12 rounded-2xl ${bg} flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-110 transition-transform shadow-inner`}>
                <Icon size={24} className={color} />
            </div>
            <div className="min-w-0 text-left">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">{label}</p>
                <p className={`text-xl font-black tracking-tighter leading-none ${color}`}>{value}</p>
                <p className="text-[8px] font-bold text-slate-600 mt-1 uppercase italic leading-none">{sub}</p>
            </div>
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
    return <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${colors[status] || 'bg-slate-900 border-slate-800 text-slate-600'}`}>{status}</span>;
}

function EmptyDisplay({ message }: { message: string }) {
    return (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-slate-950/40">
            <Clock className="mx-auto h-12 w-12 text-slate-800 mb-4" />
            <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest italic">{message}</p>
        </div>
    );
}