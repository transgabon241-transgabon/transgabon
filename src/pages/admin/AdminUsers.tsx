"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Pencil, 
  UsersRound, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  User as UserIcon, 
  UserCog, 
  Building2, 
  Mail, 
  Phone,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  companyId?: string;
  companyName?: string;
};

type Company = {
  id: string;
  name: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([
        supabase.from('User').select('*, Company:companies(name)').order('firstName', { ascending: true }),
        supabase.from('companies').select('id, name').order('name', { ascending: true }),
      ]);

      if (uRes.error) throw uRes.error;
      if (cRes.error) throw cRes.error;

      setUsers((uRes.data || []).map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email || '—',
        phone: u.phone,
        role: u.role === 'ADMIN' ? 'Administrateur' : u.role === 'AGENT_AGENCE' ? 'Agent' : 'Voyageur',
        companyId: u.agencyId || undefined,
        companyName: (u.Company as any)?.name || undefined
      })));
      setCompanies(cRes.data || []);
    } catch (e) { 
      toast.error('Erreur de synchronisation des membres'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, []);

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditCompany(u.companyId || 'none');
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const dbRole = editRole === 'Administrateur' ? 'ADMIN' : editRole === 'Agent' ? 'AGENT_AGENCE' : 'VOYAGEUR';
      const { error } = await supabase
        .from('User')
        .update({
          role: dbRole,
          agencyId: dbRole === 'AGENT_AGENCE' ? (editCompany === 'none' ? null : editCompany) : null
        })
        .eq('id', editUser.id);

      if (error) throw error;
      toast.success('Droits d’accès modifiés');
      setEditUser(null);
      loadData();
    } catch (e) { toast.error('Erreur de mise à jour'); }
    finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      const q = search.toLowerCase();
      return !q || u.email.toLowerCase().includes(q) || u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  useEffect(() => { setCurrentPage(1); }, [search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedUsers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && users.length === 0) return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-[2.5rem]" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER PROFESSIONNEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter flex items-center gap-3">
             <UsersRound className="text-primary h-8 w-8" /> Communauté
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Contrôle des accès et privilèges utilisateurs</p>
        </div>
        <Button variant="outline" onClick={loadData} className="rounded-xl border-2 h-11 w-11 flex items-center justify-center">
            <RefreshCw size={18} className="text-slate-400" />
        </Button>
      </div>

      {/* FILTRES & RECHERCHE SaaS */}
      <div className="bg-card border-2 rounded-[2.5rem] p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
            <div className="lg:col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rechercher un membre</Label>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Nom, Prénom ou Email..." 
                        className="pl-12 h-14 rounded-2xl border-2 border-slate-100 bg-white font-medium text-base shadow-inner focus:border-primary transition-all" 
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 text-center block">Filtre de rôle</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-white font-black text-[10px] uppercase tracking-widest shadow-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                        <SelectItem value="all" className="font-bold">TOUS LES MEMBRES</SelectItem>
                        <SelectItem value="Voyageur" className="font-bold">VOYAGEURS</SelectItem>
                        <SelectItem value="Agent" className="font-bold">AGENTS D'AGENCE</SelectItem>
                        <SelectItem value="Administrateur" className="font-bold">ADMINISTRATEURS</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      {/* TABLEAU PREMIUM */}
      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-5 font-black uppercase text-[10px] text-slate-400 text-left">Utilisateur</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-400 text-left hidden md:table-cell">Contact</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-400 text-center">Niveau d'accès</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-400 text-left hidden lg:table-cell">Compagnie</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedUsers.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">Aucun membre trouvé</td></tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs shadow-lg">
                            {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                        </div>
                        <div>
                            <p className="font-black text-slate-900 uppercase leading-none">{u.firstName} {u.lastName}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1.5 lowercase italic">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 hidden md:table-cell">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          <Phone size={12} className="text-primary" /> {u.phone || 'Non renseigné'}
                       </div>
                    </td>
                    <td className="p-5 text-center">
                       <RoleBadge role={u.role} />
                    </td>
                    <td className="p-5 hidden lg:table-cell">
                       {u.companyName ? (
                          <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase">
                            <Building2 size={12} /> {u.companyName}
                          </div>
                       ) : (
                          <span className="text-[9px] font-bold text-slate-300 uppercase italic">Utilisateur Indépendant</span>
                       )}
                    </td>
                    <td className="p-5 text-right">
                       <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="h-10 w-10 rounded-full hover:bg-white hover:shadow-md transition-all text-slate-300 hover:text-primary">
                          <Pencil size={18} />
                       </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-white p-2 rounded-2xl border-2 w-fit mx-auto shadow-sm">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border hover:bg-slate-50"><ChevronLeft size={18}/></Button>
          <div className="flex items-center gap-1 font-black text-[10px] uppercase text-slate-400 px-4">
             <span className="text-primary">Page {currentPage}</span>
             <span>/</span>
             <span>{totalPages}</span>
          </div>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border hover:bg-slate-50"><ChevronRight size={18}/></Button>
        </div>
      )}

      {/* MODAL D'ÉDITION REFAITE */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="rounded-[2.5rem] p-10 max-w-md border-none shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <UserCog size={120} />
          </div>

          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-left">Configuration Privilèges</DialogTitle>
          </DialogHeader>
          
          {editUser && (
            <div className="space-y-8 mt-6">
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">
                        {editUser.firstName.charAt(0)}{editUser.lastName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-black text-slate-900 uppercase leading-none">{editUser.firstName} {editUser.lastName}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">{editUser.email}</p>
                    </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rang hiérarchique</Label>
                    <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-black text-xs shadow-inner px-6">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-2xl">
                            <SelectItem value="Voyageur" className="font-bold">VOYAGEUR (Membre standard)</SelectItem>
                            <SelectItem value="Agent" className="font-bold">AGENT (Gestionnaire d'agence)</SelectItem>
                            <SelectItem value="Administrateur" className="font-bold">ADMINISTRATEUR (Super accès)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {editRole === 'Agent' && (
                    <div className="space-y-2 text-left animate-in slide-in-from-top-2">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1">Compagnie de rattachement</Label>
                        <Select value={editCompany} onValueChange={setEditCompany}>
                            <SelectTrigger className="h-14 rounded-2xl bg-primary/5 border-2 border-primary/10 font-black text-primary px-6">
                                <SelectValue placeholder="Affecter à une agence" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-2xl">
                                <SelectItem value="none">Indépendant</SelectItem>
                                {companies.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest mt-4 transition-all active:scale-95">
                {saving ? <RefreshCw className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
                Appliquer les droits
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const configs: Record<string, { color: string, icon: any }> = {
    Voyageur: { color: 'bg-blue-50 text-blue-600 border-blue-100', icon: UserIcon },
    Agent: { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: UserCog },
    Administrateur: { color: 'bg-slate-900 text-white border-slate-900 shadow-sm', icon: ShieldCheck },
  };
  const config = configs[role] || { color: 'bg-muted text-slate-400', icon: MoreHorizontal };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border ${config.color}`}>
      <Icon size={10} /> {role}
    </span>
  );
}