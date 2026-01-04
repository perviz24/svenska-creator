-- Create slides table
CREATE TABLE public.slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  slide_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  speaker_notes TEXT,
  layout TEXT NOT NULL DEFAULT 'title-content',
  image_url TEXT,
  image_source TEXT, -- 'unsplash', 'pexels', 'shutterstock', 'adobe', 'getty', 'ai-generated'
  image_attribution TEXT,
  background_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, module_id, slide_number)
);

-- Create stock_provider_settings table for premium API keys
CREATE TABLE public.stock_provider_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'shutterstock', 'adobe', 'getty'
  api_key TEXT,
  api_secret TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_provider_settings ENABLE ROW LEVEL SECURITY;

-- Slides RLS policies
CREATE POLICY "Users can view their own slides"
ON public.slides FOR SELECT
USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND user_id = auth.uid()));

CREATE POLICY "Users can create slides for their courses"
ON public.slides FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND user_id = auth.uid()));

CREATE POLICY "Users can update their own slides"
ON public.slides FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete their own slides"
ON public.slides FOR DELETE
USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND user_id = auth.uid()));

-- Stock provider settings RLS policies
CREATE POLICY "Users can view their own provider settings"
ON public.stock_provider_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own provider settings"
ON public.stock_provider_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own provider settings"
ON public.stock_provider_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own provider settings"
ON public.stock_provider_settings FOR DELETE USING (auth.uid() = user_id);

-- Triggers for timestamp updates
CREATE TRIGGER update_slides_updated_at
BEFORE UPDATE ON public.slides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_provider_settings_updated_at
BEFORE UPDATE ON public.stock_provider_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_slides_course_id ON public.slides(course_id);
CREATE INDEX idx_slides_module_id ON public.slides(course_id, module_id);
CREATE INDEX idx_stock_provider_settings_user_id ON public.stock_provider_settings(user_id);