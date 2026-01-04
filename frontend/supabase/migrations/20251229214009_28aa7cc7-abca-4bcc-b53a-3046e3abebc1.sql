-- Create module_exercises table for exercises persistence
CREATE TABLE public.module_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  module_title TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, module_id)
);

-- Create module_quizzes table for quiz persistence
CREATE TABLE public.module_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  module_title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, module_id)
);

-- Enable Row Level Security
ALTER TABLE public.module_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_quizzes ENABLE ROW LEVEL SECURITY;

-- RLS policies for module_exercises
CREATE POLICY "Users can view their own module exercises"
ON public.module_exercises
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = module_exercises.course_id
  AND courses.user_id = auth.uid()
));

CREATE POLICY "Users can create module exercises for their courses"
ON public.module_exercises
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = module_exercises.course_id
  AND courses.user_id = auth.uid()
));

CREATE POLICY "Users can update their own module exercises"
ON public.module_exercises
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = module_exercises.course_id
  AND courses.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own module exercises"
ON public.module_exercises
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = module_exercises.course_id
  AND courses.user_id = auth.uid()
));

-- RLS policies for module_quizzes
CREATE POLICY "Users can view their own module quizzes"
ON public.module_quizzes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = module_quizzes.course_id
  AND courses.user_id = auth.uid()
));

CREATE POLICY "Users can create module quizzes for their courses"
ON public.module_quizzes
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = module_quizzes.course_id
  AND courses.user_id = auth.uid()
));

CREATE POLICY "Users can update their own module quizzes"
ON public.module_quizzes
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = module_quizzes.course_id
  AND courses.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own module quizzes"
ON public.module_quizzes
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = module_quizzes.course_id
  AND courses.user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_module_exercises_updated_at
  BEFORE UPDATE ON public.module_exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_module_quizzes_updated_at
  BEFORE UPDATE ON public.module_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();