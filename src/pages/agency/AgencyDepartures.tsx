"use client"

import { useEffect, useState, useMemo, useCallback } from 'react';
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
  BarChart3, Activity, Percent, TrendingUp, CalendarDays, Baby, User as UserIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

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
  childPrice: number;
  childVipPrice: number;
  childBusinessPrice: number;
  totalSeats: number;
  bookingCount: number;
  status: string;
  type: string;
  stops: any[];
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

  // Pagination & Tabs
  const [activeTab, setActiveTab] = useState("today");
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
  const [childPrice, setChildPrice] = useState('');
  const [childVipPrice, setChildVipPrice] = useState('');
  const [childBusinessPrice, setChildBusinessPrice] = useState('');
  const [status, setStatus] = useState('');

  const canEdit = user?.role === 'Agent' || user?.role === 'Administrateur' || user?.role === 'Chef d\'agence';

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
    return {
      total: departures.length,
      today: categorizedTrips.today.length,
      sold: soldSeats,
      occupancy: totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0
    };
  }, [departures, categorizedTrips]);

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data: citiesData } = await supabase.from('cities').select('id, name').order('name');
      if (citiesData) setCities(citiesData);

      const { data: tripsData, error } = await supabase
        .from('trips')
        .select(`
          *, 
          from:cities!from_id(name), 
          to:cities!to_id(name), 
          vehicle:vehicles(registration), 
          trip_stops(*),
          bookings(id)
        `)
        .eq('company_id', user.companyId)
        .order('departure_date', { ascending: true });

      if (error) throw error;

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
        childPrice: Number(t.child_price) || 0,
        childVipPrice: Number(t.child_vip_price) || 0,
        childBusinessPrice: Number(t.child_business_price) || 0,
        totalSeats: t.seats_total || 0,
        bookingCount: t.bookings?.length || 0, // Décompte réel
        status: t.status || 'Programmé',
        type: t.type,
        stops: t.trip_stops || []
      })));

      const { data: rD } = await supabase.from('routes').select('*');
      if (rD) setRoutes(rD);
      const { data: vD } = await supabase.from('vehicles').select('*').eq('company_id', user.companyId);
      if (vD) setVehicles(vD);
    } catch (e: any) { 
      toast.error('Erreur de chargement'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const resetForm = () => {
    setEditId(null); setRouteId(''); setVehicleId(''); setDepDate(''); setDepTime(''); setArrTime('');
    setPrice(''); setVipPrice(''); setBusinessPrice('');
    setChildPrice(''); setChildVipPrice(''); setChildBusinessPrice('');
    setStatus('');
  };

  const openEdit = useCallback((dep: Departure) => {
    setEditId(dep.id);
    setDepDate(dep.departureDate);
    setDepTime(dep.departureTime);
    setArrTime(dep.arrivalTime || '');
    setPrice(String(dep.price));
    setVipPrice(String(dep.vipPrice || ''));
    setBusinessPrice(String(dep.businessPrice || ''));
    setChildPrice(String(dep.childPrice || ''));
    setChildVipPrice(String(dep.childVipPrice || ''));
    setChildBusinessPrice(String(dep.childBusinessPrice || ''));
    setStatus(dep.status);
    setShowForm(true);
  }, []);

  const handleSave = async () => {
    if (!user?.companyId) return;
    setSaving(true);
    try {
      const tripData = {
        departure_date: depDate, departure_time: depTime, arrival_time: arrTime || null,
        price: Number(price) || 0, 
        class_vip_price: vipPrice ? Number(vipPrice) : null,
        class_business_price: businessPrice ? Number(businessPrice) : null,
        child_price: childPrice ? Number(childPrice) : null,
        child_vip_price: childVipPrice ? Number(childVipPrice) : null,
        child_business_price: childBusinessPrice ? Number(childBusinessPrice) : null,
        status: status || 'Programmé'
      };
      
      if (editId) {
        await supabase.from('trips').update(tripData).eq('id', editId);
      } else {
        const route = routes.find(r => r.id === routeId);
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const { data: fC } = await supabase.from('cities').select('id').ilike('name', route!.departure_city).single();
        const { data: tC } = await supabase.from('cities').select('id').ilike('name', route!.arrival_city).single();
        
        await supabase.from('trips').insert([{
          ...tripData, company_id: user.companyId, type: vehicle!.type,
          vehicle_number: vehicle!.name, vehicle_id: vehicle!.id,
          from_id: fC!.id, to_id: tC!.id, seats_total: vehicle!.capacity, seats_left: vehicle!.capacity,
        }]);
      }
      setShowForm(false); resetForm(); await loadData();
      toast.success('Planning mis à jour');
    } catch (e: any) { toast.error("Erreur de sauvegarde"); }
    finally { setSaving(false); }
  };

  const paginatedTrips = useMemo(() => {
    const currentList = categorizedTrips[activeTab as keyof typeof categorizedTrips] || [];
    const start = (currentPage - 1) * itemsPerPage;
    return currentList.slice(start, start + itemsPerPage);
  }, [categorizedTrips, activeTab, currentPage]);

  const actualTotalPages = Math.ceil((categorizedTrips[activeTab as keyof typeof categorizedTrips]?.length || 0) / itemsPerPage);

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 text-left space-y-6 bg-background text-foreground pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2 bg-card p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-border shadow-xl">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
            <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black italic text-white uppercase tracking-tighter leading-none truncate">Planning</h1>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Exploitation Agence</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full sm:w-auto rounded-xl font-black gap-2 h-12 sm:h-14 px-6 bg-primary text-white border-none active:scale-95 transition-all text-[10px] sm:text-xs">
            <Plus size={16} /> PROGRAMMER
          </Button>
        )}
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-1">
          <StatCard icon={BarChart3} label="Total" value={stats.total} color="text-blue-400" bg="bg-blue-500/10" />
          <StatCard icon={Clock} label="Auj." value={stats.today} color="text-primary" bg="bg-primary/10" />
          <StatCard icon={Users} label="Passagers" value={stats.sold} color="text-emerald-400" bg="bg-emerald-500/10" />
          <StatCard icon={Percent} label="Remplissage" value={`${stats.occupancy}%`} color="text-amber-400" bg="bg-amber-500/10" />
      </div>

      {/* ONGLET FILTRÉS */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }} className="w-full space-y-6">
        <TabsList className="bg-slate-900 border-2 border-slate-800 p-1 rounded-2xl h-auto flex w-full md:w-fit mx-1">
            <TabsTrigger value="today" className="flex-1 md:w-40 rounded-xl font-black uppercase text-[8px] sm:text-[10px] py-3 data-[state=active]:bg-slate-800 data-[state=active]:text-primary">
                Aujourd'hui ({categorizedTrips.today.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1 md:w-40 rounded-xl font-black uppercase text-[8px] sm:text-[10px] py-3 data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
                À venir ({categorizedTrips.upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 md:w-40 rounded-xl font-black uppercase text-[8px] sm:text-[10px] py-3 data-[state=active]:bg-slate-800 data-[state=active]:text-slate-500">
                Archives ({categorizedTrips.past.length})
            </TabsTrigger>
        </TabsList>

        <div className="space-y-4 px-1">
            {paginatedTrips.length === 0 ? (
                <EmptyDisplay message={`Aucun trajet disponible`} />
            ) : (
                paginatedTrips.map(dep => <DepartureCard key={dep.id} dep={dep} canEdit={canEdit} onEdit={openEdit} />)
            )}
        </div>

        {actualTotalPages > 1 && (
            <div className="flex items-center justify-center gap-4 bg-slate-900 p-2 rounded-2xl border border-border w-fit mx-auto shadow-xl">
                <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 text-slate-400 hover:text-white"><ChevronLeft size={20} /></Button>
                <span className="text-[10px] font-black text-slate-500 px-4">Page {currentPage} / {actualTotalPages}</span>
                <Button variant="ghost" size="icon" disabled={currentPage === actualTotalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 text-slate-400 hover:text-white"><ChevronRight size={20} /></Button>
            </div>
        )}
      </Tabs>

      {/* DIALOG FORMULAIRE */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2rem] p-4 sm:p-8 w-[95vw] max-w-2xl bg-slate-900 text-white border-border overflow-y-auto max-h-[90vh]">
          <DialogTitle className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-left">{editId ? 'Modifier' : 'Programmer'} Voyage</DialogTitle>
          <div className="space-y-6 mt-6">
            {!editId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Trajet</Label>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Date</Label><Input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} className="h-12 bg-slate-950 border-none rounded-xl text-white shadow-inner" /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Départ</Label><Input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} className="h-12 bg-slate-950 border-none rounded-xl text-white shadow-inner" /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-2">Arrivée</Label><Input type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} className="h-12 bg-slate-950 border-none rounded-xl text-white shadow-inner" /></div>
            </div>

            {/* TARIFS ADULTES ET ENFANTS */}
            <div className="space-y-4">
               <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-border space-y-4 text-left">
                  <div className="flex items-center gap-2 text-primary"><UserIcon size={14} /><Label className="text-[10px] font-black uppercase tracking-widest">Tarifs Adultes</Label></div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="space-y-1"><Label className="text-[8px] text-slate-500 uppercase">Eco</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="bg-slate-900 border-none text-white font-black text-xs sm:text-sm" /></div>
                      <div className="space-y-1"><Label className="text-[8px] text-slate-500 uppercase">Business</Label><Input type="number" value={businessPrice} onChange={e => setBusinessPrice(e.target.value)} className="bg-slate-900 border-none text-white font-black text-xs sm:text-sm" /></div>
                      <div className="space-y-1"><Label className="text-[8px] text-slate-500 uppercase">VIP</Label><Input type="number" value={vipPrice} onChange={e => setVipPrice(e.target.value)} className="bg-slate-900 border-none text-white font-black text-xs sm:text-sm" /></div>
                  </div>
               </div>
               <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-blue-500/20 space-y-4 text-left">
                  <div className="flex items-center gap-2 text-blue-400"><Baby size={14} /><Label className="text-[10px] font-black uppercase tracking-widest">Tarifs Enfants</Label></div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="space-y-1"><Label className="text-[8px] text-slate-500 uppercase">Eco</Label><Input type="number" value={childPrice} onChange={e => setChildPrice(e.target.value)} className="bg-slate-900 border-none text-white font-black text-xs sm:text-sm" /></div>
                      <div className="space-y-1"><Label className="text-[8px] text-slate-500 uppercase">Business</Label><Input type="number" value={childBusinessPrice} onChange={e => setChildBusinessPrice(e.target.value)} className="bg-slate-900 border-none text-white font-black text-xs sm:text-sm" /></div>
                      <div className="space-y-1"><Label className="text-[8px] text-slate-500 uppercase">VIP</Label><Input type="number" value={childVipPrice} onChange={e => setChildVipPrice(e.target.value)} className="bg-slate-900 border-none text-white font-black text-xs sm:text-sm" /></div>
                  </div>
               </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-xl text-xs active:scale-95 transition-all border-none">
               {saving ? <RefreshCw className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Enregistrer
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
        <div className="bg-card border border-border rounded-[1.2rem] sm:rounded-[1.5rem] p-4 sm:p-5 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3 sm:gap-5 text-left min-w-0">
                <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 ${
                    dep.type === 'BOAT' ? 'bg-blue-600' : dep.type === 'TRAIN' ? 'bg-slate-950 border border-slate-800' : dep.type === 'PLANE' ? 'bg-indigo-600' : 'bg-primary'
                }`}>
                    <TransportIcon size={20} className="sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-black text-sm sm:text-xl text-white uppercase leading-none truncate">
                        {dep.departureCity} <ArrowRight size={12} className="text-primary shrink-0" /> {dep.arrivalCity}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[8px] sm:text-[10px] font-black text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">{dep.registration}</span>
                        <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase">{dep.departureTime}</span>
                        <StatusBadge status={dep.status} />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                <div className="text-left sm:text-right">
                    <p className="text-base sm:text-xl font-black text-white leading-none">{(dep.price).toLocaleString()} F</p>
                    <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase mt-1">{dep.bookingCount}/{dep.totalSeats} Places</p>
                </div>
                <div className="flex gap-2">
                    <Link to={`/agency/passengers/${dep.id}`}>
                        <Button variant="outline" className="h-9 sm:h-10 px-2 sm:px-4 rounded-xl bg-slate-950 text-slate-300 font-black text-[8px] sm:text-[9px] uppercase">
                            <Users size={12} className="mr-1 sm:mr-2" /> Manifeste
                        </Button>
                    </Link>
                    {canEdit && (
                        <Button onClick={onEdit} variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-900 border border-border text-slate-400 hover:text-primary transition-colors">
                            <Pencil size={14} />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, bg }: any) {
    return (
        <div className="bg-card border border-border rounded-2xl sm:rounded-[1.5rem] p-3 sm:p-5 shadow-xl flex items-center gap-3 sm:gap-4 transition-all group min-h-[70px] sm:min-h-0 text-left">
            <div className={`h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl ${bg} flex items-center justify-center shrink-0 border border-white/5`}>
                <Icon className={`h-4 w-4 sm:h-6 sm:w-6 ${color}`} />
            </div>
            <div className="min-w-0 text-left">
                <p className="text-[7px] sm:text-[9px] font-black uppercase text-slate-500 tracking-tighter sm:tracking-widest leading-none mb-1 truncate">{label}</p>
                <p className={`text-sm sm:text-xl font-black tracking-tighter leading-none ${color}`}>{value}</p>
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
    return <span className={`px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-black uppercase border ${colors[status] || 'bg-slate-900 border-slate-800 text-slate-600'}`}>{status}</span>;
}

function EmptyDisplay({ message }: { message: string }) {
    return (
        <div className="py-12 sm:py-20 text-center border-2 border-dashed border-border rounded-[1.5rem] sm:rounded-[2.5rem] bg-slate-950/40">
            <Clock className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-slate-800 mb-4" />
            <p className="text-[8px] sm:text-[10px] font-black uppercase text-slate-600 tracking-widest italic">{message}</p>
        </div>
    );
}