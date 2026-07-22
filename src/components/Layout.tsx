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
  Package, 
  Truck, 
  ChevronRight,
  Globe,
  MapPin,
  ChevronDown
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

  // Vérifie si l'utilisateur fait partie du personnel
  const isStaff = user && ["Agent", "Administrateur", "Agent Embarquement", "Service Colis", "Caissier"].includes(user.role);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30 text-foreground font-sans">
      
      {/* --- HEADER DESKTOP & MOBILE --- */}
      <header className="sticky top-0 z-[100] w-full border-b bg-white/90 backdrop-blur-md shadow-md">
        <div className="container mx-auto px-4 h-24 md:h-28 flex items-center justify-between">
          
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative">
                <img src={logo} alt="Logo" className="h-12 md:h-16 w-auto object-contain group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-primary rounded-full border-2 border-white shadow-sm" />
            </div>
            <div className="flex flex-col">
                <h1 className="font-black text-2xl md:text-3xl tracking-tighter leading-none uppercase italic">
                    <span className="text-slate-900">Trans</span>
                    <span className="text-primary">Gabon</span>
                    <span className="text-slate-900">-Connect</span>
                </h1>
                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 mt-1 leading-none">Mobilité Nationale</span>
            </div>
          </Link>

          {/* NAVIGATION DESKTOP */}
          <nav className="hidden lg:flex items-center gap-2">
            <NavLink to="/" label="ACCUEIL" active={location.pathname === '/'} />
            <NavLink to="/send-parcel" label="ENVOYER UN COLIS" active={location.pathname === '/send-parcel'} />
            <NavLink to="/track" label="SUIVI FRET" active={location.pathname === '/track'} />
          </nav>

          {/* USER ACTIONS DESKTOP */}
          <div className="hidden lg:flex items-center gap-6">
            {!isLoading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-100/50 border-2 border-transparent hover:border-primary/20 hover:bg-white transition-all shadow-sm group">
                         <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-110 transition-transform">
                            <User size={20} strokeWidth={2.5} />
                         </div>
                         <div className="flex flex-col text-left hidden xl:flex">
                            <span className="text-sm font-black text-slate-900 uppercase leading-none tracking-tight">{user.firstName} {user.lastName}</span>
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-1 opacity-80">{user.role}</span>
                         </div>
                         <ChevronDown size={14} className="text-slate-400 group-hover:text-primary" />
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
                    <Button variant="ghost" className="font-black text-[11px] uppercase h-12 px-6" onClick={() => loginWithRedirect()}>Connexion</Button>
                    <Button className="font-black text-[11px] uppercase h-12 px-10 rounded-2xl shadow-xl shadow-primary/20" onClick={() => loginWithRedirect({ initialView: 'signup' })}>S'inscrire</Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* HAMBURGER MOBILE */}
          <button className="lg:hidden p-4 rounded-2xl bg-slate-100 text-slate-900 active:scale-90 transition-transform shadow-sm" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* --- MENU MOBILE RÉVISÉ ET COMPLET --- */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-x-0 top-24 bg-white border-b shadow-2xl p-6 space-y-6 animate-in slide-in-from-top-4 duration-300 z-50 max-h-[85vh] overflow-y-auto">
            
            {/* 1. Entête Utilisateur (si connecté) */}
            {user && (
                <div className="flex items-center gap-4 p-5 bg-slate-900 rounded-[2rem] text-white shadow-xl">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
                        <User size={24} strokeWidth={2.5} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-black text-sm uppercase leading-none truncate">{user.firstName} {user.lastName}</p>
                        <Badge variant="outline" className="mt-2 border-primary/40 text-primary uppercase font-black text-[8px] px-2 py-0">
                            {user.role}
                        </Badge>
                    </div>
                </div>
            )}

            {/* 2. Navigation principale */}
            <div className="grid gap-2">
                <MobileLink to="/" label="Accueil" icon={Globe} onClick={() => setMobileOpen(false)} />
                <MobileLink to="/send-parcel" label="Envoyer un colis" icon={Package} onClick={() => setMobileOpen(false)} />
                <MobileLink to="/track" label="Suivre un colis" icon={Truck} onClick={() => setMobileOpen(false)} />
                
                {/* 3. Menus de gestion (si connecté) */}
                {user && (
                    <>
                        <div className="h-px bg-slate-100 my-2" />
                        <p className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 tracking-widest italic">Mon Compte</p>
                        <MobileLink to="/dashboard" label="Mes réservations" icon={LayoutDashboard} onClick={() => setMobileOpen(false)} />
                        
                        {isStaff && (
                            <MobileLink to="/agency" label="Espace Professionnel" icon={Building2} onClick={() => setMobileOpen(false)} isPrimary />
                        )}
                        
                        {user.role === 'Administrateur' && (
                            <MobileLink to="/admin" label="Administration Centrale" icon={Shield} onClick={() => setMobileOpen(false)} />
                        )}
                    </>
                )}
            </div>
            
            {/* 4. Actions de session */}
            <div className="pt-6 border-t border-slate-100">
              {!user ? (
                <div className="grid grid-cols-1 gap-3">
                  <Button className="h-14 rounded-2xl font-black text-xs uppercase bg-primary text-white" onClick={() => { loginWithRedirect({ initialView: 'signup' }); setMobileOpen(false); }}>Créer mon compte</Button>
                  <Button variant="outline" className="h-14 rounded-2xl font-black text-xs uppercase border-2" onClick={() => { loginWithRedirect(); setMobileOpen(false); }}>Connexion</Button>
                </div>
              ) : (
                <Button 
                    variant="ghost" 
                    onClick={() => { logout(); setMobileOpen(false); }} 
                    className="w-full h-14 justify-start gap-4 text-red-500 font-black uppercase text-xs hover:bg-red-50 rounded-2xl"
                >
                  <LogOut size={20} /> Déconnexion du compte
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 relative">
        {children}
      </main>

      <footer className="bg-white border-t-2 border-slate-50 py-16 mt-auto">
        {/* ... Pied de page identique ... */}
        <div className="container mx-auto px-4 flex flex-col items-center gap-10">
          <img src={logo} alt="Logo" className="h-12 w-auto grayscale opacity-20" />
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
            <Link to="/privacy" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary">Confidentialité</Link>
            <Link to="/terms" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary">Conditions</Link>
          </div>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em]">
              République Gabonaise • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * COMPOSANTS INTERNES UTILITAIRES
 */
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

function MobileLink({ to, label, icon: Icon, onClick, isPrimary = false }: any) {
    return (
        <Link 
            to={to} 
            onClick={onClick} 
            className={`flex items-center justify-between p-5 rounded-[1.5rem] transition-all active:scale-[0.98] ${
                isPrimary ? 'bg-primary/10 border-2 border-primary/20 text-primary' : 'bg-slate-50 text-slate-900 border-2 border-transparent'
            }`}
        >
            <div className="flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-sm ${
                    isPrimary ? 'bg-primary text-white' : 'bg-white text-slate-400 border border-slate-100'
                }`}>
                    <Icon size={20} />
                </div>
                <span className="font-black uppercase text-xs tracking-widest">{label}</span>
            </div>
            <ChevronRight size={18} className="opacity-30" />
        </Link>
    );
}