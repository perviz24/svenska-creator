import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, slides, templateId, format } = await req.json();

    console.log('Canva integration action:', action);

    // Canva integration actions
    switch (action) {
      case 'get-templates':
        // Return presentation templates for course slides
        const templates = [
          {
            id: 'edu-modern',
            name: 'Modern Education',
            category: 'education',
            thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300',
            colors: ['#4F46E5', '#10B981', '#F59E0B'],
          },
          {
            id: 'corp-minimal',
            name: 'Corporate Minimal',
            category: 'business',
            thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300',
            colors: ['#1F2937', '#3B82F6', '#EF4444'],
          },
          {
            id: 'creative-bold',
            name: 'Creative Bold',
            category: 'creative',
            thumbnail: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300',
            colors: ['#EC4899', '#8B5CF6', '#06B6D4'],
          },
          {
            id: 'academic-classic',
            name: 'Academic Classic',
            category: 'education',
            thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300',
            colors: ['#1E3A8A', '#92400E', '#065F46'],
          },
          {
            id: 'tech-dark',
            name: 'Tech Dark Mode',
            category: 'technology',
            thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300',
            colors: ['#0F172A', '#22D3EE', '#A855F7'],
          },
          {
            id: 'nature-organic',
            name: 'Nature Organic',
            category: 'lifestyle',
            thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300',
            colors: ['#15803D', '#A3E635', '#854D0E'],
          },
        ];

        return new Response(
          JSON.stringify({ success: true, templates }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'apply-template':
        // Apply Canva-style template to slides
        if (!slides || !templateId) {
          throw new Error('Slides and templateId are required');
        }

        const templateStyles: Record<string, { bgColor: string; accentColor: string; fontStyle: string }> = {
          'edu-modern': { bgColor: '#F0F9FF', accentColor: '#4F46E5', fontStyle: 'clean' },
          'corp-minimal': { bgColor: '#FFFFFF', accentColor: '#1F2937', fontStyle: 'minimal' },
          'creative-bold': { bgColor: '#FDF4FF', accentColor: '#EC4899', fontStyle: 'bold' },
          'academic-classic': { bgColor: '#FFFBEB', accentColor: '#1E3A8A', fontStyle: 'serif' },
          'tech-dark': { bgColor: '#0F172A', accentColor: '#22D3EE', fontStyle: 'mono' },
          'nature-organic': { bgColor: '#F0FDF4', accentColor: '#15803D', fontStyle: 'organic' },
        };

        const style = templateStyles[templateId] || templateStyles['edu-modern'];
        
        const styledSlides = slides.map((slide: any, index: number) => ({
          ...slide,
          backgroundColor: style.bgColor,
          accentColor: style.accentColor,
          fontStyle: style.fontStyle,
          templateId,
          templateApplied: true,
        }));

        return new Response(
          JSON.stringify({ success: true, slides: styledSlides, appliedStyle: style }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'export-to-canva':
        // Generate Canva-compatible export format
        if (!slides) {
          throw new Error('Slides are required');
        }

        const canvaExport = {
          version: '1.0',
          type: 'presentation',
          slides: slides.map((slide: any, index: number) => ({
            id: `slide-${index + 1}`,
            elements: [
              {
                type: 'text',
                content: slide.title,
                style: 'heading',
                position: { x: 50, y: 50 },
              },
              {
                type: 'text',
                content: slide.content,
                style: 'body',
                position: { x: 50, y: 150 },
              },
              ...(slide.imageUrl ? [{
                type: 'image',
                src: slide.imageUrl,
                position: { x: 400, y: 100 },
                size: { width: 300, height: 200 },
              }] : []),
            ],
            background: slide.backgroundColor || '#FFFFFF',
            notes: slide.speakerNotes,
          })),
          metadata: {
            createdAt: new Date().toISOString(),
            format: format || 'canva-json',
          },
        };

        return new Response(
          JSON.stringify({ 
            success: true, 
            export: canvaExport,
            downloadUrl: `data:application/json;base64,${btoa(JSON.stringify(canvaExport, null, 2))}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'get-elements':
        // Return design elements for slide enhancement
        const elements = {
          shapes: ['circle', 'rectangle', 'triangle', 'arrow', 'star', 'line'],
          icons: ['check', 'arrow-right', 'lightbulb', 'target', 'chart', 'users', 'book', 'graduation-cap'],
          layouts: [
            { id: 'title-only', name: 'Endast titel', slots: 1 },
            { id: 'title-content', name: 'Titel + innehåll', slots: 2 },
            { id: 'two-column', name: 'Två kolumner', slots: 3 },
            { id: 'image-left', name: 'Bild vänster', slots: 2 },
            { id: 'image-right', name: 'Bild höger', slots: 2 },
            { id: 'full-image', name: 'Helbildsbakgrund', slots: 1 },
          ],
          fonts: [
            { id: 'inter', name: 'Inter', category: 'sans-serif' },
            { id: 'playfair', name: 'Playfair Display', category: 'serif' },
            { id: 'roboto-mono', name: 'Roboto Mono', category: 'monospace' },
            { id: 'poppins', name: 'Poppins', category: 'sans-serif' },
          ],
        };

        return new Response(
          JSON.stringify({ success: true, elements }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Canva integration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
