import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, Settings, LogIn, LogOut, Menu, X, Download, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { usePwa } from '@/contexts/PwaContext';
import { motion, AnimatePresence } from 'motion/react';

import { Logo } from '@/components/Logo';

export function Layout() {
  const { user, logout } = useAuth();
  const { isInstalled, promptInstall } = usePwa();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <PwaInstallBanner />
      <nav className="border-b border-white/5 bg-background/80 backdrop-blur-xl fixed w-full top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* Logo */}
            <Link to="/" className="shrink-0 flex items-center">
              <Logo className="h-10" />
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center justify-center space-x-6 flex-1">
              <Link to="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider">How It Works</Link>
              <Link to="/#plans" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider">Plans</Link>
              <Link to="/#rewards" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider">Rewards</Link>
              <Link to="/#faq" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider">FAQ</Link>
              <Link to="/transparency" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider">Transparency</Link>
              <Link to="/education" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider">Education</Link>
              <Link to="/community" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider">Community</Link>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-4 shrink-0">
              {!isInstalled && (
                <Button 
                  onClick={promptInstall} 
                  variant="outline" 
                  className="border-white/10 text-white hover:bg-white/5 h-11 px-5 uppercase tracking-wider font-bold text-xs rounded-xl flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Install App
                </Button>
              )}
              <LanguageSwitcher />
              {user ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard?tab=support')}
                    className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/5 transition-all outline-none select-none hover:bg-white/10 hover:border-primary/30 active:translate-y-px"
                    title="Customer Support"
                  >
                    <Headphones className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                  <NotificationBell />
                  <Link to="/dashboard">
                    <Button variant="ghost" className="text-muted-foreground hover:text-white h-10 w-10 p-0 rounded-xl">
                      <LayoutDashboard className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" onClick={logout} className="text-muted-foreground hover:text-white h-10 w-10 p-0 rounded-xl">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                <Link to="/auth">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground neon-border h-11 px-8 uppercase tracking-wider font-bold">
                    Get Started
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2.5 border border-white/10 hover:border-white/20 rounded-xl bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu - Fullscreen Slide Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden fixed inset-0 h-[100dvh] w-screen z-[200] bg-[#05050A] backdrop-blur-2xl flex flex-col p-6 overflow-y-auto"
            >
              {/* Header inside overlay */}
              <div className="flex justify-between items-center h-20 shrink-0">
                <Logo className="h-10" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white hover:text-white p-2.5 border border-white/10 hover:border-white/20 rounded-xl bg-white/5 transition-all text-right"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Links centered */}
              <div className="flex-1 flex flex-col justify-center space-y-6 my-8 px-4">
                {[
                  { label: "How It Works", to: "/#how-it-works" },
                  { label: "Plans", to: "/#plans" },
                  { label: "Rewards", to: "/#rewards" },
                  { label: "FAQ", to: "/#faq" },
                  { label: "Transparency", to: "/transparency" },
                  { label: "Education", to: "/education" },
                  { label: "Community", to: "/community" }
                ].map((item, idx) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                  >
                    <Link
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-2xl font-black uppercase tracking-widest text-[#94A3B8] hover:text-white transition-all duration-200"
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                
                <div className="pt-2">
                  <LanguageSwitcher />
                </div>
              </div>

              {/* Action Buttons at bottom */}
              <div className="mt-auto pt-6 border-t border-white/5 space-y-4 px-4 shrink-0">
                {!isInstalled && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        promptInstall();
                      }}
                      variant="outline" 
                      className="w-full justify-center h-14 border-emerald-500/20 text-emerald-400 bg-emerald-500/5 text-sm uppercase tracking-widest font-black rounded-2xl hover:bg-emerald-500/10 transition-all flex items-center gap-3"
                    >
                      <Download className="w-5 h-5 animate-bounce" />
                      INSTALL APP
                    </Button>
                  </motion.div>
                )}
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="w-full"
                >
                  {user ? (
                    <div className="flex flex-col space-y-3">
                      <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="w-full">
                        <Button className="w-full justify-center h-14 bg-primary hover:bg-primary/95 text-primary-foreground text-sm uppercase tracking-widest font-black rounded-2xl neon-border flex items-center gap-3">
                          <LayoutDashboard className="w-5 h-5" />
                          DASHBOARD
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                        }} 
                        className="w-full justify-center h-12 text-muted-foreground hover:text-white text-sm uppercase tracking-widest font-black"
                      >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="w-full block">
                      <Button className="w-full bg-primary hover:bg-primary/95 text-primary-foreground text-sm uppercase tracking-widest font-black rounded-2xl neon-border h-14">
                        GET STARTED
                      </Button>
                    </Link>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-1 relative z-10 flex flex-col pt-20">
        <Outlet />
      </main>
    </div>
  );
}
