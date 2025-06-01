import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogIn, MessageCircle, BookOpen, Users, ShoppingCart, ChefHat, Download } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/components/ui/use-toast';
import MessageInbox from './MessageInbox';
import UserAuth from './UserAuth';
import UserProfileDialog from './UserProfileDialog';
import FriendsDialog from './FriendsDialog';
import ShoppingListDialog from './ShoppingListDialog';
import MealPlannerDialog from './MealPlannerDialog';
import { cn } from '@/lib/utils';
import { MealPlan } from './MealPlanner'; // Import MealPlan type
import { Recipe } from './RecipeScraper'; // Import Recipe type

interface TopBarProps {
  onRecipeRemoved: (id: string) => void;
  setActiveTab: (tab: string) => void;
  onOpenDm: (recipientId: string, recipientUsername: string) => void;
  recipes: Recipe[];
  mealPlan: MealPlan[];
  onShoppingListChange: (ingredients: string[]) => void;
  onMealPlanChange: (mealPlan: MealPlan[]) => void;
  availableIngredients: string[];
  onRecipeGenerated: (recipe: Recipe) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onRecipeRemoved, 
  setActiveTab, 
  onOpenDm, 
  recipes, 
  mealPlan, 
  onShoppingListChange,
  onMealPlanChange,
  availableIngredients,
  onRecipeGenerated,
  selectedMonth,
  setSelectedMonth,
}) => {
  const { user } = useAppContext();
  const isMobile = useIsMobile();
  const [showAuth, setShowAuth] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // Removed states for Friends, Shopping List, Meal Planner dialogs as they are now in MobileNavMenu

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

  const iconButtonClasses = "text-white hover:text-white hover:bg-white/10 border border-white/20 hover:border-white/40";

  return (
    <div className="flex items-center gap-3">
      {/* Message Inbox Button (only visible on desktop, on mobile it's in the menu) */}
      {!isMobile && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMessageClick}
            className={cn(iconButtonClasses)}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="ml-1">Messages</span>
          </Button>
          
          {/* Friends Button (only visible on desktop) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { /* This will be handled by MobileNavMenu on mobile */ }}
            className={cn(iconButtonClasses)}
          >
            <Users className="h-4 w-4" />
            <span className="ml-1">Friends</span>
          </Button>

          {/* Shopping List Button (only visible on desktop) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { /* This will be handled by MobileNavMenu on mobile */ }}
            className={cn(iconButtonClasses)}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="ml-1">List</span>
          </Button>

          {/* Meal Planner Button (only visible on desktop) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { /* This will be handled by MobileNavMenu on mobile */ }}
            className={cn(iconButtonClasses)}
          >
            <ChefHat className="h-4 w-4" />
            <span className="ml-1">Planner</span>
          </Button>
        </>
      )}

      {/* User Profile / Sign In Button (always visible) */}
      {user ? (
        <div className={cn(
          "flex items-center gap-2 transition-all duration-500 ease-in-out",
          "opacity-100 translate-x-0"
        )}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowProfile(true)}
            className={cn(iconButtonClasses)}
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
          className={cn(iconButtonClasses)}
        >
          <LogIn className="h-4 w-4" />
          {!isMobile && <span className="ml-1">Sign In</span>}
        </Button>
      )}
      
      <UserAuth open={showAuth} onOpenChange={setShowAuth} />
      <MessageInbox open={showMessages} onOpenChange={setShowMessages} />
      <UserProfileDialog open={showProfile} onOpenChange={setShowProfile} />
      {/* Removed dialogs from TopBar as they are now managed by MobileNavMenu or AppLayout */}
    </div>
  );
};

export default TopBar;