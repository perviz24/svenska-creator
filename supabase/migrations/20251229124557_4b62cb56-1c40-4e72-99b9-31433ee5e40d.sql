-- Add columns for course level, tags, and structure settings
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS comprehensive_level text DEFAULT 'intermediate',
ADD COLUMN IF NOT EXISTS course_length_preset text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS max_modules integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS slides_per_module integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS parent_course_id uuid REFERENCES public.courses(id),
ADD COLUMN IF NOT EXISTS course_level_order integer DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN public.courses.comprehensive_level IS 'beginner, intermediate, or advanced';
COMMENT ON COLUMN public.courses.course_length_preset IS 'short, standard, or comprehensive';
COMMENT ON COLUMN public.courses.parent_course_id IS 'Reference to parent course for continuation/upgrade';
COMMENT ON COLUMN public.courses.course_level_order IS 'Order in course series (1=beginner, 2=intermediate, 3=advanced)';

-- Create index for faster lookup of related courses
CREATE INDEX IF NOT EXISTS idx_courses_parent_course_id ON public.courses(parent_course_id);
CREATE INDEX IF NOT EXISTS idx_courses_tags ON public.courses USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_courses_user_title ON public.courses(user_id, title);