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
  ShieldCheck,
  User as UserIcon
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
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // LOGIQUE DE FILTRAGE DES ONGLETS PAR RÔLE
  const allowedItems = NAV_ITEMS.filter(item => {
    const role = user.role;
    if (role === 'Agent Embarquement') return ['/agency/departures', '/agency/validate'].includes(item.path);
    if (role === 'Service Colis') return ['/agency/parcels'].includes(item.path);
    if (role === 'Caissier') return ['/agency/validate', '/agency/refunds', '/agency/payments'].includes(item.path);
    return true; // Chef d'agence & Admin voient tout
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 font-sans">
      
      {/* SIDEBAR SaaS SOMBRE */}
      <aside className="md:w-72 bg-slate-900 text-white shrink-0 flex flex-col z-50 shadow-2xl overflow-hidden">
        
        {/* BRANDING */}
        <div className="p-8">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-primary mb-8 transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Retour Site</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
                <h2 className="font-black text-xl tracking-tighter uppercase italic leading-none">Agence</h2>
                <p className="text-[9px] font-bold text-primary uppercase tracking-[0.3em] mt-1">Opérations</p>
            </div>
          </div>
        </div>

        {/* PROFIL UTILISATEUR MINI CARD */}
        <div className="mx-4 mb-6 p-4 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black text-xs border border-primary/20">
                    {user.firstName?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                    <p className="text-xs font-black uppercase truncate text-white">{user.firstName || 'Utilisateur'}</p>
                    <Badge variant="outline" className="text-[7px] border-primary/40 text-primary uppercase font-black px-1.5 py-0">
                        {user.role}
                    </Badge>
                </div>
            </div>
        </div>

        {/* NAVIGATION FILTRÉE */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          {allowedItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 group ${
                  active 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 translate-x-2' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-500 group-hover:text-primary'}`} />
                    {item.label}
                </div>
                {active && <ChevronRight className="h-3 w-3" />}
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="p-6 mt-auto border-t border-white/5">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 font-black text-[10px] uppercase tracking-widest h-12 rounded-2xl transition-all" 
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" /> Déconnexion Session
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT CANVAS */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {/* Le "Canvas" blanc aux coins arrondis */}
            <div className="min-h-full w-full bg-white rounded-[2.5rem] shadow-sm border border-slate-200/50 p-6 md:p-10 relative">
                
                {/* Filigrane discret en fond de page (optionnel) */}
                <div className="absolute bottom-0 right-0 p-10 opacity-[0.03] pointer-events-none select-none">
                    <ShieldCheck size={300} />
                </div>

                <div className="relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {children}
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}