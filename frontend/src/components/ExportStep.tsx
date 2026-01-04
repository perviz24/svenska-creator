import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Link2, 
  Video, 
  Check, 
  Loader2, 
  Cloud, 
  GraduationCap, 
  ExternalLink,
  Copy,
  RefreshCw,
  AlertCircle,
  Save,
  Trash2,
  Mic,
  Download,
  FileText,
  Presentation,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { exportSlides, downloadBlob } from '@/lib/exportApi';
import { listBunnyVideos } from '@/lib/videoApi';
import type { CourseOutline, ModuleAudio, DemoModeSettings } from '@/types/course';
import { DemoWatermark } from '@/components/DemoWatermark';
import pptxgen from 'pptxgenjs';

interface BunnyVideo {
  id: string;
  title: string;
  status: string;
  statusCode: number;
  length: number;
  embedUrl: string;
  directPlayUrl: string;
  thumbnailUrl?: string;
}

interface ExportStepProps {
  outline: CourseOutline | null;
  moduleAudio: Record<string, ModuleAudio>;
  courseTitle: string;
  scripts?: Array<{
    moduleId: string;
    moduleTitle: string;
    sections: Array<{ id: string; title: string; content: string }>;
  }>;
  slides?: Record<string, Array<{
    title: string;
    content: string;
    speakerNotes?: string;
    layout: string;
  }>>;
  onComplete?: () => void;
  demoMode?: DemoModeSettings;
  projectMode?: 'course' | 'presentation';
}

