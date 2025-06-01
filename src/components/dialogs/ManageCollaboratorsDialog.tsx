import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import InviteCollaboratorDialog from './InviteCollaboratorDialog'; // Import the new dialog

interface Cookbook {
  id: string;
  name: string;
  user_id: string; // Owner's ID
}

interface CookbookCollaborator {
  id: string;
  user_id: string;
  role: string;
  status: string;
  users: { // Joined user data
    username: string;
    email: string;
  };
}

interface ManageCollaboratorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cookbook: Cookbook | null;
}

const ManageCollaboratorsDialog: React.FC<ManageCollaboratorsDialogProps> = ({ open, onOpenChange, cookbook }) => {
  const { user, removeCollaborator } = useAppContext();
  const [showInviteCollaboratorDialog, setShowInviteCollaboratorDialog] = React.useState(false);

  const { data: collaborators, isLoading: isLoadingCollaborators } = useQuery<CookbookCollaborator[]>({
    queryKey: ['cookbookCollaborators', cookbook?.id],
    queryFn: async () => {
      if (!cookbook) return [];
      const { data, error } = await supabase
        .from('cookbook_collaborators')
        .select(`
          id,
          user_id,
          role,
          status,
          users(username, email)
        `)
        .eq('cookbook_id', cookbook.id);
      if (error) throw error;
      return data as CookbookCollaborator[];
    },
    enabled: !!cookbook && open, // Only fetch if cookbook is selected and dialog is open
  });

  const handleRemoveCollaborator = async (collaboratorUserId: string, collaboratorUsername: string) => {
    if (!cookbook) return;
    try {
      await removeCollaborator(cookbook.id, collaboratorUserId);
      toast({
        title: 'Collaborator Removed',
        description: `${collaboratorUsername} has been removed from "${cookbook.name}".`
      });
    } catch (error) {
      // Toast handled by AppContext
    }
  };

  const isOwner = user && cookbook?.user_id === user.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Manage Collaborators for "{cookbook?.name}"
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isOwner && (
            <Button onClick={() => setShowInviteCollaboratorDialog(true)} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" /> Invite New Collaborator
            </Button>
          )}
          <h3 className="font-semibold text-sm mt-4">Current Collaborators:</h3>
          {isLoadingCollaborators ? (
            <div className="text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              Loading collaborators...
            </div>
          ) : collaborators && collaborators.length > 0 ? (
            <div className="space-y-2">
              {collaborators.map(collab => (
                <div key={collab.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{collab.users.username || collab.users.email}</span>
                    <Badge variant="secondary" className="text-xs">{collab.status}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {collab.role === 'editor' ? 'Editor' : collab.role}
                    </Badge>
                  </div>
                  {isOwner && collab.user_id !== user?.id && ( // Cannot remove self via this dialog
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Collaborator?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove "{collab.users.username || collab.users.email}" from "{cookbook?.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveCollaborator(collab.user_id, collab.users.username || collab.users.email)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No collaborators yet. Invite some!</p>
          )}
        </div>
      </DialogContent>
      <InviteCollaboratorDialog
        open={showInviteCollaboratorDialog}
        onOpenChange={setShowInviteCollaboratorDialog}
        cookbook={cookbook}
      />
    </Dialog>
  );
};

export default ManageCollaboratorsDialog;