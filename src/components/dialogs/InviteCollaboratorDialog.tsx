import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';

interface Cookbook {
  id: string;
  name: string;
}

interface InviteCollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cookbook: Cookbook | null;
}

const InviteCollaboratorDialog: React.FC<InviteCollaboratorDialogProps> = ({ open, onOpenChange, cookbook }) => {
  const { inviteCollaborator } = useAppContext();
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [isInvitingCollaborator, setIsInvitingCollaborator] = useState(false);

  const handleInviteCollaborator = async () => {
    if (!cookbook) return;
    if (!collaboratorEmail.trim()) {
      toast({ title: 'Email Required', description: 'Please enter an email address.', variant: 'destructive' });
      return;
    }
    setIsInvitingCollaborator(true);
    try {
      await inviteCollaborator(cookbook.id, collaboratorEmail.trim());
      setCollaboratorEmail('');
      onOpenChange(false);
    } catch (error) {
      // Toast handled by AppContext
    } finally {
      setIsInvitingCollaborator(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Invite Collaborator
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Invite a friend to collaborate on "{cookbook?.name}". They will be able to add and remove recipes.
          </p>
          <Input
            type="email"
            placeholder="Collaborator's email address"
            value={collaboratorEmail}
            onChange={(e) => setCollaboratorEmail(e.target.value)}
            disabled={isInvitingCollaborator}
          />
          <Button onClick={handleInviteCollaborator} disabled={isInvitingCollaborator || !collaboratorEmail.trim()} className="w-full">
            {isInvitingCollaborator ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending Invitation...
              </>
            ) : (
              'Send Invitation'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteCollaboratorDialog;