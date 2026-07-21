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
            destination: b.arrival_city_name || trip.to.name, // Escale ou terminus
            paymentMethod: b.payment_method === 'AGENCE' ? 'Cash' : b.payment_method.replace('_', ' '),
            status: b.status === 'PAYE' ? 'Confirmé' : 'En attente',
            paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
            amount: Math.round((b.total_amount || 0) / (b.passengers?.length || 1)),
            boarded: p.boarded ?? false
          });
        });
      });

      // TRI PAR NUMÉRO DE SIÈGE (Alpha-numérique)
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
      toast.success("Passager à bord");
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
        <Link to="/agency/departures" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-primary mb-6 transition-all">
          <ArrowLeft size={12} /> Retour aux départs
        </Link>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-5">
            <div className={`p-5 rounded-[1.5rem] shadow-2xl ${data.transportType === 'BOAT' ? 'bg-blue-600' : data.transportType === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'} text-white`}>
               <TransportIcon size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Manifeste passagers</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="font-black border-primary/20 text-primary bg-primary/5">{data.departureCity} ➔ {data.arrivalCity}</Badge>
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded border uppercase">
                   {data.vehicleRegistration}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-slate-100 p-4 rounded-2xl flex items-center gap-6">
                <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Présents</p>
                    <p className="text-xl font-black text-emerald-600 leading-none">{stats.boarded}</p>
                </div>
                <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Total</p>
                    <p className="text-xl font-black text-slate-900 leading-none">{stats.total}</p>
                </div>
             </div>
             <Button onClick={() => window.print()} className="gap-2 font-black rounded-xl h-14 px-8 shadow-xl">
                <Printer size={20} /> IMPRIMER
             </Button>
          </div>
        </div>
      </div>

      {/* VERSION IMPRESSION OFFICIELLE */}
      <div className="hidden print:block mb-10 border-b-4 border-slate-900 pb-8 text-left">
        <h1 className="text-4xl font-black uppercase text-slate-900 leading-none">{data.companyName}</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Manifeste de Bord Officiel — Certification de Transport</p>
        <div className="grid grid-cols-3 gap-10 mt-8 p-6 bg-slate-50 rounded-2xl border-2 border-slate-200">
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Trajet</p>
              <p className="font-black text-lg uppercase">{data.departureCity} ➔ {data.arrivalCity}</p>
           </div>
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Date du Voyage</p>
              <p className="font-black text-lg">{new Date(data.departureDate).toLocaleDateString('fr-FR')} • {data.departureTime}</p>
           </div>
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Appareil / Train</p>
              <p className="font-black text-lg uppercase">{data.vehicleRegistration} ({data.departureCode})</p>
           </div>
        </div>
      </div>

      {/* TABLEAU PREMIUM */}
      <div className="border-2 border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-2xl print:shadow-none print:border-slate-900 print:rounded-none">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b-2 print:bg-slate-100">
            <tr>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-900 opacity-70 tracking-widest">#</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-900 opacity-70 tracking-widest">Passager</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-900 opacity-70 tracking-widest text-center">Siège</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-900 opacity-70 tracking-widest">Classe</th>
              <th className="text-left p-5 font-black uppercase text-[10px] text-slate-900 opacity-70 tracking-widest">Destination</th>
              <th className="text-center p-5 font-black uppercase text-[10px] text-slate-900 opacity-70 tracking-widest print:hidden">Contrôle</th>
              <th className="hidden print:table-cell text-left p-5 font-black uppercase text-[10px] border-l-2">Signature</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-50">
            {currentPassengers.map((p, i) => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-5 text-slate-300 font-black">{(currentPage - 1) * itemsPerPage + (i + 1)}</td>
                <td className="p-5">
                    <p className="font-black text-slate-900 uppercase text-sm leading-none mb-1.5">{p.passengerName}</p>
                    <p className="text-[10px] font-mono text-primary font-bold">{p.bookingNumber}</p>
                </td>
                <td className="p-5 text-center">
                   <div className="inline-flex h-9 w-9 rounded-xl bg-slate-900 items-center justify-center text-white font-black text-xs shadow-md">
                      {p.seatNumber}
                   </div>
                </td>
                <td className="p-5">
                   <Badge variant="outline" className={`text-[9px] font-black uppercase border-2 ${p.travelClass.includes('VIP') || p.travelClass.includes('1ERE') ? 'bg-amber-50 text-amber-600 border-amber-100' : 'text-slate-400'}`}>
                      {p.travelClass}
                   </Badge>
                </td>
                <td className="p-5">
                   <div className="flex items-center gap-2 font-black text-slate-700 uppercase text-[11px] tracking-tight">
                      <MapPin size={12} className="text-primary" />
                      {p.destination}
                   </div>
                </td>
                <td className="p-5 text-center print:hidden">
                   {p.boarded ? (
                     <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-[9px] uppercase">
                        <CheckCircle2 size={16} /> À BORD
                     </div>
                   ) : (
                     <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-9 text-[9px] font-black uppercase border-2 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                        onClick={() => handleBoardPassenger(p.id)}
                        disabled={boardingId === p.id}
                     >
                        {boardingId === p.id ? <RefreshCw className="animate-spin h-3 w-3" /> : <UserCheck size={14} className="mr-1" />}
                        Valider
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

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 print:hidden">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border-2 bg-white shadow-sm"><ChevronLeft size={18} /></Button>
          <div className="text-[10px] font-black uppercase text-slate-400 px-4">Page {currentPage} / {totalPages}</div>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border-2 bg-white shadow-sm"><ChevronRight size={18} /></Button>
        </div>
      )}

      <div className="mt-10 p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col sm:flex-row justify-between items-center gap-6 print:bg-white print:text-slate-900 print:border-t-2 print:border-slate-900 print:rounded-none">
        <div className="text-left space-y-1">
          <p className="text-[10px] font-black uppercase text-primary tracking-[0.4em]">Certification TransGabon Connect</p>
          <p className="text-xs font-medium opacity-60 italic">Ce document constitue le manifeste de bord légal pour les autorités de contrôle.</p>
        </div>
        <div className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
           <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 opacity-60 leading-none">Total passagers</p>
                <p>{data.passengers.length}</p>
           </div>
           <Users size={32} className="text-primary" />
        </div>
      </div>
    </div>
  );
}