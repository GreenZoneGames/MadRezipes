import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Trash2, Edit, Loader2, Globe, Lock, CalendarDays, Printer, UserPlus, Users, ListOrdered, Plus } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import RecipeCard from './RecipeCard';
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
import { exportCookbookRecipesToPDF } from '@/utils/cookbook-pdf-export';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@/utils/array-utils';

import EditCookbookDialog from './dialogs/EditCookbookDialog';
import InviteCollaboratorDialog from './dialogs/InviteCollaboratorDialog';
import ManageCollaboratorsDialog from './dialogs/ManageCollaboratorsDialog';

interface CategorizedIngredients {
  proteins: string[];
  vegetables: string[];
  fruits: string[];
  grains: string[];
  dairy: string[];
  spices: string[];
  other: string[];
}

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string;
  cookbook_id?: string;
  categorized_ingredients?: CategorizedIngredients;
  position?: number; // Added position for ordering
  is_public?: boolean; // From parent cookbook
  cookbook_owner_id?: string; // From parent cookbook
}

interface Cookbook {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  is_public: boolean;
  is_owner?: boolean;
  is_collaborator?: boolean;
}

interface CookbookDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cookbook: Cookbook | null;
  onRecipeRemoved: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

// Sortable Item Component
const SortableRecipeItem: React.FC<{ recipe: Recipe; onClick: (recipe: Recipe) => void; onRemove: (id: string) => void; canRemove: boolean }> = ({ recipe, onClick, onRemove, canRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: recipe.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center justify-between p-2 border rounded-lg bg-background/30 cursor-grab hover:bg-background/50 transition-colors"
      onClick={() => onClick(recipe)}
    >
      <span className="text-sm font-medium truncate" {...listeners}>{recipe.title}</span>
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(recipe.id);
          }}
          className="text-destructive hover:text-destructive/80"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

