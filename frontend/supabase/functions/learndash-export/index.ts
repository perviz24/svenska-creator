import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupData {
  timestamp: string;
  courseId?: number;
  courseName?: string;
  lessons?: any[];
  action: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { 
      action, 
      wpUrl, 
      wpUsername, 
      wpAppPassword,
      courseTitle,
      courseDescription,
      lessons,
      courseId,
      lessonTitle,
      lessonContent,
      videoUrl,
      createBackup = true,
      userId,
    } = requestData;

    console.log(`LearnDash action: ${action}, createBackup: ${createBackup}`);

    if (!wpUrl || !wpUsername || !wpAppPassword) {
      throw new Error('WordPress URL, username, and application password are required');
    }

    // Create Basic Auth header
    const authHeader = 'Basic ' + btoa(`${wpUsername}:${wpAppPassword}`);
    const baseUrl = wpUrl.replace(/\/$/, '');

    // Initialize Supabase client for backup storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Helper function to create backup
    async function createBackupRecord(backupData: BackupData) {
      if (!createBackup || !userId) return null;
      
      console.log('Creating backup record...');
      // Store backup in a backup log (would need a backups table)
      // For now, log the backup data
      console.log('Backup data:', JSON.stringify(backupData));
      return backupData;
    }

    // Helper function for safer API calls with retries
    async function safeApiCall(
      url: string, 
      options: RequestInit, 
      retries = 3
    ): Promise<Response> {
      let lastError: Error | null = null;
      
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, options);
          
          // Check for rate limiting
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
            console.log(`Rate limited, waiting ${retryAfter}s before retry ${i + 1}/${retries}`);
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            continue;
          }
          
          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`API call failed (attempt ${i + 1}/${retries}):`, lastError.message);
          
          if (i < retries - 1) {
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          }
        }
      }
      
      throw lastError || new Error('API call failed after retries');
    }

    // Test connection with detailed error handling
    if (action === 'test') {
      console.log(`Testing connection to: ${baseUrl}`);
      
      // First test basic WordPress REST API
      const wpResponse = await safeApiCall(`${baseUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!wpResponse.ok) {
        if (wpResponse.status === 401) {
          throw new Error('Authentication failed. Check your username and application password. Make sure the app password has no spaces.');
        }
        if (wpResponse.status === 404) {
          throw new Error('WordPress REST API not found. Make sure permalinks are enabled.');
        }
        throw new Error(`WordPress connection failed: ${wpResponse.status} ${wpResponse.statusText}`);
      }

      // Test LearnDash API
      const ldResponse = await safeApiCall(`${baseUrl}/wp-json/ldlms/v2/sfwd-courses`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!ldResponse.ok) {
        if (ldResponse.status === 404) {
          throw new Error('LearnDash REST API not found. Make sure LearnDash is installed and REST API is enabled.');
        }
        throw new Error(`LearnDash API error: ${ldResponse.status} ${ldResponse.statusText}`);
      }

      const wpUser = await wpResponse.json();
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Connection successful',
        wpUser: wpUser.name || wpUser.slug,
        wpCapabilities: Object.keys(wpUser.capabilities || {}).slice(0, 5),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create course with backup
    if (action === 'create-course') {
      console.log(`Creating course: ${courseTitle}`);
      
      // Create backup before modifying
      await createBackupRecord({
        timestamp: new Date().toISOString(),
        action: 'create-course',
        courseName: courseTitle,
      });
      
      // Create the course
      const courseResponse = await safeApiCall(`${baseUrl}/wp-json/ldlms/v2/sfwd-courses`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: courseTitle,
          content: courseDescription || '',
          status: 'draft',
        }),
      });

      if (!courseResponse.ok) {
        const errorText = await courseResponse.text();
        console.error('Course creation error:', errorText);
        throw new Error(`Failed to create course: ${courseResponse.status} - ${errorText}`);
      }

      const course = await courseResponse.json();
      console.log(`Course created with ID: ${course.id}`);

      // Create lessons with progress tracking
      const createdLessons = [];
      const failedLessons = [];
      
      if (lessons && Array.isArray(lessons)) {
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          console.log(`Creating lesson ${i + 1}/${lessons.length}: ${lesson.title}`);
          
          try {
            // Add small delay to avoid rate limiting
            if (i > 0) {
              await new Promise(r => setTimeout(r, 500));
            }
            
            const lessonResponse = await safeApiCall(`${baseUrl}/wp-json/ldlms/v2/sfwd-lessons`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: lesson.title,
                content: lesson.content || '',
                course: course.id,
                status: 'publish',
                menu_order: i + 1,
                meta: {
                  '_sfwd-lessons': JSON.stringify({
                    'sfwd-lessons_lesson_video_enabled': lesson.videoUrl ? 'on' : '',
                    'sfwd-lessons_lesson_video_url': lesson.videoUrl || '',
                    'sfwd-lessons_lesson_video_auto_start': '',
                    'sfwd-lessons_lesson_video_show_controls': 'on',
                  }),
                },
              }),
            });

            if (!lessonResponse.ok) {
              throw new Error(await lessonResponse.text());
            }

            const createdLesson = await lessonResponse.json();
            createdLessons.push({
              id: createdLesson.id,
              title: createdLesson.title.rendered,
              order: i + 1,
            });
          } catch (error) {
            console.error(`Failed to create lesson ${i + 1}:`, error);
            failedLessons.push({
              title: lesson.title,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        courseId: course.id,
        courseUrl: `${baseUrl}/wp-admin/post.php?post=${course.id}&action=edit`,
        lessonsCreated: createdLessons.length,
        lessonsFailed: failedLessons.length,
        lessons: createdLessons,
        failedLessons: failedLessons.length > 0 ? failedLessons : undefined,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List existing courses with more details
    if (action === 'list-courses') {
      console.log('Fetching existing courses');
      const response = await safeApiCall(`${baseUrl}/wp-json/ldlms/v2/sfwd-courses?per_page=50&_embed`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.status} ${response.statusText}`);
      }

      const courses = await response.json();
      return new Response(JSON.stringify({
        courses: courses.map((c: any) => ({
          id: c.id,
          title: c.title.rendered,
          status: c.status,
          link: c.link,
          editLink: `${baseUrl}/wp-admin/post.php?post=${c.id}&action=edit`,
          modified: c.modified,
        })),
        total: courses.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get course details with lessons
    if (action === 'get-course') {
      console.log(`Fetching course details: ${courseId}`);
      
      // Get course
      const courseResponse = await safeApiCall(`${baseUrl}/wp-json/ldlms/v2/sfwd-courses/${courseId}`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!courseResponse.ok) {
        throw new Error(`Failed to fetch course: ${courseResponse.statusText}`);
      }

      const course = await courseResponse.json();

      // Get lessons for this course
      const lessonsResponse = await safeApiCall(`${baseUrl}/wp-json/ldlms/v2/sfwd-lessons?course=${courseId}&per_page=100`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      const lessons = lessonsResponse.ok ? await lessonsResponse.json() : [];

      return new Response(JSON.stringify({
        course: {
          id: course.id,
          title: course.title.rendered,
          content: course.content.rendered,
          status: course.status,
        },
        lessons: lessons.map((l: any) => ({
          id: l.id,
          title: l.title.rendered,
          status: l.status,
          order: l.menu_order,
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add lesson to existing course
    if (action === 'add-lesson') {
      console.log(`Adding lesson to course ${courseId}: ${lessonTitle}`);
      
      // Create backup
      await createBackupRecord({
        timestamp: new Date().toISOString(),
        action: 'add-lesson',
        courseId,
      });

      const response = await safeApiCall(`${baseUrl}/wp-json/ldlms/v2/sfwd-lessons`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: lessonTitle,
          content: lessonContent || '',
          course: courseId,
          status: 'publish',
          meta: videoUrl ? {
            '_sfwd-lessons': JSON.stringify({
              'sfwd-lessons_lesson_video_enabled': 'on',
              'sfwd-lessons_lesson_video_url': videoUrl,
              'sfwd-lessons_lesson_video_show_controls': 'on',
            }),
          } : {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add lesson: ${errorText}`);
      }

      const lesson = await response.json();
      return new Response(JSON.stringify({
        success: true,
        lessonId: lesson.id,
        lessonTitle: lesson.title.rendered,
        editLink: `${baseUrl}/wp-admin/post.php?post=${lesson.id}&action=edit`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update existing lesson
    if (action === 'update-lesson') {
      const { lessonId } = requestData;
      console.log(`Updating lesson ${lessonId}`);
      
      // Create backup first
      await createBackupRecord({
        timestamp: new Date().toISOString(),
        action: 'update-lesson',
        courseId,
        lessons: [{ id: lessonId, title: lessonTitle }],
      });

      const response = await safeApiCall(`${baseUrl}/wp-json/ldlms/v2/sfwd-lessons/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: lessonTitle,
          content: lessonContent || '',
          meta: videoUrl ? {
            '_sfwd-lessons': JSON.stringify({
              'sfwd-lessons_lesson_video_enabled': 'on',
              'sfwd-lessons_lesson_video_url': videoUrl,
              'sfwd-lessons_lesson_video_show_controls': 'on',
            }),
          } : {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update lesson: ${errorText}`);
      }

      const lesson = await response.json();
      return new Response(JSON.stringify({
        success: true,
        lessonId: lesson.id,
        lessonTitle: lesson.title.rendered,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('LearnDash export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      suggestion: getSuggestionForError(errorMessage),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getSuggestionForError(error: string): string {
  if (error.includes('401') || error.includes('Authentication')) {
    return 'Check that your WordPress username is correct and the Application Password has no spaces. Go to WordPress > Users > Your Profile > Application Passwords to create a new one.';
  }
  if (error.includes('404') || error.includes('not found')) {
    return 'Make sure LearnDash is installed and activated. Also verify that WordPress permalinks are not set to "Plain".';
  }
  if (error.includes('429') || error.includes('rate')) {
    return 'Too many requests. Wait a moment and try again with fewer items.';
  }
  if (error.includes('403') || error.includes('Forbidden')) {
    return 'Your WordPress user may not have permission to manage LearnDash courses. Check user roles and capabilities.';
  }
  return 'Check your WordPress URL and credentials. Make sure the site is accessible and LearnDash REST API is enabled.';
}
