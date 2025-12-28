import { useState, useCallback } from 'react';
import { WorkflowState, WorkflowStep, TitleSuggestion, CourseOutline, CourseSettings } from '@/types/course';

const initialSettings: CourseSettings = {
  voiceId: 'sv-SE-MattiasNeural',
  voiceName: 'Mattias (Svenska, Maskulin)',
  targetDuration: 15,
  style: 'professional',
  includeQuizzes: true,
  language: 'sv',
};

const initialState: WorkflowState = {
  currentStep: 'title',
  completedSteps: [],
  title: '',
  selectedTitleId: null,
  titleSuggestions: [],
  outline: null,
  settings: initialSettings,
  isProcessing: false,
  error: null,
};

// Mock data for demonstration
const mockTitleSuggestions: TitleSuggestion[] = [
  {
    id: '1',
    title: 'Grundläggande patientvård inom hemtjänst',
    explanation: 'En omfattande kurs som täcker alla grundläggande aspekter av patientvård i hemtjänstmiljö.',
  },
  {
    id: '2',
    title: 'Säker och empatisk hemtjänst: Patientvård för vårdpersonal',
    explanation: 'Fokuserar på både praktiska vårdmoment och vikten av emotionellt stöd till patienter.',
  },
  {
    id: '3',
    title: 'Hemtjänstens grunder: Patientvård med kvalitet',
    explanation: 'Betonar kvalitetsaspekter och professionalism inom hemtjänstens vårdarbete.',
  },
  {
    id: '4',
    title: 'Praktisk patientvård i hemmet: En komplett guide',
    explanation: 'En praktiskt orienterad kurs med fokus på konkreta arbetsmoment och rutiner.',
  },
  {
    id: '5',
    title: 'Vårdkompetens för hemtjänstpersonal',
    explanation: 'Kompetensutvecklande kurs som förbereder personal för varierande vårdsituationer i hemmet.',
  },
];

const mockOutline: CourseOutline = {
  title: 'Grundläggande patientvård inom hemtjänst',
  description: 'En omfattande kurs som ger hemtjänstpersonal de kunskaper och färdigheter som krävs för att ge trygg och professionell vård i patientens hem.',
  totalDuration: 180,
  modules: [
    {
      id: 'm1',
      number: 1,
      title: 'Introduktion till hemtjänst',
      description: 'Grundläggande förståelse för hemtjänstens roll och uppdrag inom svensk äldreomsorg.',
      duration: 20,
      learningObjectives: [
        { id: 'lo1', text: 'Förstå hemtjänstens uppdrag och organisation' },
        { id: 'lo2', text: 'Känna till relevanta lagar och förordningar' },
        { id: 'lo3', text: 'Beskriva personalens olika roller och ansvar' },
      ],
      subTopics: [
        { id: 'st1', title: 'Hemtjänstens historia och utveckling', duration: 5 },
        { id: 'st2', title: 'Lagstiftning och regelverk', duration: 8 },
        { id: 'st3', title: 'Organisation och samverkan', duration: 7 },
      ],
    },
    {
      id: 'm2',
      number: 2,
      title: 'Kommunikation och bemötande',
      description: 'Utveckla förmågan att kommunicera professionellt och empatiskt med brukare och anhöriga.',
      duration: 25,
      learningObjectives: [
        { id: 'lo4', text: 'Tillämpa tekniker för aktivt lyssnande' },
        { id: 'lo5', text: 'Anpassa kommunikationen efter brukarens behov' },
        { id: 'lo6', text: 'Hantera svåra samtal och konflikter' },
      ],
      subTopics: [
        { id: 'st4', title: 'Grundläggande kommunikation', duration: 8 },
        { id: 'st5', title: 'Empatiskt bemötande', duration: 10 },
        { id: 'st6', title: 'Kulturell kompetens', duration: 7 },
      ],
    },
    {
      id: 'm3',
      number: 3,
      title: 'Personlig hygien och omvårdnad',
      description: 'Praktiska färdigheter för att assistera brukare med personlig hygien på ett värdigt sätt.',
      duration: 30,
      learningObjectives: [
        { id: 'lo7', text: 'Genomföra personlig hygien med respekt för integritet' },
        { id: 'lo8', text: 'Förebygga smittspridning' },
        { id: 'lo9', text: 'Dokumentera utförda insatser korrekt' },
      ],
      subTopics: [
        { id: 'st7', title: 'Dusch- och badassistans', duration: 10 },
        { id: 'st8', title: 'Munhälsa och tandvård', duration: 8 },
        { id: 'st9', title: 'Klädsel och hudvård', duration: 12 },
      ],
    },
    {
      id: 'm4',
      number: 4,
      title: 'Förflyttning och ergonomi',
      description: 'Säkra tekniker för att hjälpa brukare med förflyttning och undvika arbetsskador.',
      duration: 25,
      learningObjectives: [
        { id: 'lo10', text: 'Använda hjälpmedel på rätt sätt' },
        { id: 'lo11', text: 'Tillämpa ergonomiska principer' },
        { id: 'lo12', text: 'Förebygga fall och olyckor' },
      ],
      subTopics: [
        { id: 'st10', title: 'Ergonomiska grunder', duration: 8 },
        { id: 'st11', title: 'Hjälpmedel och teknik', duration: 10 },
        { id: 'st12', title: 'Fallprevention', duration: 7 },
      ],
    },
    {
      id: 'm5',
      number: 5,
      title: 'Kost och nutrition',
      description: 'Förståelse för näringsbehov och praktisk hjälp med måltider.',
      duration: 20,
      learningObjectives: [
        { id: 'lo13', text: 'Förstå äldres särskilda näringsbehov' },
        { id: 'lo14', text: 'Identifiera tecken på undernäring' },
        { id: 'lo15', text: 'Anpassa måltider efter specialkoster' },
      ],
      subTopics: [
        { id: 'st13', title: 'Näringslära för äldre', duration: 7 },
        { id: 'st14', title: 'Måltidsstöd', duration: 8 },
        { id: 'st15', title: 'Specialkoster och allergier', duration: 5 },
      ],
    },
    {
      id: 'm6',
      number: 6,
      title: 'Medicinhantering',
      description: 'Korrekt hantering av läkemedel och dokumentation av medicinering.',
      duration: 30,
      learningObjectives: [
        { id: 'lo16', text: 'Förstå delegationsregler för läkemedel' },
        { id: 'lo17', text: 'Hantera och administrera läkemedel säkert' },
        { id: 'lo18', text: 'Dokumentera och rapportera avvikelser' },
      ],
      subTopics: [
        { id: 'st16', title: 'Läkemedelskunskap', duration: 10 },
        { id: 'st17', title: 'Delegation och ansvar', duration: 10 },
        { id: 'st18', title: 'Dokumentation och avvikelser', duration: 10 },
      ],
    },
    {
      id: 'm7',
      number: 7,
      title: 'Demens och kognitiv svikt',
      description: 'Fördjupad kunskap om bemötande av personer med demenssjukdom.',
      duration: 30,
      learningObjectives: [
        { id: 'lo19', text: 'Förstå olika typer av demenssjukdomar' },
        { id: 'lo20', text: 'Anpassa vården efter kognitiv förmåga' },
        { id: 'lo21', text: 'Hantera utmanande beteenden' },
      ],
      subTopics: [
        { id: 'st19', title: 'Demenssjukdomar och symtom', duration: 10 },
        { id: 'st20', title: 'Personcentrerad vård', duration: 12 },
        { id: 'st21', title: 'Beteendeförändringar', duration: 8 },
      ],
    },
  ],
};

