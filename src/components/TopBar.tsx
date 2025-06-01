import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogIn, MessageCircle, BookOpen, Users } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/components/ui/use-toast';
import MessageInbox from './MessageInbox';
import UserAuth from './UserAuth';
import UserProfileDialog from './UserProfileDialog';
import MyCookbooksDialog from './MyCookbooksDialog';
import FriendsDialog from './FriendsDialog'; // Import the new dialog
import { cn } from '@/lib/utils';

interface TopBarProps {
  onRecipeRemoved: (id: string) => void;
  setActiveTab: (tab: string) => void;
  onOpenDm: (recipientId: string, recipientUsername: string) => void; // New prop
}

const TopBar: React.FC<TopBarProps> = ({ onRecipeRemoved, setActiveTab, onOpenDm }) => {
  const { user } = useAppContext();
  const isMobile = useIsMobile();
  const [showAuth, setShowAuth] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCookbooksDialog, setShowCookbooksDialog] = useState(false);
  const [showFriendsDialog, setShowFriendsDialog] = useState(false); // New state for friends dialog
  const [hasShownLoginToast, setHasShownLoginToast] = useState(false);

  useEffect(() => {
    if (user && !hasShownLoginToast) {
      const displayName = user.username || user.email?.split('@')[0] || 'User';
      toast({
        title: `🍽️ Welcome back, ${displayName}!`,
        description: 'Successfully signed in to MadRezipes.'
      });
      setHasShownLoginToast(true);
    } else if (!user && hasShownLoginToast) {
      setHasShownLoginToast(false);
    }
  }, [user, hasShownLoginToast]);

  const displayName = user?.username || user?.email?.split('@')[0] || 'User';

  const handleMessageClick = () => {
    if (user) {
      setShowMessages(true);
    } else {
      setShowAuth(true);
      toast({
        title: 'Sign In Required',
        description: 'Please sign in or register to access messages.',
        variant: 'destructive'
      });
    }
  };

  const handleCookbooksClick = () => {
    setShowCookbooksDialog(true);
  };

  const handleFriendsClick = () => { // New handler for friends dialog
    setShowFriendsDialog(true);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Message Inbox Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMessageClick}
        className={cn(
          "text-white hover:text-white hover:bg-white/10 transition-all duration-500 ease-in-out",
        )}
      >
        <MessageCircle className="h-4 w-4" />
        {!isMobile && <span className="ml-1">Messages</span>}
      </Button>
      
      {/* My Cookbooks Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCookbooksClick}
        className="text-white hover:text-white hover:bg-white/10 border border-white/20 hover:border-white/40"
      >
        <BookOpen className="h-4 w-4" />
        {!isMobile && <span className="ml-1">Cookbooks</span>}
      </Button>

      {/* Friends Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleFriendsClick}
        className="text-white hover:text-white hover:bg-white/10 border border-white/20 hover:border-white/40"
      >
        <Users className="h-4 w-4" />
        {!isMobile && <span className="ml-1">Friends</span>}
      </Button>

      {/* User Profile / Sign In Button */}
      {user ? (
        <div className={cn(
          "flex items-center gap-2 transition-all duration-500 ease-in-out",
          "opacity-100 translate-x-0"
        )}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowProfile(true)}
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
          className={cn(
            "text-white hover:text-white hover:bg-white/10 border border-white/20 transition-all duration-500 ease-in-out",
            "opacity-100 translate-x-0"
          )}
        >
          <LogIn className="h-4 w-4" />
          {!isMobile && <span className="ml-1">Sign In</span>}
        </Button>
      )}
      
      <UserAuth open={showAuth} onOpenChange={setShowAuth} />
      <MessageInbox open={showMessages} onOpenChange={setShowMessages} />
      <UserProfileDialog open={showProfile} onOpenChange={setShowProfile} />
      <MyCookbooksDialog 
        open={showCookbooksDialog} 
        onOpenChange={setShowCookbooksDialog} 
        onRecipeRemoved={onRecipeRemoved}
        setActiveTab={setActiveTab}
      />
      <FriendsDialog 
        open={showFriendsDialog} 
        onOpenChange={setShowFriendsDialog} 
        onOpenDm={onOpenDm} 
      />
    </div>
  );
};

export default TopBar;