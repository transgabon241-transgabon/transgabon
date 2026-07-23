"use client"

import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Bus, 
  QrCode, 
  LogOut, 
  ArrowLeft, 
  Package, 
  RefreshCw, 
  Users,
  Settings2,
  Truck,
  DollarSign,
  ChevronRight,
  ShieldCheck
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
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      loginWithRedirect({ initialView: 'signin' });
    }
  }, [isLoading, user, loginWithRedirect]);

  useEffect(() => {
    const allowedRoles = ['Agent', 'Administrateur', 'Agent Embarquement', 'Service Colis', 'Caissier'];
    if (user && !allowedRoles.includes(user.role)) {
      navigate('/');
    }
  }, [user, navigate]);

  if (isLoading || !user) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 font-sans">
      
      {/* SIDEBAR SaaS LARGE & SOMBRE */}
      <aside className="md:w-80 bg-slate-900 text-white shrink-0 flex flex-col z-50 shadow-2xl overflow-hidden">
        
        {/* BRANDING D'AGENCE */}
        <div className="p-10">
          <Link to="/" className="flex items-center gap-3 text-slate-400 hover:text-primary mb-10 transition-colors group">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-[11px] font-black uppercase tracking-[0.25em]">Site Public</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <div>
                <h2 className="font-black text-2xl tracking-tighter uppercase italic leading-none">Console</h2>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mt-1.5">Gestion Agence</p>
            </div>
          </div>
        </div>

        {/* PROFILE CARD ENRICHIE */}
        <div className="mx-6 mb-10 p-5 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black text-sm border-2 border-primary/20">
                    {user.firstName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-black uppercase truncate text-white leading-none">{user.firstName || 'Agent'}</p>
                    <Badge variant="outline" className="mt-2 border-primary/40 text-primary uppercase font-black text-[8px] px-2.5 py-0.5">
                        {user.role}
                    </Badge>
                </div>
            </div>
        </div>

        {/* NAVIGATION LARGE */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          {allowedItems.map(item => {
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
                <div className="flex items-center gap-4">
                    <item.icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-500 group-hover:text-primary'}`} />
                    {item.label}
                </div>
                {active && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER SIDEBAR */}
        <div className="p-8 mt-auto border-t border-white/5">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-4 text-slate-500 hover:text-red-400 hover:bg-red-500/10 font-black text-[10px] uppercase tracking-[0.2em] h-14 rounded-2xl transition-all" 
            onClick={() => logout()}
          >
            <LogOut size={20} /> Fermer Session
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT CANVAS - CORRIGÉ POUR MOBILE */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-2 md:p-8"> {/* p-2 sur mobile */}
            {/* Le conteneur s'adapte : moins arrondi et moins de padding sur mobile */}
            <div className="min-h-full w-full bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-200/50 p-4 md:p-10 relative">
                
                <div className="relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {children}
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}