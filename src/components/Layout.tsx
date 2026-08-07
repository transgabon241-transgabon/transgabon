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
  ChevronDown,
  ShieldCheck
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

  // On garde ta logique de staff identique
  const isStaff = user && ["Agent", "Administrateur", "Agent Embarquement", "Service Colis", "Caissier", "Chef d'agence"].includes(user.role);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-primary/30 selection:text-white">
      
      {/* --- HEADER : Glassmorphism Effect --- */}
      <header className="sticky top-0 z-[100] w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md shadow-2xl">
        <div className="container mx-auto px-4 h-20 md:h-24 flex items-center justify-between">
          
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative">
                <img src={logo} alt="Logo" className="h-10 md:h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-[#020817] shadow-lg shadow-primary/20" />
            </div>
            <div className="flex flex-col text-left">
                <h1 className="font-black text-xl md:text-2xl tracking-tighter leading-none uppercase italic">
                    <span className="text-white">Trans</span>
                    <span className="text-primary">Gabon</span>
                    <span className="text-white opacity-80">-Connect</span>
                </h1>
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 mt-1 leading-none">Mobilité Nationale</span>
            </div>
          </Link>

          {/* NAVIGATION DESKTOP */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            <NavLink to="/" label="Accueil" active={location.pathname === '/'} />
            <NavLink to="/send-parcel" label="Fret" active={location.pathname === '/send-parcel'} />
            <NavLink to="/track" label="Suivi" active={location.pathname === '/track'} />
          </nav>

          {/* USER ACTIONS DESKTOP */}
          <div className="hidden lg:flex items-center gap-4">
            {!isLoading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/10 transition-all group">
                         <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <User size={18} strokeWidth={2.5} />
                         </div>
                         <div className="flex flex-col text-left hidden xl:flex">
                            <span className="text-xs font-black text-white uppercase leading-none truncate max-w-[100px]">{user.firstName}</span>
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest mt-1 opacity-80">{user.role}</span>
                         </div>
                         <ChevronDown size={14} className="text-slate-500 group-hover:text-primary" />
                      </button>
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent align="end" className="w-72 p-4 rounded-[2rem] shadow-2xl border-white/10 bg-slate-900 text-foreground animate-in zoom-in-95">
                      <div className="px-3 py-4 mb-2 bg-slate-950/50 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Session Active</p>
                        <p className="text-xs font-bold text-slate-300 truncate italic">{user.email}</p>
                      </div>
                      
                      <DropdownMenuItem onClick={() => navigate('/dashboard')} className="rounded-xl py-3 font-bold text-xs gap-3 focus:bg-white/10 cursor-pointer">
                        <LayoutDashboard size={16} className="text-primary" /> Mon Espace Client
                      </DropdownMenuItem>

                      {isStaff && (
                        <DropdownMenuItem onClick={() => navigate('/agency')} className="rounded-xl py-3 font-black text-xs gap-3 text-emerald-400 bg-emerald-500/10 mt-1 focus:bg-emerald-500/20 cursor-pointer border border-emerald-500/10">
                          <Building2 size={16} /> Console Agence
                        </DropdownMenuItem>
                      )}

                      {user.role === 'Administrateur' && (
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-xl py-3 font-black text-xs gap-3 text-white border border-white/10 mt-1 focus:bg-white/10 cursor-pointer">
                          <Shield size={16} className="text-primary" /> Administration Centrale
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator className="my-2 bg-white/5" />
                      <DropdownMenuItem onClick={() => logout()} className="rounded-xl py-3 font-black text-xs gap-3 text-red-400 hover:text-red-300 focus:bg-red-500/10 cursor-pointer">
                        <LogOut size={16} /> Déconnexion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" className="font-black text-[11px] uppercase text-slate-400 hover:text-white" onClick={() => loginWithRedirect()}>Connexion</Button>
                    <Button className="font-black text-[11px] uppercase h-11 px-8 rounded-xl shadow-xl shadow-primary/20 bg-primary text-white border-none hover:bg-primary/90 transition-all active:scale-95" onClick={() => loginWithRedirect({ initialView: 'signup' })}>S'inscrire</Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* HAMBURGER MOBILE */}
          <button className="lg:hidden p-3 rounded-xl bg-white/5 text-white active:scale-90 transition-transform" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* --- MENU MOBILE : Glassmorphism Style --- */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-x-0 top-[80px] bg-slate-950/95 backdrop-blur-2xl border-b border-white/10 shadow-2xl p-6 space-y-6 animate-in slide-in-from-top-4 duration-300 z-50 max-h-[85vh] overflow-y-auto">
            
            {user && (
                <div className="flex items-center gap-4 p-5 bg-white/5 rounded-[2rem] text-white border border-white/10">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
                        <User size={24} strokeWidth={2.5} />
                    </div>
                    <div className="overflow-hidden text-left">
                        <p className="font-black text-sm uppercase leading-none truncate">{user.firstName} {user.lastName}</p>
                        <Badge className="mt-2 bg-primary/20 text-primary border-none uppercase font-black text-[8px] px-2 py-0.5">
                            {user.role}
                        </Badge>
                    </div>
                </div>
            )}

            <div className="grid gap-2 text-left">
                <MobileLink to="/" label="Accueil" icon={Globe} onClick={() => setMobileOpen(false)} />
                <MobileLink to="/send-parcel" label="Envoyer un colis" icon={Package} onClick={() => setMobileOpen(false)} />
                <MobileLink to="/track" label="Suivre un colis" icon={Truck} onClick={() => setMobileOpen(false)} />
                
                {user && (
                    <>
                        <div className="h-px bg-white/5 my-2" />
                        <p className="text-[10px] font-black uppercase text-slate-500 ml-4 mb-1 tracking-widest italic">Navigation Privée</p>
                        <MobileLink to="/dashboard" label="Mes réservations" icon={LayoutDashboard} onClick={() => setMobileOpen(false)} />
                        
                        {isStaff && (
                            <MobileLink to="/agency" label="Espace Professionnel" icon={Building2} onClick={() => setMobileOpen(false)} isPrimary />
                        )}

                        {user.role === 'Administrateur' && (
                            <MobileLink to="/admin" label="Administration Centrale" icon={ShieldCheck} onClick={() => setMobileOpen(false)} />
                        )}
                    </>
                )}
            </div>
            
            <div className="pt-6 border-t border-white/10">
              {!user ? (
                <div className="grid grid-cols-1 gap-3">
                  <Button className="h-14 rounded-2xl font-black text-xs uppercase bg-primary text-white" onClick={() => { loginWithRedirect({ initialView: 'signup' }); setMobileOpen(false); }}>Créer mon compte</Button>
                  <Button variant="outline" className="h-14 rounded-2xl font-black text-xs uppercase border-white/20 bg-white/5 text-slate-300" onClick={() => { loginWithRedirect(); setMobileOpen(false); }}>Connexion</Button>
                </div>
              ) : (
                <Button variant="ghost" onClick={() => { logout(); setMobileOpen(false); }} className="w-full h-14 justify-start gap-4 text-red-400 font-black uppercase text-xs hover:bg-red-500/10 rounded-2xl">
                  <LogOut size={20} /> Déconnexion
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 relative">
        {children}
      </main>

      {/* --- FOOTER SOMBRE --- */}
      <footer className="bg-slate-950 border-t border-white/5 py-16 mt-auto">
        <div className="container mx-auto px-4 flex flex-col items-center gap-8">
          <img src={logo} alt="Logo" className="h-10 w-auto opacity-20 grayscale brightness-200" />
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
            <Link to="/privacy" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-primary transition-colors">Confidentialité</Link>
            <Link to="/terms" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-primary transition-colors">Conditions</Link>
            <a href="mailto:transgabon241@gmail.com" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-primary transition-colors">Support</a>
          </div>
          <p className="text-[9px] font-bold text-slate-700 uppercase tracking-[0.5em] text-center max-w-xs leading-relaxed">
              République Gabonaise • Système National Connecté
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
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                active ? 'text-primary bg-primary/10 shadow-sm' : 'text-slate-400 hover:text-white'
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
            className={`flex items-center justify-between p-4 rounded-[1.25rem] transition-all active:scale-[0.98] ${
                isPrimary ? 'bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/5' : 'bg-white/5 text-slate-200 border border-white/5'
            }`}
        >
            <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-md ${
                    isPrimary ? 'bg-primary text-white' : 'bg-slate-900 text-slate-500 border border-white/5'
                }`}>
                    <Icon size={18} />
                </div>
                <span className="font-black uppercase text-[11px] tracking-widest leading-none">{label}</span>
            </div>
            <ChevronRight size={16} className="opacity-20" />
        </Link>
    );
}