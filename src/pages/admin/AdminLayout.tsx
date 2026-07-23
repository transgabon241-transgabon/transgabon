"use client"

import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { 
  LayoutDashboard, 
  Building2, 
  UsersRound, 
  CreditCard, 
  LogOut, 
  ArrowLeft, 
  Shield, 
  ArrowLeftRight, 
  Globe, 
  ChevronRight, 
  Menu, 
  X,
  Plane // Importé pour de futures utilisations si besoin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const NAV = [
  { path: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/admin/companies', label: 'Partenaires', icon: Building2 },
  { path: '/admin/cities', label: 'Maillage National', icon: Globe },
  { path: '/admin/routes', label: 'Axes Commerciaux', icon: ArrowLeftRight },
  { path: '/admin/users', label: 'Gestion Utilisateurs', icon: UsersRound },
  { path: '/admin/payments', label: 'Flux Financiers', icon: CreditCard },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, loginWithRedirect, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect({ initialView: 'signin' });
  }, [isLoading, user, loginWithRedirect]);

  useEffect(() => {
    if (user && user.role !== 'Administrateur') navigate('/');
  }, [user, navigate]);

  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  if (isLoading || !user) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-primary">
        <RefreshCw className="h-10 w-10 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background font-sans relative overflow-x-hidden text-foreground">
      
      {/* --- MOBILE TOP BAR --- */}
      <div className="md:hidden flex items-center justify-between bg-card text-white p-4 h-20 shadow-2xl z-[60] border-b border-border">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="font-black uppercase tracking-tighter italic text-lg text-white">Admin Console</span>
        </div>
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-3 bg-muted rounded-2xl active:scale-90 transition-transform"
        >
            {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* --- OVERLAY MOBILE --- */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR ADMIN XXL --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-slate-950 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        <div className="p-10 text-left">
          <Link to="/" className="flex items-center gap-3 text-slate-500 hover:text-primary mb-10 transition-colors group">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-[11px] font-black uppercase tracking-[0.25em]">Site Public</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Shield className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
                <h2 className="font-black text-2xl tracking-tighter uppercase italic leading-none text-white">Console</h2>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mt-1.5 leading-none">Super Administration</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          {NAV.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-5 py-4 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest transition-all duration-300 group ${
                  active 
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 translate-x-2' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-4 text-left">
                    <item.icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-500 group-hover:text-primary'}`} />
                    {item.label}
                </div>
                {active && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-8 mt-auto border-t border-white/5 bg-black/20 text-left">
          <div className="flex items-center gap-4 mb-6">
             <div className="h-12 w-12 rounded-2xl bg-slate-900 border-2 border-white/10 flex items-center justify-center font-black text-primary text-lg shrink-0 shadow-inner">
                {user.firstName?.charAt(0) || 'A'}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-black uppercase truncate text-white leading-none">{user.firstName} {user.lastName}</p>
                <Badge variant="outline" className="mt-2 border-emerald-500/50 text-emerald-400 uppercase font-black text-[7px] px-2 py-0.5">Super Admin</Badge>
             </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-4 text-slate-500 hover:text-red-400 hover:bg-red-500/10 font-black text-[10px] uppercase tracking-[0.2em] h-14 rounded-2xl transition-all" 
            onClick={() => logout()}
          >
            <LogOut size={20} /> Déconnexion Système
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 w-full h-screen overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto p-3 md:p-8">
            <div className="min-h-full w-full bg-card rounded-[1.5rem] md:rounded-[3rem] shadow-2xl border border-border p-5 md:p-12 relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none text-white">
                    <Shield size={500} />
                </div>
                <div className="relative z-10 animate-in fade-in slide-in-from-bottom-3 duration-700">
                    {children}
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}

// Importation nécessaire pour le squelette si non définie
import { RefreshCw } from 'lucide-react';