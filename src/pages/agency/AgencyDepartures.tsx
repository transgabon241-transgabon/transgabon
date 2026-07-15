"use client"

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Users, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

type Departure = {
  id: string;
  departureCode: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  totalSeats: number;
  bookingCount: number;
  status: string;
};

type Route = {
  id: string;
  departureCity: string;
  arrivalCity: string;
};

type Vehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  totalSeats: number;
};

export default function AgencyDepartures() {
  const { user } = useAuth();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // --- ÉTATS POUR LA PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form state
  const [routeId, setRouteId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [depDate, setDepDate] = useState('');
  const [depTime, setDepTime] = useState('');
  const [arrTime, setArrTime] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('');

  const isBoardingAgent = user?.role === 'Agent Embarquement';

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const companyId = user.companyId || null;
      if (!companyId) return;

      const { data: tripsData } = await supabase
        .from('trips')
        .select('*, from:cities!from_id(name), to:cities!to_id(name)')
        .eq('company_id', companyId)
        .order('departure_date', { ascending: true });

      const formattedDeps: Departure[] = (tripsData || []).map(t => ({
        id: t.id,
        departureCode: t.vehicle_number,
        departureCity: t.from.name,
        arrivalCity: t.to.name,
        departureDate: t.departure_date,
        departureTime: t.departure_time,
        arrivalTime: t.arrival_time,
        price: t.price,
        totalSeats: t.seats_total,
        bookingCount: t.seats_total - t.seats_left,
        status: t.status || 'Programmé'
      }));

      setDepartures(formattedDeps);
      setCurrentPage(1); // Reset à la page 1 lors du rechargement

      const { data: routesData } = await supabase.from('routes').select('*');
      const formattedRoutes: Route[] = (routesData || []).map(r => ({
        id: r.id,
        departureCity: r.departure_city,
        arrivalCity: r.arrival_city
      }));
      setRoutes(formattedRoutes);

      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', companyId);

      const formattedVehicles: Vehicle[] = (vehiclesData || []).map(v => ({
        id: v.id,
        vehicleNumber: v.name,
        vehicleType: v.type === 'TRAIN' ? 'Train' : 'Bus',
        totalSeats: v.capacity
      }));
      setVehicles(formattedVehicles);

    } catch (e: any) {
      toast.error(e.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // --- LOGIQUE DE CALCUL DE LA PAGINATION ---
  const totalPages = Math.ceil(departures.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const lastIndex = currentPage * itemsPerPage;
    const firstIndex = lastIndex - itemsPerPage;
    return departures.slice(firstIndex, lastIndex);
  }, [departures, currentPage]);

  const resetForm = () => {
    setRouteId(''); setVehicleId(''); setDepDate(''); setDepTime(''); setArrTime(''); setPrice(''); setStatus('');
    setEditId(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (dep: Departure) => {
    setEditId(dep.id);
    setDepDate(dep.departureDate);
    setDepTime(dep.departureTime);
    setArrTime(dep.arrivalTime || '');
    setPrice(String(dep.price));
    setStatus(dep.status);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user?.companyId) return;
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase
          .from('trips')
          .update({
            departure_date: depDate,
            departure_time: depTime,
            arrival_time: arrTime,
            price: Number(price),
            status: status
          })
          .eq('id', editId);

        if (error) throw new Error(error.message);
        toast.success('Trajet mis à jour avec succès !');
      } else {
        const selectedRoute = routes.find(r => r.id === routeId);
        const selectedVehicle = vehicles.find(v => v.id === vehicleId);

        if (!selectedRoute || !selectedVehicle) {
          toast.error("Veuillez sélectionner un trajet et un véhicule.");
          setSaving(false);
          return;
        }

        const { data: fromCity } = await supabase.from('cities').select('id').ilike('name', selectedRoute.departureCity.trim()).single();
        const { data: toCity } = await supabase.from('cities').select('id').ilike('name', selectedRoute.arrivalCity.trim()).single();

        if (!fromCity || !toCity) {
          toast.error("Veuillez vérifier les gares d'origine et destination.");
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from('trips')
          .insert([{
            company_id: user.companyId,
            type: selectedVehicle.vehicleType === 'Train' ? 'TRAIN' : 'BUS',
            vehicle_number: selectedVehicle.vehicleNumber,
            vehicle_id: selectedVehicle.id,
            from_id: fromCity.id,
            to_id: toCity.id,
            departure_date: depDate,
            departure_time: depTime,
            arrival_time: arrTime,
            duration_min: 240, 
            price: Number(price),
            seats_total: selectedVehicle.totalSeats,
            seats_left: selectedVehicle.totalSeats,
            status: 'Programmé'
          }]);

        if (error) throw new Error(error.message);
        toast.success('Départ créé avec succès !');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setDepartures(prev => prev.filter(d => d.id !== id));
      toast.success('Départ supprimé');
    } catch (e: any) {
      toast.error(e.message || "Erreur de suppression");
    }
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div className="text-foreground text-left">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestion des départs</h1>
        {!isBoardingAgent && (
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouveau départ</Button>
        )}
      </div>

      {departures.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl bg-card">
          <p>Aucun départ programmé</p>
          {!isBoardingAgent && (
            <Button variant="outline" className="mt-4" onClick={openCreate}>Créer un départ</Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {currentItems.map(dep => (
              <div key={dep.id} className="border rounded-xl bg-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    {dep.departureCity} <ArrowRight className="h-4 w-4 text-primary" /> {dep.arrivalCity}
                    <StatusBadge status={dep.status} />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {dep.departureCode} • {new Date(dep.departureDate + 'T00:00:00').toLocaleDateString('fr-FR')} • {dep.departureTime} • {dep.bookingCount}/{dep.totalSeats} passagers
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-between md:justify-end">
                  <span className="font-semibold text-primary mr-2">{dep.price.toLocaleString()} FCFA</span>
                  
                  <Link to={`/agency/passengers/${dep.id}`}>
                    <Button variant="outline" size="sm" title="Liste des passagers"><Users className="h-4 w-4" /></Button>
                  </Link>

                  {!isBoardingAgent && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(dep)} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive" title="Supprimer"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader className="text-left">
                            <AlertDialogTitle>Supprimer ce départ ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(dep.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* --- CONTRÔLES DE PAGINATION --- */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 bg-white p-3 rounded-2xl border w-fit mx-auto shadow-sm">
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                className="rounded-xl h-10 w-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1 text-sm font-bold">
                <span className="text-primary">{currentPage}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-500">{totalPages}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                className="rounded-xl h-10 w-10"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialog Formulaire */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-left">{editId ? 'Modifier le départ' : 'Nouveau départ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-left">
            {!editId && (
              <>
                <div>
                  <Label>Trajet</Label>
                  <Select value={routeId} onValueChange={setRouteId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir un trajet" /></SelectTrigger>
                    <SelectContent>
                      {routes.map(r => <SelectItem key={r.id} value={r.id}>{r.departureCity} → {r.arrivalCity}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Véhicule</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir un véhicule" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType} — {v.totalSeats} places)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} className="mt-1" /></div>
              <div><Label>Heure départ</Label><Input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Heure arrivée</Label><Input type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} className="mt-1" /></div>
              <div><Label>Prix (FCFA)</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="mt-1" /></div>
            </div>
            {editId && (
              <div>
                <Label>Statut d&apos;acheminement</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Programmé', 'Embarquement', 'Parti', 'Arrivé', 'Annulé'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Programmé': 'bg-blue-100 text-blue-800',
    'Embarquement': 'bg-orange-100 text-orange-800',
    'Parti': 'bg-emerald-100 text-emerald-800',
    'Arrivé': 'bg-green-100 text-green-800',
    'Annulé': 'bg-red-100 text-red-800',
    'En attente': 'bg-yellow-100 text-yellow-800',
    'Confirmé': 'bg-green-100 text-green-800',
    'Terminé': 'bg-blue-100 text-blue-800',
    'Remboursé': 'bg-gray-100 text-gray-800',
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[status] || 'bg-muted'}`}>{status}</span>;
}