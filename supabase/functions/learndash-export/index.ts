import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { 
      action, 
      wpUrl, 
      wpUsername, 
      wpAppPassword,
      courseTitle,
      courseDescription,
      lessons,
    } = await req.json();

    console.log(`LearnDash action: ${action}`);

    if (!wpUrl || !wpUsername || !wpAppPassword) {
      throw new Error('WordPress URL, username, and application password are required');
    }

    // Create Basic Auth header
    const authHeader = 'Basic ' + btoa(`${wpUsername}:${wpAppPassword}`);
    const baseUrl = wpUrl.replace(/\/$/, '');

    // Test connection
    if (action === 'test') {
      console.log(`Testing connection to: ${baseUrl}`);
      const response = await fetch(`${baseUrl}/wp-json/ldlms/v2/sfwd-courses`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Check your username and application password.');
        }
        throw new Error(`Connection failed: ${response.statusText}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Connection successful' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create course
    if (action === 'create-course') {
      console.log(`Creating course: ${courseTitle}`);
      
      // First create the course
      const courseResponse = await fetch(`${baseUrl}/wp-json/ldlms/v2/sfwd-courses`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: courseTitle,
          content: courseDescription || '',
          status: 'draft', // Start as draft
        }),
      });

      if (!courseResponse.ok) {
        const errorText = await courseResponse.text();
        throw new Error(`Failed to create course: ${errorText}`);
      }

      const course = await courseResponse.json();
      console.log(`Course created with ID: ${course.id}`);

      // Create lessons if provided
      const createdLessons = [];
      if (lessons && Array.isArray(lessons)) {
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          console.log(`Creating lesson ${i + 1}: ${lesson.title}`);
          
          const lessonResponse = await fetch(`${baseUrl}/wp-json/ldlms/v2/sfwd-lessons`, {
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
                // Video settings for LearnDash
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
            console.error(`Failed to create lesson: ${await lessonResponse.text()}`);
            continue;
          }

          const createdLesson = await lessonResponse.json();
          createdLessons.push({
            id: createdLesson.id,
            title: createdLesson.title.rendered,
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        courseId: course.id,
        courseUrl: `${baseUrl}/wp-admin/post.php?post=${course.id}&action=edit`,
        lessonsCreated: createdLessons.length,
        lessons: createdLessons,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List existing courses
    if (action === 'list-courses') {
      console.log('Fetching existing courses');
      const response = await fetch(`${baseUrl}/wp-json/ldlms/v2/sfwd-courses?per_page=50`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.statusText}`);
      }

      const courses = await response.json();
      return new Response(JSON.stringify({
        courses: courses.map((c: any) => ({
          id: c.id,
          title: c.title.rendered,
          status: c.status,
          link: c.link,
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add lesson to existing course
    if (action === 'add-lesson') {
      const { courseId, lessonTitle, lessonContent, videoUrl } = await req.json();
      
      console.log(`Adding lesson to course ${courseId}: ${lessonTitle}`);
      const response = await fetch(`${baseUrl}/wp-json/ldlms/v2/sfwd-lessons`, {
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
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('LearnDash export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
