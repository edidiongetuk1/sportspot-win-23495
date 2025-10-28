import { Button } from "@/components/ui/button";
import { Wallet, User, LogOut, Plus } from "lucide-react";
import { Link } from "react-router-dom";

interface NavbarProps {
  balance?: number;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  isAdmin?: boolean;
}

export const Navbar = ({ balance = 0, isAuthenticated = false, onLogout, isAdmin = false }: NavbarProps) => {
  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">S</span>
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              SportyBet
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">
              Sports
            </Link>
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
              Live
            </Link>
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
              Casino
            </Link>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
              <Wallet className="w-4 h-4 text-accent" />
              <span className="font-bold text-accent">${balance.toFixed(2)}</span>
            </div>
            <Button 
              variant="bet" 
              size="sm"
              onClick={() => window.location.href = 'https://paystack.shop/pay/imx4s34hm4'}
            >
              <Plus className="w-4 h-4 mr-1" />
              Deposit
            </Button>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/dashboard">Dashboard</Link>
          </Button>
          {isAdmin && (
            <Button variant="ghost" asChild>
              <Link to="/admin">Admin Panel</Link>
            </Button>
          )}
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="default">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
