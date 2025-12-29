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

// Temporary in-memory storage until database migration
// This will be replaced with Supabase queries after migration
let mockInvitations: UserInvitation[] = [];
let mockTeamMembers: TeamMember[] = [];

export function useUserRoles() {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [permissions, setPermissions] = useState<RolePermission>(ROLE_PERMISSIONS.owner);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize current user as owner (will be replaced with DB query)
  useEffect(() => {
    if (user) {
      // For now, the logged-in user is always owner
      // After migration: query user_roles table
      setCurrentRole('owner');
      setPermissions(ROLE_PERMISSIONS.owner);
      
      // Add current user to team members if not present
      if (!mockTeamMembers.find(m => m.id === user.id)) {
        mockTeamMembers.push({
          id: user.id,
          email: user.email || '',
          role: 'owner',
          joinedAt: new Date().toISOString(),
        });
      }
      setTeamMembers([...mockTeamMembers]);
      setInvitations([...mockInvitations]);
    }
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
      // Check if already invited
      if (mockInvitations.find(i => i.email === email && i.status === 'pending')) {
        toast.error('Denna e-post har redan en väntande inbjudan');
        return false;
      }

      // Create invitation (will be replaced with Supabase insert)
      const invitation: UserInvitation = {
        id: crypto.randomUUID(),
        email,
        role,
        status: 'pending',
        invitedBy: user.id,
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };

      mockInvitations.push(invitation);
      setInvitations([...mockInvitations]);

      // TODO: Send invitation email via edge function
      console.log('Invitation created:', invitation);
      
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
      // Update role (will be replaced with Supabase update)
      const memberIndex = mockTeamMembers.findIndex(m => m.id === userId);
      if (memberIndex !== -1) {
        mockTeamMembers[memberIndex].role = newRole;
        setTeamMembers([...mockTeamMembers]);
        toast.success('Roll uppdaterad');
        return true;
      }
      return false;
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
      mockTeamMembers = mockTeamMembers.filter(m => m.id !== userId);
      setTeamMembers([...mockTeamMembers]);
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
      mockInvitations = mockInvitations.filter(i => i.id !== invitationId);
      setInvitations([...mockInvitations]);
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
      const invitation = mockInvitations.find(i => i.id === invitationId);
      if (invitation) {
        invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        setInvitations([...mockInvitations]);
        toast.success('Inbjudan skickad igen');
        return true;
      }
      return false;
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
