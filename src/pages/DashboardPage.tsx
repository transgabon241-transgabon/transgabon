"use client"

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CalendarDays, MapPin, Ticket, X, Eye, Bus, Package } from 'lucide-react';
import { toast } from 'sonner';

type Booking = {
  id: string;
  bookingNumber: string;
  status: string;
  passengerName: string;
  passengerPhone: string;
  departureCity: string;
  arrivalCity: string;
  companyName: string;
  transportType: string;
  departureDate: string;
  departureTime: string;
  seatNumber: string;
  amount: number;
  paymentMethod: string;
};

type Parcel = {
  id: string;
  trackingNumber: string;
  status: string;
  departureCity: string;
  arrivalCity: string;
  companyName: string;
  departureDate: string;
  receiverName: string;
  receiverCity: string;
  parcelType: string;
  weightKg: number;
  price: number;
};

export default function DashboardPage() {
  const { user, isLoading, loginWithRedirect } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect({ redirectUrl: window.location.href });
  }, [isLoading, user, loginWithRedirect]);

  useEffect(() => {
    if (isLoading || !user) return;
    setLoading(true);

    const loadDashboardData = async () => {
      try {
        // 1. Récupération des réservations réelles de l'utilisateur dans Supabase
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*, trip:trips(*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name)), passengers(*)') // <-- Ajout de !from_id et !to_id
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Mappage fluide vers l'UI d'origine
        const formattedBookings: Booking[] = (bookingsData || []).map(b => {
          const lead = b.passengers[0];
          
          const methodLabel: Record<string, string> = {
            AGENCE: 'Paiement en agence',
            AIRTEL_MONEY: 'Airtel Money',
            MOOV_MONEY: 'Moov Money',
          };

          return {
            id: b.id,
            bookingNumber: b.reference,
            status: b.status === 'PAYE' ? 'Confirmé' : b.status === 'ANNULE' ? 'Annulé' : b.status === 'REMBOURSE' ? 'Remboursé' : 'En attente',
            passengerName: lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme',
            passengerPhone: b.contact_phone,
            departureCity: b.trip.from.name,
            arrivalCity: b.trip.to.name,
            companyName: b.trip.company.name,
            transportType: b.trip.type === 'TRAIN' ? 'Train' : 'Bus',
            departureDate: b.trip.departure_date,
            departureTime: b.trip.departure_time,
            seatNumber: b.passengers.map((p: any) => p.seat_number).filter(Boolean).join(', ') || '—',
            amount: b.total_amount,
            paymentMethod: methodLabel[b.payment_method] || b.payment_method
          };
        });

        setBookings(formattedBookings);

        // 2. Récupération des colis réels de l'utilisateur dans Supabase
        const { data: parcelsData } = await supabase
          .from('parcels')
          .select('*, company:companies(name), from:cities(name), to:cities(name)')
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false });

        // Mappage fluide vers l'UI d'origine
        const formattedParcels: Parcel[] = (parcelsData || []).map(p => {
          
          const statusLabel: Record<string, string> = {
            COLIS_ENREGISTRE: 'En attente',
            EN_ATTENTE_DEPART: 'Pris en charge',
            EN_COURS_DE_TRANSPORT: 'En transit',
            ARRIVE_A_DESTINATION: 'Arrivé',
            DISPONIBLE_POUR_RETRAIT: 'Arrivé',
            LIVRE: 'Livré',
            RETOURNE: 'Retourné'
          };

          return {
            id: p.id,
            trackingNumber: p.tracking_number,
            status: statusLabel[p.status] || p.status,
            departureCity: p.from.name,
            arrivalCity: p.to.name,
            companyName: p.company.name,
            departureDate: p.created_at.slice(0, 10),
            receiverName: p.receiver_name,
            receiverCity: p.receiver_name,
            parcelType: p.description,
            weightKg: p.weight,
            price: p.price
          };
        });

        setParcels(formattedParcels);

      } catch (err) {
        console.error("Erreur de chargement des données d'historique :", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isLoading, user]);

  const handleCancel = async (id: string) => {
    try {
      // Appel de la procédure stockée (RPC) sécurisée d'annulation sur Supabase
      const { data, error } = await supabase.rpc('cancel_booking_by_user', {
        p_booking_id: id,
        p_user_id: user.id
      });

      if (error || !data?.success) {
        toast.error(error?.message || data?.error || 'Erreur lors de l’annulation');
        return;
      }

      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'Annulé' } : b));
      toast.success('Réservation annulée avec succès !');
    } catch (err: any) {
      toast.error('Une erreur réseau est survenue.');
    }
  };

  if (isLoading || !user) return null;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter(b => b.status !== 'Annulé' && b.status !== 'Remboursé' && b.departureDate >= today);
  const past = bookings.filter(b => b.status === 'Terminé' || b.departureDate < today);
  const cancelled = bookings.filter(b => b.status === 'Annulé' || b.status === 'Remboursé');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="text-left">
          <h1 className="text-2xl font-bold">Mes voyages</h1>
          <p className="text-muted-foreground">Bonjour {user.firstName || user.email} 👋</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/send-parcel')} className="gap-2">
            <Package className="h-4 w-4" /> Envoyer un colis
          </Button>
          <Button onClick={() => navigate('/')} className="gap-2">
            <Bus className="h-4 w-4" /> Nouveau voyage
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total réservations" value={bookings.length} icon={Ticket} />
        <StatCard label="À venir" value={upcoming.length} icon={CalendarDays} />
        <StatCard label="Terminés" value={past.length} icon={MapPin} />
        <StatCard label="Annulés/Remboursés" value={cancelled.length} icon={X} />
        <StatCard label="Colis envoyés" value={parcels.length} icon={Package} />
      </div>

      <Tabs defaultValue="upcoming" className="text-left">
        <TabsList>
          <TabsTrigger value="upcoming">À venir ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Historique ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Annulés/Remboursés ({cancelled.length})</TabsTrigger>
          <TabsTrigger value="parcels">Colis ({parcels.length})</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <>
            <TabsContent value="upcoming">
              <BookingList bookings={upcoming} onCancel={handleCancel} showCancel />
            </TabsContent>
            <TabsContent value="past">
              <BookingList bookings={past} />
            </TabsContent>
            <TabsContent value="cancelled">
              <BookingList bookings={cancelled} />
            </TabsContent>
            <TabsContent value="parcels">
              <ParcelList parcels={parcels} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="bg-card border rounded-xl p-4 text-left">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
          <Icon className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ParcelList({ parcels }: { parcels: Parcel[] }) {
  if (parcels.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Aucun colis envoyé</div>;
  }
  const statusColor: Record<string, string> = {
    'En attente': 'bg-yellow-100 text-yellow-800',
    'Pris en charge': 'bg-blue-100 text-blue-800',
    'En transit': 'bg-orange-100 text-orange-800',
    'Arrivé': 'bg-emerald-100 text-emerald-800',
    'Livré': 'bg-green-100 text-green-800',
    'Retourné': 'bg-red-100 text-red-800',
  };
  return (
    <div className="space-y-3 mt-4">
      {parcels.map(p => (
        <div key={p.id} className="border rounded-xl bg-card p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-semibold">{p.trackingNumber}</span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor[p.status] || 'bg-muted'}`}>{p.status}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {p.departureCity} → {p.arrivalCity} • {p.companyName} • {p.departureDate ? new Date(p.departureDate + 'T00:00:00').toLocaleDateString('fr-FR') : ''}
              </div>
              <div className="text-sm mt-1">Destinataire: {p.receiverName} ({p.receiverCity}) • {p.parcelType} • {p.weightKg} kg</div>
              <div className="text-sm font-medium mt-1">{p.price.toLocaleString()} FCFA</div>
            </div>
            <Link to={`/track?q=${p.trackingNumber}`}>
              <Button variant="outline" size="sm" className="gap-1"><Eye className="h-3 w-3" /> Suivre</Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingList({ bookings, onCancel, showCancel }: { bookings: Booking[]; onCancel?: (id: string) => void; showCancel?: boolean }) {
  const navigate = useNavigate();

  if (bookings.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Aucune réservation</div>;
  }

  const statusColor: Record<string, string> = {
    'En attente': 'bg-yellow-100 text-yellow-800',
    'Confirmé': 'bg-green-100 text-green-800',
    'Annulé': 'bg-red-100 text-red-800',
    'Remboursé': 'bg-red-100 text-red-800',
    'Terminé': 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-3 mt-4">
      {bookings.map(b => (
        <div key={b.id} className="border rounded-xl bg-card p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{b.departureCity} → {b.arrivalCity}</span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor[b.status] || 'bg-muted'}`}>
                  {b.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {b.companyName} • {b.departureDate ? new Date(b.departureDate + 'T00:00:00').toLocaleDateString('fr-FR') : ''} à {b.departureTime} • Siège {b.seatNumber}
              </div>
              <div className="text-sm font-medium mt-1">{b.amount.toLocaleString()} FCFA — {b.paymentMethod}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/ticket/${b.id}`)}>
                <Eye className="h-3 w-3" /> Voir
              </Button>
              {showCancel && onCancel && b.status !== 'Annulé' && b.status !== 'Remboursé' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30">
                      <X className="h-3 w-3" /> Annuler
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader className="text-left">
                      <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Billet {b.bookingNumber} — {b.departureCity} → {b.arrivalCity}. 
                        <br /><span className="text-xs text-destructive font-semibold">Rappel : Moins de 4h avant le départ, l&apos;annulation n&apos;est plus possible en ligne.</span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Garder</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onCancel(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui, annuler</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}