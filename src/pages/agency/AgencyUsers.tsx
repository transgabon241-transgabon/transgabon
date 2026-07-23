"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Phone, 
  Mail, 
  RefreshCw, 
  Trash2, 
  UserCog, 
  UserPlus,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

type AgencyStaff = {
  id: string; 
  firstName: string; 
  lastName: string; 
  email: string; 
  phone: string; 
  role: string;
  roleLabel: string;
};

export default function AgencyUsers() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<AgencyStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [roleToAssign, setRoleToAssign] = useState<'AGENCE_EMBARQUEMENT' | 'SERVICE_COLIS' | 'CAISSIER'>('AGENCE_EMBARQUEMENT');

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .eq('agencyId', user.companyId)
        .in('role', ['AGENCE_EMBARQUEMENT', 'SERVICE_COLIS', 'CAISSIER']);
      
      if (error) throw error;
      
      const formatted: AgencyStaff[] = (data || []).map(a => {
        const labels: Record<string, string> = {
            "SERVICE_COLIS": "Agent Fret / Colis",
            "CAISSIER": "Caissier d'agence",
            "AGENCE_EMBARQUEMENT": "Contrôle Embarquement"
        };
        return {
            id: a.id, 
            firstName: a.firstName, 
            lastName: a.lastName, 
            email: a.email || '—', 
            phone: a.phone,
            role: a.role,
            roleLabel: labels[a.role] || a.role
        };
      });
      setStaff(formatted);
    } catch (e) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            role: roleToAssign,
            agencyId: user?.companyId
          },
          emailRedirectTo: window.location.origin 
        }
      });

      if (error) throw error;

      toast.success("Agent recruté avec succès !");
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setPassword('');
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase.from('User').delete().eq('id', id);
    if (!error) {
      setStaff(staff.filter(s => s.id !== id));
      toast.success("Collaborateur retiré");
    }
  };

  if (loading && staff.length === 0) return (
    <div className="p-8 space-y-4 bg-background min-h-screen">
      <Skeleton className="h-12 w-48 rounded-xl bg-slate-800" />
      <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-800" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500 bg-background text-foreground">
      
      {/* HEADER PROFESSIONNEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
             <Users className="text-primary h-8 w-8" /> Mon Équipe
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Gestion des accès guichet et logistique</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-2xl font-black gap-2 h-14 px-8 shadow-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 uppercase tracking-widest text-xs border-none">
          <UserPlus size={20} /> Recruter un agent
        </Button>
      </div>

      {/* LISTE DES COLLABORATEURS */}
      <div className="grid gap-4 md:grid-cols-2">
        {staff.map((agent) => (
          <div key={agent.id} className="bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-6 hover:shadow-2xl hover:border-primary/20 transition-all group flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-primary font-black text-xl shadow-lg">
                {agent.firstName.charAt(0)}{agent.lastName.charAt(0)}
              </div>
              <div className="space-y-1">
                <p className="font-black text-white text-lg leading-tight uppercase">{agent.firstName} {agent.lastName}</p>
                <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                        <Mail size={12} className="text-primary" /> {agent.email}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                        <Phone size={12} className="text-primary" /> {agent.phone}
                    </span>
                </div>
                <div className="pt-2">
                    <Badge variant="outline" className={`text-[8px] font-black uppercase px-2.5 py-0.5 border ${
                        agent.role === 'CAISSIER' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        agent.role === 'SERVICE_COLIS' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                        {agent.roleLabel}
                    </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
                <AlertDialogDelete onConfirm={() => deleteAgent(agent.id)} name={agent.firstName} />
            </div>
          </div>
        ))}

        {staff.length === 0 && (
            <div className="md:col-span-2 p-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/40">
                <UserCog className="h-12 w-12 mx-auto text-slate-700 mb-2" />
                <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest italic">Aucun collaborateur enregistré</p>
            </div>
        )}
      </div>

      {/* DIALOG DE RECRUTEMENT SOMBRE */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-8 md:p-10 max-w-lg border-slate-800 bg-slate-900 text-white shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-left leading-none text-white">
                Recrutement
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="space-y-6 mt-8">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Prénom</Label>
                    <Input required value={firstName} onChange={e => setFirstName(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" />
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nom</Label>
                    <Input required value={lastName} onChange={e => setLastName(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-bold text-white shadow-inner" />
                </div>
            </div>

            <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Affectation Poste</Label>
                <Select value={roleToAssign} onValueChange={(v: any) => setRoleToAssign(v)}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-950 text-white border-none font-black text-xs uppercase tracking-widest shadow-lg">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="AGENCE_EMBARQUEMENT" className="font-bold focus:bg-primary/20">Contrôle Embarquement</SelectItem>
                      <SelectItem value="SERVICE_COLIS" className="font-bold focus:bg-primary/20">Gestionnaire Fret / Colis</SelectItem>
                      <SelectItem value="CAISSIER" className="font-bold focus:bg-primary/20">Caissier Principal</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Téléphone</Label>
                    <Input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl border-none bg-slate-950 font-bold text-white shadow-inner" />
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Email Pro</Label>
                    <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl border-none bg-slate-950 font-bold text-white shadow-inner" />
                </div>
            </div>

            <div className="space-y-1.5 text-left border-t border-slate-800 pt-6">
                <Label className="text-[10px] font-black uppercase text-primary ml-1 tracking-widest">Mot de passe temporaire</Label>
                <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="h-14 rounded-2xl bg-primary/5 border-2 border-primary/20 font-black text-primary px-6" placeholder="••••••••" />
                <p className="text-[8px] font-bold text-slate-500 uppercase mt-2 italic leading-tight">L'agent devra modifier ce passe dès sa première connexion.</p>
            </div>

            <Button type="submit" disabled={saving} className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl bg-primary text-white hover:bg-primary/90 uppercase tracking-widest transition-all active:scale-95 border-none">
                {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : <UserCheck className="mr-2 h-6 w-6" />}
                ACTIVER LE COMPTE
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * MINI COMPOSANT : ALERTE SUPPRESSION SOMBRE
 */
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

function AlertDialogDelete({ onConfirm, name }: { onConfirm: () => void, name: string }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all">
                    <Trash2 size={20} />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] border-slate-800 bg-slate-900 text-white shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-black italic text-xl uppercase text-white leading-tight">Retirer de l'équipe ?</AlertDialogTitle>
                    <AlertDialogDescription className="font-medium text-slate-400 mt-2">
                        Voulez-vous vraiment supprimer les accès de <strong>{name}</strong> ? Cette action bloquera ses futures connexions à la plateforme.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-2">
                    <AlertDialogCancel className="rounded-xl font-bold bg-slate-800 border-none text-white hover:bg-slate-700">ANNULER</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-red-600 rounded-xl font-bold uppercase text-white hover:bg-red-700 border-none px-6">RÉSILIER</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}