"use client"

import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context"; 
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  LayoutDashboard, 
  Building2, 
  Shield, 
  ChevronRight,
  ChevronDown, // Ajouté
  Globe,
  MapPin,
  Package,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// IMPORTATION DU LOGO
import logo from "@/assets/logo.png";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, isLoading, loginWithRedirect, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isStaff = user && ["Agent", "Administrateur", "Agent Embarquement", "Service Colis", "Caissier"].includes(user.role);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30 text-foreground font-sans">
      
      <header className="sticky top-0 z-[100] w-full border-b bg-white/90 backdrop-blur-md shadow-md">
        <div className="container mx-auto px-4 h-24 md:h-28 flex items-center justify-between">
          
          {/* LOGO ET NOM */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative">
                <img src={logo} alt="Logo" className="h-12 md:h-16 w-auto object-contain group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-primary rounded-full border-2 border-white shadow-sm" />
            </div>
            <div className="flex flex-col">
                <h1 className="font-black text-2xl md:text-3xl tracking-tighter leading-none">
                    <span className="text-slate-900">Trans</span>
                    <span className="text-primary">Gabon</span>
                    <span className="text-slate-900">-Connect</span>
                </h1>
                <span className="text-[10px] md:text-[10px] font-black uppercase tracking-[1em] text-slate-400 mt-1">Mobilité Nationale</span>
            </div>
          </Link>

          {/* NAVIGATION DESKTOP */}
          <nav className="hidden lg:flex items-center gap-2">
            <NavLink to="/" label="ACCUEIL" active={location.pathname === '/'} />
            <NavLink to="/send-parcel" label="ENVOYER UN COLIS" active={location.pathname === '/send-parcel'} />
            <NavLink to="/track" label="SUIVI FRET" active={location.pathname === '/track'} />
          </nav>

          <div className="hidden lg:flex items-center gap-6">
            {!isLoading && (
              <>
                {user ? (
                  <DropdownMenu>
                    {/* --- BOUTON DE PROFIL AVEC NOM COMPLET --- */}
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-100/50 border-2 border-transparent hover:border-primary/20 hover:bg-white transition-all shadow-sm group">
                         {/* Avatar Icon */}
                         <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-110 transition-transform">
                            <User size={20} strokeWidth={2.5} />
                         </div>
                         
                         {/* Nom et Rôle */}
                         <div className="flex flex-col text-left hidden xl:flex">
                            <span className="text-sm font-black text-slate-900 uppercase leading-none tracking-tight">
                                {user.firstName} {user.lastName}
                            </span>
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-1 opacity-80">
                                {user.role}
                            </span>
                         </div>

                         <ChevronDown size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
                      </button>
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent align="end" className="w-72 p-4 rounded-[2rem] shadow-2xl border-slate-100 animate-in zoom-in-95">
                      <div className="px-3 py-4 mb-2 bg-slate-50 rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Identifiant</p>
                        <p className="text-xs font-bold text-slate-600 truncate">{user.email}</p>
                      </div>
                      
                      <DropdownMenuItem onClick={() => navigate('/dashboard')} className="rounded-xl py-3.5 font-bold text-xs gap-3">
                        <LayoutDashboard size={18} className="text-slate-400" /> Mes réservations
                      </DropdownMenuItem>
                      
                      {isStaff && (
                        <DropdownMenuItem onClick={() => navigate('/agency')} className="rounded-xl py-3.5 font-black text-xs gap-3 text-primary bg-primary/5 mt-1">
                          <Building2 size={18} /> Espace Professionnel
                        </DropdownMenuItem>
                      )}
                      
                      {user.role === 'Administrateur' && (
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-xl py-3.5 font-black text-xs gap-3 text-slate-900 border-2 border-slate-50 mt-1">
                          <Shield size={18} /> Administration Centrale
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator className="my-2" />
                      
                      <DropdownMenuItem onClick={() => logout()} className="rounded-xl py-3.5 font-black text-xs gap-3 text-red-500 hover:bg-red-50">
                        <LogOut size={18} /> Déconnexion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" className="font-black text-[11px] uppercase tracking-widest h-12 px-6" onClick={() => loginWithRedirect()}>
                        Connexion
                    </Button>
                    <Button className="font-black text-[11px] uppercase tracking-widest h-12 px-10 rounded-2xl shadow-xl shadow-primary/20" onClick={() => loginWithRedirect({ initialView: 'signup' })}>
                        S'inscrire
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <button className="lg:hidden p-4 rounded-2xl bg-slate-100 text-slate-900 active:scale-90 transition-transform shadow-sm" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* MOBILE MENU */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-x-0 top-24 bg-white border-b shadow-2xl p-6 space-y-6 animate-in slide-in-from-top-4 duration-300 z-50">
            {user && (
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
                        <User size={24} />
                    </div>
                    <div>
                        <p className="font-black text-slate-900 uppercase text-sm leading-none">{user.firstName} {user.lastName}</p>
                        <p className="text-[10px] font-bold text-primary uppercase mt-1">{user.role}</p>
                    </div>
                </div>
            )}
            <div className="grid gap-3">
                <MobileLink to="/" label="Accueil" icon={Globe} onClick={() => setMobileOpen(false)} />
                <MobileLink to="/send-parcel" label="Envoyer un colis" icon={Package} onClick={() => setMobileOpen(false)} />
                <MobileLink to="/track" label="Suivre un colis" icon={Truck} onClick={() => setMobileOpen(false)} />
                {user && <MobileLink to="/dashboard" label="Mes voyages" icon={MapPin} onClick={() => setMobileOpen(false)} />}
            </div>
            {/* ... reste du menu mobile ... */}
          </div>
        )}
      </header>

      <main className="flex-1 relative">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t-2 border-slate-50 py-20 mt-auto">
        <div className="container mx-auto px-4 flex flex-col items-center gap-10">
          <img src={logo} alt="Logo" className="h-14 w-auto grayscale opacity-20" />
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
            <Link to="/privacy" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary">Confidentialité</Link>
            <Link to="/terms" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary">Conditions</Link>
          </div>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em]">
              République Gabonaise. Tout droit reservé SHOOL-TECH   • {new Date().getFullYear()}
          </p>
        </div>
      </footer>   
    </div> 
  );
}

function NavLink({ to, label, active }: { to: string, label: string, active: boolean }) {
    return (
        <Link 
            to={to} 
            className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                active ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-primary'
            }`}
        >
            {label}
        </Link>
    );
}

function MobileLink({ to, label, icon: Icon, onClick }: any) {
    return (
        <Link 
            to={to} 
            onClick={onClick} 
            className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 text-slate-900 active:bg-slate-100 transition-colors"
        >
            <div className="h-12 w-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                <Icon size={24} />
            </div>
            <span className="font-black uppercase text-sm tracking-widest">{label}</span>
        </Link>
    );
}