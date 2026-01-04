import { useState } from 'react';
import { Search, Play, Check, X, Loader2, Film, ExternalLink, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { StockVideoProvider } from '@/types/course';
import { searchVideos } from '@/lib/mediaApi';

export interface StockVideo {
  id: string;
  url: string;
  previewUrl: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  user: string;
  userUrl: string;
  source: StockVideoProvider;
  tags?: string[];
  aiRelevanceScore?: number;
}

interface StockVideoSearchProps {
  context?: string; // Course/slide context for AI-enhanced search
  onVideoSelect: (video: StockVideo) => void;
  selectedVideos?: StockVideo[];
  provider?: StockVideoProvider;
}

export function StockVideoSearch({ context, onVideoSelect, selectedVideos = [], provider = 'pexels' }: StockVideoSearchProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [videos, setVideos] = useState<StockVideo[]>([]);
  const [previewVideo, setPreviewVideo] = useState<StockVideo | null>(null);
  const [enhancedQuery, setEnhancedQuery] = useState<string | null>(null);
  const handleAIEnhanceQuery = async () => {
    if (!searchQuery.trim() && !context) {
      toast.error('Ange en sökfråga eller kontext först');
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-stock-videos', {
        body: { 
          action: 'enhance-query',
          query: searchQuery,
          context 
        }
      });

      if (error) throw error;
      if (data?.enhancedQuery) {
        setEnhancedQuery(data.enhancedQuery);
        setSearchQuery(data.enhancedQuery);
        toast.success('Sökfråga förbättrad med AI');
      }
    } catch (err) {
      console.error('Error enhancing query:', err);
      toast.error('Kunde inte förbättra sökfrågan');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Ange en sökfråga');
      return;
    }

    setIsSearching(true);
    setVideos([]);
    try {
      const { data, error } = await supabase.functions.invoke('search-stock-videos', {
        body: { 
          action: 'search',
          query: searchQuery,
          context,
          perPage: 20,
          provider,
          userId: user?.id,
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      
      if (data?.videos) {
        setVideos(data.videos);
        if (data.videos.length === 0) {
          toast.info('Inga videor hittades. Försök med en annan sökfråga.');
        }
      }
    } catch (err) {
      console.error('Error searching videos:', err);
      toast.error('Kunde inte söka videor');
    } finally {
      setIsSearching(false);
    }
  };

  const isVideoSelected = (videoId: string) => {
    return selectedVideos.some(v => v.id === videoId);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Film className="w-4 h-4 text-muted-foreground" />
          Sök stockvideor
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="T.ex. 'business meeting' eller 'nature landscape'"
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleAIEnhanceQuery}
            disabled={isEnhancing}
            title="AI-förbättra sökfråga"
          >
            {isEnhancing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </Button>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Sök'
            )}
          </Button>
        </div>
        {enhancedQuery && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI-förbättrad sökning
          </p>
        )}
      </div>

      {/* Results Grid */}
      {videos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{videos.length} videor hittade</p>
            {selectedVideos.length > 0 && (
              <Badge variant="secondary">{selectedVideos.length} valda</Badge>
            )}
          </div>
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-4">
              {videos.map((video) => (
                <Card 
                  key={video.id}
                  className={`group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50 ${
                    isVideoSelected(video.id) ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setPreviewVideo(video)}
                >
                  <div className="relative aspect-video bg-muted">
                    <img 
                      src={video.thumbnailUrl} 
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    {isVideoSelected(video.id) && (
                      <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {formatDuration(video.duration)}
                    </div>
                    {video.aiRelevanceScore && (
                      <div className="absolute top-2 left-2 bg-accent/90 text-accent-foreground text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Sparkles className="w-2 h-2" />
                        {Math.round(video.aiRelevanceScore * 100)}%
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2">
                    <p className="text-[10px] text-muted-foreground truncate">
                      av {video.user} • {video.source}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5" />
              Förhandsvisning
            </DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video 
                  src={previewVideo.previewUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Av:</span>{' '}
                    <a 
                      href={previewVideo.userUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline inline-flex items-center gap-1"
                    >
                      {previewVideo.user}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {previewVideo.width}x{previewVideo.height} • {formatDuration(previewVideo.duration)} • {previewVideo.source}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPreviewVideo(null)}>
                    <X className="w-4 h-4 mr-1" />
                    Stäng
                  </Button>
                  <Button 
                    onClick={() => {
                      onVideoSelect(previewVideo);
                      setPreviewVideo(null);
                      toast.success('Video vald!');
                    }}
                    disabled={isVideoSelected(previewVideo.id)}
                  >
                    {isVideoSelected(previewVideo.id) ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Redan vald
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Välj video
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {!isSearching && videos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Sök efter stockvideor för att komma igång</p>
          <p className="text-xs mt-1">Använd AI-knappen för att få bättre sökförslag baserat på ditt innehåll</p>
        </div>
      )}
    </div>
  );
}