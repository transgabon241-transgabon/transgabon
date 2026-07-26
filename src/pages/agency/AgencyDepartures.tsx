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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // AJOUT DES TABS
import { 
  Plus, Pencil, Trash2, Users, ArrowRight, ChevronLeft, ChevronRight, 
  Ship, Train, Bus, Plane, Save, RefreshCw, Hash, MapPin, Clock, X,
  BarChart3, Activity, PieChart, Percent, TrendingUp, CalendarDays
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

  // Form states
  const [routeId, setRouteId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [depDate, setDepDate] = useState('');
  const [depTime, setDepTime] = useState('');
  const [arrTime, setArrTime] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('');

  const canEdit = user?.role === 'Agent' || user?.role === 'Administrateur';

  // --- LOGIQUE DE FILTRAGE PAR DATE ---
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const categorizedTrips = useMemo(() => {
    return {
      today: departures.filter(d => d.departureDate === todayStr),
      upcoming: departures.filter(d => d.departureDate > todayStr),
      past: departures.filter(d => d.departureDate < todayStr),
    };
  }, [departures, todayStr]);

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data: citiesData } = await supabase.from('cities').select('id, name').order('name');
      if (citiesData) setCities(citiesData);

      const { data: tripsData } = await supabase
        .from('trips')
        .select(`*, from:cities!from_id(name), to:cities!to_id(name), vehicle:vehicles(registration), trip_stops(*)`)
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
        totalSeats: t.seats_total || 0,
        bookingCount: (t.seats_total || 0) - (t.seats_left || 0),
        status: t.status || 'Programmé',
        type: t.type,
        stops: t.trip_stops || []
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
        price: Number(price) || 0, status: status || 'Programmé'
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
    } catch (e: any) { toast.error("Erreur"); }
    finally { setSaving(false); }
  };

  const resetForm = () => {
    setEditId(null); setRouteId(''); setVehicleId(''); setDepDate(''); setDepTime(''); setArrTime('');
    setPrice(''); setStatus('');
  };

  if (loading && departures.length === 0) return <div className="p-10 text-center animate-pulse text-slate-500 font-black uppercase">Chargement...</div>;

  return (
    <div className="w-full max-w-6xl mx-auto p-2 md:p-4 text-left space-y-8 animate-in fade-in duration-500 bg-background text-foreground pb-20">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-2 bg-card p-6 rounded-[2rem] border-2 border-border shadow-xl">
        <div className="text-left flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
            <CalendarDays size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black italic text-white uppercase tracking-tighter leading-none">Planning de la flotte</h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Organisation des départs</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full sm:w-auto rounded-xl font-black gap-2 h-14 px-8 shadow-2xl bg-primary text-white border-none active:scale-95 transition-all">
            <Plus size={20} /> PROGRAMMER UN VOYAGE
          </Button>
        )}
      </div>

      <Tabs defaultValue="today" className="w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
            <TabsList className="bg-slate-900 border-2 border-slate-800 p-1 rounded-2xl h-auto flex w-full md:w-fit">
                <TabsTrigger value="today" className="flex-1 md:w-48 rounded-xl font-black uppercase text-[10px] py-3 data-[state=active]:bg-slate-800 data-[state=active]:text-primary">
                    Aujourd'hui <span className="ml-2 opacity-50">({categorizedTrips.today.length})</span>
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="flex-1 md:w-48 rounded-xl font-black uppercase text-[10px] py-3 data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
                    Prochainement <span className="ml-2 opacity-50">({categorizedTrips.upcoming.length})</span>
                </TabsTrigger>
                <TabsTrigger value="past" className="flex-1 md:w-48 rounded-xl font-black uppercase text-[10px] py-3 data-[state=active]:bg-slate-800 data-[state=active]:text-slate-500">
                    Archives
                </TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="today" className="space-y-4 outline-none">
            {categorizedTrips.today.length === 0 ? (
                <EmptyDisplay message="Aucun départ prévu pour ce jour" />
            ) : (
                categorizedTrips.today.map(dep => <DepartureCard key={dep.id} dep={dep} canEdit={canEdit} onEdit={openEdit} onRefresh={loadData} />)
            )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4 outline-none">
            {categorizedTrips.upcoming.length === 0 ? (
                <EmptyDisplay message="Aucune programmation future" />
            ) : (
                categorizedTrips.upcoming.map(dep => <DepartureCard key={dep.id} dep={dep} canEdit={canEdit} onEdit={openEdit} onRefresh={loadData} />)
            )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 outline-none">
            {categorizedTrips.past.length === 0 ? (
                <EmptyDisplay message="Aucun historique disponible" />
            ) : (
                categorizedTrips.past.map(dep => <DepartureCard key={dep.id} dep={dep} canEdit={canEdit} onEdit={openEdit} onRefresh={loadData} />)
            )}
        </TabsContent>
      </Tabs>

      {/* MODAL FORMULAIRE (Similaire à l'original, gardé pour la cohérence) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        {/* ... contenu du dialogue identique à votre original ... */}
      </Dialog>
    </div>
  );
}

// --- SOUS-COMPOSANT : CARTE DE DÉPART ---
function DepartureCard({ dep, canEdit, onEdit, onRefresh }: any) {
    const TransportIcon = dep.type === 'BOAT' ? Ship : dep.type === 'TRAIN' ? Train : dep.type === 'PLANE' ? Plane : Bus;

    return (
        <div className="bg-card border border-border rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-6 hover:border-primary/30 transition-all group">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5 text-left">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${
                        dep.type === 'BOAT' ? 'bg-blue-600' : 
                        dep.type === 'TRAIN' ? 'bg-slate-950 border border-slate-800' : 
                        dep.type === 'PLANE' ? 'bg-indigo-600' : 'bg-primary'
                    }`}>
                        <TransportIcon size={24} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 font-black text-lg md:text-xl text-white uppercase leading-none">
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
                        <p className="text-[9px] font-black text-slate-500 uppercase mt-1">{dep.bookingCount}/{dep.totalSeats} Places</p>
                    </div>
                    <div className="flex gap-2">
                        <Link to={`/agency/passengers/${dep.id}`}>
                            <Button variant="outline" size="sm" className="h-10 rounded-xl border-border bg-slate-950 text-slate-300 font-black text-[9px] uppercase hover:bg-slate-800 hover:text-white">
                                <Users size={14} className="mr-2" /> Manifeste
                            </Button>
                        </Link>
                        {canEdit && (
                            <Button onClick={() => onEdit(dep)} variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-900 border border-border text-slate-400 hover:text-primary">
                                <Pencil size={18} />
                            </Button>
                        )}
                    </div>
                </div>
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