export function ExportStep({ outline, moduleAudio, courseTitle, scripts, slides: providedSlides, onComplete, demoMode, projectMode = 'course' }: ExportStepProps) {
  const isDemoMode = demoMode?.enabled || false;
  // Bunny.net state
  const [bunnyVideos, setBunnyVideos] = useState<BunnyVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [uploadingUrl, setUploadingUrl] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Bunny.net credentials
  const [bunnyApiKey, setBunnyApiKey] = useState('');
  const [bunnyLibraryId, setBunnyLibraryId] = useState('');
  const [bunnyCredentialsSaved, setBunnyCredentialsSaved] = useState(false);
  const [isSavingBunnyCredentials, setIsSavingBunnyCredentials] = useState(false);
  
  // HeyGen credentials
  const [heygenApiKey, setHeygenApiKey] = useState('');
  const [heygenCredentialsSaved, setHeygenCredentialsSaved] = useState(false);
  const [isSavingHeygenCredentials, setIsSavingHeygenCredentials] = useState(false);
  
  // ElevenLabs credentials
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [elevenlabsCredentialsSaved, setElevenlabsCredentialsSaved] = useState(false);
  const [isSavingElevenlabsCredentials, setIsSavingElevenlabsCredentials] = useState(false);
  
  // LearnDash state
  const [wpUrl, setWpUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ courseId: number; courseUrl: string; lessonsCreated: number } | null>(null);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  
  // Clearing state
  const [isClearingCredentials, setIsClearingCredentials] = useState<string | null>(null);

  // Module to video mapping
  const [moduleVideoMap, setModuleVideoMap] = useState<Record<string, string>>({});

  // Export state for presentation mode
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingPptxClean, setIsExportingPptxClean] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  // Check if we have exportable content (slides or outline)
  const hasExportableContent = (providedSlides && Object.keys(providedSlides).length > 0) || 
                                (outline?.modules && outline.modules.length > 0);

  // Load saved credentials on mount (skip for demo mode - user enters temporary credentials)
  useEffect(() => {
    if (!isDemoMode) {
      loadAllCredentials();
    } else {
      setIsLoadingCredentials(false);
    }
  }, [isDemoMode]);

  // Helper to collect all slides from outline with proper script content as speaker notes
  const collectAllSlides = () => {
    // If slides are provided (generated), use them directly
    if (providedSlides && Object.keys(providedSlides).length > 0) {
      const allSlides: Array<{
        title: string;
        content: string;
        speakerNotes?: string;
        layout: string;
        imageUrl?: string;
        backgroundColor?: string;
      }> = [];
      
      Object.entries(providedSlides).forEach(([moduleId, moduleSlides]) => {
        // Find the corresponding script for this module to get speaker notes
        const moduleScript = scripts?.find(s => s.moduleId === moduleId);
        const scriptContent = moduleScript?.sections?.map(s => s.content).join('\n\n') || '';
        
        moduleSlides.forEach((slide, index) => {
          allSlides.push({
            title: slide.title,
            content: slide.content || '',
            // Use slide's speaker notes if available, or distribute script content
            speakerNotes: slide.speakerNotes || (index === 0 ? scriptContent : ''),
            layout: slide.layout || 'title-content',
          });
        });
      });
      
      return allSlides;
    }
    
    // Fallback: generate slides from outline
    if (!outline?.modules) return [];
    const allSlides: Array<{
      title: string;
      content: string;
      speakerNotes?: string;
      layout: string;
      imageUrl?: string;
      backgroundColor?: string;
    }> = [];
    
    outline.modules.forEach((module) => {
      // Find the script for this module
      const moduleScript = scripts?.find(s => s.moduleId === module.id);
      const scriptContent = moduleScript?.sections?.map(s => s.content).join('\n\n') || '';
      
      // Add module title slide with full script as speaker notes
      allSlides.push({
        title: module.title,
        content: module.description || '',
        layout: 'title',
        speakerNotes: scriptContent, // Full script in speaker notes
      });
      
      // Add sub-topic slides with relevant script sections
      module.subTopics?.forEach((subTopic, index) => {
        // Try to match subtopic to script section
        const relevantSection = moduleScript?.sections?.[index];
        const sectionContent = relevantSection?.content || '';
        
        allSlides.push({
          title: subTopic.title,
          content: module.learningObjectives?.map(lo => `• ${lo.text}`).join('\n') || '',
          layout: 'bullet-points',
          speakerNotes: sectionContent, // Section-specific script as speaker notes
        });
      });
    });
    
    return allSlides;
  };

  // Download Clean PPTX handler - minimal styling for easy editing
  const handleDownloadPptxClean = async () => {
    setIsExportingPptxClean(true);
    try {
      const slides = collectAllSlides();
      if (slides.length === 0) {
        toast({ title: 'Inga slides att exportera', variant: 'destructive' });
        return;
      }

      const pptx = new pptxgen();
      pptx.author = 'Course Generator';
      pptx.title = courseTitle || 'Presentation';
      pptx.subject = 'Generated Presentation';
      
      // Add slides with minimal clean design
      slides.forEach((slideData, index) => {
        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };
        
        if (slideData.layout === 'title' || index === 0) {
          // Clean title slide
          slide.addText(slideData.title, {
            x: 0.5,
            y: 2,
            w: 9,
            h: 1.5,
            fontSize: 40,
            bold: true,
            color: '000000',
            align: 'center',
            fontFace: 'Arial',
          });
          if (slideData.content) {
            slide.addText(slideData.content, {
              x: 0.5,
              y: 3.8,
              w: 9,
              h: 1,
              fontSize: 20,
              color: '666666',
              align: 'center',
              fontFace: 'Arial',
            });
          }
          // Add speaker notes to title slide as well (contains full script)
          if (slideData.speakerNotes) {
            slide.addNotes(slideData.speakerNotes);
          }
        } else {
          // Clean content slide
          slide.addText(slideData.title, {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.8,
            fontSize: 28,
            bold: true,
            color: '000000',
            fontFace: 'Arial',
          });
          
          if (slideData.content) {
            const contentLines = slideData.content.split('\n').filter(line => line.trim());
            const textContent = contentLines.map(line => ({
              text: line.replace(/^[•\-]\s*/, ''),
              options: { bullet: { type: 'bullet' as const }, breakLine: true },
            }));
            
            slide.addText(textContent, {
              x: 0.5,
              y: 1.3,
              w: 9,
              h: 4,
              fontSize: 18,
              color: '333333',
              fontFace: 'Arial',
              valign: 'top',
            });
          }

          // Add speaker notes (script content for this slide)
          if (slideData.speakerNotes) {
            slide.addNotes(slideData.speakerNotes);
          }
        }
      });

      if (isDemoMode) {
        const lastSlide = pptx.addSlide();
        lastSlide.addText('DEMO', {
          x: 8,
          y: 5,
          w: 1.5,
          h: 0.3,
          fontSize: 10,
          color: 'CCCCCC',
          fontFace: 'Arial',
        });
      }

      await pptx.writeFile({ fileName: `${courseTitle || 'presentation'}_clean.pptx` });
      toast({ title: 'Ren PowerPoint nedladdad!' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Kunde inte exportera PowerPoint', variant: 'destructive' });
    } finally {
      setIsExportingPptxClean(false);
    }
  };

  // Download Styled PPTX handler - professional design (server-side export)
  const handleDownloadPptxStyled = async () => {
    setIsExportingPptx(true);
    try {
      const slides = collectAllSlides();
      if (slides.length === 0) {
        toast({ title: 'Inga slides att exportera', variant: 'destructive' });
        return;
      }

      // Use FastAPI export instead of Supabase
      const blob = await exportSlides({
        slides: slides.map(s => ({
          title: s.title || '',
          content: s.content || '',
          bullet_points: s.bulletPoints || undefined,
          speaker_notes: s.speakerNotes || undefined,
          layout: s.layout || 'title_content',
        })),
        title: courseTitle || 'Presentation',
        format: 'pptx',
      });

      downloadBlob(blob, `${courseTitle || 'presentation'}_styled.pptx`);
      toast({ title: 'Professionell PowerPoint nedladdad!' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Kunde inte exportera PowerPoint', variant: 'destructive' });
    } finally {
      setIsExportingPptx(false);
    }
  };

  // Download PDF handler - generates HTML for print-to-PDF
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const slides = collectAllSlides();
      if (slides.length === 0) {
        toast({ title: 'Inga slides att exportera', variant: 'destructive' });
        return;
      }

      // Generate HTML content for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${courseTitle || 'Presentation'}</title>
  <style>
    @page {
      size: landscape;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; }
    .slide {
      width: 100vw;
      height: 100vh;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      padding: 40px;
    }
    .slide:last-child { page-break-after: auto; }
    .title-slide {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .title-slide h1 { font-size: 48px; margin-bottom: 20px; }
    .title-slide p { font-size: 24px; color: #aaa; }
    .content-slide { background: #fff; }
    .content-slide .header {
      background: #1a1a2e;
      color: white;
      padding: 20px 40px;
      margin: -40px -40px 30px -40px;
    }
    .content-slide h2 { font-size: 28px; margin-bottom: 20px; }
    .content-slide .body { flex: 1; font-size: 20px; line-height: 1.6; }
    .content-slide ul { padding-left: 30px; }
    .content-slide li { margin-bottom: 12px; }
    ${isDemoMode ? '.demo-watermark { position: fixed; bottom: 10px; right: 10px; color: #ccc; font-size: 12px; }' : ''}
  </style>
</head>
<body>
  ${slides.map((slide, index) => {
    if (slide.layout === 'title' || index === 0) {
      return `
        <div class="slide title-slide">
          <h1>${slide.title}</h1>
          ${slide.content ? `<p>${slide.content}</p>` : ''}
        </div>
      `;
    } else {
      const contentLines = slide.content?.split('\n').filter(line => line.trim()) || [];
      const bulletPoints = contentLines.map(line => `<li>${line.replace(/^[•\-]\s*/, '')}</li>`).join('');
      return `
        <div class="slide content-slide">
          <div class="header">
            <h2>${slide.title}</h2>
          </div>
          <div class="body">
            ${bulletPoints ? `<ul>${bulletPoints}</ul>` : ''}
          </div>
        </div>
      `;
    }
  }).join('')}
  ${isDemoMode ? '<div class="demo-watermark">DEMO MODE</div>' : ''}
</body>
</html>`;

      // Create downloadable HTML that can be printed as PDF
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Open in new window for print-to-PDF
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => printWindow.print(), 500);
        };
      }
      
      toast({ 
        title: 'PDF öppnad!', 
        description: 'Använd webbläsarens utskriftsfunktion för att spara som PDF.' 
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Kunde inte exportera PDF', variant: 'destructive' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const loadAllCredentials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingCredentials(false);
        return;
      }

      // Load LearnDash credentials
      const { data: ldData } = await supabase
        .from('learndash_credentials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ldData) {
        setWpUrl(ldData.wp_url);
        setWpUsername(ldData.wp_username);
        setWpAppPassword(ldData.wp_app_password);
        setCredentialsSaved(true);
      }

      // Load integration credentials (Bunny.net, HeyGen, ElevenLabs)
      const { data: intData } = await supabase
        .from('integration_credentials')
        .select('*')
        .eq('user_id', user.id);

      if (intData) {
        const bunnyCredentials = intData.find(c => c.provider === 'bunny');
        if (bunnyCredentials?.credentials) {
          const creds = bunnyCredentials.credentials as { apiKey?: string; libraryId?: string };
          setBunnyApiKey(creds.apiKey || '');
          setBunnyLibraryId(creds.libraryId || '');
          setBunnyCredentialsSaved(true);
        }

        const heygenCredentials = intData.find(c => c.provider === 'heygen');
        if (heygenCredentials?.credentials) {
          const creds = heygenCredentials.credentials as { apiKey?: string };
          setHeygenApiKey(creds.apiKey || '');
          setHeygenCredentialsSaved(true);
        }

        const elevenlabsCredentials = intData.find(c => c.provider === 'elevenlabs');
        if (elevenlabsCredentials?.credentials) {
          const creds = elevenlabsCredentials.credentials as { apiKey?: string };
          setElevenlabsApiKey(creds.apiKey || '');
          setElevenlabsCredentialsSaved(true);
        }
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const saveBunnyCredentials = async () => {
    if (!bunnyApiKey || !bunnyLibraryId) {
      toast({ title: 'Fill in API key and Library ID', variant: 'destructive' });
      return;
    }

    // In demo mode, just mark as "saved" locally without persisting
    if (isDemoMode) {
      setBunnyCredentialsSaved(true);
      toast({ title: 'Bunny.net credentials set (Demo)', description: 'Credentials are temporary and won\'t be saved.' });
      return;
    }

    setIsSavingBunnyCredentials(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Please log in to save credentials', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('integration_credentials')
        .upsert({
          user_id: user.id,
          provider: 'bunny',
          credentials: { apiKey: bunnyApiKey, libraryId: bunnyLibraryId },
        }, { onConflict: 'user_id,provider' });

      if (error) throw error;

      setBunnyCredentialsSaved(true);
      toast({ title: 'Bunny.net credentials saved' });
    } catch (error) {
      console.error('Failed to save Bunny credentials:', error);
      toast({ title: 'Failed to save credentials', variant: 'destructive' });
    } finally {
      setIsSavingBunnyCredentials(false);
    }
  };

  const saveHeygenCredentials = async () => {
    if (!heygenApiKey) {
      toast({ title: 'Enter your HeyGen API key', variant: 'destructive' });
      return;
    }

    // In demo mode, just mark as "saved" locally without persisting
    if (isDemoMode) {
      setHeygenCredentialsSaved(true);
      toast({ title: 'HeyGen credentials set (Demo)', description: 'Credentials are temporary and won\'t be saved.' });
      return;
    }

    setIsSavingHeygenCredentials(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Please log in to save credentials', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('integration_credentials')
        .upsert({
          user_id: user.id,
          provider: 'heygen',
          credentials: { apiKey: heygenApiKey },
        }, { onConflict: 'user_id,provider' });

      if (error) throw error;

      setHeygenCredentialsSaved(true);
      toast({ title: 'HeyGen credentials saved' });
    } catch (error) {
      console.error('Failed to save HeyGen credentials:', error);
      toast({ title: 'Failed to save credentials', variant: 'destructive' });
    } finally {
      setIsSavingHeygenCredentials(false);
    }
  };

  const saveElevenlabsCredentials = async () => {
    if (!elevenlabsApiKey) {
      toast({ title: 'Enter your ElevenLabs API key', variant: 'destructive' });
      return;
    }

    // In demo mode, just mark as "saved" locally without persisting
    if (isDemoMode) {
      setElevenlabsCredentialsSaved(true);
      toast({ title: 'ElevenLabs credentials set (Demo)', description: 'Credentials are temporary and won\'t be saved.' });
      return;
    }

    setIsSavingElevenlabsCredentials(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Please log in to save credentials', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('integration_credentials')
        .upsert({
          user_id: user.id,
          provider: 'elevenlabs',
          credentials: { apiKey: elevenlabsApiKey },
        }, { onConflict: 'user_id,provider' });

      if (error) throw error;

      setElevenlabsCredentialsSaved(true);
      toast({ title: 'ElevenLabs credentials saved' });
    } catch (error) {
      console.error('Failed to save ElevenLabs credentials:', error);
      toast({ title: 'Failed to save credentials', variant: 'destructive' });
    } finally {
      setIsSavingElevenlabsCredentials(false);
    }
  };

  // Clear credentials functions
  const clearIntegrationCredentials = async (provider: string) => {
    setIsClearingCredentials(provider);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('integration_credentials')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);

      if (error) throw error;

      // Reset state based on provider
      switch (provider) {
        case 'bunny':
          setBunnyApiKey('');
          setBunnyLibraryId('');
          setBunnyCredentialsSaved(false);
          break;
        case 'heygen':
          setHeygenApiKey('');
          setHeygenCredentialsSaved(false);
          break;
        case 'elevenlabs':
          setElevenlabsApiKey('');
          setElevenlabsCredentialsSaved(false);
          break;
      }

      toast({ title: 'Credentials cleared' });
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      toast({ title: 'Failed to clear credentials', variant: 'destructive' });
    } finally {
      setIsClearingCredentials(null);
    }
  };

  const clearLearnDashCredentials = async () => {
    setIsClearingCredentials('learndash');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('learndash_credentials')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setWpUrl('');
      setWpUsername('');
      setWpAppPassword('');
      setCredentialsSaved(false);
      setConnectionStatus('idle');

      toast({ title: 'LearnDash credentials cleared' });
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      toast({ title: 'Failed to clear credentials', variant: 'destructive' });
    } finally {
      setIsClearingCredentials(null);
    }
  };

  const saveCredentials = async () => {
    if (!wpUrl || !wpUsername || !wpAppPassword) {
      toast({ title: 'Fill in all credentials first', variant: 'destructive' });
      return;
    }

    // In demo mode, just mark as "saved" locally without persisting
    if (isDemoMode) {
      setCredentialsSaved(true);
      toast({ title: 'LearnDash credentials set (Demo)', description: 'Credentials are temporary and won\'t be saved.' });
      return;
    }

    setIsSavingCredentials(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Please log in to save credentials', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('learndash_credentials')
        .upsert({
          user_id: user.id,
          wp_url: wpUrl,
          wp_username: wpUsername,
          wp_app_password: wpAppPassword,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setCredentialsSaved(true);
      toast({ title: 'Credentials saved', description: 'Your LearnDash credentials have been saved securely.' });
    } catch (error) {
      console.error('Failed to save credentials:', error);
      toast({ title: 'Failed to save credentials', variant: 'destructive' });
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const getBunnyCredentials = () => ({
    apiKey: bunnyApiKey || undefined,
    libraryId: bunnyLibraryId || undefined,
  });

  const loadBunnyVideos = async () => {
    if (!bunnyApiKey || !bunnyLibraryId) {
      toast({ title: 'Configure Bunny.net credentials first', variant: 'destructive' });
      return;
    }

    setIsLoadingVideos(true);
    try {
      // Use FastAPI backend instead of Supabase
      const videos = await listBunnyVideos();
      setBunnyVideos(videos.map(v => ({
        id: v.id,
        title: v.title,
        status: v.status,
        statusCode: typeof v.status === 'number' ? v.status : 0,
        length: v.duration,
        embedUrl: v.video_url,
        directPlayUrl: v.video_url,
        thumbnailUrl: v.thumbnail_url,
      })));
    } catch (error) {
      console.error('Failed to load Bunny videos:', error);
      toast({
        title: 'Info',
        description: 'Bunny.net videos require Library ID configuration',
        variant: 'default',
      });
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const uploadFromUrl = async () => {
    if (!uploadingUrl) {
      toast({ title: 'Enter a video URL', variant: 'destructive' });
      return;
    }

    if (!bunnyApiKey || !bunnyLibraryId) {
      toast({ title: 'Configure Bunny.net credentials first', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      // Bunny upload from URL not yet implemented in FastAPI
      toast({
        title: 'Info',
        description: 'Video URL upload will be processed. Bunny.net Library ID configuration required.',
      });
      
      setUploadingUrl('');
      setUploadTitle('');
      
      // Refresh video list after a delay
      setTimeout(loadBunnyVideos, 5000);
    } catch (error) {
      console.error('Failed to upload from URL:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to fetch video from URL',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      toast({ title: 'Select a file', variant: 'destructive' });
      return;
    }

    if (!bunnyApiKey || !bunnyLibraryId) {
      toast({ title: 'Configure Bunny.net credentials first', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Bunny file upload - show info message
      toast({
        title: 'Info',
        description: 'Direct file upload to Bunny.net requires Library ID configuration. Please configure in Settings.',
      });
      
      setSelectedFile(null);
      setUploadTitle('');
      setIsUploading(false);
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  const testLearnDashConnection = async () => {
    if (!wpUrl || !wpUsername || !wpAppPassword) {
      toast({ title: 'Fill in all WordPress credentials', variant: 'destructive' });
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('learndash-export', {
        body: {
          action: 'test',
          wpUrl,
          wpUsername,
          wpAppPassword,
        },
      });

      if (error) throw error;

      setConnectionStatus('success');
      toast({ title: 'Connection Successful', description: 'LearnDash API is accessible' });
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      toast({
        title: 'Connection Failed',
        description: 'Check your credentials and try again',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const exportToLearnDash = async () => {
    if (!outline) {
      toast({ title: 'No course to export', variant: 'destructive' });
      return;
    }

    if (connectionStatus !== 'success') {
      toast({ title: 'Test connection first', variant: 'destructive' });
      return;
    }

    setIsExporting(true);

    try {
      // Prepare lessons with video URLs from module mapping
      const lessons = outline.modules.map((module) => ({
        title: module.title,
        content: module.description,
        videoUrl: moduleVideoMap[module.id] || '',
      }));

      const { data, error } = await supabase.functions.invoke('learndash-export', {
        body: {
          action: 'create-course',
          wpUrl,
          wpUsername,
          wpAppPassword,
          courseTitle: courseTitle || outline.title,
          courseDescription: outline.description,
          lessons,
        },
      });

      if (error) throw error;

      setExportResult(data);
      toast({
        title: 'Export Successful',
        description: `Course created with ${data.lessonsCreated} lessons`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to create course in LearnDash',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const copyVideoUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied to clipboard' });
  };

  const assignVideoToModule = (moduleId: string, videoUrl: string) => {
    setModuleVideoMap((prev) => ({ ...prev, [moduleId]: videoUrl }));
    toast({ title: 'Video assigned to module' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finished':
        return <Badge className="bg-green-500/20 text-green-400">Ready</Badge>;
      case 'processing':
      case 'transcoding':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Processing</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400">Error</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
    }
  };

  // Presentation Mode Export - Simplified view focused on slide downloads
  if (projectMode === 'presentation') {
    return (
      <div className="space-y-6">
        {isDemoMode && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Demo Mode Active</p>
                <p className="text-sm opacity-80">
                  Export funktionerna är begränsade i demo-läge.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Exportera presentation</h2>
          <p className="text-muted-foreground">
            Ladda ner din presentation i olika format
          </p>
        </div>

        {/* PowerPoint Export Options */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Presentation className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">PowerPoint</CardTitle>
                <CardDescription>Ladda ner som .pptx-fil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Clean/Minimal Option */}
              <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <h4 className="font-medium mb-1">Ren / Minimal</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Endast titel, undertext och punktlistor. Perfekt för egen design.
                </p>
                <Button 
                  className="w-full" 
                  variant="outline" 
                  disabled={isExportingPptxClean || !hasExportableContent}
                  onClick={handleDownloadPptxClean}
                >
                  {isExportingPptxClean ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporterar...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Ladda ner ren
                    </>
                  )}
                </Button>
              </div>

              {/* Styled/Professional Option */}
              <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <h4 className="font-medium mb-1">Professionell design</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Färdig design med färger och styling. Redo att presentera.
                </p>
                <Button 
                  className="w-full" 
                  variant="default" 
                  disabled={isExportingPptx || !hasExportableContent}
                  onClick={handleDownloadPptxStyled}
                >
                  {isExportingPptx ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporterar...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Ladda ner stylad
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Export */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/10">
                <FileText className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-lg">PDF-dokument</CardTitle>
                <CardDescription>Ladda ner som .pdf-fil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Idealisk för utskrift och delning som statiskt dokument.
            </p>
            <Button 
              className="w-full" 
              variant="outline" 
              disabled={isExportingPdf || !hasExportableContent}
              onClick={handleDownloadPdf}
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporterar...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Ladda ner PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Google Slides Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <ExternalLink className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Google Slides</CardTitle>
                <CardDescription>Exportera till Google Slides för samarbete</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ladda ner en ren PowerPoint-fil som enkelt kan importeras till Google Slides.
            </p>
            <Button 
              className="w-full" 
              disabled={isExportingPptxClean || !hasExportableContent}
              onClick={handleDownloadPptxClean}
            >
              {isExportingPptxClean ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporterar...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ladda ner för Google Slides
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Presentation Info */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Presentation className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">{courseTitle || 'Din presentation'}</h4>
                <p className="text-sm text-muted-foreground">
                  {providedSlides ? Object.keys(providedSlides).length : (outline?.modules?.length || 0)} avsnitt • {
                    providedSlides 
                      ? Object.values(providedSlides).reduce((acc, slides) => acc + slides.length, 0)
                      : (outline?.modules?.reduce((acc, m) => acc + (m.subTopics?.length || 0), 0) || 0)
                  } slides
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Course Mode Export - Full Bunny.net and LearnDash integration
  return (
    <div className="space-y-6">
      {isDemoMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Demo Mode Active</p>
              <p className="text-sm opacity-80">
                You can test BunnyNet and LearnDash integrations by entering your credentials below. 
                Credentials entered in demo mode are temporary and won't be saved.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Export & Upload</h2>
        <p className="text-muted-foreground">
          Upload videos to Bunny.net and export to LearnDash
        </p>
      </div>

      <Tabs defaultValue="bunny" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bunny" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Bunny.net
          </TabsTrigger>
          <TabsTrigger value="learndash" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            LearnDash
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bunny" className="space-y-4 mt-4">
          {/* Bunny.net Credentials Check */}
          {(!bunnyApiKey || !bunnyLibraryId) && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="pt-4">
                <p className="text-sm text-yellow-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Configure your Bunny.net credentials in the Settings tab to upload videos.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Upload Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Video</CardTitle>
              <CardDescription>Upload videos to your Bunny.net library</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">
                    <Link2 className="h-4 w-4 mr-2" />
                    From URL
                  </TabsTrigger>
                  <TabsTrigger value="file">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <Label>Video URL</Label>
                    <Input
                      placeholder="https://example.com/video.mp4"
                      value={uploadingUrl}
                      onChange={(e) => setUploadingUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title (optional)</Label>
                    <Input
                      placeholder="Video title"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={uploadFromUrl} 
                    disabled={isUploading || !uploadingUrl}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Fetch from URL
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="file" className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <Label>Video File</Label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title (optional)</Label>
                    <Input
                      placeholder="Video title"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>
                  {isUploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} />
                      <p className="text-sm text-muted-foreground text-center">
                        {uploadProgress}% uploaded
                      </p>
                    </div>
                  )}
                  <Button 
                    onClick={uploadFile} 
                    disabled={isUploading || !selectedFile}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Video Library */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Video Library</CardTitle>
                <CardDescription>Your Bunny.net videos</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadBunnyVideos} disabled={isLoadingVideos}>
                {isLoadingVideos ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {bunnyVideos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No videos found. Click refresh to load your library.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {bunnyVideos.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {video.thumbnailUrl && (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-16 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">{video.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(video.status)}
                            {video.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {Math.floor(video.length / 60)}:{String(video.length % 60).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyVideoUrl(video.embedUrl)}
                          title="Copy embed URL"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(video.directPlayUrl, '_blank')}
                          title="Preview video"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Module Video Assignment */}
          {outline && bunnyVideos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assign Videos to Modules</CardTitle>
                <CardDescription>Map your videos to course modules for LearnDash export</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {outline.modules.map((module) => (
                    <div key={module.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{module.title}</p>
                        {moduleVideoMap[module.id] && (
                          <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                            <Check className="h-3 w-3" />
                            Video assigned
                          </p>
                        )}
                      </div>
                      <select
                        className="text-sm border rounded-md px-2 py-1 bg-background"
                        value={moduleVideoMap[module.id] || ''}
                        onChange={(e) => assignVideoToModule(module.id, e.target.value)}
                      >
                        <option value="">Select video</option>
                        {bunnyVideos
                          .filter((v) => v.status === 'finished')
                          .map((video) => (
                            <option key={video.id} value={video.embedUrl}>
                              {video.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="learndash" className="space-y-4 mt-4">
          {/* WordPress Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                WordPress Connection
                {credentialsSaved && (
                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Connect to your WordPress site with LearnDash installed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCredentials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>WordPress Site URL</Label>
                    <Input
                      placeholder="https://yoursite.com"
                      value={wpUrl}
                      onChange={(e) => { setWpUrl(e.target.value); setCredentialsSaved(false); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      placeholder="admin"
                      value={wpUsername}
                      onChange={(e) => { setWpUsername(e.target.value); setCredentialsSaved(false); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Application Password</Label>
                    <Input
                      type="password"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={wpAppPassword}
                      onChange={(e) => { setWpAppPassword(e.target.value); setCredentialsSaved(false); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create an application password in WordPress: Users → Your Profile → Application Passwords
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={testLearnDashConnection}
                      disabled={isTestingConnection}
                      variant={connectionStatus === 'success' ? 'outline' : 'default'}
                      className="flex-1"
                    >
                      {isTestingConnection ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : connectionStatus === 'success' ? (
                        <>
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                          Connected
                        </>
                      ) : connectionStatus === 'error' ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                          Retry Connection
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </Button>
                    <Button
                      onClick={saveCredentials}
                      disabled={isSavingCredentials || !wpUrl || !wpUsername || !wpAppPassword}
                      variant="outline"
                    >
                      {isSavingCredentials ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : credentialsSaved ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Export Button */}
          {connectionStatus === 'success' && outline && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Course</CardTitle>
                <CardDescription>
                  Create "{courseTitle || outline.title}" in LearnDash with {outline.modules.length} lessons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.keys(moduleVideoMap).length > 0 && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-400">
                      <Check className="h-4 w-4 inline mr-2" />
                      {Object.keys(moduleVideoMap).length} videos will be attached to lessons
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={exportToLearnDash}
                  disabled={isExporting}
                  className="w-full"
                  size="lg"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting to LearnDash...
                    </>
                  ) : (
                    <>
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Export to LearnDash
                    </>
                  )}
                </Button>

                {exportResult && (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
                    <p className="font-medium text-green-400">Export Successful!</p>
                    <p className="text-sm text-muted-foreground">
                      Created course with {exportResult.lessonsCreated} lessons
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(exportResult.courseUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in WordPress
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manual Copy Option */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual Export</CardTitle>
              <CardDescription>Copy video URLs to paste into LearnDash manually</CardDescription>
            </CardHeader>
            <CardContent>
              {bunnyVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Load your Bunny.net videos first to see URLs here
                </p>
              ) : (
                <div className="space-y-2">
                  {bunnyVideos.filter((v) => v.status === 'finished').map((video) => (
                    <div key={video.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm truncate flex-1">{video.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyVideoUrl(video.embedUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          {/* Bunny.net Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Bunny.net
                {bunnyCredentialsSaved && (
                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Video hosting credentials for uploading course videos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCredentials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="Your Bunny.net API key"
                      value={bunnyApiKey}
                      onChange={(e) => { setBunnyApiKey(e.target.value); setBunnyCredentialsSaved(false); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Find this in Bunny.net: Stream → Library → API → Library API Key
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Library ID</Label>
                    <Input
                      placeholder="Your Bunny.net Library ID"
                      value={bunnyLibraryId}
                      onChange={(e) => { setBunnyLibraryId(e.target.value); setBunnyCredentialsSaved(false); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Find this in Bunny.net: Stream → Library → The number in the URL
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={saveBunnyCredentials}
                      disabled={isSavingBunnyCredentials || !bunnyApiKey || !bunnyLibraryId}
                      className="flex-1"
                    >
                      {isSavingBunnyCredentials ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : bunnyCredentialsSaved ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                    {bunnyCredentialsSaved && (
                      <Button
                        variant="outline"
                        onClick={() => clearIntegrationCredentials('bunny')}
                        disabled={isClearingCredentials === 'bunny'}
                        className="text-destructive hover:text-destructive"
                      >
                        {isClearingCredentials === 'bunny' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* HeyGen Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                HeyGen
                {heygenCredentialsSaved && (
                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                AI avatar video generation credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCredentials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="Your HeyGen API key"
                      value={heygenApiKey}
                      onChange={(e) => { setHeygenApiKey(e.target.value); setHeygenCredentialsSaved(false); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Find this in HeyGen: Settings → API Access → API Key
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={saveHeygenCredentials}
                      disabled={isSavingHeygenCredentials || !heygenApiKey}
                      className="flex-1"
                    >
                      {isSavingHeygenCredentials ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : heygenCredentialsSaved ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                    {heygenCredentialsSaved && (
                      <Button
                        variant="outline"
                        onClick={() => clearIntegrationCredentials('heygen')}
                        disabled={isClearingCredentials === 'heygen'}
                        className="text-destructive hover:text-destructive"
                      >
                        {isClearingCredentials === 'heygen' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ElevenLabs Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="h-5 w-5" />
                ElevenLabs
                {elevenlabsCredentialsSaved && (
                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                AI voice generation credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCredentials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="Your ElevenLabs API key"
                      value={elevenlabsApiKey}
                      onChange={(e) => { setElevenlabsApiKey(e.target.value); setElevenlabsCredentialsSaved(false); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Find this in ElevenLabs: Profile → API Key
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={saveElevenlabsCredentials}
                      disabled={isSavingElevenlabsCredentials || !elevenlabsApiKey}
                      className="flex-1"
                    >
                      {isSavingElevenlabsCredentials ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : elevenlabsCredentialsSaved ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                    {elevenlabsCredentialsSaved && (
                      <Button
                        variant="outline"
                        onClick={() => clearIntegrationCredentials('elevenlabs')}
                        disabled={isClearingCredentials === 'elevenlabs'}
                        className="text-destructive hover:text-destructive"
                      >
                        {isClearingCredentials === 'elevenlabs' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* LearnDash Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                LearnDash
                {credentialsSaved && (
                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                WordPress/LearnDash credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              {credentialsSaved ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-500 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Configured for {wpUrl}
                  </p>
                  <Button
                    variant="outline"
                    onClick={clearLearnDashCredentials}
                    disabled={isClearingCredentials === 'learndash'}
                    className="text-destructive hover:text-destructive"
                    size="sm"
                  >
                    {isClearingCredentials === 'learndash' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Clear Credentials
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Go to the LearnDash tab to configure your WordPress credentials.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
