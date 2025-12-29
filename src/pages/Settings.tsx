import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Volume2, 
  Users, 
  Link2, 
  ArrowLeft,
  Plug,
  Palette,
  FileText,
  Video,
  ChevronDown,
  ExternalLink,
  Zap,
  Sparkles,
  Info,
  Film,
  Image as ImageIcon
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { VoiceControlPanel, defaultVoiceSettings } from '@/components/VoiceControlPanel';
import { UserInvitePanel } from '@/components/UserInvitePanel';
import { FreelancerExportPanel } from '@/components/FreelancerExportPanel';
import { SystemDiagnostics } from '@/components/SystemDiagnostics';
import { StockVideoProviderSettings } from '@/components/StockVideoProviderSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StockVideoProvider } from '@/types/course';

const Settings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('ai');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // AI Quality Mode state
  const [aiQualityMode, setAiQualityMode] = useState<'fast' | 'quality'>('quality');
  
  // Voice settings state
  const [voiceSettings, setVoiceSettings] = useState(defaultVoiceSettings);
  
  // LearnDash credentials state
  const [learnDashCredentials, setLearnDashCredentials] = useState({
    wpUrl: '',
    wpUsername: '',
    wpAppPassword: '',
  });
  const [isTestingLearnDash, setIsTestingLearnDash] = useState(false);
  const [learnDashConnected, setLearnDashConnected] = useState(false);
  
  // Canva settings state
  const [canvaSettings, setCanvaSettings] = useState({
    apiKey: '',
    enabled: false,
  });
  
  // HeyGen settings state
  const [heygenSettings, setHeygenSettings] = useState({
    apiKey: '',
    enabled: false,
  });
  
  // Bunny settings state
  const [bunnySettings, setBunnySettings] = useState({
    apiKey: '',
    libraryId: '',
    enabled: false,
  });
  
  // Stock video provider state
  const [selectedVideoProvider, setSelectedVideoProvider] = useState<StockVideoProvider>('pexels');

  const testLearnDashConnection = async () => {
    if (!learnDashCredentials.wpUrl || !learnDashCredentials.wpUsername || !learnDashCredentials.wpAppPassword) {
      toast({
        title: "Fyll i alla fält",
        description: "Alla WordPress-uppgifter krävs för att testa anslutningen.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingLearnDash(true);
    try {
      const { data, error } = await supabase.functions.invoke('learndash-export', {
        body: {
          action: 'test',
          credentials: {
            wpUrl: learnDashCredentials.wpUrl,
            wpUsername: learnDashCredentials.wpUsername,
            wpAppPassword: learnDashCredentials.wpAppPassword,
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        setLearnDashConnected(true);
        toast({
          title: "Anslutning lyckades!",
          description: `Ansluten till ${data.siteInfo?.name || 'WordPress'}`,
        });
      } else {
        throw new Error(data.error || 'Anslutningen misslyckades');
      }
    } catch (error: any) {
      toast({
        title: "Anslutningsfel",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingLearnDash(false);
    }
  };

  const saveLearnDashCredentials = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.from('learndash_credentials').upsert({
        user_id: user.id,
        wp_url: learnDashCredentials.wpUrl,
        wp_username: learnDashCredentials.wpUsername,
        wp_app_password: learnDashCredentials.wpAppPassword,
      }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Sparad!",
        description: "LearnDash-uppgifterna har sparats.",
      });
    } catch (error: any) {
      toast({
        title: "Fel",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till kurser
          </Link>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <SettingsIcon className="w-7 h-7 text-primary" />
              </div>
              Inställningar
            </h1>
            <p className="text-muted-foreground mt-2">
              Hantera röstinställningar, team och integrationer
            </p>
          </div>

          {/* Main Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="gap-2">
                <Volume2 className="w-4 h-4" />
                <span className="hidden sm:inline">Röst</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="gap-2">
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Integrationer</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </TabsTrigger>
            </TabsList>

            {/* AI Quality Mode Tab */}
            <TabsContent value="ai" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI-kvalitetsläge
                  </CardTitle>
                  <CardDescription>
                    Välj mellan snabb generering eller högsta kvalitet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup 
                    value={aiQualityMode} 
                    onValueChange={(v) => setAiQualityMode(v as 'fast' | 'quality')}
                    className="space-y-4"
                  >
                    {/* Fast Mode */}
                    <div className={`relative flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${aiQualityMode === 'fast' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                      <RadioGroupItem value="fast" id="fast" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="fast" className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                          <Zap className="w-5 h-5 text-yellow-500" />
                          Snabbläge
                          <Badge variant="secondary" className="ml-2">Gemini Flash</Badge>
                        </Label>
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            2-3x snabbare generering
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Lägre kostnad per generering
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Bra för snabb prototyping
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-amber-500">–</span>
                            Något mindre precision i komplexa uppgifter
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-amber-500">–</span>
                            Enklare bildförslag
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quality Mode */}
                    <div className={`relative flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${aiQualityMode === 'quality' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                      <RadioGroupItem value="quality" id="quality" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="quality" className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                          <Sparkles className="w-5 h-5 text-primary" />
                          Kvalitetsläge
                          <Badge variant="default" className="ml-2">Gemini Pro + GPT-5</Badge>
                        </Label>
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Bästa möjliga resultat
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            GPT-5 för manusskrivning (naturligt, engagerande)
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Gemini Pro för struktur (outline, slides)
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Mer träffsäkra bildförslag
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-amber-500">–</span>
                            Längre genereringstid
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-amber-500">–</span>
                            Högre kostnad
                          </p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>

                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Rekommendation</p>
                      <p>
                        Använd <strong>Kvalitetsläge</strong> för slutgiltigt kursinnehåll som ska publiceras.
                        Använd <strong>Snabbläge</strong> för att snabbt testa idéer och strukturer.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voice Settings Tab */}
            <TabsContent value="voice" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-primary" />
                    Röstinställningar
                  </CardTitle>
                  <CardDescription>
                    Konfigurera AI-röst för berättning och voiceover
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VoiceControlPanel
                    settings={voiceSettings}
                    onSettingsChange={(newSettings) => setVoiceSettings(prev => ({ ...prev, ...newSettings }))}
                    language="sv"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Management Tab */}
            <TabsContent value="team" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Teamhantering
                  </CardTitle>
                  <CardDescription>
                    Bjud in teammedlemmar och hantera behörigheter
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserInvitePanel />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              {/* LearnDash/WordPress Integration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Plug className="w-5 h-5 text-primary" />
                        WordPress / LearnDash
                      </CardTitle>
                      <CardDescription>
                        Exportera kurser direkt till din WordPress-sajt med LearnDash
                      </CardDescription>
                    </div>
                    {learnDashConnected && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Ansluten
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wp-url">WordPress URL</Label>
                      <Input
                        id="wp-url"
                        placeholder="https://din-sajt.se"
                        value={learnDashCredentials.wpUrl}
                        onChange={(e) => setLearnDashCredentials(prev => ({ ...prev, wpUrl: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wp-username">WordPress Användarnamn</Label>
                      <Input
                        id="wp-username"
                        placeholder="admin"
                        value={learnDashCredentials.wpUsername}
                        onChange={(e) => setLearnDashCredentials(prev => ({ ...prev, wpUsername: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wp-password">Application Password</Label>
                      <Input
                        id="wp-password"
                        type="password"
                        placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                        value={learnDashCredentials.wpAppPassword}
                        onChange={(e) => setLearnDashCredentials(prev => ({ ...prev, wpAppPassword: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Skapa ett Application Password under Användare → Din profil → Application Passwords
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={testLearnDashConnection}
                      disabled={isTestingLearnDash}
                    >
                      {isTestingLearnDash ? 'Testar...' : 'Testa anslutning'}
                    </Button>
                    <Button onClick={saveLearnDashCredentials}>
                      Spara uppgifter
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* HeyGen Integration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-primary" />
                        HeyGen
                      </CardTitle>
                      <CardDescription>
                        Skapa AI-genererade videor med avatarer
                      </CardDescription>
                    </div>
                    <Switch
                      checked={heygenSettings.enabled}
                      onCheckedChange={(checked) => setHeygenSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                  </div>
                </CardHeader>
                {heygenSettings.enabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="heygen-api">API-nyckel</Label>
                      <Input
                        id="heygen-api"
                        type="password"
                        placeholder="Din HeyGen API-nyckel"
                        value={heygenSettings.apiKey}
                        onChange={(e) => setHeygenSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                      />
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://app.heygen.com/settings" target="_blank" rel="noopener noreferrer" className="gap-2">
                        Hämta API-nyckel
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </CardContent>
                )}
              </Card>

              {/* Canva Integration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-primary" />
                        Canva
                      </CardTitle>
                      <CardDescription>
                        Exportera slides till Canva för vidare design
                      </CardDescription>
                    </div>
                    <Switch
                      checked={canvaSettings.enabled}
                      onCheckedChange={(checked) => setCanvaSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                  </div>
                </CardHeader>
                {canvaSettings.enabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="canva-api">API-nyckel</Label>
                      <Input
                        id="canva-api"
                        type="password"
                        placeholder="Din Canva API-nyckel"
                        value={canvaSettings.apiKey}
                        onChange={(e) => setCanvaSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Bunny.net Integration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-primary" />
                        Bunny.net
                      </CardTitle>
                      <CardDescription>
                        Ladda upp och strömma videor via Bunny.net
                      </CardDescription>
                    </div>
                    <Switch
                      checked={bunnySettings.enabled}
                      onCheckedChange={(checked) => setBunnySettings(prev => ({ ...prev, enabled: checked }))}
                    />
                  </div>
                </CardHeader>
                {bunnySettings.enabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bunny-api">API-nyckel</Label>
                      <Input
                        id="bunny-api"
                        type="password"
                        placeholder="Din Bunny API-nyckel"
                        value={bunnySettings.apiKey}
                        onChange={(e) => setBunnySettings(prev => ({ ...prev, apiKey: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bunny-library">Library ID</Label>
                      <Input
                        id="bunny-library"
                        placeholder="Din Video Library ID"
                        value={bunnySettings.libraryId}
                        onChange={(e) => setBunnySettings(prev => ({ ...prev, libraryId: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Stock Video Providers Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="w-5 h-5 text-primary" />
                    Stockvideoleverantörer
                  </CardTitle>
                  <CardDescription>
                    Konfigurera API-nycklar för premium stockvideotjänster
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StockVideoProviderSettings
                    selectedProvider={selectedVideoProvider}
                    onProviderChange={setSelectedVideoProvider}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            {/* Export Tab */}
            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Freelancer Export
                  </CardTitle>
                  <CardDescription>
                    Förbered slides för designers på Fiverr eller Upwork
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FreelancerExportPanel slides={[]} courseTitle="Exempelkurs" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* System Diagnostics */}
          <div className="mt-8">
            <Separator className="mb-6" />
            <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="text-muted-foreground">Systemdiagnostik</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showDiagnostics ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <SystemDiagnostics />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
