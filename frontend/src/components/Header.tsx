import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, LogOut, PlusCircle, Settings, TestTube } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUserRoles } from '@/hooks/useUserRoles';

interface HeaderProps {
  onNewCourse?: () => void;
}

export function Header({ onNewCourse }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { currentRole } = useUserRoles();
  const isAdminOrOwner = currentRole === 'owner' || currentRole === 'admin';
  
  // Check admin demo mode from localStorage
  const [adminDemoMode, setAdminDemoMode] = useState(() => {
    return localStorage.getItem('adminDemoMode') === 'true';
  });
  
  // Listen for localStorage changes (when toggled in settings)
  useEffect(() => {
    const handleStorageChange = () => {
      setAdminDemoMode(localStorage.getItem('adminDemoMode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    // Also check periodically for same-tab updates
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Kursgenerator
            </h1>
            <p className="text-xs text-muted-foreground">
              Automatisk videokursproduktion
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {onNewCourse && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNewCourse}
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Ny kurs
            </Button>
          )}
          
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Inställningar</span>
            </Link>
          </Button>
          
          {isAdminOrOwner && adminDemoMode && (
            <Link 
              to="/settings" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
              title="Admin Demo: Alla integrationer aktiva + begränsningar (1 modul, 3 slides)"
            >
              <TestTube className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">Demo PÅ (1M/3S)</span>
            </Link>
          )}
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-success">System redo</span>
          </div>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-0.5 leading-none">
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Inställningar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logga ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
