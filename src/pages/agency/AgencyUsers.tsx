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
import { Users, Plus, Key, Phone, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type AgencyStaff = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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
      // Récupère l'ensemble du personnel de l'agence
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .eq('agencyId', user.companyId)
        .in('role', ['AGENCE_EMBARQUEMENT', 'SERVICE_COLIS', 'CAISSIER']);

      if (error) throw new Error(error.message);

      const formatted: AgencyStaff[] = (data || []).map(a => {
        let label = "Embarquement";
        if (a.role === "SERVICE_COLIS") label = "Service Colis";
        else if (a.role === "CAISSIER") label = "Caissier";

        return {
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email || '—',
          phone: a.phone,
          roleLabel: label
        };
      });

      setStaff(formatted);
    } catch (e: any) {
      toast.error(e.message || "Erreur de chargement de l'équipe");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const resetForm = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setPassword('');
    setRoleToAssign('AGENCE_EMBARQUEMENT'); setEditId(null);
  };

  const [editId, setEditId] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    if (!email || !password || !firstName || !lastName || !phone || !roleToAssign) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setSaving(true);

    try {
      // Appel de la procédure stockée (RPC) généralisée de création de staff sur Supabase
      const { data: res, error } = await supabase.rpc('create_agency_staff', {
        p_email: email.trim().toLowerCase(),
        p_password: password,
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone,
        p_role: roleToAssign,
        p_company_id: user.companyId
      });

      if (error || !res?.success) {
        toast.error(error?.message || res?.error || "Erreur de création.");
        setSaving(false);
        return;
      }

      toast.success("Compte collaborateur créé et rattaché à votre agence !");
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error("Erreur réseau d'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="text-foreground text-left">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Gestion de l&apos;Équipe</h1>
          <p className="text-sm text-muted-foreground">Pilotez et recrutez le personnel (caisse, embarquement, colis) de votre agence.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Recruter un agent</Button>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl bg-card">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/60 mb-2" />
          <p className="text-sm">Aucun collaborateur actif dans votre équipe.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>Enregistrer un agent</Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Nom &amp; Prénom</th>
                <th className="p-3 font-medium">E-mail de connexion</th>
                <th className="p-3 font-medium">Téléphone</th>
                <th className="p-3 font-medium">Rôle de guichet</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((agent) => (
                <tr key={agent.id} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-semibold">{agent.firstName} {agent.lastName}</td>
                  <td className="p-3 text-muted-foreground">{agent.email}</td>
                  <td className="p-3 font-mono text-xs tracking-wider">{agent.phone}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      agent.roleLabel === 'Caissier' ? 'bg-emerald-100 text-emerald-800' :
                      agent.roleLabel === 'Service Colis' ? 'bg-secondary/15 text-secondary' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {agent.roleLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE CRÉATION DE COMPTE COLLABORATEUR D'AGENCE */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-left">Recruter un collaborateur d&apos;agence</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="agentFN">Prénom</Label>
                <Input id="agentFN" required placeholder="Jean" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agentLN">Nom</Label>
                <Input id="agentLN" required placeholder="Mba" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={saving} />
              </div>
            </div>

            {/* Sélecteur de rôle de guichet */}
            <div className="space-y-1.5">
              <Label htmlFor="roleAssign">Rôle de guichet à attribuer</Label>
              <Select value={roleToAssign} onValueChange={(v: any) => setRoleToAssign(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENCE_EMBARQUEMENT">Agent d&apos;embarquement (Contrôle quai)</SelectItem>
                  <SelectItem value="SERVICE_COLIS">Agent Service Colis (Fret / Logistique)</SelectItem>
                  <SelectItem value="CAISSIER">Caissier d&apos;agence (Encaissements billets)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agentPhone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="agentPhone" type="tel" required placeholder="+241 062 00 00 00" className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agentEmail">E-mail de connexion</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="agentEmail" type="email" required placeholder="nom.agent@gabon.ga" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agentPass">Mot de passe temporaire d&apos;accès</Label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="agentPass" type="password" required placeholder="Saisir min 6 caractères" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} disabled={saving} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" disabled={saving || !email || !password || !firstName}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Créer le compte collaborateur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  function openCreate() {
    resetForm();
    setShowForm(true);
  }
}