import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users } from 'lucide-react';
import FriendsList from './FriendsList';

interface FriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDm: (recipientId: string, recipientUsername: string) => void;
}

const FriendsDialog: React.FC<FriendsDialogProps> = ({ open, onOpenChange, onOpenDm }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends & Community
          </DialogTitle>
        </DialogHeader>
        <FriendsList onOpenDm={onOpenDm} />
      </DialogContent>
    </Dialog>
  );
};

export default FriendsDialog;