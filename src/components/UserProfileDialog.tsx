import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, LogOut, Mail } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ open, onOpenChange }) => {
  const { user, signOut } = useAppContext();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: '👋 Goodbye!',
        description: 'Successfully signed out of MadRezipes.'
      });
      onOpenChange(false); // Close the dialog after signing out
    } catch (error: any) {
      toast({
        title: 'Sign out failed',
        description: error.message || 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (!user) {
    return null; // Should not be rendered if no user is logged in
  }

  const displayName = user.username || user.email?.split('@')[0] || 'User';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg text-foreground">{displayName}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleSignOut} 
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;