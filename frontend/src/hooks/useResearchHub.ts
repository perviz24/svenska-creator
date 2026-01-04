import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  ResearchMode, 
  ResearchResult, 
  Citation, 
  ScrapeResult,
  RESEARCH_MODES 
} from '@/types/research';

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

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
      // Use FastAPI backend instead of Supabase
      const response = await fetch(`${BACKEND_URL}/api/research/topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          context: options?.context,
          language: options?.language || 'sv',
          depth: mode === 'deep' ? 'deep' : 'standard',
        }),
      });

      if (!response.ok) throw new Error('Research failed');
      const data = await response.json();

      const result: ResearchResult = {
        content: data.content,
        citations: [],
        topic: data.topic,
        mode: mode,
        model: 'gemini-2.5-flash',
        metadata: {},
      };

      setResults(prev => [...prev, result]);

      const modeConfig = RESEARCH_MODES.find(m => m.id === mode);
      toast.success(`Forskning klar med ${modeConfig?.name || mode}`);

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
