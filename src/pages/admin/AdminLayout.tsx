"use client"

import { ReactNode, useEffect } from 'react';
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
  MapPin, 
  ArrowLeftRight,
  Globe,
  Settings,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Liste des onglets d'administration
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
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      loginWithRedirect({ initialView: 'signin' });
    }
  }, [isLoading, user, loginWithRedirect]);

  useEffect(() => {
    // Vérification du rôle Administrateur
    if (user && user.role !== 'Administrateur') {
      navigate('/');
    }
  }, [user, navigate]);

  if (isLoading || !user) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 font-sans">
      
      {/* SIDEBAR DESIGN SaaS */}
      <aside className="md:w-72 bg-slate-900 text-white shrink-0 flex flex-col z-50 shadow-2xl">
        
        {/* LOGO & BRANDING */}
        <div className="p-8">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-primary mb-8 transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Retour Site</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
                <h2 className="font-black text-xl tracking-tighter uppercase italic leading-none">Console</h2>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Administration</p>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {NAV.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 group ${
                  active 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-500 group-hover:text-primary'}`} />
                    {item.label}
                </div>
                {active && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        {/* USER FOOTER */}
        <div className="p-6 mt-auto border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3 mb-4">
             <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-black text-primary">
                {user.firstName?.charAt(0) || 'A'}
             </div>
             <div className="overflow-hidden">
                <p className="text-xs font-black uppercase truncate">{user.firstName} {user.lastName}</p>
                <Badge variant="outline" className="text-[7px] border-emerald-500/50 text-emerald-400 uppercase font-black px-1.5 py-0">Super Admin</Badge>
             </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 font-black text-[10px] uppercase tracking-widest h-11 rounded-xl" 
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {/* Conteneur arrondi pour les pages internes */}
            <div className="min-h-full w-full bg-white rounded-[2.5rem] shadow-sm border border-slate-200/50 p-6 md:p-10 relative overflow-hidden">
                {/* Petit décor visuel en fond (optionnel) */}
                <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none">
                    <Shield size={400} />
                </div>
                
                <div className="relative z-10">
                    {children}
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}