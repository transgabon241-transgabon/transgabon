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
  ArrowRight, 
  Users, 
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
  MapPin,
  Gem
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Passenger = {
  id: string;
  bookingNumber: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: string;
  travelClass: string;
  destination: string; // NOUVEAU
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
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardingId, setBoardingId] = useState<string | null>(null);

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

      // Sécurité Agence
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
        'VIP': 'VIP',
        'BUSINESS': 'Business',
        '1ERE_CLASSE': '1ère Cl.',
        '2EME_CLASSE': '2ème Cl.',
        'ECO': 'Éco',
        'STANDARD': 'Std'
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
            destination: b.arrival_city_name || trip.to.name, // On prend l'escale ou le terminus
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
      toast.success("Passager à bord");
    } catch (err) { toast.error("Erreur"); }
    finally { setBoardingId(null); }
  };

  const currentPassengers = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return data.passengers.slice(start, start + itemsPerPage);
  }, [data, currentPage]);

  const totalPages = Math.ceil((data?.passengers.length || 0) / itemsPerPage);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!data) return null;

  return (
    <div className="text-foreground text-left p-4 max-w-6xl mx-auto">
      {/* HEADER WEB */}
      <div className="print:hidden">
        <Link to="/agency/departures" className="inline-flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft size={12} /> Retour aux départs
        </Link>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-3xl shadow-xl ${data.transportType === 'BOAT' ? 'bg-blue-600' : data.transportType === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'} text-white`}>
              {data.transportType === 'BOAT' ? <Ship size={32}/> : data.transportType === 'TRAIN' ? <Train size={32} /> : <Bus size={32} />}
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Manifeste passagers</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="font-bold border-primary/20 text-primary">{data.departureCity} → {data.arrivalCity}</Badge>
                <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border uppercase">
                   {data.vehicleRegistration}
                </span>
              </div>
            </div>
          </div>
          <Button onClick={() => window.print()} className="gap-2 font-black rounded-xl h-14 px-8 shadow-lg">
            <Printer size={20} /> IMPRIMER LE MANIFESTE
          </Button>
        </div>
      </div>

      {/* HEADER IMPRESSION OFFICIELLE */}
      <div className="hidden print:block mb-10 border-b-4 border-slate-900 pb-8 text-left">
        <h1 className="text-4xl font-black uppercase text-slate-900">{data.companyName}</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Manifeste de Bord Officiel</p>
        <div className="grid grid-cols-3 gap-10 mt-8 p-6 bg-slate-50 rounded-2xl border-2 border-slate-200">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Trajet Principal</p>
              <p className="font-black text-lg">{data.departureCity} ➔ {data.arrivalCity}</p>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Date & Heure</p>
              <p className="font-black text-lg">{data.departureDate} • {data.departureTime}</p>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Véhicule / Train</p>
              <p className="font-black text-lg">{data.vehicleRegistration} ({data.departureCode})</p>
           </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="border-2 border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-xl print:shadow-none print:border-slate-900 print:rounded-none">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b-2 print:bg-slate-100">
            <tr>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400">#</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400">Nom du Passager</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400">Siège</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400">Classe</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400">Destination</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-400 print:hidden">Validation</th>
              <th className="hidden print:table-cell text-left p-5 font-black uppercase text-[10px] border-l-2">Émargement</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-50">
            {(window.matchMedia('print').matches ? data.passengers : currentPassengers).map((p, i) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-5 text-slate-300 font-black">{(currentPage - 1) * itemsPerPage + (i + 1)}</td>
                <td className="p-5">
                    <p className="font-black text-slate-800 uppercase text-sm leading-none mb-1">{p.passengerName}</p>
                    <p className="text-[10px] font-mono text-primary font-bold">{p.bookingNumber}</p>
                </td>
                <td className="p-5">
                   <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-xs">
                      {p.seatNumber}
                   </div>
                </td>
                <td className="p-5">
                   <Badge variant="outline" className={`text-[9px] font-black uppercase border-2 ${p.travelClass.includes('VIP') || p.travelClass.includes('1ERE') ? 'bg-amber-50 text-amber-600 border-amber-100' : 'text-slate-400'}`}>
                      {p.travelClass}
                   </Badge>
                </td>
                <td className="p-5">
                   <div className="flex items-center gap-2 font-bold text-slate-700 uppercase text-xs">
                      <MapPin size={12} className="text-primary" />
                      {p.destination}
                   </div>
                </td>
                <td className="p-5 text-center print:hidden">
                   {p.boarded ? (
                     <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px]">
                        <CheckCircle2 size={16} /> VALIDÉ
                     </div>
                   ) : (
                     <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-9 text-[9px] font-black uppercase border-2 rounded-xl hover:bg-primary hover:text-white transition-all"
                        onClick={() => handleBoardPassenger(p.id)}
                        disabled={boardingId === p.id}
                     >
                        {boardingId === p.id ? <RefreshCw className="animate-spin h-3 w-3" /> : <UserCheck size={14} className="mr-1" />}
                        Embarquer
                     </Button>
                   )}
                </td>
                <td className="hidden print:table-cell p-5 border-l-2">
                   <div className="h-6 w-32 border-b border-slate-300"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER STATS */}
      <div className="mt-8 flex justify-between items-center print:border-t-2 print:border-slate-900 print:pt-4">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden print:block">Document certifié TransGabon-Connect</p>
         <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl flex items-center gap-4 shadow-xl print:bg-white print:text-slate-900 print:p-0 print:shadow-none">
            <Users size={24} className="text-primary" />
            <div>
               <p className="text-[10px] font-black uppercase text-primary/60 leading-none mb-1">Total Passagers</p>
               <p className="text-2xl font-black">{data.passengers.length} Voyageurs</p>
            </div>
         </div>
      </div>
    </div>
  );
}