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
  Printer,
  Hash, // Ajout icône immatriculation
  Ship,
  Bus,
  Train
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Passenger = {
  id: string;
  bookingNumber: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: string;
  travelClass: string; // NOUVEAU
  status: string;
  paymentStatus: string;
  amount: number;
  boarded: boolean;
};

type Data = {
  companyName: string;
  departureCode: string;
  vehicleRegistration: string; // NOUVEAU
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  departureTime: string;
  transportType: string; // NOUVEAU
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

  const userRole = user?.role?.toUpperCase();
  const isAgencyChief = userRole === 'AGENT' || userRole === 'ADMIN';

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const loadPassengersData = async () => {
    if (!departureId || !user) return;
    setLoading(true);

    try {
      // MISE À JOUR QUERY : Jointure avec vehicles pour la registration
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name), vehicle:vehicles(registration)')
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
            travelClass: b.travel_class || 'Éco', // RÉCUPÉRATION DE LA CLASSE
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
        vehicleRegistration: trip.vehicle?.registration || '—',
        departureCity: trip.from.name,
        arrivalCity: trip.to.name,
        departureDate: trip.departure_date,
        departureTime: trip.departure_time,
        transportType: trip.type,
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

  if (loading) return <div className="p-8"><Skeleton className="h-64 w-full rounded-3xl" /></div>;
  if (!data) return null;

  return (
    <div className="text-foreground text-left p-4">
      {/* HEADER SECTION - WEB */}
      <div className="print:hidden">
        <Link to="/agency/departures" className="inline-flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Retour aux départs
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-lg ${data.transportType === 'BOAT' ? 'bg-blue-600' : 'bg-primary'} text-white`}>
              {data.transportType === 'BOAT' ? <Ship size={24}/> : <Users size={24} />}
            </div>
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tighter">Manifeste Passagers</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">{data.departureCity} → {data.arrivalCity}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1 text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 uppercase">
                  <Hash size={10} /> {data.vehicleRegistration}
                </span>
              </div>
            </div>
          </div>
          
          {isAgencyChief && (
            <Button onClick={() => window.print()} className="gap-2 font-black rounded-xl shadow-lg h-11 px-6">
              <Printer className="h-4 w-4" /> IMPRIMER LE MANIFESTE
            </Button>
          )}
        </div>
      </div>

      {/* --- VERSION IMPRIMABLE (PAPIER/PDF) --- */}
      <div className="hidden print:block mb-8 border-b-4 border-slate-900 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black uppercase text-slate-900 leading-none">{data.companyName}</h1>
            <p className="text-sm font-bold text-slate-500 tracking-[0.3em] mt-2">MANIFESTE D'EMBARQUEMENT</p>
          </div>
          <div className="text-right space-y-1">
             <p className="text-xs font-black uppercase bg-slate-900 text-white px-3 py-1 rounded">N° VOYAGE : {data.departureCode}</p>
             <p className="text-xs font-bold uppercase">Date : {new Date(data.departureDate).toLocaleDateString('fr-FR')}</p>
             <p className="text-xs font-bold uppercase text-primary">Matériel : {data.vehicleRegistration}</p>
          </div>
        </div>
        <div className="mt-6 text-center p-3 bg-slate-100 rounded-xl font-black text-lg uppercase tracking-widest border-2 border-slate-200">
          {data.departureCity} ➔ {data.arrivalCity}
        </div>
      </div>

      {/* TABLEAU DES PASSAGERS */}
      <div className="border-2 rounded-[2rem] overflow-hidden bg-card shadow-sm print:border-slate-900 print:rounded-none">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b-2 print:bg-slate-100">
            <tr>
              <th className="text-left p-4 font-black uppercase text-[10px]">#</th>
              <th className="text-left p-4 font-black uppercase text-[10px]">Passager</th>
              <th className="text-left p-4 font-black uppercase text-[10px] hidden md:table-cell">Téléphone</th>
              <th className="text-left p-4 font-black uppercase text-[10px]">Siège</th>
              <th className="text-left p-4 font-black uppercase text-[10px]">Classe</th> {/* NOUVEAU */}
              <th className="text-left p-4 font-black uppercase text-[10px] print:hidden text-center">Statut</th>
              <th className="hidden print:table-cell text-left p-4 font-black uppercase text-[10px] border-l-2">Émargement</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-50 print:divide-slate-200">
            {(window.matchMedia('print').matches ? data.passengers : currentPassengers).map((p, i) => (
              <tr key={p.id} className="hover:bg-muted/10 transition-colors print:break-inside-avoid">
                <td className="p-4 text-muted-foreground font-bold">{(currentPage - 1) * itemsPerPage + (i + 1)}</td>
                <td className="p-4 font-bold text-slate-800 uppercase text-xs">{p.passengerName}</td>
                <td className="p-4 font-medium text-slate-500 hidden md:table-cell">{p.passengerPhone}</td>
                <td className="p-4">
                  <Badge className="font-black rounded-lg bg-slate-100 text-slate-700 border-none shadow-none">{p.seatNumber}</Badge>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${p.travelClass === 'VIP' ? 'text-amber-600' : p.travelClass === 'Business' ? 'text-blue-600' : 'text-slate-500'}`}>
                    {p.travelClass}
                  </span>
                </td>
                
                {/* WEB VIEW */}
                <td className="p-4 text-center print:hidden">
                  {p.boarded ? (
                    <span className="text-emerald-600 font-black text-[9px] uppercase flex items-center justify-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      <CheckCircle2 size={12} /> À BORD
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[9px] font-black border-2 gap-1 uppercase rounded-lg hover:bg-primary/5 transition-all"
                      onClick={() => handleBoardPassenger(p.id)}
                      disabled={boardingId === p.id}
                    >
                      {boardingId === p.id ? <RefreshCw size={12} className="animate-spin" /> : <UserCheck size={12} />}
                      Valider
                    </Button>
                  )}
                </td>

                {/* PRINT VIEW */}
                <td className="hidden print:table-cell p-4 border-l-2">
                   <div className="h-6 w-32 border-b border-slate-300"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION WEB */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 print:hidden">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border-2 shadow-sm">
            <ChevronLeft size={18} />
          </Button>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border-2 shadow-sm">
            <ChevronRight size={18} />
          </Button>
        </div>
      )}

      {/* FOOTER MANIFESTE (PAPIER) */}
      <div className="hidden print:grid grid-cols-2 mt-12 px-4 gap-20">
        <div className="text-center">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-8">Visa du Chef de Bord / Chauffeur</p>
          <div className="h-20 w-full border-2 border-slate-200 rounded-2xl"></div>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-8">Cachet et Signature de l'Agence</p>
          <div className="h-20 w-full border-2 border-slate-200 rounded-2xl"></div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 print:bg-white print:border-none print:mt-4">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Manifeste édité par Gabon Mobilité le {new Date().toLocaleString('fr-FR')}
        </div>
        <div className="text-xl font-black text-primary uppercase tracking-tighter">
          Total : {data.passengers.length} passagers
        </div>
      </div>
    </div>
  );
}