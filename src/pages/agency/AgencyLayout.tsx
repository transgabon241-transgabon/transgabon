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
  Truck // Ajout de l'icône Truck pour les colis
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { path: '/agency', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/agency/departures', label: 'Départs', icon: CalendarDays },
  { path: '/agency/vehicles', label: 'Véhicules', icon: Bus },
  { path: '/agency/validate', label: 'Validation QR', icon: QrCode },
  { path: '/agency/parcels', label: 'Colis', icon: Package },
  { path: '/agency/refunds', label: 'Remboursements', icon: RefreshCw },
  { path: '/agency/users', label: 'Gestion Équipe', icon: Users },
  { path: '/agency/luggage-settings', label: 'Réglages Bagages', icon: Settings2 },
  // NOUVEAU : Lien vers les réglages colis
  { path: '/agency/parcel-settings', label: 'Réglages Colis', icon: Truck },
  { path: '/agency/payments', label: 'Ma Caisse', icon: DollarSign },
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

  if (isLoading || !user) return null;

  // FILTRAGE DES ONGLETS SELON LE RÔLE
  const allowedItems = NAV_ITEMS.filter(item => {
    if (user.role === 'Agent Embarquement') {
      return ['/agency/departures', '/agency/validate'].includes(item.path);
    }
    if (user.role === 'Service Colis') {
      return ['/agency/parcels'].includes(item.path);
    }
    if (user.role === 'Caissier') {
      return ['/agency/validate', '/agency/refunds'].includes(item.path);
    }

    if (user.role === 'Caissier' || user.role === 'Agent') {
    return ['/agency/validate', '/agency/refunds', '/agency/payments'].includes(item.path);
  }
    
    // Les rôles 'Agent' (Manager) et 'Administrateur' voient tout, 
    // y compris les nouveaux 'luggage-settings' et 'parcel-settings'
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-foreground">
      <aside className="md:w-64 bg-card border-b md:border-b-0 md:border-r shrink-0 text-left flex flex-col">
        <div className="p-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Retour au site
          </Link>
          <h2 className="font-bold text-lg text-primary mb-1 tracking-tighter uppercase italic">Espace Guichet</h2>
          <div className="p-2 bg-muted/50 rounded-lg border border-primary/5">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Utilisateur</p>
            <p className="text-xs font-bold truncate">{user.firstName || user.email}</p>
            <p className="text-[9px] font-bold text-primary uppercase tracking-wider">{user.role}</p>
          </div>
        </div>

        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible px-2 pb-2 md:pb-4 gap-1 mt-2">
          {allowedItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  active 
                    ? 'bg-primary text-primary-foreground shadow-md translate-x-1' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? 'text-white' : 'text-primary'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block px-4 pb-4 mt-auto border-t pt-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 font-bold rounded-xl" 
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto bg-slate-50/50">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}