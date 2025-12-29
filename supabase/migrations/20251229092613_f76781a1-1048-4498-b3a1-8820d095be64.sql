-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create user_invitations table
CREATE TABLE public.user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'editor',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    token UUID DEFAULT gen_random_uuid()
);

-- Create partial unique index for pending invitations
CREATE UNIQUE INDEX user_invitations_pending_email_idx ON public.user_invitations (email) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any admin-level role
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'admin')
  )
$$;

-- RLS Policies for user_roles

-- Users can view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins and owners can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin_or_owner(auth.uid()));

-- Only owners can insert roles
CREATE POLICY "Owners can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Only owners can update roles
CREATE POLICY "Owners can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Only owners can delete roles
CREATE POLICY "Owners can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for user_invitations

-- Users can view their own invitations (by email)
CREATE POLICY "Users can view invitations sent to them"
ON public.user_invitations
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR invited_by = auth.uid()
  OR public.is_admin_or_owner(auth.uid())
);

-- Admins and owners can create invitations
CREATE POLICY "Admins can create invitations"
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- Admins can update their own invitations
CREATE POLICY "Admins can update invitations"
ON public.user_invitations
FOR UPDATE
TO authenticated
USING (
  invited_by = auth.uid()
  OR public.is_admin_or_owner(auth.uid())
);

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
ON public.user_invitations
FOR DELETE
TO authenticated
USING (
  invited_by = auth.uid()
  OR public.is_admin_or_owner(auth.uid())
);

-- Trigger to update updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically assign owner role to first user
CREATE OR REPLACE FUNCTION public.handle_first_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the first user (no roles exist yet)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to assign owner role to first user
CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_first_user_role();