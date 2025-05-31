import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogIn, LogOut, MessageCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/components/ui/use-toast';
import MessageInbox from './MessageInbox';
import UserAuth from './UserAuth';

const TopBar: React.FC = () => {
  const { user, signOut } = useAppContext();
  const isMobile = useIsMobile();
  const [showAuth, setShowAuth] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: '👋 Goodbye!',
        description: 'Successfully signed out of MadRezipes.'
      });
    } catch (error: any) {
      toast({
        title: 'Sign out failed',
        description: error.message || 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const displayName = user?.username || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex items-center gap-3">
      {user && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMessages(true)}
          className="text-white hover:text-white hover:bg-white/10"
        >
          <MessageCircle className="h-4 w-4" />
          {!isMobile && <span className="ml-1">Messages</span>}
        </Button>
      )}
      
      {user ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1 bg-white/10 text-white border-white/20">
            <User className="h-3 w-3" />
            {displayName}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut} 
            className="text-white hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            {!isMobile && <span className="ml-1">Sign Out</span>}
          </Button>
        </div>
      ) : (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowAuth(true)}
          className="text-white hover:text-white hover:bg-white/10 border border-white/20"
        >
          <LogIn className="h-4 w-4" />
          {!isMobile && <span className="ml-1">Sign In</span>}
        </Button>
      )}
      
      <UserAuth open={showAuth} onOpenChange={setShowAuth} />
      <MessageInbox open={showMessages} onOpenChange={setShowMessages} />
    </div>
  );
};

export default TopBar;