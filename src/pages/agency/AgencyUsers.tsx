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
import { Users, Plus, Key, Phone, Mail, RefreshCw, Trash2, UserCog, ShieldCheck } from 'lucide-react';
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

      const formatted: AgencyStaff[] = (data || []).map(a => ({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email || '—',
        phone: a.phone,
        role: a.role,
        roleLabel: a.role === "SERVICE_COLIS" ? "Service Colis" : a.role === "CAISSIER" ? "Caissier" : "Embarquement"
      }));
      setStaff(formatted);
    } catch (e: any) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: res, error } = await supabase.rpc('create_agency_staff', {
        p_email: email.trim().toLowerCase(),
        p_password: password,
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone,
        p_role: roleToAssign,
        p_company_id: user?.companyId
      });

      if (error || !res?.success) throw new Error(res?.error || "Erreur");

      toast.success("Collaborateur recruté !");
      setShowForm(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase.from('User').delete().eq('id', id);
    if (!error) {
      setStaff(staff.filter(s => s.id !== id));
      toast.success("Agent supprimé");
    }
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin h-10 w-10 text-primary opacity-20" /></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 space-y-8 text-left">
      
      {/* HEADER */}
      <header className="flex items-center justify-between bg-white p-6 rounded-[2rem] border shadow-sm w-full">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tight">Mon Équipe</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gestion des accès guichet</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} size="icon" className="h-12 w-12 rounded-2xl shadow-lg">
           <Plus className="h-6 w-6" />
        </Button>
      </header>

      {/* LISTE DES AGENTS */}
      <div className="space-y-4">
        <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-6">Personnel Actif</h3>
        {staff.length === 0 ? (
          <div className="p-16 text-center border-2 border-dashed rounded-[2.5rem] bg-white">
            <p className="text-slate-400 italic">Aucun agent enregistré</p>
          </div>
        ) : (
          staff.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between bg-white border border-slate-100 p-6 rounded-[2rem] hover:shadow-lg transition-all group">
              <div className="flex items-center gap-4 text-left">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-primary font-black text-xl">
                  {agent.firstName.charAt(0)}{agent.lastName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800 text-lg">{agent.firstName} {agent.lastName}</p>
                    <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px] font-black uppercase tracking-tighter">
                      {agent.roleLabel}
                    </Badge>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs font-bold text-muted-foreground uppercase">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {agent.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {agent.phone}</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteAgent(agent.id)} className="text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* MODAL RECRUTEMENT */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-md border-none shadow-2xl">
          <DialogHeader>
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <UserCog className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black text-left">Recruter un agent</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase ml-1">Prénom</Label>
                    <Input required placeholder="Ex: Jean" className="h-12 rounded-xl bg-slate-50 border-none" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase ml-1">Nom</Label>
                    <Input required placeholder="Ex: Mba" className="h-12 rounded-xl bg-slate-50 border-none" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Poste de guichet</Label>
                <Select value={roleToAssign} onValueChange={(v: any) => setRoleToAssign(v)}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                        <SelectItem value="AGENCE_EMBARQUEMENT" className="font-bold">Contrôleur Quai</SelectItem>
                        <SelectItem value="SERVICE_COLIS" className="font-bold">Agent Colis / Fret</SelectItem>
                        <SelectItem value="CAISSIER" className="font-bold">Caissier Billetterie</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Téléphone & Email</Label>
                <div className="space-y-2">
                    <Input required type="tel" placeholder="+241 062..." className="h-12 rounded-xl bg-slate-50 border-none" value={phone} onChange={e => setPhone(e.target.value)} />
                    <Input required type="email" placeholder="agent@email.ga" className="h-12 rounded-xl bg-slate-50 border-none" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Mot de passe temporaire</Label>
                <Input required type="password" placeholder="••••••••" className="h-12 rounded-xl bg-slate-50 border-none" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <Button type="submit" disabled={saving} className="w-full h-14 rounded-2xl bg-primary font-black text-lg shadow-xl shadow-primary/20">
                {saving ? <RefreshCw className="animate-spin h-5 w-5" /> : "ACTIVER LE COMPTE"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}