import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportWordRequest {
  type: 'outline' | 'script' | 'full';
  courseTitle: string;
  outline?: any;
  scripts?: any[];
  exercises?: any[];
  quizzes?: any[];
  includeExercises?: boolean;
  includeQuizzes?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, 
      courseTitle, 
      outline, 
      scripts, 
      exercises, 
      quizzes,
      includeExercises,
      includeQuizzes 
    }: ExportWordRequest = await req.json();

    console.log(`Exporting to Word: ${type} for course: ${courseTitle}`);

    // Generate Word-compatible HTML/XML
    let content = generateWordDocument(type, courseTitle, outline, scripts || [], exercises || [], quizzes || [], includeExercises, includeQuizzes);

    // Word document XML header
    const wordHeader = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
<w:body>`;

    const wordFooter = `</w:body>
</w:wordDocument>`;

    const fullDocument = wordHeader + content + wordFooter;

    return new Response(
      JSON.stringify({
        content: fullDocument,
        contentType: 'application/vnd.ms-word',
        filename: `${courseTitle.replace(/[^a-zA-Z0-9åäöÅÄÖ ]/g, '_')}_${type}.doc`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error exporting to Word:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateWordDocument(
  type: string, 
  courseTitle: string, 
  outline: any, 
  scripts: any[], 
  exercises: any[],
  quizzes: any[],
  includeExercises?: boolean,
  includeQuizzes?: boolean
): string {
  let content = '';

  // Title
  content += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(courseTitle)}</w:t></w:r></w:p>`;

  if (type === 'outline' || type === 'full') {
    if (outline) {
      content += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Kursöversikt</w:t></w:r></w:p>`;
      content += `<w:p><w:r><w:t>${escapeXml(outline.description || '')}</w:t></w:r></w:p>`;

      if (outline.modules) {
        for (const module of outline.modules) {
          content += `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Modul ${module.number}: ${escapeXml(module.title)}</w:t></w:r></w:p>`;
          content += `<w:p><w:r><w:t>${escapeXml(module.description)}</w:t></w:r></w:p>`;
          
          if (module.learningObjectives?.length > 0) {
            content += `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Lärandemål:</w:t></w:r></w:p>`;
            for (const obj of module.learningObjectives) {
              content += `<w:p><w:r><w:t>• ${escapeXml(obj.text)}</w:t></w:r></w:p>`;
            }
          }

          if (module.subTopics?.length > 0) {
            content += `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Delmoment:</w:t></w:r></w:p>`;
            for (const topic of module.subTopics) {
              content += `<w:p><w:r><w:t>• ${escapeXml(topic.title)} (${topic.duration} min)</w:t></w:r></w:p>`;
            }
          }
        }
      }
    }
  }

  if (type === 'script' || type === 'full') {
    if (scripts?.length > 0) {
      content += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Manus</w:t></w:r></w:p>`;
      
      for (const script of scripts) {
        content += `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>${escapeXml(script.moduleTitle)}</w:t></w:r></w:p>`;
        
        if (script.sections) {
          for (const section of script.sections) {
            content += `<w:p><w:pPr><w:pStyle w:val="Heading4"/></w:pPr><w:r><w:t>${escapeXml(section.title)}</w:t></w:r></w:p>`;
            content += `<w:p><w:r><w:t>${escapeXml(section.content)}</w:t></w:r></w:p>`;
          }
        }
      }
    }
  }

  if (includeExercises && exercises?.length > 0) {
    content += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Övningar</w:t></w:r></w:p>`;
    
    for (const moduleExercise of exercises) {
      content += `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>${escapeXml(moduleExercise.moduleTitle)}</w:t></w:r></w:p>`;
      
      if (moduleExercise.exercises) {
        for (const exercise of moduleExercise.exercises) {
          content += `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(exercise.title)}</w:t></w:r></w:p>`;
          content += `<w:p><w:r><w:t>${escapeXml(exercise.purpose)}</w:t></w:r></w:p>`;
        }
      }
    }
  }

  if (includeQuizzes && quizzes?.length > 0) {
    content += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Quiz</w:t></w:r></w:p>`;
    
    for (const quiz of quizzes) {
      content += `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>${escapeXml(quiz.moduleTitle)}</w:t></w:r></w:p>`;
      
      if (quiz.questions) {
        let qNum = 1;
        for (const question of quiz.questions) {
          content += `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${qNum}. ${escapeXml(question.question)}</w:t></w:r></w:p>`;
          
          for (const option of question.options) {
            const isCorrect = option.id === question.correctOptionId;
            content += `<w:p><w:r><w:t>   ${isCorrect ? '✓' : '○'} ${escapeXml(option.text)}</w:t></w:r></w:p>`;
          }
          qNum++;
        }
      }
    }
  }

  return content;
}

function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
