"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Phone,
  RefreshCw,
  MoreHorizontal,
  X
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
      toast.error('Erreur de synchronisation'); 
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
      toast.success('Droits d’accès mis à jour');
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
    <div className="max-w-6xl mx-auto p-4 space-y-6 bg-background min-h-screen">
        <Skeleton className="h-12 w-64 rounded-xl bg-card" />
        <Skeleton className="h-64 w-full rounded-[2.5rem] bg-card" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500 bg-background text-foreground pb-20">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3 leading-none">
             <UsersRound className="text-primary h-8 w-8" /> Communauté
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 leading-none">Contrôle des accès utilisateurs</p>
        </div>
        <Button variant="outline" onClick={loadData} className="rounded-xl border-border bg-card h-11 w-11 flex items-center justify-center hover:bg-muted transition-colors">
            <RefreshCw size={18} className="text-slate-400" />
        </Button>
      </div>

      <div className="bg-card border-2 border-border rounded-[2.5rem] p-6 shadow-2xl space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end text-left">
            <div className="lg:col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Rechercher un membre</Label>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-primary transition-colors" />
                    <Input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Nom, Prénom ou Email..." 
                        className="pl-12 h-14 rounded-2xl border-none bg-slate-950 text-white font-medium text-base shadow-inner focus:visible:ring-1 focus-visible:ring-primary/50" 
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 text-center block">Filtre de rôle</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-14 rounded-2xl border-none bg-slate-950 text-slate-300 font-black text-[10px] uppercase tracking-widest shadow-inner">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-slate-900 border-border text-white">
                        <SelectItem value="all" className="font-bold">TOUS LES MEMBRES</SelectItem>
                        <SelectItem value="Voyageur" className="font-bold">VOYAGEURS</SelectItem>
                        <SelectItem value="Agent" className="font-bold">AGENTS D'AGENCE</SelectItem>
                        <SelectItem value="Administrateur" className="font-bold">ADMINISTRATEURS</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      <div className="bg-card border-2 border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 border-b border-border">
              <tr>
                <th className="p-5 font-black uppercase text-[10px] text-slate-500 text-left">Utilisateur</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-500 text-left hidden md:table-cell">Contact</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-500 text-center">Rôle</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-500 text-left hidden lg:table-cell">Compagnie</th>
                <th className="p-5 font-black uppercase text-[10px] text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedUsers.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs italic">Aucun membre trouvé</td></tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="p-5 text-left">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-950 border border-border flex items-center justify-center text-primary font-black text-xs shadow-lg">
                            {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                        </div>
                        <div className="text-left">
                            <p className="font-black text-white uppercase leading-none truncate max-w-[140px]">{u.firstName} {u.lastName}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1.5 lowercase italic truncate max-w-[140px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 hidden md:table-cell text-left">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          <Phone size={12} className="text-primary" /> {u.phone || 'N/A'}
                       </div>
                    </td>
                    <td className="p-5 text-center">
                       <RoleBadge role={u.role} />
                    </td>
                    <td className="p-5 hidden lg:table-cell text-left">
                       {u.companyName ? (
                          <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase">
                            <Building2 size={12} /> {u.companyName}
                          </div>
                       ) : (
                          <span className="text-[9px] font-bold text-slate-600 uppercase italic">Indépendant</span>
                       )}
                    </td>
                    <td className="p-5 text-right">
                       <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="h-10 w-10 rounded-full hover:bg-slate-800 hover:text-white transition-all text-slate-600">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-card p-2 rounded-2xl border border-border w-fit mx-auto shadow-2xl">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border border-border bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><ChevronLeft size={18}/></Button>
          <div className="flex items-center gap-1 font-black text-[10px] uppercase text-slate-500 px-4">
             <span className="text-primary">Page {currentPage} / {totalPages}</span>
          </div>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border border-border bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><ChevronRight size={18}/></Button>
        </div>
      )}

      {/* --- MODAL D'ÉDITION CORRIGÉ : Centrage Absolu --- */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent 
           /* Les classes suivantes forcent le centrage au milieu de l'écran et limitent la hauteur */
           className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rounded-[2.5rem] p-6 md:p-10 max-w-md border-border bg-slate-900 text-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <DialogHeader className="text-left shrink-0">
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Configuration Privilèges</DialogTitle>
          </DialogHeader>
          
          {editUser && (
            <div className="space-y-6 mt-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="p-4 bg-slate-950 rounded-2xl border border-border shadow-inner text-left">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 border border-border text-primary flex items-center justify-center font-black shrink-0 shadow-lg">
                        {editUser.firstName.charAt(0)}{editUser.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <p className="font-black text-white text-sm uppercase leading-none truncate">{editUser.firstName} {editUser.lastName}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 truncate">{editUser.email}</p>
                    </div>
                </div>
              </div>

              <div className="space-y-5 text-left">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Rang hiérarchique</Label>
                    <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-950 border-none font-black text-xs shadow-inner px-4 text-slate-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-slate-900 border-border text-white">
                            <SelectItem value="Voyageur" className="font-bold focus:bg-primary/20">VOYAGEUR</SelectItem>
                            <SelectItem value="Agent" className="font-bold focus:bg-primary/20">AGENT D'AGENCE</SelectItem>
                            <SelectItem value="Administrateur" className="font-bold focus:bg-primary/20">ADMINISTRATEUR</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {editRole === 'Agent' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1 tracking-widest">Affectation Agence</Label>
                        <Select value={editCompany} onValueChange={setEditCompany}>
                            <SelectTrigger className="h-12 rounded-xl bg-primary/10 border-2 border-primary/20 font-black text-primary px-4 shadow-sm">
                                <SelectValue placeholder="Choisir une compagnie" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl bg-slate-900 border-border text-white max-h-[200px]">
                                <SelectItem value="none">Indépendant</SelectItem>
                                {companies.map(c => <SelectItem key={c.id} value={c.id} className="font-bold focus:bg-primary/20">{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full h-14 rounded-2xl font-black text-lg shadow-2xl bg-primary text-white hover:bg-primary/90 uppercase tracking-widest transition-all active:scale-95 border-none mt-2 shrink-0">
                {saving ? <RefreshCw className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                Appliquer
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
    Voyageur: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: UserIcon },
    Agent: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: UserCog },
    Administrateur: { color: 'bg-slate-950 text-white border-primary/30 shadow-lg', icon: ShieldCheck },
  };
  const config = configs[role] || { color: 'bg-slate-800 text-slate-500 border-slate-700', icon: MoreHorizontal };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase border ${config.color}`}>
      <Icon size={10} /> {role}
    </span>
  );
}