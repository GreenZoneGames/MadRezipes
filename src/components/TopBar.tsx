import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogIn, MessageCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/components/ui/use-toast';
import MessageInbox from './MessageInbox';
import UserAuth from './UserAuth';
import UserProfileDialog from './UserProfileDialog';
import { cn } from '@/lib/utils'; // Import cn for conditional class names

const TopBar: React.FC = () => {
  const { user } = useAppContext();
  const isMobile = useIsMobile();
  const [showAuth, setShowAuth] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [hasShownLoginToast, setHasShownLoginToast] = useState(false); // New state to track toast display

  useEffect(() => {
    // Check if user just logged in (user is not null, and toast hasn't been shown yet)
    if (user && !hasShownLoginToast) {
      const displayName = user.username || user.email?.split('@')[0] || 'User';
      toast({
        title: `🍽️ Welcome back, ${displayName}!`,
        description: 'Successfully signed in to MadRezipes.'
      });
      setHasShownLoginToast(true); // Mark toast as shown
    } else if (!user && hasShownLoginToast) {
      // If user logs out, reset the flag so toast can be shown again on next login
      setHasShownLoginToast(false);
    }
  }, [user, hasShownLoginToast]); // Depend on user and hasShownLoginToast

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

  return (
    <div className="flex items-center gap-3">
      {/* Message Inbox Button - Always present, behavior changes based on login */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMessageClick}
        className={cn(
          "text-white hover:text-white hover:bg-white/10 transition-all duration-500 ease-in-out",
          // No animation for this one, it's always visible
        )}
      >
        <MessageCircle className="h-4 w-4" />
        {!isMobile && <span className="ml-1">Messages</span>}
      </Button>
      
      {/* User Profile / Sign In Button */}
      {user ? (
        <div className={cn(
          "flex items-center gap-2 transition-all duration-500 ease-in-out",
          "opacity-100 translate-x-0" // Always visible when logged in
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
            "opacity-100 translate-x-0" // Always visible when logged out
          )}
        >
          <LogIn className="h-4 w-4" />
          {!isMobile && <span className="ml-1">Sign In</span>}
        </Button>
      )}
      
      <UserAuth open={showAuth} onOpenChange={setShowAuth} />
      <MessageInbox open={showMessages} onOpenChange={setShowMessages} />
      <UserProfileDialog open={showProfile} onOpenChange={setShowProfile} />
    </div>
  );
};

export default TopBar;