export function useCourseWorkflow() {
  const [state, setState] = useState<WorkflowState>(initialState);

  const setTitle = useCallback((title: string) => {
    setState(prev => ({ ...prev, title }));
  }, []);

  const generateTitleSuggestions = useCallback(async () => {
    setState(prev => ({ ...prev, isProcessing: true }));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setState(prev => ({
      ...prev,
      titleSuggestions: mockTitleSuggestions,
      isProcessing: false,
    }));
  }, []);

  const selectTitle = useCallback((id: string) => {
    const suggestion = mockTitleSuggestions.find(s => s.id === id);
    setState(prev => ({
      ...prev,
      selectedTitleId: id,
      title: suggestion?.title || prev.title,
    }));
  }, []);

  const goToStep = useCallback((step: WorkflowStep) => {
    setState(prev => {
      const steps: WorkflowStep[] = ['title', 'outline', 'script', 'slides', 'voice', 'video', 'upload'];
      const currentIndex = steps.indexOf(prev.currentStep);
      const newIndex = steps.indexOf(step);
      
      if (newIndex <= currentIndex || prev.completedSteps.includes(step)) {
        return { ...prev, currentStep: step };
      }
      return prev;
    });
  }, []);

  const completeStep = useCallback((step: WorkflowStep) => {
    setState(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, step])],
    }));
  }, []);

  const nextStep = useCallback(() => {
    const steps: WorkflowStep[] = ['title', 'outline', 'script', 'slides', 'voice', 'video', 'upload'];
    setState(prev => {
      const currentIndex = steps.indexOf(prev.currentStep);
      if (currentIndex < steps.length - 1) {
        return {
          ...prev,
          currentStep: steps[currentIndex + 1],
          completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
        };
      }
      return prev;
    });
  }, []);

  const generateOutline = useCallback(async () => {
    setState(prev => ({ ...prev, isProcessing: true }));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setState(prev => ({
      ...prev,
      outline: mockOutline,
      isProcessing: false,
    }));
  }, []);

  const updateSettings = useCallback((settings: Partial<CourseSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  }, []);

  return {
    state,
    setTitle,
    generateTitleSuggestions,
    selectTitle,
    goToStep,
    completeStep,
    nextStep,
    generateOutline,
    updateSettings,
  };
}
