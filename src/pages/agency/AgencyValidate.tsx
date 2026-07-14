"use client"

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  CreditCard, 
  RefreshCw, 
  Users, 
  UserCheck, 
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

type PassengerData = {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string | null;
  seatNumber: string | null;
  boarded: boolean;
};

type Result = {
  valid: boolean;
  message: string;
  booking?: {
    id: string;
    bookingNumber: string;
    passengerName: string;
    passengerPhone: string;
    seatNumber: string;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    departureTime: string;
    paymentStatus: string;
    rawStatus: string;
    passengers: PassengerData[];
  };
};

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  // --- LOGIQUE DES RÔLES (Correction de la casse) ---
  const userRole = user?.role?.toUpperCase(); // On force tout en MAJUSCULES pour la comparaison

  // Qui a le droit d'encaisser l'argent ?
  const canCollectMoney = ['CAISSIER', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');
  
  // Qui a le droit de valider l'embarquement (quai) ?
  const canBoardPassengers = ['AGENCE_EMBARQUEMENT', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');
  
  // Liste de tous les personnels d'agence
  const isAgencyStaff = ['AGENT', 'AGENCE_EMBARQUEMENT', 'CAISSIER', 'SERVICE_COLIS', 'ADMIN'].includes(userRole || '');

  /**
   * Valide le billet (Recherche et vérification du statut)
   */
  const handleValidate = async (forcedRef?: string) => {
    const targetRef = forcedRef || qrInput.trim();
    if (!targetRef) return;

    setLoading(true);
    if (!forcedRef) setResult(null); // Ne pas reset si on vient d'un encaissement pour éviter le flash

    try {
      let ref = targetRef.toUpperCase();
      
      // Tentative de parsing si c'est un QR Code JSON
      try {
        const parsed = JSON.parse(targetRef);
        if (parsed && parsed.ref) ref = parsed.ref.toUpperCase();
      } catch (e) {}

      const { data: b, error } = await supabase
        .from('bookings')
        .select('*, trip:trips(*, from:cities!from_id(name), to:cities!to_id(name), company:companies(name)), passengers(*)')
        .eq('reference', ref)
        .single();

      if (error || !b) {
        setResult({ valid: false, message: 'Numéro de billet introuvable ou invalide.' });
        toast.error('Billet introuvable');
        return;
      }

      // Sécurité : Vérifier que l'agent appartient à la même compagnie que le trajet
      const agentCompanyId = user?.companyId;
      if (isAgencyStaff && agentCompanyId && b.trip.company_id !== agentCompanyId) {
        setResult({ 
          valid: false, 
          message: `Accès refusé : Ce billet appartient à une autre compagnie.` 
        });
        toast.error("Accès non autorisé.");
        return;
      }

      const lead = b.passengers[0];
      const passengerName = lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme';
      const seatNumber = b.passengers.map((p: any) => p.seat_number).filter(Boolean).join(', ') || '—';

      let isValid = false;
      let messageLabel = '';

      if (b.status === 'PAYE') {
        isValid = true;
        messageLabel = 'Billet validé ! Accès à bord autorisé.';
      } else if (b.status === 'EN_ATTENTE_PAIEMENT') {
        isValid = false;
        messageLabel = 'Attention : Paiement en attente.';
      } else {
        isValid = false;
        messageLabel = 'Attention : Billet annulé ou remboursé.';
      }

      setResult({
        valid: isValid,
        message: messageLabel,
        booking: {
          id: b.id,
          bookingNumber: b.reference,
          passengerName,
          passengerPhone: b.contact_phone,
          seatNumber,
          departureCity: b.trip.from.name,
          arrivalCity: b.trip.to.name,
          departureDate: b.trip.departure_date,
          departureTime: b.trip.departure_time,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : b.status === 'ANNULE' ? 'Annulé' : 'Non payé',
          rawStatus: b.status,
          passengers: (b.passengers || []).map((p: any) => ({
            id: p.id,
            firstName: p.first_name,
            lastName: p.last_name,
            idNumber: p.id_number,
            seatNumber: p.seat_number,
            boarded: p.boarded
          }))
        }
      });

      if (isValid && !forcedRef) toast.success('Billet valide');
    } catch (e: any) {
      toast.error('Erreur lors de la vérification.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Action de quai : Faire monter un passager
   */
  const handleBoardPassenger = async (passengerId: string) => {
    if (!canBoardPassengers) {
      toast.error("Seul l'agent d'embarquement peut valider la montée.");
      return;
    }
    setBoardingId(passengerId);
    try {
      const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      if (error) throw error;

      setResult((prev) => {
        if (!prev || !prev.booking) return prev;
        return {
          ...prev,
          booking: {
            ...prev.booking,
            passengers: prev.booking.passengers.map((p) => p.id === passengerId ? { ...p, boarded: true } : p),
          },
        };
      });
      toast.success("Passager à bord !");
    } catch (err) {
      toast.error("Erreur de mise à jour.");
    } finally {
      setBoardingId(null);
    }
  };

  /**
   * Action de caisse : Encaisser le paiement en espèces
   */
  const handleCollectPayment = async () => {
    if (!result?.booking?.id || !canCollectMoney) {
      toast.error("Action non autorisée");
      return;
    }

    setLoading(true);
    try {
      // 1. Mise à jour en base de données
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'PAYE' })
        .eq('id', result.booking.id);

      if (error) throw error;

      toast.success("Encaissement validé avec succès !");

      // 2. Rafraîchir les données pour débloquer l'embarquement
      // On passe la référence actuelle pour remettre à jour l'état 'result'
      const currentRef = result.booking.bookingNumber;
      await handleValidate(currentRef);

    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'encaissement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg text-foreground text-left mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Contrôle & Caisse</h1>
      <p className="text-muted-foreground mb-8 text-sm">Vérifiez la validité du titre de transport</p>

      {/* ZONE DE RECHERCHE */}
      <div className="bg-card border rounded-2xl p-6 mb-6">
        <Label className="text-base font-semibold mb-2 block">Numéro de billet ou scan</Label>
        <div className="flex gap-2">
          <Input
            value={qrInput}
            onChange={e => setQrInput(e.target.value)}
            placeholder="GAB-XXXXXX"
            onKeyDown={e => e.key === 'Enter' && handleValidate()}
            disabled={loading}
          />
          <Button onClick={() => handleValidate()} disabled={loading || !qrInput.trim()} className="shrink-0">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* CARTE DE RÉSULTAT */}
          <div className={`border-2 rounded-2xl p-6 ${result.valid ? 'border-emerald-500 bg-emerald-500/5' : 'border-red-500 bg-red-500/5'}`}>
            <div className="flex items-center gap-3 mb-4">
              {result.valid ? <CheckCircle className="h-8 w-8 text-emerald-600" /> : <XCircle className="h-8 w-8 text-red-600" />}
              <span className={`text-xl font-bold ${result.valid ? 'text-emerald-800' : 'text-red-800'}`}>
                {result.message}
              </span>
            </div>

            {result.booking && (
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm border-t pt-4">
                <InfoField label="N° Billet" value={result.booking.bookingNumber} />
                <InfoField label="Passager" value={result.booking.passengerName} />
                <InfoField label="Trajet" value={`${result.booking.departureCity} → ${result.booking.arrivalCity}`} />
                <InfoField label="Paiement" value={result.booking.paymentStatus} />
              </div>
            )}

            {/* LISTE D'EMBARQUEMENT (Visible uniquement si payé) */}
            {result.valid && result.booking && (
              <div className="border-t border-border pt-4 mt-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <Users className="h-4.5 w-4.5" /> Liste d'embarquement
                </h3>
                <div className="space-y-2">
                  {result.booking.passengers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-muted/30 p-3 rounded-xl text-sm border">
                      <div className="text-left">
                        <p className="font-semibold">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-primary font-bold">Siège {p.seatNumber || "—"}</p>
                      </div>
                      <div>
                        {p.boarded ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                            <CheckCircle className="h-3 w-3"/> Embarqué
                          </span>
                        ) : (
                          <Button 
                            size="sm" 
                            disabled={!canBoardPassengers || boardingId === p.id}
                            onClick={() => handleBoardPassenger(p.id)}
                          >
                             {boardingId === p.id ? <RefreshCw className="h-3 w-3 animate-spin"/> : <UserCheck className="h-3.5 w-3.5 mr-1"/>}
                             {canBoardPassengers ? "Valider" : "Quai uniquement"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACTION DE CAISSE (Si en attente de paiement) */}
          {result.booking && result.booking.rawStatus === 'EN_ATTENTE_PAIEMENT' && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              {canCollectMoney ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Action Caissier : Encaisser le billet
                  </p>
                  <Button 
                    onClick={handleCollectPayment} 
                    disabled={loading}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12"
                  >
                    <CreditCard className="h-5 w-5" />
                    Valider le paiement en espèces
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-red-600 font-bold flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  Ce billet n'est pas payé. Veuillez envoyer le passager à la caisse avant l'embarquement.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-bold text-muted-foreground">{label}</div>
      <div className="font-semibold truncate">{value || '—'}</div>
    </div>
  );
}