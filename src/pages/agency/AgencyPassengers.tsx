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
            destination: b.arrival_city_name || trip.to.name,
            paymentMethod: b.payment_method === 'AGENCE' ? 'Cash' : b.payment_method.replace('_', ' '),
            status: b.status === 'PAYE' ? 'Confirmé' : 'En attente',
            paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
            amount: Math.round((b.total_amount || 0) / (b.passengers?.length || 1)),
            boarded: p.boarded ?? false
          });
        });
      });

      // TRI PAR SIÈGE
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

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full rounded-3xl" /></div>;
  if (!data) return null;

  return (
    <div className="text-foreground text-left p-4 max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {/* HEADER WEB */}
      <div className="print:hidden">
        <Link to="/agency/departures" className="inline-flex items-center gap-3 text-sm font-black uppercase text-slate-900 opacity-60 hover:text-primary mb-8 transition-all tracking-widest">
          <ArrowLeft size={18} /> Retour aux départs
        </Link>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-10">
          <div className="flex items-center gap-6">
            <div className={`p-6 rounded-[2rem] shadow-2xl ${data.transportType === 'BOAT' ? 'bg-blue-600' : data.transportType === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'} text-white`}>
               <TransportIcon size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Manifeste passagers</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <Badge variant="outline" className="font-black text-xs border-primary/20 text-primary bg-primary/5 px-4 py-1">{data.departureCity} ➔ {data.arrivalCity}</Badge>
                <span className="text-sm font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-xl border uppercase tracking-tighter">
                   {data.vehicleRegistration}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full lg:w-auto">
             <div className="bg-white border-2 border-slate-100 p-5 rounded-[1.5rem] flex items-center gap-8 shadow-sm flex-1 lg:flex-none">
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-900 opacity-60 uppercase tracking-widest mb-1">Présents</p>
                    <p className="text-3xl font-black text-emerald-600 leading-none">{stats.boarded}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-900 opacity-60 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-3xl font-black text-slate-900 leading-none">{stats.total}</p>
                </div>
             </div>
             <Button onClick={() => window.print()} className="gap-3 font-black rounded-2xl h-20 px-10 shadow-2xl text-base">
                <Printer size={24} /> IMPRIMER
             </Button>
          </div>
        </div>
      </div>

      {/* VERSION IMPRESSION OFFICIELLE */}
      <div className="hidden print:block mb-10 border-b-8 border-slate-900 pb-10 text-left">
        <h1 className="text-6xl font-black uppercase text-slate-900 leading-none">{data.companyName}</h1>
        <p className="text-lg font-bold text-slate-500 uppercase tracking-[0.3em] mt-4">Manifeste de Bord Officiel — Certification de Transport</p>
        <div className="grid grid-cols-3 gap-12 mt-12 p-8 bg-slate-50 rounded-[2rem] border-4 border-slate-200">
           <div>
              <p className="text-xs font-black text-slate-400 uppercase mb-2">Trajet</p>
              <p className="font-black text-2xl uppercase">{data.departureCity} ➔ {data.arrivalCity}</p>
           </div>
           <div>
              <p className="text-xs font-black text-slate-400 uppercase mb-2">Date du Voyage</p>
              <p className="font-black text-2xl">{new Date(data.departureDate).toLocaleDateString('fr-FR')} • {data.departureTime}</p>
           </div>
           <div>
              <p className="text-xs font-black text-slate-400 uppercase mb-2">Appareil / Train</p>
              <p className="font-black text-2xl uppercase">{data.vehicleRegistration} ({data.departureCode})</p>
           </div>
        </div>
      </div>

      {/* TABLEAU "HAUTE VISIBILITÉ" */}
      <div className="border-2 border-slate-100 rounded-[3rem] overflow-hidden bg-white shadow-2xl print:shadow-none print:border-slate-900 print:rounded-none">
        <table className="w-full text-base">
          <thead className="bg-slate-50 border-b-4 border-slate-100 print:bg-slate-100">
            <tr>
              <th className="text-left p-6 font-black uppercase text-xs text-slate-900 opacity-70 tracking-widest">#</th>
              <th className="text-left p-6 font-black uppercase text-xs text-slate-900 opacity-70 tracking-widest">Nom du Passager</th>
              <th className="text-center p-6 font-black uppercase text-xs text-slate-900 opacity-70 tracking-widest">Siège</th>
              <th className="text-left p-6 font-black uppercase text-xs text-slate-900 opacity-70 tracking-widest">Classe</th>
              <th className="text-left p-6 font-black uppercase text-xs text-slate-900 opacity-70 tracking-widest">Destination</th>
              <th className="text-center p-6 font-black uppercase text-xs text-slate-900 opacity-70 tracking-widest print:hidden">Contrôle</th>
              <th className="hidden print:table-cell text-left p-6 font-black uppercase text-xs border-l-4 border-slate-200">Signature</th>
            </tr>
          </thead>
          <tbody className="divide-y-4 divide-slate-50">
            {currentPassengers.map((p, i) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-6 text-slate-300 font-black text-lg">{(currentPage - 1) * itemsPerPage + (i + 1)}</td>
                <td className="p-6">
                    <p className="font-black text-slate-900 uppercase text-lg leading-tight mb-2">{p.passengerName}</p>
                    <p className="text-xs font-mono text-primary font-bold tracking-widest">{p.bookingNumber}</p>
                </td>
                <td className="p-6 text-center">
                   <div className="inline-flex h-14 w-14 rounded-2xl bg-slate-900 items-center justify-center text-white font-black text-lg shadow-xl">
                      {p.seatNumber}
                   </div>
                </td>
                <td className="p-6">
                   <Badge variant="outline" className={`text-[10px] font-black uppercase border-2 px-3 py-1 ${p.travelClass.includes('VIP') || p.travelClass.includes('1ERE') ? 'bg-amber-50 text-amber-600 border-amber-200' : 'text-slate-500 border-slate-200'}`}>
                      {p.travelClass}
                   </Badge>
                </td>
                <td className="p-6">
                   <div className="flex items-center gap-2 font-black text-slate-800 uppercase text-sm tracking-tighter">
                      <MapPin size={16} className="text-primary" />
                      {p.destination}
                   </div>
                </td>
                <td className="p-6 text-center print:hidden">
                   {p.boarded ? (
                     <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest">
                        <CheckCircle2 size={24} strokeWidth={3} /> VALIDÉ
                     </div>
                   ) : (
                     <Button 
                        size="lg"
                        className="h-14 font-black uppercase rounded-2xl hover:bg-slate-900 shadow-lg"
                        onClick={() => handleBoardPassenger(p.id)}
                        disabled={boardingId === p.id}
                     >
                        {boardingId === p.id ? <RefreshCw className="animate-spin h-5 w-5" /> : <UserCheck size={20} className="mr-2" />}
                        Embarquer
                     </Button>
                   )}
                </td>
                <td className="hidden print:table-cell p-6 border-l-4 border-slate-100">
                   <div className="h-10 w-48 border-b-2 border-slate-300"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION XXL */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-8 mt-12 print:hidden">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-[1.5rem] h-16 w-16 border-4 bg-white shadow-xl hover:bg-slate-50 active:scale-90 transition-all"><ChevronLeft size={32} /></Button>
          <div className="text-sm font-black uppercase text-slate-500 tracking-[0.3em] bg-white px-8 py-3 rounded-full border-2">PAGE {currentPage} <span className="mx-2 opacity-20">/</span> {totalPages}</div>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-[1.5rem] h-16 w-16 border-4 bg-white shadow-xl hover:bg-slate-50 active:scale-90 transition-all"><ChevronRight size={32} /></Button>
        </div>
      )}

      {/* FOOTER STATS XXL */}
      <div className="mt-16 p-10 bg-slate-900 rounded-[3rem] text-white flex flex-col sm:flex-row justify-between items-center gap-8 print:bg-white print:text-slate-900 print:border-t-4 print:border-slate-900 print:rounded-none">
        <div className="text-left space-y-2">
          <p className="text-xs font-black uppercase text-primary tracking-[0.5em]">Certification TransGabon Connect</p>
          <p className="text-sm font-medium opacity-60 italic max-w-md leading-relaxed">Le présent manifeste certifie la liste des passagers autorisés par l'autorité compétente à voyager à bord de cet appareil.</p>
        </div>
        <div className="text-4xl font-black uppercase tracking-tighter flex items-center gap-6">
           <div className="text-right">
                <p className="text-xs font-bold text-slate-400 opacity-60 leading-none uppercase tracking-widest mb-1">Volume Voyageurs</p>
                <p>{data.passengers.length}</p>
           </div>
           <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
              <Users size={48} className="text-primary" />
           </div>
        </div>
      </div>
    </div>
  );
}