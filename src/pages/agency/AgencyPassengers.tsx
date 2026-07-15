"use client"

import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Users, 
  AlertCircle, 
  UserCheck, 
  CheckCircle2, 
  RefreshCw,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';

type Passenger = {
  id: string;
  bookingNumber: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: string;
  status: string;
  paymentStatus: string;
  amount: number;
  boarded: boolean;
};

type Data = {
  departureCode: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  departureTime: string;
  passengers: Passenger[];
};

export default function AgencyPassengers() {
  const { departureId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorizedError, setUnauthorizedError] = useState<string | null>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  // --- ÉTATS POUR LA PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const loadPassengersData = async () => {
    if (!departureId || !user) return;
    setLoading(true);
    setUnauthorizedError(null);

    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('*, from:cities!from_id(name), to:cities!to_id(name)')
        .eq('id', departureId)
        .single();

      if (tripError || !trip) throw new Error("Trajet introuvable.");

      const agentCompanyId = user.companyId || null;
      const userRole = user.role?.toUpperCase();
      const isAgencyStaff = ['AGENT', 'AGENCE_EMBARQUEMENT', 'CAISSIER', 'ADMIN'].includes(userRole || '');

      if (isAgencyStaff && agentCompanyId && trip.company_id !== agentCompanyId) {
        setUnauthorizedError("Accès refusé : Vous n'êtes pas autorisé à consulter cette liste.");
        setLoading(false);
        return;
      }

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, passengers(*)')
        .eq('trip_id', departureId)
        .not('status', 'in', '("ANNULE", "REMBOURSE")');

      if (bookingsError) throw new Error(bookingsError.message);

      const passengersList: Passenger[] = [];
      
      (bookings || []).forEach(b => {
        b.passengers.forEach((p: any) => {
          passengersList.push({
            id: p.id,
            bookingNumber: b.reference,
            passengerName: `${p.first_name} ${p.last_name}`,
            passengerPhone: b.contact_phone,
            seatNumber: p.seat_number || '—',
            status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'EN_ATTENTE_PAIEMENT' ? 'En attente' : b.status,
            paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
            amount: Math.round(b.total_amount / (b.passengers?.length || 1)),
            boarded: p.boarded ?? false
          });
        });
      });

      setData({
        departureCode: trip.vehicle_number,
        departureCity: trip.from.name,
        arrivalCity: trip.to.name,
        departureDate: trip.departure_date,
        departureTime: trip.departure_time,
        passengers: passengersList
      });
      setCurrentPage(1); // Reset pagination au chargement

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur de communication.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassengersData();
  }, [departureId, user]);

  // --- LOGIQUE DE CALCUL DE LA PAGINATION ---
  const totalPages = useMemo(() => {
    return data ? Math.ceil(data.passengers.length / itemsPerPage) : 0;
  }, [data]);

  const currentPassengers = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return data.passengers.slice(start, start + itemsPerPage);
  }, [data, currentPage]);

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      const { error } = await supabase
        .from('passengers')
        .update({ boarded: true })
        .eq('id', passengerId);

      if (error) throw error;

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          passengers: prev.passengers.map((p) =>
            p.id === passengerId ? { ...p, boarded: true } : p
          ),
        };
      });

      toast.success("Passager enregistré à bord !");
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setBoardingId(null);
    }
  };

  if (loading) return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    </div>
  );

  if (unauthorizedError) {
    return (
      <div className="container mx-auto px-4 py-12 text-center max-w-sm space-y-4">
        <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
        <h3 className="font-bold text-lg">Accès non autorisé</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{unauthorizedError}</p>
        <Button variant="outline" className="w-full" onClick={() => navigate('/agency/departures')}>Retour aux départs</Button>
      </div>
    );
  }

  if (!data) return <p className="text-center py-12 text-muted-foreground">Données introuvables</p>;

  return (
    <div className="text-foreground text-left p-4">
      <Link to="/agency/departures" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour aux départs
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Liste des passagers</h1>
          <p className="text-muted-foreground text-sm uppercase font-semibold">
            {data.departureCode} • {data.departureCity} → {data.arrivalCity}
          </p>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-4 font-semibold">#</th>
              <th className="text-left p-4 font-semibold">N° Billet</th>
              <th className="text-left p-4 font-semibold">Passager</th>
              <th className="text-left p-4 font-semibold hidden lg:table-cell">Téléphone</th>
              <th className="text-left p-4 font-semibold">Siège</th>
              <th className="text-left p-4 font-semibold">Paiement</th>
              <th className="text-left p-4 font-semibold text-center">Embarquement</th>
              <th className="text-right p-4 font-semibold">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.passengers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground italic">
                  Aucun passager enregistré pour ce voyage.
                </td>
              </tr>
            ) : (
              currentPassengers.map((p, i) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4 text-muted-foreground">
                    {(currentPage - 1) * itemsPerPage + (i + 1)}
                  </td>
                  <td className="p-4 font-mono text-xs font-bold text-primary">{p.bookingNumber}</td>
                  <td className="p-4 font-medium">{p.passengerName}</td>
                  <td className="p-4 hidden lg:table-cell text-muted-foreground">{p.passengerPhone}</td>
                  <td className="p-4">
                    <span className="bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-md text-xs font-bold">
                      {p.seatNumber}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${p.paymentStatus === 'Payé' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      {p.boarded ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirmé
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 font-bold border-primary/30 text-primary hover:bg-primary hover:text-white transition-all"
                          onClick={() => handleBoardPassenger(p.id)}
                          disabled={boardingId === p.id}
                        >
                          {boardingId === p.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                          Embarquer
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right font-bold text-slate-700">
                    {p.amount.toLocaleString()} <span className="text-[10px] text-muted-foreground ml-0.5">FCFA</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm font-medium text-slate-600 italic">
          * Liste mise à jour en temps réel
        </div>
        <div className="text-base font-bold text-primary bg-white px-4 py-2 rounded-lg shadow-sm border">
          Total : {data.passengers.length} passager(s) • {data.passengers.reduce((s, p) => s + p.amount, 0).toLocaleString()} FCFA
        </div>
      </div>
    </div>
  );
}