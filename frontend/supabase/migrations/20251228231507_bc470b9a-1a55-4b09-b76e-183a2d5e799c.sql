-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  selected_title_id TEXT,
  title_suggestions JSONB DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  outline JSONB,
  current_step TEXT NOT NULL DEFAULT 'title',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create module_scripts table
CREATE TABLE public.module_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  module_title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_url TEXT,
  voice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, module_id)
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Courses RLS policies
CREATE POLICY "Users can view their own courses" 
ON public.courses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own courses" 
ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses" 
ON public.courses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses" 
ON public.courses FOR DELETE USING (auth.uid() = user_id);

-- Module scripts RLS policies
CREATE POLICY "Users can view their own module scripts" 
ON public.module_scripts FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND user_id = auth.uid()));

CREATE POLICY "Users can create module scripts for their courses" 
ON public.module_scripts FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND user_id = auth.uid()));

CREATE POLICY "Users can update their own module scripts" 
ON public.module_scripts FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete their own module scripts" 
ON public.module_scripts FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND user_id = auth.uid()));

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_module_scripts_updated_at
BEFORE UPDATE ON public.module_scripts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_courses_user_id ON public.courses(user_id);
CREATE INDEX idx_module_scripts_course_id ON public.module_scripts(course_id);