const CookbookDetailsDialog: React.FC<CookbookDetailsDialogProps> = ({
  open,
  onOpenChange,
  cookbook,
  onRecipeRemoved,
  setActiveTab,
}) => {
  const { user, guestRecipes, setGuestRecipes, deleteCookbook, setSelectedCookbook, updateRecipeOrder } = useAppContext();
  const queryClient = useQueryClient();

  const [showEditCookbookDialog, setShowEditCookbookDialog] = useState(false);
  const [showInviteCollaboratorDialog, setShowInviteCollaboratorDialog] = useState(false);
  const [showManageCollaboratorsDialog, setShowManageCollaboratorsDialog] = useState(false);
  const [selectedRecipeForDetails, setSelectedRecipeForDetails] = useState<Recipe | null>(null);
  const [showRecipeDetailsDialog, setShowRecipeDetailsDialog] = useState(false);

  const isOwnerOfCookbook = user && cookbook?.user_id === user.id;
  const isCollaboratorOnCookbook = user && cookbook?.is_collaborator;
  const canAddRemoveRecipes = isOwnerOfCookbook || isCollaboratorOnCookbook;
  const canEditCookbook = isOwnerOfCookbook;
  const canDeleteCookbook = isOwnerOfCookbook;
  const canManageCollaborators = isOwnerOfCookbook;
  const canReorderRecipes = isOwnerOfCookbook || isCollaboratorOnCookbook;

  console.log('CookbookDetailsDialog - cookbook:', cookbook);

  const { data: dbRecipes, isLoading: isLoadingDbRecipes } = useQuery<Recipe[]>({
    queryKey: ['recipes', user?.id, cookbook?.id],
    queryFn: async () => {
      if (!user || !cookbook || cookbook.user_id === 'guest') return [];

      const ownerId = cookbook.user_id;
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', ownerId)
        .eq('cookbook_id', cookbook.id)
        .order('position', { ascending: true });

      if (error) throw error;
      return data.map(recipe => ({
        ...recipe,
        is_public: cookbook.is_public,
        cookbook_owner_id: cookbook.user_id,
      })) as Recipe[];
    },
    enabled: !!cookbook && cookbook.user_id !== 'guest',
  });

  console.log('CookbookDetailsDialog - dbRecipes:', dbRecipes);

  const guestRecipesForSelectedCookbook = cookbook && cookbook.user_id === 'guest'
    ? guestRecipes.filter(recipe => recipe.cookbook_id === cookbook.id).sort((a, b) => (a.position || 0) - (b.position || 0))
    : [];

  console.log('CookbookDetailsDialog - guestRecipesForSelectedCookbook:', guestRecipesForSelectedCookbook);

  const [recipesToDisplay, setRecipesToDisplay] = useState<Recipe[]>([]);

  useEffect(() => {
    if (user && cookbook?.user_id !== 'guest') {
      setRecipesToDisplay(dbRecipes || []);
    } else if (cookbook?.user_id === 'guest') {
      setRecipesToDisplay(guestRecipesForSelectedCookbook);
    } else {
      setRecipesToDisplay([]);
    }
  }, [dbRecipes, guestRecipesForSelectedCookbook, user, cookbook]);

  console.log('CookbookDetailsDialog - recipesToDisplay:', recipesToDisplay);

  const handleRemoveRecipe = async (recipeId: string) => {
    if (!cookbook) return;

    if (cookbook.user_id === 'guest') {
      setGuestRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      toast({
        title: 'Recipe Removed',
        description: 'Recipe has been removed from this temporary cookbook.'
      });
      onRecipeRemoved(recipeId);
      return;
    }

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId)
        .eq('cookbook_id', cookbook.id)
        .eq('user_id', cookbook.user_id);

      if (error) throw error;

      toast({
        title: 'Recipe Removed',
        description: 'Recipe has been removed from this cookbook.'
      });
      queryClient.invalidateQueries({ queryKey: ['recipes', cookbook.id] });
      onRecipeRemoved(recipeId);
    } catch (error: any) {
      toast({
        title: 'Removal Failed',
        description: error.message || 'Failed to remove recipe.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCookbook = async () => {
    if (!cookbook) return;
    try {
      await deleteCookbook(cookbook.id);
      toast({
        title: 'Cookbook Deleted!',
        description: `"${cookbook.name}" and all its recipes have been removed.`
      });
      onOpenChange(false); // Close dialog after deletion
      setSelectedCookbook(null); // Deselect the cookbook
    } catch (error: any) {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'An error occurred while deleting the cookbook.',
        variant: 'destructive'
      });
    }
  };

  const handlePlanWithCookbook = () => {
    if (cookbook) {
      setSelectedCookbook(cookbook);
      if (typeof setActiveTab === 'function') {
        setActiveTab('planner');
        toast({
          title: 'Switched to Meal Planner',
          description: `Now planning meals with "${cookbook.name}".`
        });
        onOpenChange(false); // Close dialog
      } else {
        console.error('setActiveTab is not a function, cannot switch tab.');
        toast({
          title: 'Error',
          description: 'Could not switch to Meal Planner tab. Please try refreshing the page.',
          variant: 'destructive'
        });
      }
    } else {
      toast({
        title: 'No Cookbook Selected',
        description: 'Please select a cookbook to plan meals with.',
        variant: 'destructive'
      });
    }
  };

  const handleExportCookbookRecipes = async () => {
    if (!cookbook) {
      toast({
        title: 'No Cookbook Selected',
        description: 'Please select a cookbook to export its recipes.',
        variant: 'destructive'
      });
      return;
    }

    if (!recipesToDisplay || recipesToDisplay.length === 0) {
      toast({
        title: 'No Recipes to Export',
        description: 'This cookbook does not contain any recipes to export.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await exportCookbookRecipesToPDF(recipesToDisplay, cookbook.name);
      toast({
        title: 'Recipes Exported!',
        description: `"${cookbook.name}" recipes downloaded as PDF.`
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'An error occurred while exporting recipes.',
        variant: 'destructive'
      });
    }
  };

  const handleViewRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipeForDetails(recipe);
    setShowRecipeDetailsDialog(true);
  };

  const handleAddNewRecipe = () => {
    if (cookbook) {
      setSelectedCookbook(cookbook); // Ensure this cookbook is selected in context
      setActiveTab('add-recipe'); // Switch to the add-recipe tab
      onOpenChange(false); // Close the cookbook details dialog
      toast({
        title: 'Ready to Add Recipe',
        description: `You can now add a new recipe to "${cookbook.name}".`
      });
    }
  };

  // DND state
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const getActiveRecipe = (activeId: string | null) => {
    return recipesToDisplay.find((recipe) => recipe.id === activeId);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setRecipesToDisplay((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        const updatedOrderWithPositions = newOrder.map((recipe, index) => ({
          ...recipe,
          position: index,
        }));

        if (cookbook) {
          const orderedRecipeIds = updatedOrderWithPositions.map(r => r.id);
          updateRecipeOrder(cookbook.id, orderedRecipeIds);
        }

        return updatedOrderWithPositions;
      });
    }
    setActiveId(null);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (!cookbook) {
    return null; // Or a loading/empty state
  }

  const isLoadingCurrentRecipes = user && cookbook.user_id !== 'guest' ? isLoadingDbRecipes : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {cookbook.name}
            {cookbook.is_owner && (
              <Badge variant="outline" className="text-xs bg-primary/20 text-primary">Owner</Badge>
            )}
            {cookbook.is_collaborator && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-700">Collaborator</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex-1">
              <p className="font-medium text-lg">{cookbook.name}</p>
              {cookbook.description && (
                <p className="text-sm text-muted-foreground mt-1">{cookbook.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {cookbook.is_public ? (
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public</span>
                  ) : (
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
                  )}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {recipesToDisplay.length} Recipes
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {canEditCookbook && (
                <Button variant="ghost" size="sm" onClick={() => setShowEditCookbookDialog(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canManageCollaborators && (
                <Button variant="ghost" size="sm" onClick={() => setShowManageCollaboratorsDialog(true)}>
                  <Users className="h-4 w-4" />
                </Button>
              )}
              {canDeleteCookbook && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the cookbook "{cookbook.name}" and all recipes within it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCookbook}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete Cookbook
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handlePlanWithCookbook}
              disabled={isLoadingCurrentRecipes || recipesToDisplay.length === 0}
              className="flex-1 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Plan with this Cookbook
            </Button>
            <Button
              onClick={handleExportCookbookRecipes}
              disabled={isLoadingCurrentRecipes || recipesToDisplay.length === 0}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Printer className="h-4 w-4 mr-2" />
              Export Recipes
            </Button>
          </div>

          <h3 className="font-semibold text-lg flex items-center gap-2 mt-6">
            <ListOrdered className="h-5 w-5" /> Recipes
            {canAddRemoveRecipes && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddNewRecipe}
                className="ml-auto text-primary hover:text-primary/80 border-primary/50"
              >
                <Plus className="h-4 w-4 mr-1" /> Add New
              </Button>
            )}
          </h3>
          <div className="space-y-4">
            {isLoadingCurrentRecipes ? (
              <div className="text-center py-4 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading recipes...
              </div>
            ) : recipesToDisplay && recipesToDisplay.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={recipesToDisplay.map(r => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recipesToDisplay.map(recipe => (
                      <SortableRecipeItem
                        key={recipe.id}
                        recipe={recipe}
                        onClick={handleViewRecipeDetails}
                        onRemove={handleRemoveRecipe}
                        canRemove={canAddRemoveRecipes}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeId ? (
                    <div className="p-2 border rounded-lg bg-background/80 shadow-lg">
                      <span className="text-sm font-medium truncate">
                        {getActiveRecipe(activeId)?.title}
                      </span>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recipes in this cookbook yet. Add some!
              </p>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <EditCookbookDialog
          open={showEditCookbookDialog}
          onOpenChange={setShowEditCookbookDialog}
          cookbook={cookbook}
        />
        <InviteCollaboratorDialog
          open={showInviteCollaboratorDialog}
          onOpenChange={setShowInviteCollaboratorDialog}
          cookbook={cookbook}
        />
        <ManageCollaboratorsDialog
          open={showManageCollaboratorsDialog}
          onOpenChange={setShowManageCollaboratorsDialog}
          cookbook={cookbook}
        />
        <Dialog open={showRecipeDetailsDialog} onOpenChange={setShowRecipeDetailsDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRecipeForDetails?.title}</DialogTitle>
            </DialogHeader>
            {selectedRecipeForDetails && (
              <RecipeCard
                recipe={selectedRecipeForDetails}
                showFullDetails={true}
              />
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default CookbookDetailsDialog;