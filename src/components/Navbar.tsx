import { Button } from "@/components/ui/button";
import { Wallet, User, LogOut, Plus, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
interface NavbarProps {
  balance?: number;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  isAdmin?: boolean;
}
export const Navbar = ({
  balance = 0,
  isAuthenticated = false,
  onLogout,
  isAdmin = false
}: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return <nav className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-xl md:text-2xl font-bold text-primary-foreground">​𝑮
            </span>
            </div>
            <span className="text-lg md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">​GameX
          </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">
              Sports
            </Link>
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
              Live
            </Link>
            <Link to="/casino" className="text-muted-foreground hover:text-primary transition-colors">
              Casino
            </Link>
            <Link to="/mobile-wagers" className="text-muted-foreground hover:text-primary transition-colors">
              Mobile Wagers
            </Link>
          </div>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
                  <Wallet className="w-4 h-4 text-accent" />
                  <span className="font-bold text-accent text-sm">₦{balance.toFixed(2)}</span>
                </div>
                <Button variant="bet" size="sm" onClick={() => window.location.href = 'https://paystack.shop/pay/imx4s34hm4'}>
                  <Plus className="w-4 h-4 mr-1" />
                  Deposit
                </Button>
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
                  <Button variant="outline" size="sm">Login</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="default" size="sm">Sign Up</Button>
                </Link>
              </>}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && <>
                <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-lg">
                  <Wallet className="w-3 h-3 text-accent" />
                  <span className="font-bold text-accent text-xs">₦{balance.toFixed(0)}</span>
                </div>
                <Button variant="bet" size="sm" onClick={() => window.location.href = 'https://paystack.shop/pay/imx4s34hm4'} className="h-8 px-2">
                  <Plus className="w-3 h-3" />
                </Button>
              </>}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px]">
                <div className="flex flex-col gap-4 mt-8">
                  <Link to="/" onClick={() => setIsOpen(false)} className="text-foreground hover:text-primary transition-colors py-2">
                    Sports
                  </Link>
                  <Link to="/" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-primary transition-colors py-2">
                    Live
                  </Link>
                  <Link to="/casino" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-primary transition-colors py-2">
                    Casino
                  </Link>
                  <Link to="/mobile-wagers" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-primary transition-colors py-2">
                    Mobile Wagers
                  </Link>
                  {isAuthenticated ? <>
                      <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
                      </Link>
                      {isAdmin && <Link to="/admin" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">Admin Panel</Button>
                        </Link>}
                      <Button variant="ghost" onClick={() => {
                    onLogout?.();
                    setIsOpen(false);
                  }} className="w-full justify-start">
                        Logout
                      </Button>
                    </> : <>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full">Login</Button>
                      </Link>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        <Button variant="default" className="w-full">Sign Up</Button>
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