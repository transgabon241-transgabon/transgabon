"use client"

import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, CalendarDays, Bus, QrCode, LogOut, ArrowLeft, Package, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { path: '/agency', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/agency/departures', label: 'Départs', icon: CalendarDays },
  { path: '/agency/vehicles', label: 'Véhicules', icon: Bus },
  { path: '/agency/validate', label: 'Validation QR', icon: QrCode },
  { path: '/agency/parcels', label: 'Colis', icon: Package },
  { path: '/agency/refunds', label: 'Remboursements', icon: RefreshCw },
  { path: '/agency/users', label: 'Gestion Équipe', icon: Users },
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

  // SÉPARATION STRICTE DES COMPÉTENCES : Filtrage des onglets de la Sidebar selon le rôle exact
  const allowedItems = NAV_ITEMS.filter(item => {
    if (user.role === 'Agent Embarquement') {
      // Le contrôleur de quai ne voit que les départs (manifestes) et la validation QR de quai
      return ['/agency/departures', '/agency/validate'].includes(item.path);
    }
    if (user.role === 'Service Colis') {
      // L'agent logistique ne voit que le guichet de fret/colis
      return ['/agency/parcels'].includes(item.path);
    }
    if (user.role === 'Caissier') {
      // Le caissier ne voit que la caisse (Validation QR) et les remboursements
      return ['/agency/validate', '/agency/refunds'].includes(item.path);
    }
    // Le chef d'agence et l'admin ont accès à l'intégralité du menu
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-foreground">
      <aside className="md:w-64 bg-card border-b md:border-b-0 md:border-r shrink-0 text-left">
        <div className="p-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Retour au site
          </Link>
          <h2 className="font-bold text-lg text-primary mb-1">Espace Guichet</h2>
          <p className="text-xs text-muted-foreground truncate">{user.email} (<strong>{user.role}</strong>)</p>
        </div>
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible px-2 pb-2 md:pb-4 gap-1">
          {allowedItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:block px-4 pb-4 mt-auto">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground font-semibold" onClick={() => logout()}>
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto bg-muted/20">{children}</main>
    </div>
  );
}