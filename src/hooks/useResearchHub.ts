import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ResearchMode, 
  ResearchResult, 
  Citation, 
  ScrapeResult,
  RESEARCH_MODES 
} from '@/types/research';

export function useResearchHub() {
  const [isResearching, setIsResearching] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);

  const research = useCallback(async (
    topic: string, 
    mode: ResearchMode = 'general',
    options?: {
      context?: string;
      language?: 'sv' | 'en';
      domainFilter?: string[];
      dateFilter?: string;
      knowledgeBase?: string;
      urlsToScrape?: string[];
      maxCitations?: number;
    }
  ): Promise<ResearchResult | null> => {
    if (!topic.trim()) {
      toast.error('Ange ett ämne att forska på');
      return null;
    }

    setIsResearching(true);

    try {
      const { data, error } = await supabase.functions.invoke('research-topic', {
        body: {
          topic,
          researchMode: mode,
          context: options?.context,
          language: options?.language || 'sv',
          domainFilter: options?.domainFilter,
          dateFilter: options?.dateFilter,
          knowledgeBase: options?.knowledgeBase,
          urlsToScrape: options?.urlsToScrape,
          maxCitations: options?.maxCitations || 10,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const result: ResearchResult = {
        content: data.research,
        citations: data.citations || [],
        topic: data.topic,
        mode: data.researchMode,
        model: data.modelUsed,
        metadata: data.metadata,
      };

      setResults(prev => [...prev, result]);

      // Add citations to collection
      const newCitations: Citation[] = result.citations.map((url, i) => ({
        id: `${Date.now()}-${i}`,
        url,
        addedAt: new Date(),
      }));
      
      setCitations(prev => [...prev, ...newCitations]);

      const modeConfig = RESEARCH_MODES.find(m => m.id === mode);
      toast.success(`Forskning klar med ${modeConfig?.name || mode} (${result.citations.length} källor)`);

      return result;
    } catch (err) {
      console.error('Research error:', err);
      const message = err instanceof Error ? err.message : 'Kunde inte genomföra forskning';
      toast.error(message);
      return null;
    } finally {
      setIsResearching(false);
    }
  }, []);

  const scrapeUrl = useCallback(async (url: string): Promise<ScrapeResult | null> => {
    if (!url.trim()) {
      toast.error('Ange en URL att skrapa');
      return null;
    }

    setIsScraping(true);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-url', {
        body: { 
          url,
          formats: ['markdown', 'links'],
          onlyMainContent: true,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Scraping misslyckades');

      toast.success('Sida skrapad!');
      return data;
    } catch (err) {
      console.error('Scrape error:', err);
      const message = err instanceof Error ? err.message : 'Kunde inte skrapa sidan';
      toast.error(message);
      return null;
    } finally {
      setIsScraping(false);
    }
  }, []);

  const addCitation = useCallback((citation: Omit<Citation, 'id' | 'addedAt'>) => {
    const newCitation: Citation = {
      ...citation,
      id: `manual-${Date.now()}`,
      addedAt: new Date(),
    };
    setCitations(prev => [...prev, newCitation]);
    toast.success('Källa tillagd');
  }, []);

  const removeCitation = useCallback((citationId: string) => {
    setCitations(prev => prev.filter(c => c.id !== citationId));
    toast.success('Källa borttagen');
  }, []);

  const clearCitations = useCallback(() => {
    setCitations([]);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  const exportCitations = useCallback((format: 'text' | 'markdown' | 'bibtex' = 'markdown') => {
    if (citations.length === 0) {
      toast.error('Inga källor att exportera');
      return '';
    }

    let output = '';

    if (format === 'markdown') {
      output = '## Källor\n\n';
      citations.forEach((c, i) => {
        output += `${i + 1}. ${c.title || c.url}\n   - URL: ${c.url}\n`;
        if (c.source) output += `   - Källa: ${c.source}\n`;
        if (c.stepName) output += `   - Steg: ${c.stepName}\n`;
        output += '\n';
      });
    } else if (format === 'text') {
      output = 'Källor:\n\n';
      citations.forEach((c, i) => {
        output += `${i + 1}. ${c.title || c.url} - ${c.url}\n`;
      });
    } else if (format === 'bibtex') {
      citations.forEach((c, i) => {
        const key = `source${i + 1}`;
        output += `@online{${key},\n`;
        output += `  title = {${c.title || 'Untitled'}},\n`;
        output += `  url = {${c.url}},\n`;
        output += `  urldate = {${new Date().toISOString().split('T')[0]}}\n`;
        output += '}\n\n';
      });
    }

    return output;
  }, [citations]);

  return {
    // State
    isResearching,
    isScraping,
    results,
    citations,
    
    // Actions
    research,
    scrapeUrl,
    addCitation,
    removeCitation,
    clearCitations,
    clearResults,
    exportCitations,
  };
}
