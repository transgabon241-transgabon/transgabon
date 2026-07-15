"use client"

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Pencil, UsersRound, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // --- ÉTATS POUR LA PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    try {
      const [uRes, cRes] = await Promise.all([
        supabase.from('User').select('*, Company:companies(name)').order('firstName', { ascending: true }),
        supabase.from('companies').select('id, name').order('name', { ascending: true }),
      ]);

      if (uRes.error) throw new Error(uRes.error.message);
      if (cRes.error) throw new Error(cRes.error.message);

      const formattedUsers: User[] = (uRes.data || []).map(u => {
        let mappedRole = 'Voyageur';
        if (u.role === 'ADMIN') mappedRole = 'Administrateur';
        else if (u.role === 'AGENT_AGENCE') mappedRole = 'Agent';

        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email || '—',
          phone: u.phone,
          role: mappedRole,
          companyId: u.agencyId || undefined,
          companyName: (u.Company as any)?.name || undefined
        };
      });

      setUsers(formattedUsers);
      setCompanies(cRes.data || []);
    } catch (e: any) { 
      toast.error(e.message || 'Erreur lors du chargement des données'); 
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
      let dbRole = 'VOYAGEUR';
      if (editRole === 'Administrateur') dbRole = 'ADMIN';
      else if (editRole === 'Agent') dbRole = 'AGENT_AGENCE';

      const { error } = await supabase
        .from('User')
        .update({
          role: dbRole,
          agencyId: dbRole === 'AGENT_AGENCE' ? (editCompany === 'none' ? null : editCompany) : null
        })
        .eq('id', editUser.id);

      if (error) throw new Error(error.message);

      toast.success('Utilisateur mis à jour avec succès !');
      setEditUser(null);
      loadData();
    } catch (e: any) { 
      toast.error(e.message || 'Erreur d’enregistrement'); 
    } finally { 
      setSaving(false); 
    }
  };

  // --- LOGIQUE DE FILTRAGE ET PAGINATION ---
  const filtered = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      const q = search.toLowerCase();
      return !q || u.email.toLowerCase().includes(q) || u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  // Reset la page quand on filtre ou recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  if (loading) return <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;

  const roleCounts = {
    all: users.length,
    Voyageur: users.filter(u => u.role === 'Voyageur').length,
    Agent: users.filter(u => u.role === 'Agent').length,
    Administrateur: users.filter(u => u.role === 'Administrateur').length,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-left">Gestion des utilisateurs</h1>

      <div className="flex flex-col md:flex-row gap-3 mb-6 text-left">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur…" className="pl-9" />
        </div>
        <div className="flex gap-2">
          {(['all', 'Voyageur', 'Agent', 'Administrateur'] as const).map(r => (
            <Button key={r} variant={roleFilter === r ? 'default' : 'outline'} size="sm" onClick={() => setRoleFilter(r)}>
              {r === 'all' ? 'Tous' : r} ({roleCounts[r]})
            </Button>
          ))}
        </div>
      </div>

      {paginatedUsers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UsersRound className="h-12 w-12 mx-auto mb-4" />
          <p>Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Utilisateur</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Téléphone</th>
                  <th className="text-left p-3 font-medium">Rôle</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Compagnie</th>
                  <th className="text-right p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(u => (
                  <tr key={u.id} className="border-t hover:bg-muted/30 text-left">
                    <td className="p-3 font-medium">{u.firstName} {u.lastName}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{u.email}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{u.phone || '—'}</td>
                    <td className="p-3"><RoleBadge role={u.role} /></td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{u.companyName || '—'}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- CONTRÔLES DE PAGINATION --- */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6 bg-slate-50 p-2 rounded-xl w-fit mx-auto border">
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-xs font-bold">
                <span className="text-primary">Page {currentPage}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-500">{totalPages}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <p className="text-sm text-muted-foreground mt-4 text-left">
        Affichage de {paginatedUsers.length} sur {filtered.length} utilisateur(s) trouvé(s)
      </p>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-left">Modifier le rôle</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4 text-left">
              <p className="text-sm text-muted-foreground">{editUser.firstName} {editUser.lastName} — {editUser.email}</p>
              <div>
                <Label>Rôle</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Voyageur">Voyageur</SelectItem>
                    <SelectItem value="Agent">Agent</SelectItem>
                    <SelectItem value="Administrateur">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editRole === 'Agent' && (
                <div>
                  <Label>Compagnie associée</Label>
                  <Select value={editCompany} onValueChange={setEditCompany}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir une compagnie" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    Voyageur: 'bg-blue-100 text-blue-800',
    Agent: 'bg-orange-100 text-orange-800',
    Administrateur: 'bg-purple-100 text-purple-800',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[role] || 'bg-muted'}`}>{role}</span>;
}