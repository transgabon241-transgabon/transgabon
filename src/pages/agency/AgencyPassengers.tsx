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
  CheckCircle2, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Printer,
  Hash,
  Ship,
  Bus,
  Train,
  MapPin,
  UserCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Passenger = {
  id: string;
  bookingNumber: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: string;
  travelClass: string;
  destination: string;
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
  const [boardingId, setBoardingId] = useState<string | null>(null);

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
        toast.error("Accès refusé");
        return;
      }

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, passengers(*)')
        .eq('trip_id', departureId)
        .not('status', 'in', '("ANNULE", "REMBOURSE")');

      if (bookingsError) throw new Error(bookingsError.message);

      const passengersList: Passenger[] = [];
      const classMapping: Record<string, string> = {
        'VIP': 'VIP', 'BUSINESS': 'Business', '1ERE_CLASSE': '1ère Cl.', '2EME_CLASSE': '2ème Cl.', 'ECO': 'Éco', 'STANDARD': 'Std'
      };

      (bookings || []).forEach(b => {
        b.passengers.forEach((p: any) => {
          passengersList.push({
            id: p.id,
            bookingNumber: b.reference,
            passengerName: `${p.first_name} ${p.last_name}`,
            passengerPhone: b.contact_phone,
            seatNumber: p.seat_number || '—',
            travelClass: classMapping[b.class_type] || 'Std',
            destination: b.arrival_city_name || trip.to.name,
            paymentMethod: b.payment_method === 'AGENCE' ? 'Cash' : b.payment_method.replace('_', ' '),
            status: b.status === 'PAYE' ? 'Confirmé' : 'En attente',
            paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
            amount: Math.round((b.total_amount || 0) / (b.passengers?.length || 1)),
            boarded: p.boarded ?? false
          });
        });
      });

      passengersList.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, {numeric: true}));

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
      toast.error("Erreur manifeste.");
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
      setData(prev => prev ? {
        ...prev,
        passengers: prev.passengers.map(p => p.id === passengerId ? { ...p, boarded: true } : p)
      } : null);
      toast.success("Embarquement validé");
    } catch (err) { toast.error("Erreur technique"); }
    finally { setBoardingId(null); }
  };

  const currentPassengers = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return data.passengers.slice(start, start + itemsPerPage);
  }, [data, currentPage]);

  const stats = useMemo(() => {
    if (!data) return { boarded: 0, total: 0 };
    return {
      boarded: data.passengers.filter(p => p.boarded).length,
      total: data.passengers.length
    };
  }, [data]);

  const totalPages = Math.ceil((data?.passengers.length || 0) / itemsPerPage);
  const TransportIcon = data?.transportType === 'TRAIN' ? Train : data?.transportType === 'BOAT' ? Ship : Bus;

  if (loading) return <div className="p-4 space-y-4 bg-background min-h-screen"><Skeleton className="h-12 w-48 bg-slate-800" /><Skeleton className="h-64 w-full rounded-3xl bg-slate-800" /></div>;
  if (!data) return null;

  return (
    <div className="bg-background text-foreground text-left p-2 md:p-4 max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {/* HEADER WEB */}
      <div className="print:hidden">
        <Link to="/agency/departures" className="inline-flex items-center gap-3 text-xs font-black uppercase text-slate-500 hover:text-primary mb-6 transition-all tracking-widest">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Retour aux départs</span>
        </Link>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl ${data.transportType === 'BOAT' ? 'bg-blue-600' : data.transportType === 'TRAIN' ? 'bg-slate-950 border border-slate-800' : 'bg-primary'} text-white`}>
               <TransportIcon className="h-6 w-6 md:h-10 md:w-10" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-white leading-none">Manifeste</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="font-black text-[10px] border-primary/30 text-primary bg-primary/5 px-2 py-0.5">{data.departureCity} ➔ {data.arrivalCity}</Badge>
                <span className="text-[10px] font-black text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 uppercase tracking-tighter">
                   {data.vehicleRegistration}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
             <div className="bg-slate-900 border border-slate-800 p-3 md:p-5 rounded-[1.25rem] md:rounded-[1.5rem] flex items-center gap-4 md:gap-8 shadow-xl flex-1 lg:flex-none">
                <div className="text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Présents</p>
                    <p className="text-xl md:text-3xl font-black text-emerald-400 leading-none">{stats.boarded}</p>
                </div>
                <div className="text-center border-l border-slate-800 pl-4 md:pl-8">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-xl md:text-3xl font-black text-white leading-none">{stats.total}</p>
                </div>
             </div>
             <Button onClick={() => window.print()} className="gap-3 font-black rounded-xl h-14 md:h-20 px-6 md:px-10 shadow-xl text-xs md:text-base flex-1 md:flex-none bg-primary text-white hover:bg-primary/90">
                <Printer size={20} /> <span className="hidden sm:inline">IMPRIMER</span>
             </Button>
          </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="border border-slate-800 rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-slate-900 shadow-2xl print:shadow-none print:border-slate-900 print:rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-base min-w-[600px]">
            <thead className="bg-slate-950 border-b border-slate-800 print:bg-slate-100">
              <tr>
                <th className="text-left p-4 md:p-6 font-black uppercase text-[10px] text-slate-500 tracking-widest">#</th>
                <th className="text-left p-4 md:p-6 font-black uppercase text-[10px] text-slate-500 tracking-widest">Passager</th>
                <th className="text-center p-4 md:p-6 font-black uppercase text-[10px] text-slate-500 tracking-widest">Siège</th>
                <th className="text-left p-4 md:p-6 font-black uppercase text-[10px] text-slate-500 tracking-widest hidden sm:table-cell">Classe</th>
                <th className="text-left p-4 md:p-6 font-black uppercase text-[10px] text-slate-500 tracking-widest">Destination</th>
                <th className="text-center p-4 md:p-6 font-black uppercase text-[10px] text-slate-500 tracking-widest print:hidden">Contrôle</th>
                <th className="hidden print:table-cell text-left p-6 font-black uppercase text-[10px] border-l border-slate-200">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {currentPassengers.map((p, i) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="p-4 md:p-6 text-slate-600 font-black text-sm md:text-lg">{(currentPage - 1) * itemsPerPage + (i + 1)}</td>
                  <td className="p-4 md:p-6">
                      <p className="font-black text-white uppercase text-sm md:text-lg leading-tight mb-1">{p.passengerName}</p>
                      <p className="text-[10px] font-mono text-primary font-bold tracking-widest hidden sm:block">{p.bookingNumber}</p>
                  </td>
                  <td className="p-4 md:p-6 text-center">
                    <div className="inline-flex h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-slate-950 border border-slate-800 items-center justify-center text-primary font-black text-sm md:text-lg shadow-inner">
                        {p.seatNumber}
                    </div>
                  </td>
                  <td className="p-4 md:p-6 hidden sm:table-cell">
                    <Badge variant="outline" className={`text-[9px] font-black uppercase border-2 px-3 py-1 ${p.travelClass.includes('VIP') || p.travelClass.includes('1ERE') ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'text-slate-400 border-slate-800 bg-slate-950'}`}>
                        {p.travelClass}
                    </Badge>
                  </td>
                  <td className="p-4 md:p-6">
                    <div className="flex items-center gap-2 font-black text-slate-300 uppercase text-[10px] md:text-sm tracking-tighter">
                        <MapPin size={14} className="text-primary shrink-0" />
                        <span className="truncate max-w-[80px] md:max-w-none">{p.destination}</span>
                    </div>
                  </td>
                  <td className="p-4 md:p-6 text-center print:hidden">
                    {p.boarded ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-[9px] uppercase tracking-widest">
                          <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" strokeWidth={3} /> <span className="hidden sm:inline">À BORD</span>
                      </div>
                    ) : (
                      <Button 
                          size="sm"
                          className="h-10 md:h-14 px-4 md:px-8 font-black uppercase rounded-xl md:rounded-2xl bg-slate-950 text-slate-300 border border-slate-800 hover:bg-emerald-600 hover:text-white hover:border-transparent shadow-lg text-[9px] md:text-xs transition-all"
                          onClick={() => handleBoardPassenger(p.id)}
                          disabled={boardingId === p.id}
                      >
                          {boardingId === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4 md:h-5 md:w-5 mr-0 md:mr-2" />}
                          <span className="hidden md:inline">Embarquer</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 md:gap-8 mt-10 print:hidden">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl md:rounded-[1.5rem] h-12 w-12 md:h-16 md:w-16 border-2 border-slate-800 bg-slate-900 text-slate-400 shadow-xl hover:bg-slate-800 hover:text-white"><ChevronLeft size={24} /></Button>
          <div className="text-[10px] md:text-sm font-black uppercase text-slate-500 tracking-widest bg-slate-900 px-4 md:px-8 py-2 md:py-3 rounded-full border border-slate-800 shadow-xl">PAGE {currentPage} / {totalPages}</div>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl md:rounded-[1.5rem] h-12 w-12 md:h-16 md:w-16 border-2 border-slate-800 bg-slate-900 text-slate-400 shadow-xl hover:bg-slate-800 hover:text-white"><ChevronRight size={24} /></Button>
        </div>
      )}

      {/* FOOTER MANIFESTE */}
      <div className="mt-10 md:mt-16 p-6 md:p-10 bg-slate-950 border border-slate-800 rounded-[2rem] md:rounded-[3rem] text-white flex flex-col sm:flex-row justify-between items-center gap-6 print:bg-white print:text-black print:border-t-4 print:border-black print:rounded-none">
        <div className="text-left space-y-2">
          <p className="text-[10px] font-black uppercase text-primary tracking-[0.4em]">Certification TransGabon Connect</p>
          <p className="text-[9px] md:text-sm font-medium text-slate-500 italic max-w-md leading-relaxed">Document officiel de transport de voyageurs.</p>
        </div>
        <div className="text-xl md:text-4xl font-black uppercase tracking-tighter flex items-center gap-4 md:gap-6 text-slate-200">
            <Users className="h-8 w-8 md:h-12 md:w-12 text-primary" />
            <p>{data.passengers.length} Voyageurs Enregistrés</p>
        </div>
      </div>
    </div>
  );
}