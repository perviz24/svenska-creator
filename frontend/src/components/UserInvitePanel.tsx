import { useState } from 'react';
import { Users, Mail, UserPlus, Shield, Clock, MoreVertical, RefreshCw, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserRoles } from '@/hooks/useUserRoles';
import { UserRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types/users';
import { toast } from 'sonner';

export function UserInvitePanel() {
  const {
    currentRole,
    hasPermission,
    teamMembers,
    invitations,
    isLoading,
    inviteUser,
    updateUserRole,
    removeTeamMember,
    cancelInvitation,
    resendInvitation,
  } = useUserRoles();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('editor');
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      toast.error('Ange en e-postadress');
      return;
    }

    if (!inviteEmail.includes('@')) {
      toast.error('Ange en giltig e-postadress');
      return;
    }

    setIsInviting(true);
    const success = await inviteUser(inviteEmail, inviteRole);
    if (success) {
      setInviteEmail('');
      setInviteRole('editor');
    }
    setIsInviting(false);
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'editor': return 'outline';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadge = (status: 'pending' | 'accepted' | 'expired') => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><Clock className="w-3 h-3 mr-1" />Väntar</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30"><Check className="w-3 h-3 mr-1" />Accepterad</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><X className="w-3 h-3 mr-1" />Utgången</Badge>;
    }
  };

  const canManage = hasPermission('canManageRoles');
  const canInvite = hasPermission('canInviteUsers');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Teamhantering
        </CardTitle>
        <CardDescription>
          Bjud in användare och hantera behörigheter
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="team" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" />
              Team ({teamMembers.length})
            </TabsTrigger>
            <TabsTrigger value="invitations">
              <Mail className="w-4 h-4 mr-2" />
              Inbjudningar ({invitations.filter(i => i.status === 'pending').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-4 mt-4">
            {/* Team Members List */}
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatarUrl} />
                      <AvatarFallback>
                        {member.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.displayName || member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {ROLE_LABELS[member.role]}
                    </Badge>
                    {canManage && member.role !== 'owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => updateUserRole(member.id, 'admin')}>
                            <Shield className="w-4 h-4 mr-2" />
                            Gör till Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateUserRole(member.id, 'editor')}>
                            <Shield className="w-4 h-4 mr-2" />
                            Gör till Redaktör
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateUserRole(member.id, 'viewer')}>
                            <Shield className="w-4 h-4 mr-2" />
                            Gör till Läsare
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => removeTeamMember(member.id)}
                            className="text-destructive"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Ta bort från team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Invite Form */}
            {canInvite && (
              <form onSubmit={handleInvite} className="pt-4 border-t border-border space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Bjud in ny användare
                </h4>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="invite-email" className="sr-only">E-post</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="E-postadress"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {canManage && (
                        <SelectItem value="admin">
                          <span className="font-medium">Admin</span>
                        </SelectItem>
                      )}
                      <SelectItem value="editor">
                        <span className="font-medium">Redaktör</span>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <span className="font-medium">Läsare</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={isInviting || isLoading}>
                    {isInviting ? 'Skickar...' : 'Bjud in'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ROLE_DESCRIPTIONS[inviteRole]}
                </p>
              </form>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="space-y-3 mt-4">
            {invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Inga väntande inbjudningar</p>
              </div>
            ) : (
              invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {invitation.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Skickad {new Date(invitation.invitedAt).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(invitation.role)}>
                      {ROLE_LABELS[invitation.role]}
                    </Badge>
                    {getStatusBadge(invitation.status)}
                    {invitation.status === 'pending' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => resendInvitation(invitation.id)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Skicka igen
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => cancelInvitation(invitation.id)}
                            className="text-destructive"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Avbryt inbjudan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
