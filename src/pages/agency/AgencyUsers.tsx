"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Key, Phone, Mail, RefreshCw, Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';

type AgencyStaff = {
  id: string; firstName: string; lastName: string; email: string; phone: string; roleLabel: string;
};

export default function AgencyUsers() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<AgencyStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const { data, error } = await supabase.from('User').select('*').eq('agencyId', user.companyId).in('role', ['AGENCE_EMBARQUEMENT', 'SERVICE_COLIS', 'CAISSIER']);
      if (error) throw error;
      const formatted: AgencyStaff[] = (data || []).map(a => ({
        id: a.id, firstName: a.firstName, lastName: a.lastName, email: a.email || '—', phone: a.phone,
        roleLabel: a.role === "SERVICE_COLIS" ? "Service Colis" : a.role === "CAISSIER" ? "Caissier" : "Embarquement"
      }));
      setStaff(formatted);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);

  // On utilise signUp. Le Trigger SQL s'occupera d'insérer dans la table User
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        role: roleToAssign, // Ex: 'CAISSIER'
        agencyId: user?.companyId // L'ID de l'agence du chef actuel
      },
      // IMPORTANT : empêche la redirection/déconnexion automatique
      emailRedirectTo: window.location.origin 
    }
  });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Agent recruté ! Un e-mail de confirmation lui a été envoyé.");
    setShowForm(false);
    loadData();
    setSaving(false);
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase.from('User').delete().eq('id', id);
    if (!error) { setStaff(staff.filter(s => s.id !== id)); toast.success("Supprimé"); }
  };

  if (loading) return <div className="space-y-4 p-8"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-32 w-full" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-primary flex items-center gap-3">
            <Users className="h-8 w-8" /> Mon Équipe
          </h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Gestion du personnel de guichet</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl font-black border-2 gap-2 shadow-lg h-12 px-6">
          <Plus className="h-5 w-5" /> RECRUTER UN AGENT
        </Button>
      </div>

      <div className="grid gap-4">
        {staff.map((agent) => (
          <div key={agent.id} className="bg-card border-2 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl uppercase">
                {agent.firstName.charAt(0)}{agent.lastName.charAt(0)}
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800 text-lg leading-tight">{agent.firstName} {agent.lastName}</p>
                <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground uppercase">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {agent.email}</span>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {agent.phone}</span>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-2 border-emerald-100 font-black uppercase text-[9px] px-2.5">
                  {agent.roleLabel}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteAgent(agent.id)} className="text-red-200 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>

      {/* DIALOG STYLE */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-8">
          <DialogHeader><DialogTitle className="text-2xl font-black italic">Nouveau Collaborateur</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-5 mt-4">
            <div className="grid grid-cols-2 gap-4">
                <Input required placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} className="h-12 rounded-2xl border-2" />
                <Input required placeholder="Nom" value={lastName} onChange={e => setLastName(e.target.value)} className="h-12 rounded-2xl border-2" />
            </div>
            <Select value={roleToAssign} onValueChange={(v: any) => setRoleToAssign(v)}>
                <SelectTrigger className="h-12 rounded-2xl border-2 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="AGENCE_EMBARQUEMENT" className="font-bold">Agent d'embarquement</SelectItem>
                  <SelectItem value="SERVICE_COLIS" className="font-bold">Agent Colis / Fret</SelectItem>
                  <SelectItem value="CAISSIER" className="font-bold">Caissier d'agence</SelectItem>
                </SelectContent>
            </Select>
            <Input type="tel" required placeholder="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-2xl border-2" />
            <Input type="email" required placeholder="Email professionnel" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-2xl border-2" />
            <Input type="password" required placeholder="Mot de passe temporaire" value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-2xl border-2" />
            <Button type="submit" disabled={saving} className="w-full h-14 rounded-2xl font-black shadow-lg">
                {saving ? <RefreshCw className="animate-spin h-5 w-5" /> : "ACTIVER LE COMPTE"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}