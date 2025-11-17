import { Button } from "@/components/ui/button";
import { Wallet, User, LogOut, Plus, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
interface NavbarProps {
  balance?: number;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  isAdmin?: boolean;
  onDepositClick?: () => void;
}
export const Navbar = ({
  balance = 0,
  isAuthenticated = false,
  onLogout,
  isAdmin = false,
  onDepositClick
}: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return <nav className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50 animate-fade-in-down">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-primary flex items-center justify-center rounded-md bg-[#2e6f88] transition-all duration-300 group-hover:shadow-glow group-hover:scale-110">
              <span className="text-xl md:text-2xl font-bold text-primary-foreground">​𝑮
            </span>
            </div>
            <span className="text-lg md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105">​GameX
          </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-primary transition-all duration-300 hover:scale-110 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100">
              Sports
            </Link>
            <Link to="/" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100">
              Live
            </Link>
            <Link to="/casino" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100">
              Casino
            </Link>
            <Link to="/mobile-wagers" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100">
              Mobile Wagers
            </Link>
          </div>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg animate-scale-in hover:animate-glow-pulse transition-all duration-300">
                  <Wallet className="w-4 h-4 text-accent" />
                  <span className="font-bold text-accent text-sm">₦{balance.toFixed(2)}</span>
                </div>
                <Button variant="bet" size="sm" onClick={onDepositClick} className="hover:scale-110 transition-transform duration-300">
                  <Plus className="w-4 h-4 mr-1" />
                  Deposit
                </Button>
                <ThemeSwitcher />
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                {isAdmin && <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin">Admin</Link>
                  </Button>}
                <Button variant="ghost" size="sm" onClick={onLogout}>
                  Logout
                </Button>
              </> : <>
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="text-base">Login</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="default" size="sm">Sign Up</Button>
                </Link>
              </>}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && <>
                <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-lg animate-scale-in">
                  <Wallet className="w-3 h-3 text-accent" />
                  <span className="font-bold text-accent text-xs">₦{balance.toFixed(0)}</span>
                </div>
                <Button variant="bet" size="sm" onClick={onDepositClick} className="h-8 px-2">
                  <Plus className="w-3 h-3" />
                </Button>
              </>}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex items-center justify-center">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] animate-slide-in-right">
                <div className="flex flex-col gap-4 mt-8">
                  <Link to="/" onClick={() => setIsOpen(false)} className="text-foreground hover:text-primary transition-all duration-300 py-2 hover:pl-2 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                    Sports
                  </Link>
                  <Link to="/" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-primary transition-all duration-300 py-2 hover:pl-2 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                    Live
                  </Link>
                  <Link to="/casino" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-primary transition-all duration-300 py-2 hover:pl-2 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                    Casino
                  </Link>
                  <Link to="/mobile-wagers" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-primary transition-all duration-300 py-2 hover:pl-2 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                    Mobile Wagers
                  </Link>
                  {isAuthenticated ? <>
                      <Link to="/dashboard" onClick={() => setIsOpen(false)} className="animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                        <Button variant="ghost" className="w-full justify-start hover:scale-105 transition-transform duration-300">Dashboard</Button>
                      </Link>
                      {isAdmin && <Link to="/admin" onClick={() => setIsOpen(false)} className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                          <Button variant="ghost" className="w-full justify-start hover:scale-105 transition-transform duration-300">Admin Panel</Button>
                        </Link>}
                      <Button variant="ghost" onClick={() => {
                    onLogout?.();
                    setIsOpen(false);
                  }} className="w-full justify-start hover:scale-105 transition-transform duration-300 animate-fade-in-up" style={{animationDelay: '0.7s'}}>
                        Logout
                      </Button>
                    </> : <>
                      <Link to="/auth" onClick={() => setIsOpen(false)} className="animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                        <Button variant="outline" className="w-full hover:scale-105 transition-transform duration-300">Login</Button>
                      </Link>
                      <Link to="/auth" onClick={() => setIsOpen(false)} className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                        <Button variant="default" className="w-full hover:scale-105 transition-transform duration-300">Sign Up</Button>
                      </Link>
                    </>}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>;
};