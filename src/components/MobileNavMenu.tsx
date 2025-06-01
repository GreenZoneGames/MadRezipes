import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users, ShoppingCart, ChefHat, BookOpen } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import ShoppingListDialog from './ShoppingListDialog';
import MealPlannerDialog from './MealPlannerDialog';
import FriendsDialog from './FriendsDialog';
import { MealPlan } from './MealPlanner';
import { Recipe } from './RecipeScraper';

interface MobileNavMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDm: (recipientId: string, recipientUsername: string) => void;
  recipes: Recipe[];
  mealPlan: MealPlan[];
  onShoppingListChange: (ingredients: string[]) => void;
  onMealPlanChange: (mealPlan: MealPlan[]) => void;
  availableIngredients: string[];
  onRecipeGenerated: (recipe: Recipe) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  setActiveTab: (tab: string) => void; // Added setActiveTab
}

const MobileNavMenu: React.FC<MobileNavMenuProps> = ({
  open,
  onOpenChange,
  onOpenDm,
  recipes,
  mealPlan,
  onShoppingListChange,
  onMealPlanChange,
  availableIngredients,
  onRecipeGenerated,
  selectedMonth,
  setSelectedMonth,
  setActiveTab,
}) => {
  const { user } = useAppContext();
  const [showMessages, setShowMessages] = React.useState(false);
  const [showFriendsDialog, setShowFriendsDialog] = React.useState(false);
  const [showShoppingListDialog, setShowShoppingListDialog] = React.useState(false);
  const [showMealPlannerDialog, setShowMealPlannerDialog] = React.useState(false);

  const handleMessageClick = () => {
    if (user) {
      setShowMessages(true);
      onOpenChange(false); // Close sidebar
    } else {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in or register to access messages.',
        variant: 'destructive'
      });
    }
  };

  const handleFriendsClick = () => {
    setShowFriendsDialog(true);
    onOpenChange(false); // Close sidebar
  };

  const handleShoppingListClick = () => {
    setShowShoppingListDialog(true);
    onOpenChange(false); // Close sidebar
  };

  const handleMealPlannerClick = () => {
    setShowMealPlannerDialog(true);
    onOpenChange(false); // Close sidebar
  };

  const handleCookbookManagerClick = () => {
    setActiveTab('add-recipe'); // Assuming 'add-recipe' tab is where CookbookManager is visible
    onOpenChange(false); // Close sidebar
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 bg-card border-r border-border flex flex-col">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold text-primary">MadRezipes</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 flex-1">
          <Button variant="ghost" className="justify-start text-foreground hover:bg-muted" onClick={handleMessageClick}>
            <MessageCircle className="h-5 w-5 mr-3" /> Messages
          </Button>
          <Button variant="ghost" className="justify-start text-foreground hover:bg-muted" onClick={handleFriendsClick}>
            <Users className="h-5 w-5 mr-3" /> Friends
          </Button>
          <Button variant="ghost" className="justify-start text-foreground hover:bg-muted" onClick={handleShoppingListClick}>
            <ShoppingCart className="h-5 w-5 mr-3" /> Shopping List
          </Button>
          <Button variant="ghost" className="justify-start text-foreground hover:bg-muted" onClick={handleMealPlannerClick}>
            <ChefHat className="h-5 w-5 mr-3" /> Meal Planner
          </Button>
          <Button variant="ghost" className="justify-start text-foreground hover:bg-muted" onClick={handleCookbookManagerClick}>
            <BookOpen className="h-5 w-5 mr-3" /> Cookbooks
          </Button>
        </nav>

        {/* Dialogs for the mobile menu items */}
        <FriendsDialog
          open={showFriendsDialog}
          onOpenChange={setShowFriendsDialog}
          onOpenDm={onOpenDm}
        />
        <ShoppingListDialog
          open={showShoppingListDialog}
          onOpenChange={setShowShoppingListDialog}
          recipes={recipes}
          mealPlan={mealPlan}
          onShoppingListChange={onShoppingListChange}
        />
        <MealPlannerDialog
          open={showMealPlannerDialog}
          onOpenChange={setShowMealPlannerDialog}
          recipes={recipes}
          mealPlan={mealPlan}
          onMealPlanChange={onMealPlanChange}
          availableIngredients={availableIngredients}
          onRecipeGenerated={onRecipeGenerated}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          allRecipes={recipes}
        />
      </SheetContent>
    </Sheet>
  );
};

export default MobileNavMenu;