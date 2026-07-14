"use client"

import { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context"; 
import { Menu, X, User, LogOut, LayoutDashboard, Building2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// IMPORTATION DU LOGO
import logo from "@/assets/logo.png";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, isLoading, loginWithRedirect, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* LOGO ET NOM DU SITE */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={logo} 
              alt="Logo TransGabon-Connect" 
              className="h-9 w-auto object-contain group-hover:scale-105 transition-transform" 
            />
            <span className="font-black text-xl tracking-tighter text-primary hidden sm:block">
              TransGabon-Connect
            </span>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Accueil</Link>
            {user && (
              <Link to="/dashboard" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Mes voyages</Link>
            )}
            <Link to="/send-parcel" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Envoyer un colis</Link>
            <Link to="/track" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Suivre un colis</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isLoading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 font-bold border-2 border-primary/10 hover:border-primary/30">
                    <User className="h-4 w-4 text-primary" />
                    {user.firstName || user.email}
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-xl rounded-2xl p-2 text-slate-900 w-56">
                  <div className="px-2 py-1.5 mb-2 border-b">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mon Compte</p>
                  </div>
                  
                  <DropdownMenuItem onSelect={() => navigate('/dashboard')} className="rounded-lg cursor-pointer font-semibold">
                    <LayoutDashboard className="h-4 w-4 mr-2 text-slate-500" /> Mes voyages
                  </DropdownMenuItem>
                  
                  {(user.role === 'Agent' || user.role === 'Administrateur' || user.role === 'Agent Embarquement' || user.role === 'Caissier') && (
                    <DropdownMenuItem onSelect={() => navigate('/agency')} className="rounded-lg cursor-pointer font-semibold text-primary">
                      <Building2 className="h-4 w-4 mr-2" /> Espace agence
                    </DropdownMenuItem>
                  )}
                  
                  {user.role === 'Administrateur' && (
                    <DropdownMenuItem onSelect={() => navigate('/admin')} className="rounded-lg cursor-pointer font-semibold">
                      <Shield className="h-4 w-4 mr-2 text-slate-500" /> Administration
                    </DropdownMenuItem>
                  )}

                  <div className="mt-2 pt-2 border-t">
                    <DropdownMenuItem onSelect={() => logout()} className="rounded-lg cursor-pointer text-destructive font-bold hover:bg-destructive/10">
                      <LogOut className="h-4 w-4 mr-2" /> Déconnexion
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="font-bold" onClick={() => loginWithRedirect()}>Connexion</Button>
                <Button size="sm" className="font-bold px-5 shadow-lg" onClick={() => loginWithRedirect({ initialView: 'signup' })}>S'inscrire</Button>
              </div>
            )}
          </div>

          {/* Hamburger Mobile */}
          <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Menu Mobile */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-card px-4 py-6 space-y-4 animate-in slide-in-from-top duration-300">
            <Link to="/" onClick={() => setMobileOpen(false)} className="block text-base font-bold">Accueil</Link>
            {user && <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block text-base font-bold">Mes voyages</Link>}
            
            {user && (['Agent', 'Administrateur', 'Agent Embarquement', 'Caissier'].includes(user.role)) && (
              <Link to="/agency" onClick={() => setMobileOpen(false)} className="block text-base font-black text-primary flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Espace agence
              </Link>
            )}

            <Link to="/send-parcel" onClick={() => setMobileOpen(false)} className="block text-base font-bold">Envoyer un colis</Link>
            <Link to="/track" onClick={() => setMobileOpen(false)} className="block text-base font-bold">Suivre un colis</Link>
            
            <div className="pt-4 border-t">
              {!isLoading && !user ? (
                <div className="flex flex-col gap-3">
                  <Button variant="outline" className="w-full font-bold" onClick={() => { loginWithRedirect(); setMobileOpen(false); }}>Connexion</Button>
                  <Button className="w-full font-bold" onClick={() => { loginWithRedirect({ initialView: 'signup' }); setMobileOpen(false); }}>Créer un compte</Button>
                </div>
              ) : (
                <button onClick={() => { logout(); setMobileOpen(false); }} className="text-base text-destructive font-black flex items-center gap-2 w-full text-left">
                  <LogOut className="h-5 w-5" /> Se déconnecter
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 bg-slate-50/50">{children}</main>

      <footer className="border-t bg-white py-12">
        <div className="container mx-auto px-4 flex flex-col items-center gap-6">
          <img src={logo} alt="Logo" className="h-10 w-auto opacity-50" />
          
          {/* LIENS JURIDIQUES OBLIGATOIRES */}
          <div className="flex gap-6 text-[11px] uppercase font-black tracking-widest text-slate-500">
            <Link to="/privacy" className="hover:text-primary transition-colors">Confidentialité</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Conditions d'utilisation</Link>
          </div>

          <p className="text-center text-sm text-muted-foreground font-medium">
            © {new Date().getFullYear()} TransGabon-Connect — République Gabonaise
          </p>
        </div>
      </footer>
    </div>
  );
}