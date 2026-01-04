import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserRole, 
  RolePermission, 
  ROLE_PERMISSIONS, 
  TeamMember, 
  UserInvitation 
} from '@/types/users';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUserRoles() {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>('viewer');
  const [permissions, setPermissions] = useState<RolePermission>(ROLE_PERMISSIONS.viewer);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's role from database
  useEffect(() => {
    if (!user) return;

    const fetchUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // If no role exists, user might be owner (first user)
          if (error.code === 'PGRST116') {
            // Check if any roles exist
            const { count } = await supabase
              .from('user_roles')
              .select('*', { count: 'exact', head: true });
            
            if (count === 0) {
              // First user - assign as owner
              setCurrentRole('owner');
              setPermissions(ROLE_PERMISSIONS.owner);
            } else {
              // Not first user, default to viewer
              setCurrentRole('viewer');
              setPermissions(ROLE_PERMISSIONS.viewer);
            }
          }
          return;
        }

        const role = data.role as UserRole;
        setCurrentRole(role);
        setPermissions(ROLE_PERMISSIONS[role]);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [user]);

  // Fetch team members
  useEffect(() => {
    if (!user) return;

    const fetchTeamMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select(`
            id,
            user_id,
            role,
            created_at
          `);

        if (error) throw error;

        // Get profiles for team members
        const members: TeamMember[] = await Promise.all(
          (data || []).map(async (ur) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', ur.user_id)
              .single();

            return {
              id: ur.user_id,
              email: profile?.email || 'Unknown',
              role: ur.role as UserRole,
              joinedAt: ur.created_at,
            };
          })
        );

        setTeamMembers(members);
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };

    fetchTeamMembers();
  }, [user, currentRole]);

  // Fetch invitations
  useEffect(() => {
    if (!user) return;

    const fetchInvitations = async () => {
      try {
        const { data, error } = await supabase
          .from('user_invitations')
          .select('*')
          .order('invited_at', { ascending: false });

        if (error) throw error;

        const invites: UserInvitation[] = (data || []).map(inv => ({
          id: inv.id,
          email: inv.email,
          role: inv.role as UserRole,
          status: inv.status as 'pending' | 'accepted' | 'expired',
          invitedBy: inv.invited_by || '',
          invitedAt: inv.invited_at,
          expiresAt: inv.expires_at,
          acceptedAt: inv.accepted_at || undefined,
        }));

        setInvitations(invites);
      } catch (error) {
        console.error('Error fetching invitations:', error);
      }
    };

    fetchInvitations();
  }, [user]);

  const hasPermission = useCallback((permission: keyof RolePermission): boolean => {
    return permissions[permission];
  }, [permissions]);

  const inviteUser = useCallback(async (email: string, role: UserRole): Promise<boolean> => {
    if (!hasPermission('canInviteUsers')) {
      toast.error('Du har inte behörighet att bjuda in användare');
      return false;
    }

    if (!user) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_invitations')
        .insert({
          email,
          role,
          invited_by: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Denna e-post har redan en väntande inbjudan');
          return false;
        }
        throw error;
      }

      // Refresh invitations
      const { data } = await supabase
        .from('user_invitations')
        .select('*')
        .order('invited_at', { ascending: false });

      if (data) {
        setInvitations(data.map(inv => ({
          id: inv.id,
          email: inv.email,
          role: inv.role as UserRole,
          status: inv.status as 'pending' | 'accepted' | 'expired',
          invitedBy: inv.invited_by || '',
          invitedAt: inv.invited_at,
          expiresAt: inv.expires_at,
          acceptedAt: inv.accepted_at || undefined,
        })));
      }

      toast.success(`Inbjudan skickad till ${email}`);
      return true;
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Kunde inte skicka inbjudan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, hasPermission]);

  const updateUserRole = useCallback(async (userId: string, newRole: UserRole): Promise<boolean> => {
    if (!hasPermission('canManageRoles')) {
      toast.error('Du har inte behörighet att ändra roller');
      return false;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setTeamMembers(prev => 
        prev.map(m => m.id === userId ? { ...m, role: newRole } : m)
      );

      toast.success('Roll uppdaterad');
      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Kunde inte uppdatera roll');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission]);

  const removeTeamMember = useCallback(async (userId: string): Promise<boolean> => {
    if (!hasPermission('canManageRoles')) {
      toast.error('Du har inte behörighet att ta bort användare');
      return false;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setTeamMembers(prev => prev.filter(m => m.id !== userId));
      toast.success('Användare borttagen');
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Kunde inte ta bort användare');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission]);

  const cancelInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      toast.success('Inbjudan avbruten');
      return true;
    } catch (error) {
      console.error('Error canceling invitation:', error);
      toast.error('Kunde inte avbryta inbjudan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ 
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
        })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Inbjudan skickad igen');
      return true;
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Kunde inte skicka om inbjudan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    currentRole,
    permissions,
    hasPermission,
    teamMembers,
    invitations,
    isLoading,
    inviteUser,
    updateUserRole,
    removeTeamMember,
    cancelInvitation,
    resendInvitation,
  };
}
