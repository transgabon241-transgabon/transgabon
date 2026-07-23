"use client"

import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { 
  LayoutDashboard, CalendarDays, Bus, QrCode, LogOut, ArrowLeft, Package, 
  RefreshCw, Users, Settings2, Truck, DollarSign, ChevronRight, ShieldCheck, Menu, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { path: '/agency', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/agency/departures', label: 'Gestion Départs', icon: CalendarDays },
  { path: '/agency/vehicles', label: 'Ma Flotte', icon: Bus },
  { path: '/agency/validate', label: 'Contrôle QR', icon: QrCode },
  { path: '/agency/parcels', label: 'Logistique Colis', icon: Package },
  { path: '/agency/refunds', label: 'Annulations', icon: RefreshCw },
  { path: '/agency/users', label: 'Mon Équipe', icon: Users },
  { path: '/agency/luggage-settings', label: 'Prix Bagages', icon: Settings2 },
  { path: '/agency/parcel-settings', label: 'Grilles Fret', icon: Truck },
  { path: '/agency/payments', label: 'État de Caisse', icon: DollarSign },
];

export default function AgencyLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, loginWithRedirect, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect({ initialView: 'signin' });
  }, [isLoading, user]);

  useEffect(() => {
    const allowedRoles = ['Agent', 'Administrateur', 'Agent Embarquement', 'Service Colis', 'Caissier'];
    if (user && !allowedRoles.includes(user.role)) navigate('/');
  }, [user]);

  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  if (isLoading || !user) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const allowedItems = NAV_ITEMS.filter(item => {
    const role = user.role;
    if (role === 'Agent Embarquement') return ['/agency/departures', '/agency/validate'].includes(item.path);
    if (role === 'Service Colis') return ['/agency/parcels'].includes(item.path);
    if (role === 'Caissier') return ['/agency/validate', '/agency/refunds', '/agency/payments', '/agency/parcels'].includes(item.path);
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background font-sans relative overflow-x-hidden text-foreground">
      
      {/* --- MOBILE TOP BAR --- */}
      <div className="md:hidden flex items-center justify-between bg-card text-white p-4 h-20 shadow-xl z-[60] border-b border-border">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="font-black uppercase tracking-tighter italic text-lg text-white">Console</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-muted rounded-2xl active:scale-90 transition-transform">
            {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* OVERLAY MOBILE */}
      {isSidebarOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* --- SIDEBAR AGENCE --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-slate-950 text-white flex flex-col shadow-2xl transition-transform duration-300
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-10 text-left">
          <Link to="/" className="flex items-center gap-3 text-slate-500 hover:text-primary mb-10 transition-colors group">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-[11px] font-black uppercase tracking-widest leading-none">Public</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
                <h2 className="font-black text-2xl tracking-tighter uppercase italic leading-none text-white">Agence</h2>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mt-1.5">Opérations</p>
            </div>
          </div>
        </div>

        {/* PROFILE CARD SOMBRE */}
        <div className="mx-6 mb-8 p-5 bg-white/5 rounded-[1.5rem] border border-white/10">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black text-xs border border-primary/20">
                    {user.firstName?.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden text-left">
                    <p className="text-sm font-black uppercase truncate text-white leading-none">{user.firstName}</p>
                    <Badge className="mt-2 bg-primary text-white border-none uppercase font-black text-[7px] h-4">
                        {user.role}
                    </Badge>
                </div>
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide">
          {allowedItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center justify-between px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  active ? 'bg-primary text-white shadow-lg translate-x-2' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-4">
                    <item.icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-600'}`} />
                    {item.label}
                </div>
                {active && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-8 mt-auto border-t border-white/5">
          <Button variant="ghost" onClick={() => logout()} className="w-full justify-start gap-4 text-slate-500 hover:text-red-400 font-black text-[10px] uppercase tracking-widest h-14 rounded-2xl">
            <LogOut size={20} /> Fermer Session
          </Button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto p-3 md:p-8">
            <div className="min-h-full w-full bg-card rounded-[1.5rem] md:rounded-[3.5rem] shadow-2xl border border-border p-5 md:p-12 relative overflow-hidden">
                <div className="relative z-10 animate-in fade-in duration-500">
                    {children}
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}