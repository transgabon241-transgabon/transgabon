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
  ArrowRight, // <--- CORRECTION : Ajouté ici
  Users, 
  AlertCircle, 
  UserCheck, 
  CheckCircle2, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Printer,
  Hash,
  Ship,
  Bus,
  Train,
  Phone,
  CreditCard,
  Ticket
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Passenger = {
  id: string;
  bookingNumber: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: string;
  travelClass: string;
  paymentMethod: string;
  status: string;
  paymentStatus: string;
  amount: number;
  boarded: boolean;
};

type Data = {
  companyName: string;
  departureCode: string;
  vehicleRegistration: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  departureTime: string;
  transportType: string;
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const loadPassengersData = async () => {
    if (!departureId || !user) return;
    setLoading(true);

    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name), vehicle:vehicles(registration)')
        .eq('id', departureId)
        .single();

      if (tripError || !trip) throw new Error("Trajet introuvable.");

      if (user.companyId && trip.company_id !== user.companyId) {
        setUnauthorizedError("Accès refusé : Ce voyage appartient à une autre agence.");
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
            travelClass: b.travel_class || 'Éco',
            paymentMethod: b.payment_method === 'AGENCE' ? 'Cash' : b.payment_method.replace('_', ' '),
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

    } catch (err: any) {
      console.error(err);
      toast.error("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPassengersData(); }, [departureId, user]);

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      if (error) throw error;
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          passengers: prev.passengers.map(p => p.id === passengerId ? { ...p, boarded: true } : p)
        };
      });
      toast.success("Embarquement validé !");
    } catch (err) {
      toast.error("Erreur.");
    } finally {
      setBoardingId(null);
    }
  };

  const stats = useMemo(() => {
    if (!data) return { boarded: 0, total: 0 };
    return {
      boarded: data.passengers.filter(p => p.boarded).length,
      total: data.passengers.length
    };
  }, [data]);

  const totalPages = Math.ceil((data?.passengers.length || 0) / itemsPerPage);
  const currentPassengers = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return data.passengers.slice(start, start + itemsPerPage);
  }, [data, currentPage]);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full rounded-3xl" /></div>;
  if (!data) return null;

  return (
    <div className="text-foreground text-left p-4 max-w-6xl mx-auto">
      {/* HEADER SECTION - WEB */}
      <div className="print:hidden">
        <Link to="/agency/departures" className="inline-flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Retour
        </Link>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-3xl shadow-xl ${data.transportType === 'BOAT' ? 'bg-blue-600' : 'bg-primary'} text-white`}>
              {data.transportType === 'BOAT' ? <Ship size={32}/> : <Users size={32} />}
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Manifeste de Bord</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <Badge variant="outline" className="font-bold border-primary/20 text-primary">{data.departureCity} → {data.arrivalCity}</Badge>
                <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                  <Hash size={10} /> {data.vehicleRegistration}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                  N° {data.departureCode}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="bg-white border-2 border-slate-100 rounded-2xl p-3 flex items-center gap-4 shadow-sm">
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Embarqués</p>
                  <p className="text-xl font-black text-emerald-600">{stats.boarded}</p>
                </div>
                <div className="h-8 w-px bg-slate-100"></div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Attente</p>
                  <p className="text-xl font-black text-slate-300">{stats.total - stats.boarded}</p>
                </div>
             </div>
             
             {isAgencyChief && (
              <Button onClick={() => window.print()} className="gap-2 font-black rounded-xl shadow-lg h-14 px-8 border-none active:scale-95 transition-all">
                <Printer size={20} /> IMPRIMER
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* VERSION IMPRESSION OFFICIELLE */}
      <div className="hidden print:block mb-10 border-b-4 border-slate-900 pb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black uppercase text-slate-900 leading-none">{data.companyName}</h1>
            <p className="text-sm font-bold text-slate-500 tracking-[0.4em] mt-3 uppercase">Manifeste Officiel d'Embarquement</p>
          </div>
          <div className="text-right space-y-2">
             <div className="bg-slate-900 text-white px-4 py-1 rounded-lg font-black text-sm">VOYAGE : {data.departureCode}</div>
             <p className="text-xs font-bold uppercase">Date : {new Date(data.departureDate).toLocaleDateString('fr-FR')}</p>
             <p className="text-xs font-bold uppercase">Véhicule : {data.vehicleRegistration}</p>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-center gap-10 p-4 bg-slate-100 rounded-2xl font-black text-xl uppercase border-2 border-slate-200">
          <span>{data.departureCity}</span>
          <ArrowRight size={24} />
          <span>{data.arrivalCity}</span>
        </div>
      </div>

      <div className="border-2 border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-xl print:rounded-none print:border-slate-900 print:shadow-none">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b-2 print:bg-slate-100">
            <tr>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400">#</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400">Passager / Billet</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400 hidden md:table-cell">Contact</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400">Siège</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400">Règlement</th>
              <th className="text-center p-5 font-black uppercase text-[10px] text-slate-400 print:hidden">Validation</th>
              <th className="hidden print:table-cell text-left p-5 font-black uppercase text-[10px] border-l-2">Émargement</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-50">
            {(window.matchMedia('print').matches ? data.passengers : currentPassengers).map((p, i) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-5 text-slate-300 font-black">{(currentPage - 1) * itemsPerPage + (i + 1)}</td>
                <td className="p-5">
                    <p className="font-black text-slate-800 uppercase text-sm leading-none mb-1.5">{p.passengerName}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-primary font-mono bg-primary/5 px-2 py-0.5 rounded uppercase tracking-tighter border border-primary/10">
                          {p.bookingNumber}
                       </span>
                       <Badge variant="outline" className="text-[8px] font-black h-4 px-1.5 uppercase border-slate-200 text-slate-400">
                          {p.travelClass}
                       </Badge>
                    </div>
                </td>
                <td className="p-5 font-bold text-slate-500 hidden md:table-cell">
                   <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-300" />
                      {p.passengerPhone}
                   </div>
                </td>
                <td className="p-5">
                  <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs shadow-lg">
                    {p.seatNumber}
                  </div>
                </td>
                <td className="p-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                       <CreditCard size={12} className="text-slate-400" />
                       <span className="text-[10px] font-black text-slate-600 uppercase">{p.paymentMethod}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${p.paymentStatus === 'Payé' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                       {p.paymentStatus}
                    </span>
                  </div>
                </td>
                
                <td className="p-5 text-center print:hidden">
                  {p.boarded ? (
                    <div className="flex flex-col items-center gap-1">
                       <CheckCircle2 size={20} className="text-emerald-500" />
                       <span className="text-[8px] font-black text-emerald-600 uppercase">À BORD</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 text-[10px] font-black border-2 gap-2 uppercase rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                      onClick={() => handleBoardPassenger(p.id)}
                      disabled={boardingId === p.id}
                    >
                      {boardingId === p.id ? <RefreshCw size={14} className="animate-spin" /> : <UserCheck size={14} />}
                      EMBARQUER
                    </Button>
                  )}
                </td>

                <td className="hidden print:table-cell p-5 border-l-2">
                   <div className="h-8 w-40 border-b-2 border-slate-200"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION WEB */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10 print:hidden">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-2xl h-12 w-12 border-2 shadow-sm bg-white">
            <ChevronLeft size={20} />
          </Button>
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-400">
             <span className="text-primary text-sm">Page {currentPage}</span>
             <span>/</span>
             <span>{totalPages}</span>
          </div>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-2xl h-12 w-12 border-2 shadow-sm bg-white">
            <ChevronRight size={20} />
          </Button>
        </div>
      )}

      <div className="mt-10 p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col sm:flex-row justify-between items-center gap-6 print:bg-white print:text-slate-900 print:border-t-2 print:border-slate-900 print:rounded-none">
        <div className="text-left space-y-1">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Certification Gabon Mobilité</p>
          <p className="text-xs font-medium opacity-60">Le présent manifeste certifie la liste des passagers autorisés à voyager.</p>
        </div>
        <div className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
          <Users size={28} className="text-primary" />
          {data.passengers.length} Voyageurs inscrits
        </div>
      </div>
    </div>
  );
}