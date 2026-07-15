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
  ChevronRight,
  Printer // Ajout de l'icône
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
  companyName: string; // Ajouté pour l'entête
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

  // --- LOGIQUE DE SÉCURITÉ ---
  const userRole = user?.role?.toUpperCase();
  const isAgencyChief = userRole === 'AGENT' || userRole === 'ADMIN';

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
        .select('*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name)')
        .eq('id', departureId)
        .single();

      if (tripError || !trip) throw new Error("Trajet introuvable.");

      const agentCompanyId = user.companyId || null;
      const isAgencyStaff = ['AGENT', 'AGENCE_EMBARQUEMENT', 'CAISSIER', 'ADMIN'].includes(userRole || '');

      if (isAgencyStaff && agentCompanyId && trip.company_id !== agentCompanyId) {
        setUnauthorizedError("Accès refusé.");
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
            status: b.status === 'PAYE' ? 'Confirmé' : 'En attente',
            paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
            amount: Math.round(b.total_amount / (b.passengers?.length || 1)),
            boarded: p.boarded ?? false
          });
        });
      });

      setData({
        companyName: trip.company.name,
        departureCode: trip.vehicle_number,
        departureCity: trip.from.name,
        arrivalCity: trip.to.name,
        departureDate: trip.departure_date,
        departureTime: trip.departure_time,
        passengers: passengersList
      });
      setCurrentPage(1);

    } catch (err: any) {
      toast.error("Erreur de communication.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPassengersData(); }, [departureId, user]);

  const totalPages = useMemo(() => data ? Math.ceil(data.passengers.length / itemsPerPage) : 0, [data]);
  const currentPassengers = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return data.passengers.slice(start, start + itemsPerPage);
  }, [data, currentPage]);

  const handlePrint = () => {
    window.print();
  };

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, passengers: prev.passengers.map(p => p.id === passengerId ? { ...p, boarded: true } : p) };
      });
      toast.success("Embarqué !");
    } finally {
      setBoardingId(null);
    }
  };

  if (loading) return <div className="p-8"><Skeleton className="h-64 w-full rounded-3xl" /></div>;
  if (unauthorizedError) return <div className="p-20 text-center font-bold text-red-500">{unauthorizedError}</div>;
  if (!data) return null;

  return (
    <div className="text-foreground text-left p-4">
      {/* HEADER SECTION - CACHÉ À L'IMPRESSION */}
      <div className="print:hidden">
        <Link to="/agency/departures" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour aux départs
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic">Manifeste Passagers</h1>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                {data.departureCode} • {data.departureCity} → {data.arrivalCity}
              </p>
            </div>
          </div>
          
          {/* BOUTON D'IMPRESSION RÉSERVÉ AU CHEF D'AGENCE / ADMIN */}
          {isAgencyChief && (
            <Button onClick={handlePrint} className="gap-2 font-black rounded-xl shadow-lg h-11 px-6">
              <Printer className="h-4 w-4" /> IMPRIMER (PDF)
            </Button>
          )}
        </div>
      </div>

      {/* --- VERSION IMPRIMABLE (Visible uniquement sur papier/PDF) --- */}
      <div className="hidden print:block mb-8 border-b-4 border-primary pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase text-primary">{data.companyName}</h1>
            <p className="text-sm font-bold text-slate-500 tracking-widest">MANIFESTE DE DÉPART OFFICIEL</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold uppercase">Date: {new Date(data.departureDate).toLocaleDateString('fr-FR')}</p>
             <p className="text-xs font-bold uppercase">Heure: {data.departureTime}</p>
             <p className="text-xs font-bold uppercase text-primary">N° Voyage: {data.departureCode}</p>
          </div>
        </div>
        <div className="mt-4 text-center p-2 bg-slate-100 rounded-lg font-black text-sm uppercase">
          {data.departureCity} ➔ {data.arrivalCity}
        </div>
      </div>

      <div className="border-2 rounded-3xl overflow-hidden bg-card shadow-sm print:border-none print:shadow-none">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b-2 print:bg-slate-50">
            <tr>
              <th className="text-left p-4 font-black uppercase text-[10px]">#</th>
              <th className="text-left p-4 font-black uppercase text-[10px]">N° Billet</th>
              <th className="text-left p-4 font-black uppercase text-[10px]">Passager</th>
              <th className="text-left p-4 font-black uppercase text-[10px]">Téléphone</th>
              <th className="text-left p-4 font-black uppercase text-[10px]">Siège</th>
              <th className="text-left p-4 font-black uppercase text-[10px] print:hidden">Embarquement</th>
              {/* Colonne signature pour le papier */}
              <th className="hidden print:table-cell text-left p-4 font-black uppercase text-[10px]">Signature</th>
              <th className="text-right p-4 font-black uppercase text-[10px] print:hidden">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-border">
            {/* À l'impression, on peut vouloir imprimer TOUT le monde, pas juste la page actuelle */}
            {/* Si c'est le cas, remplace currentPassengers par data.passengers ici */}
            {(window.matchMedia('print').matches ? data.passengers : currentPassengers).map((p, i) => (
              <tr key={p.id} className="hover:bg-muted/10 transition-colors print:break-inside-avoid">
                <td className="p-4 text-muted-foreground font-bold">{(currentPage - 1) * itemsPerPage + (i + 1)}</td>
                <td className="p-4 font-mono text-xs font-black text-primary uppercase">{p.bookingNumber}</td>
                <td className="p-4 font-bold text-slate-800">{p.passengerName}</td>
                <td className="p-4 font-medium text-slate-500">{p.passengerPhone}</td>
                <td className="p-4">
                  <Badge variant="secondary" className="font-black rounded-lg">{p.seatNumber}</Badge>
                </td>
                
                {/* INTERFACE WEB : BOUTONS */}
                <td className="p-4 text-center print:hidden">
                  {p.boarded ? (
                    <span className="text-emerald-600 font-black text-[10px] uppercase flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> À BORD
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[10px] font-black border-2 gap-1 uppercase"
                      onClick={() => handleBoardPassenger(p.id)}
                      disabled={boardingId === p.id}
                    >
                      {boardingId === p.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                      Embarquer
                    </Button>
                  )}
                </td>

                {/* VERSION PAPIER : CASE VIDE POUR SIGNATURE */}
                <td className="hidden print:table-cell p-4 border-l">
                   <div className="h-6 w-24 border-b border-slate-300"></div>
                </td>

                <td className="p-4 text-right font-black text-slate-700 print:hidden">
                  {p.amount.toLocaleString()} <span className="text-[9px] text-muted-foreground">F</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION (CACHÉE À L'IMPRESSION) --- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 print:hidden">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border-2">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* FOOTER MANIFESTE (PAPIER) */}
      <div className="hidden print:flex justify-between mt-12 px-4 border-t pt-4">
        <div className="text-center">
          <p className="text-[10px] font-black uppercase text-slate-400">Signature Chauffeur / Pilote</p>
          <div className="mt-8 h-12 w-48 border border-dashed border-slate-200 rounded-lg"></div>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase text-slate-400">Cachet & Signature Agence</p>
          <div className="mt-8 h-12 w-48 border border-dashed border-slate-200 rounded-lg"></div>
        </div>
      </div>

      <div className="mt-6 p-6 bg-slate-50 rounded-3xl border-2 border-dashed flex flex-col sm:flex-row justify-between items-center gap-4 print:bg-white print:border-none">
        <div className="text-xs font-bold text-slate-500 italic">
          * Manifeste généré le {new Date().toLocaleString('fr-FR')}
        </div>
        <div className="text-lg font-black text-primary bg-white px-6 py-2 rounded-2xl shadow-sm border-2">
          Total : {data.passengers.length} passager(s)
        </div>
      </div>
    </div>
  );
}