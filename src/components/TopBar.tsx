import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogIn, MessageCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/components/ui/use-toast';
import MessageInbox from './MessageInbox';
import UserAuth from './UserAuth';
import UserProfileDialog from './UserProfileDialog'; // Import the new component

const TopBar: React.FC = () => {
  const { user } = useAppContext(); // Removed signOut from here as it's moved to UserProfileDialog
  const isMobile = useIsMobile();
  const [showAuth, setShowAuth] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false); // New state for profile dialog

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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowProfile(true)} // Open profile dialog
            className="text-white hover:text-white hover:bg-white/10 border border-white/20"
          >
            <User className="h-4 w-4" />
            {!isMobile && <span className="ml-1">{displayName}</span>}
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
      <UserProfileDialog open={showProfile} onOpenChange={setShowProfile} /> {/* Render the new dialog */}
    </div>
  );
};

export default TopBar;