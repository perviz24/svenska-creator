import { useState, useEffect } from 'react';
import { Key, Check, Loader2, ExternalLink, Film, Shield, Star, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type StockVideoProvider = 'pexels' | 'pixabay' | 'storyblocks' | 'shutterstock';

interface ProviderConfig {
  id: StockVideoProvider;
  name: string;
  description: string;
  free: boolean;
  features: string[];
  website: string;
  requiresApiKey: boolean;
  requiresApiSecret?: boolean;
  docsUrl: string;
}

const providers: ProviderConfig[] = [
  {
    id: 'pexels',
    name: 'Pexels',
    description: 'Gratis högkvalitativa stockvideor',
    free: true,
    features: ['Gratis att använda', 'HD & 4K videor', 'Ingen attribution krävs'],
    website: 'https://www.pexels.com',
    requiresApiKey: false, // Uses system key
    docsUrl: 'https://www.pexels.com/api/',
  },
  {
    id: 'pixabay',
    name: 'Pixabay',
    description: 'Gratis royalty-free videor',
    free: true,
    features: ['Gratis att använda', 'Stort bibliotek', 'Ingen attribution krävs'],
    website: 'https://pixabay.com',
    requiresApiKey: true,
    docsUrl: 'https://pixabay.com/api/docs/',
  },
  {
    id: 'storyblocks',
    name: 'Storyblocks',
    description: 'Premium stockvideobibliotek med obegränsade nedladdningar',
    free: false,
    features: ['Obegränsade nedladdningar', '4K & HD', 'Redaktionellt innehåll', 'After Effects-mallar'],
    website: 'https://www.storyblocks.com',
    requiresApiKey: true,
    requiresApiSecret: true,
    docsUrl: 'https://www.storyblocks.com/business-solutions/api',
  },
  {
    id: 'shutterstock',
    name: 'Shutterstock',
    description: 'Världens största stockmediebibliotek',
    free: false,
    features: ['450M+ tillgångar', 'Premiumkvalitet', 'Redaktionellt innehåll', 'AI-sök'],
    website: 'https://www.shutterstock.com',
    requiresApiKey: true,
    requiresApiSecret: true,
    docsUrl: 'https://developers.shutterstock.com/',
  },
];

interface ProviderCredential {
  provider: string;
  apiKey?: string;
  apiSecret?: string;
  isEnabled: boolean;
}

interface StockVideoProviderSettingsProps {
  selectedProvider: StockVideoProvider;
  onProviderChange: (provider: StockVideoProvider) => void;
}

export function StockVideoProviderSettings({ selectedProvider, onProviderChange }: StockVideoProviderSettingsProps) {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Record<string, ProviderCredential>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempApiSecret, setTempApiSecret] = useState('');

  useEffect(() => {
    if (user) {
      loadCredentials();
    }
  }, [user]);

  const loadCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_provider_settings')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      const creds: Record<string, ProviderCredential> = {};
      (data || []).forEach((item) => {
        creds[item.provider] = {
          provider: item.provider,
          apiKey: item.api_key || undefined,
          apiSecret: item.api_secret || undefined,
          isEnabled: item.is_enabled,
        };
      });
      setCredentials(creds);
    } catch (err) {
      console.error('Error loading credentials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCredential = async (providerId: string) => {
    if (!user) return;

    setIsSaving(providerId);
    try {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) return;

      // Validate required fields
      if (provider.requiresApiKey && !tempApiKey.trim()) {
        toast.error('API-nyckel krävs');
        return;
      }
      if (provider.requiresApiSecret && !tempApiSecret.trim()) {
        toast.error('API Secret krävs');
        return;
      }

      const { error } = await supabase
        .from('stock_provider_settings')
        .upsert({
          user_id: user.id,
          provider: providerId,
          api_key: tempApiKey || null,
          api_secret: tempApiSecret || null,
          is_enabled: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,provider'
        });

      if (error) throw error;

      setCredentials(prev => ({
        ...prev,
        [providerId]: {
          provider: providerId,
          apiKey: tempApiKey || undefined,
          apiSecret: tempApiSecret || undefined,
          isEnabled: true,
        }
      }));

      setEditingProvider(null);
      setTempApiKey('');
      setTempApiSecret('');
      toast.success(`${provider.name} konfigurerad!`);
    } catch (err) {
      console.error('Error saving credential:', err);
      toast.error('Kunde inte spara inställningar');
    } finally {
      setIsSaving(null);
    }
  };

  const toggleProvider = async (providerId: string, enabled: boolean) => {
    if (!user) return;

    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    // For providers requiring API key, check if configured
    if (enabled && provider.requiresApiKey && !credentials[providerId]?.apiKey) {
      setEditingProvider(providerId);
      return;
    }

    try {
      const { error } = await supabase
        .from('stock_provider_settings')
        .upsert({
          user_id: user.id,
          provider: providerId,
          is_enabled: enabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,provider'
        });

      if (error) throw error;

      setCredentials(prev => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          provider: providerId,
          isEnabled: enabled,
        }
      }));

      if (enabled) {
        onProviderChange(providerId as StockVideoProvider);
      }
    } catch (err) {
      console.error('Error toggling provider:', err);
      toast.error('Kunde inte uppdatera inställningar');
    }
  };

  const deleteCredential = async (providerId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('stock_provider_settings')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', providerId);

      if (error) throw error;

      setCredentials(prev => {
        const newCreds = { ...prev };
        delete newCreds[providerId];
        return newCreds;
      });

      if (selectedProvider === providerId) {
        onProviderChange('pexels');
      }

      toast.success('API-nyckel borttagen');
    } catch (err) {
      console.error('Error deleting credential:', err);
      toast.error('Kunde inte ta bort');
    }
  };

  const isProviderConfigured = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider?.requiresApiKey) return true; // Pexels uses system key
    return !!credentials[providerId]?.apiKey;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Film className="w-4 h-4 text-accent" />
        <Label className="text-sm font-medium">Videoleverantörer</Label>
      </div>

      <div className="space-y-3">
        {providers.map((provider) => {
          const isConfigured = isProviderConfigured(provider.id);
          const isEnabled = provider.id === 'pexels' || credentials[provider.id]?.isEnabled;
          const isSelected = selectedProvider === provider.id;
          const isEditing = editingProvider === provider.id;

          return (
            <Card
              key={provider.id}
              className={`transition-all cursor-pointer ${
                isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
              } ${!isConfigured && provider.requiresApiKey ? 'opacity-70' : ''}`}
              onClick={() => {
                if (isConfigured || !provider.requiresApiKey) {
                  onProviderChange(provider.id);
                }
              }}
            >
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{provider.name}</CardTitle>
                    {provider.free ? (
                      <Badge variant="secondary" className="text-[10px]">Gratis</Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500">
                        <Star className="w-2 h-2 mr-0.5" />
                        Premium
                      </Badge>
                    )}
                    {isSelected && (
                      <Badge variant="outline" className="text-[10px] bg-primary/10">
                        <Check className="w-2 h-2 mr-0.5" />
                        Aktiv
                      </Badge>
                    )}
                  </div>
                  {provider.requiresApiKey && (
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => toggleProvider(provider.id, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
                <CardDescription className="text-xs mt-1">
                  {provider.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-3 pt-0 space-y-2">
                {/* Features */}
                <div className="flex flex-wrap gap-1">
                  {provider.features.slice(0, 3).map((feature, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] py-0">
                      {feature}
                    </Badge>
                  ))}
                </div>

                {/* API Key Status / Form */}
                {provider.requiresApiKey && (
                  <>
                    {isEditing ? (
                      <div className="space-y-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <Label className="text-xs">API-nyckel</Label>
                          <Input
                            type="password"
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                            placeholder="Ange din API-nyckel"
                            className="h-8 text-xs"
                          />
                        </div>
                        {provider.requiresApiSecret && (
                          <div className="space-y-1">
                            <Label className="text-xs">API Secret</Label>
                            <Input
                              type="password"
                              value={tempApiSecret}
                              onChange={(e) => setTempApiSecret(e.target.value)}
                              placeholder="Ange din API Secret"
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => saveCredential(provider.id)}
                            disabled={isSaving === provider.id}
                          >
                            {isSaving === provider.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Spara
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setEditingProvider(null);
                              setTempApiKey('');
                              setTempApiSecret('');
                            }}
                          >
                            Avbryt
                          </Button>
                        </div>
                        <a
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-muted-foreground hover:underline inline-flex items-center gap-0.5"
                        >
                          Hämta API-nyckel
                          <ExternalLink className="w-2 h-2" />
                        </a>
                      </div>
                    ) : isConfigured ? (
                      <div className="flex items-center justify-between pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Shield className="w-3 h-3" />
                          <span>API konfigurerad</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2"
                            onClick={() => {
                              setEditingProvider(provider.id);
                              setTempApiKey(credentials[provider.id]?.apiKey || '');
                              setTempApiSecret(credentials[provider.id]?.apiSecret || '');
                            }}
                          >
                            <Key className="w-2 h-2 mr-0.5" />
                            Ändra
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                            onClick={() => deleteCredential(provider.id)}
                          >
                            <Trash2 className="w-2 h-2" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-7 text-xs mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProvider(provider.id);
                        }}
                      >
                        <Key className="w-3 h-3 mr-1" />
                        Konfigurera API-nyckel
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Dina API-nycklar lagras säkert och används endast för att söka videor.
      </p>
    </div>
  );
}
