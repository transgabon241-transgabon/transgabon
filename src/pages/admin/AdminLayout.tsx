"use client"

import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, Building2, UsersRound, CreditCard, LogOut, ArrowLeft, Shield, MapPin, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';


// Liste des onglets d'administration (La Sidebar d'Admin)
const NAV = [
  { path: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/admin/companies', label: 'Compagnies', icon: Building2 },
  { path: '/admin/cities', label: 'Gares & Villes', icon: MapPin },
  { path: '/admin/routes', label: 'Itinéraires (Routes)', icon: ArrowLeftRight },
  { path: '/admin/users', label: 'Utilisateurs', icon: UsersRound },
  { path: '/admin/payments', label: 'Paiements', icon: CreditCard },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, loginWithRedirect, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      loginWithRedirect({ initialView: 'signin' });
    }
  }, [isLoading, user, loginWithRedirect]);

  useEffect(() => {
    // Règle d'autorisation stricte : Seul l'Administrateur accède au Portail Admin
    if (user && user.role !== 'Administrateur') {
      navigate('/');
    }
  }, [user, navigate]);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30 text-foreground">
      {/* Sidebar d'administration */}
      <aside className="md:w-64 bg-card border-b md:border-b-0 md:border-r shrink-0 text-left">
        <div className="p-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Retour au site
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg text-primary">Administration</h2>
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible px-2 pb-2 md:pb-4 gap-1">
          {NAV.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  active 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
      <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}