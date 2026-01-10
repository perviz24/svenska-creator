import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2, GraduationCap, FlaskConical, ArrowRight, AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

const authSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(6, 'Lösenordet måste vara minst 6 tecken'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') fieldErrors.email = err.message;
          if (err.path[0] === 'password') fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Felaktiga inloggningsuppgifter');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Inloggad!');
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('E-postadressen är redan registrerad');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Konto skapat! Du är nu inloggad.');
      navigate('/');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Demo Mode Banner */}
      <Link 
        to="/demo"
        className="mb-6 w-full max-w-md group"
      >
        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Testa Demo
                <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  Ingen inloggning krävs
                </span>
              </h3>
              <p className="text-sm text-muted-foreground">
                Utforska hela arbetsflödet med begränsade funktioner
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* Supabase Not Configured Warning */}
      {!isSupabaseConfigured && (
        <div className="mb-6 w-full max-w-md">
          <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-orange-500/50 bg-orange-500/5">
            <div className="p-2 rounded-lg bg-orange-500 text-white shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                Autentisering inte konfigurerad
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Supabase-anslutning krävs för inloggning. Använd demo-läget för att testa systemet.
              </p>
              <Link to="/demo">
                <Button variant="outline" size="sm" className="mt-2">
                  <FlaskConical className="w-4 h-4 mr-2" />
                  Gå till Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Kursskaparen</CardTitle>
          <CardDescription>
            Logga in eller skapa ett konto för att spara dina kurser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Logga in</TabsTrigger>
              <TabsTrigger value="signup">Skapa konto</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">E-post</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="din@email.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Lösenord</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loggar in...
                    </>
                  ) : (
                    'Logga in'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-post</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="din@email.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Lösenord</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Skapar konto...
                    </>
                  ) : (
                    'Skapa konto'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
