import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BookOpen, Plus, Trash2, Edit, Loader2, Save, Globe, Lock, CalendarDays, Printer, UserPlus, Check, X, Users, ListOrdered } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import UserAuth from './UserAuth';
import RecipeCard from './RecipeCard';
import { Textarea } from '@/components/ui/textarea';
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
import { Checkbox } from '@/components/ui/checkbox';
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
}

interface Cookbook {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  is_public: boolean;
  is_owner?: boolean; // Added for UI convenience
  is_collaborator?: boolean; // Added for UI convenience
}

interface CookbookCollaborator {
  id: string;
  user_id: string;
  role: string;
  status: string;
  users: { // Joined user data
    username: string;
    email: string;
  };
}

interface CookbookManagerProps {
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
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};


const CookbookManager: React.FC<CookbookManagerProps> = ({ onRecipeRemoved, setActiveTab }) => {
  const { user, cookbooks, selectedCookbook, setSelectedCookbook, createCookbook, guestCookbooks, guestRecipes, setGuestRecipes, syncGuestDataToUser, updateCookbookPrivacy, deleteCookbook, copyCookbook, cookbookInvitations, acceptCookbookInvitation, rejectCookbookInvitation, inviteCollaborator, removeCollaborator, updateRecipeOrder } = useAppContext();
  const queryClient = useQueryClient();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState('');
  const [newCookbookDescription, setNewCookbookDescription] = useState('');
  const [newCookbookIsPublic, setNewCookbookIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showRecipeDetailsDialog, setShowRecipeDetailsDialog] = useState(false);
  const [selectedRecipeForDetails, setSelectedRecipeForDetails] = useState<Recipe | null>(null);
  const [showEditCookbookDialog, setShowEditCookbookDialog] = useState(false);
  const [editingCookbook, setEditingCookbook] = useState<Cookbook | null>(null);
  const [editingCookbookName, setEditingCookbookName] = useState('');
  const [editingCookbookDescription, setEditingCookbookDescription] = useState('');
  const [editingCookbookIsPublic, setEditingCookbookIsPublic] = useState(false);
  const [isUpdatingCookbook, setIsUpdatingCookbook] = useState(false);

  const [selectedCookbookIds, setSelectedCookbookIds] = useState<Set<string>>(new Set());

  const [showInviteCollaboratorDialog, setShowInviteCollaboratorDialog] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [isInvitingCollaborator, setIsInvitingCollaborator] = useState(false);

  const [showManageCollaboratorsDialog, setShowManageCollaboratorsDialog] = useState(false);
  const [cookbookToManageCollaborators, setCookbookToManageCollaborators] = useState<Cookbook | null>(null);

  const [showManageRecipesDialog, setShowManageRecipesDialog] = useState(false);

  // DND state
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const uniqueCookbooks = Array.from(new Map(
    (user ? cookbooks : guestCookbooks).map(cb => [cb.id, cb])
  ).values());

  const currentSelectedCookbook = selectedCookbook || (uniqueCookbooks.length > 0 ? uniqueCookbooks[0] : null);

  // Define permission variables here, after currentSelectedCookbook is determined
  const isOwnerOfSelectedCookbook = user && currentSelectedCookbook?.user_id === user.id;
  const isCollaboratorOnSelectedCookbook = user && currentSelectedCookbook?.is_collaborator;
  const canAddRemoveRecipes = isOwnerOfSelectedCookbook || isCollaboratorOnSelectedCookbook; // Owner or collaborator can add/remove recipes
  const canEditCookbook = isOwnerOfSelectedCookbook; // Only owner can edit cookbook details
  const canDeleteCookbook = isOwnerOfSelectedCookbook; // Only owner can delete cookbook
  const canManageCollaborators = isOwnerOfSelectedCookbook; // Only owner can manage collaborators
  const canReorderRecipes = isOwnerOfSelectedCookbook || isCollaboratorOnSelectedCookbook; // Owner or collaborator can reorder

  const { data: dbRecipes, isLoading: isLoadingDbRecipes } = useQuery<Recipe[]>({
    queryKey: ['recipes', user?.id, currentSelectedCookbook?.id], // Key only depends on cookbook ID
    queryFn: async () => {
      if (!user || !currentSelectedCookbook || currentSelectedCookbook.user_id === 'guest') return [];
      
      // If the user is the owner, fetch their recipes for this cookbook
      // If the user is a collaborator, fetch recipes owned by the cookbook owner for this cookbook
      const ownerId = currentSelectedCookbook.user_id;

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', ownerId) // Fetch recipes owned by the cookbook owner
        .eq('cookbook_id', currentSelectedCookbook.id)
        .order('position', { ascending: true }); // Order by position
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentSelectedCookbook && currentSelectedCookbook.user_id !== 'guest',
  });

  const guestRecipesForSelectedCookbook = currentSelectedCookbook && currentSelectedCookbook.user_id === 'guest'
    ? guestRecipes.filter(recipe => recipe.cookbook_id === currentSelectedCookbook.id).sort((a, b) => (a.position || 0) - (b.position || 0))
    : [];

  const [recipesToDisplay, setRecipesToDisplay] = useState<Recipe[]>([]);

  // Effect 1: Populate form data when dialog opens or user data changes
  useEffect(() => {
    if (showEditCookbookDialog && editingCookbook) {
      setEditingCookbookName(editingCookbook.name);
      setEditingCookbookDescription(editingCookbook.description || '');
      setEditingCookbookIsPublic(editingCookbook.is_public);
    }
  }, [showEditCookbookDialog, editingCookbook]);

  // Effect 2: Sync recipes from query/guest state to local state for DND
  useEffect(() => {
    if (user && currentSelectedCookbook?.user_id !== 'guest') {
      setRecipesToDisplay(dbRecipes || []);
    } else if (currentSelectedCookbook?.user_id === 'guest') {
      setRecipesToDisplay(guestRecipesForSelectedCookbook);
    } else {
      setRecipesToDisplay([]);
    }
  }, [dbRecipes, guestRecipesForSelectedCookbook, user, currentSelectedCookbook]);


  const handleCreateCookbook = async () => {
    if (!newCookbookName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a cookbook name.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const newCb = await createCookbook(newCookbookName.trim(), newCookbookDescription.trim(), newCookbookIsPublic);
      setNewCookbookName('');
      setNewCookbookDescription('');
      setNewCookbookIsPublic(false);
      setShowCreateDialog(false);
      if (newCb) {
        setSelectedCookbook(newCb);
      }
    } catch (error: any) {
      console.error('Creation Failed:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCookbook = (cookbook: Cookbook) => {
    setEditingCookbook(cookbook);
    setShowEditCookbookDialog(true);
  };

  const handleUpdateCookbook = async () => {
    if (!editingCookbook || !user) return;
    if (!editingCookbookName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a cookbook name.',
        variant: 'destructive'
      });
      return;
    }

    setIsUpdatingCookbook(true);
    try {
      const { error } = await supabase
        .from('cookbooks')
        .update({ 
          name: editingCookbookName.trim(), 
          description: editingCookbookDescription.trim(),
          is_public: editingCookbookIsPublic
        })
        .eq('id', editingCookbook.id)
        .eq('user_id', user.id);
      
      if (error) throw error;

      toast({
        title: 'Cookbook Updated!',
        description: `"${editingCookbookName}" has been updated.`
      });
      setShowEditCookbookDialog(false);
      setEditingCookbook(null);
      queryClient.invalidateQueries({ queryKey: ['cookbooks', user.id] });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update cookbook.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingCookbook(false);
    }
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    if (!currentSelectedCookbook) return;

    if (currentSelectedCookbook.user_id === 'guest') {
      setGuestRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      toast({
        title: 'Recipe Removed',
        description: 'Recipe has been removed from this temporary cookbook.'
      });
      onRecipeRemoved(recipeId);
      return;
    }
    
    try {
      // Check if user is owner or collaborator
      const isOwner = currentSelectedCookbook?.user_id === user?.id;
      const { data: collaboratorStatus } = await supabase
        .from('cookbook_collaborators')
        .select('status')
        .eq('cookbook_id', currentSelectedCookbook?.id)
        .eq('user_id', user?.id)
        .single();
      const isAcceptedCollaborator = collaboratorStatus?.status === 'accepted';

      if (!isOwner && !isAcceptedCollaborator) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to remove recipes from this cookbook.',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId)
        .eq('cookbook_id', currentSelectedCookbook?.id)
        .eq('user_id', currentSelectedCookbook?.user_id); // Ensure we delete the recipe owned by the cookbook owner
      
      if (error) throw error;
      
      toast({
        title: 'Recipe Removed',
        description: 'Recipe has been removed from this cookbook.'
      });
      queryClient.invalidateQueries({ queryKey: ['recipes', currentSelectedCookbook?.id] });
      onRecipeRemoved(recipeId);
    } catch (error: any) {
      toast({
        title: 'Removal Failed',
        description: error.message || 'Failed to remove recipe.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCookbook = async (cookbookId: string, cookbookName: string) => {
    try {
      await deleteCookbook(cookbookId);
      toast({
        title: 'Cookbook Deleted!',
        description: `"${cookbookName}" and all its recipes have been removed.`
      });
    } catch (error: any) {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'An error occurred while deleting the cookbook.',
        variant: 'destructive'
      });
    }
  };

  const handleBulkDeleteCookbooks = async () => {
    if (selectedCookbookIds.size === 0) return;

    setLoading(true);
    try {
      for (const id of selectedCookbookIds) {
        const cookbookToDelete = uniqueCookbooks.find(cb => cb.id === id);
        if (cookbookToDelete) {
          await deleteCookbook(id);
        }
      }
      toast({
        title: 'Cookbooks Deleted!',
        description: `${selectedCookbookIds.size} cookbook(s) and their recipes have been removed.`
      });
      setSelectedCookbookIds(new Set());
    } catch (error: any) {
      toast({
        title: 'Bulk Deletion Failed',
        description: error.message || 'An error occurred during bulk deletion.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToAccount = () => {
    if (!user) {
      setShowAuthDialog(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
  };

  const handleViewRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipeForDetails(recipe);
    setShowRecipeDetailsDialog(true);
  };

  const toggleCookbookSelection = (cookbookId: string) => {
    setSelectedCookbookIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cookbookId)) {
        newSet.delete(cookbookId);
      } else {
        newSet.add(cookbookId);
      }
      return newSet;
    });
  };

  const toggleSelectAllCookbooks = () => {
    if (selectedCookbookIds.size === uniqueCookbooks.length) {
      setSelectedCookbookIds(new Set());
    } else {
      setSelectedCookbookIds(new Set(uniqueCookbooks.map(cb => cb.id)));
    }
  };

  const handlePlanWithCookbook = () => {
    if (currentSelectedCookbook) {
      setSelectedCookbook(currentSelectedCookbook);
      if (typeof setActiveTab === 'function') {
        setActiveTab('planner');
        toast({
          title: 'Switched to Meal Planner',
          description: `Now planning meals with "${currentSelectedCookbook.name}".`
        });
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
    if (!currentSelectedCookbook) {
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
      await exportCookbookRecipesToPDF(recipesToDisplay, currentSelectedCookbook.name);
      toast({
        title: 'Recipes Exported!',
        description: `"${currentSelectedCookbook.name}" recipes downloaded as PDF.`
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'An error occurred while exporting recipes.',
        variant: 'destructive'
      });
    }
  };

  const handleInviteCollaborator = async () => {
    if (!currentSelectedCookbook || !user) return;
    if (!collaboratorEmail.trim()) {
      toast({ title: 'Email Required', description: 'Please enter an email address.', variant: 'destructive' });
      return;
    }
    setIsInvitingCollaborator(true);
    try {
      await inviteCollaborator(currentSelectedCookbook.id, collaboratorEmail.trim());
      setCollaboratorEmail('');
      setShowInviteCollaboratorDialog(false);
    } catch (error) {
      // Toast handled by AppContext
    } finally {
      setIsInvitingCollaborator(false);
    }
  };

  const handleManageCollaborators = (cookbook: Cookbook) => {
    setCookbookToManageCollaborators(cookbook);
    setShowManageCollaboratorsDialog(true);
  };

  const handleRemoveCollaborator = async (collaboratorUserId: string, collaboratorUsername: string) => {
    if (!cookbookToManageCollaborators) return;
    try {
      await removeCollaborator(cookbookToManageCollaborators.id, collaboratorUserId);
      toast({
        title: 'Collaborator Removed',
        description: `${collaboratorUsername} has been removed from "${cookbookToManageCollaborators.name}".`
      });
    } catch (error) {
      // Toast handled by AppContext
    }
  };

  const { data: collaborators, isLoading: isLoadingCollaborators } = useQuery<CookbookCollaborator[]>({
    queryKey: ['cookbookCollaborators', cookbookToManageCollaborators?.id],
    queryFn: async () => {
      if (!cookbookToManageCollaborators) return [];
      const { data, error } = await supabase
        .from('cookbook_collaborators')
        .select(`
          id,
          user_id,
          role,
          status,
          users(username, email)
        `)
        .eq('cookbook_id', cookbookToManageCollaborators.id);
      if (error) throw error;
      return data as CookbookCollaborator[];
    },
    enabled: !!cookbookToManageCollaborators,
  });

  const isLoadingCurrentRecipes = user && currentSelectedCookbook?.user_id !== 'guest' ? isLoadingDbRecipes : false;

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
        
        // Update positions in the local state immediately
        const updatedOrderWithPositions = newOrder.map((recipe, index) => ({
          ...recipe,
          position: index,
        }));
        
        // Persist the new order to Supabase
        if (currentSelectedCookbook) {
          const orderedRecipeIds = updatedOrderWithPositions.map(r => r.id);
          updateRecipeOrder(currentSelectedCookbook.id, orderedRecipeIds);
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

  return (
    <Card className="hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            My Cookbooks
          </div>
          <div className="flex items-center gap-2">
            {!user && guestCookbooks.length > 0 && (
              <Button size="sm" onClick={handleSaveToAccount} className="bg-purple-500 hover:bg-purple-600">
                <Save className="h-4 w-4 mr-1" />
                Save to Account
              </Button>
            )}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Cookbook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Cookbook name"
                    value={newCookbookName}
                    onChange={(e) => setNewCookbookName(e.target.value)}
                    disabled={loading}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newCookbookDescription}
                    onChange={(e) => setNewCookbookDescription(e.target.value)}
                    disabled={loading}
                    rows={3}
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="new-cookbook-public"
                      checked={newCookbookIsPublic}
                      onCheckedChange={setNewCookbookIsPublic}
                      disabled={loading}
                    />
                    <Label htmlFor="new-cookbook-public">
                      {newCookbookIsPublic ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Globe className="h-4 w-4" /> Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Lock className="h-4 w-4" /> Private
                        </span>
                      )}
                    </Label>
                  </div>
                  <Button onClick={handleCreateCookbook} disabled={loading} className="w-full">
                    {loading ? 'Creating...' : 'Create Cookbook'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {user && cookbookInvitations.length > 0 && (
            <div className="space-y-2 border-b pb-4 mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-1 text-orange-500">
                <UserPlus className="h-4 w-4" /> Cookbook Invitations ({cookbookInvitations.length})
              </h3>
              {cookbookInvitations.map(invite => (
                <div key={invite.id} className="flex items-center justify-between p-2 border rounded bg-orange-50/50">
                  <span className="text-sm font-medium">
                    "{invite.cookbook_name}" from {invite.invited_by_username}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acceptCookbookInvitation(invite.id)}
                      className="text-green-600 hover:text-green-800 border-green-300"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rejectCookbookInvitation(invite.id)}
                      className="text-red-600 hover:text-red-800 border-red-300"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Select
            value={currentSelectedCookbook?.id || ''}
            onValueChange={(value) => {
              const cookbook = uniqueCookbooks.find(c => c.id === value);
              setSelectedCookbook(cookbook || null);
            }}
          >
            <SelectTrigger>
              <SelectValue>
                {currentSelectedCookbook ? (
                  <span className="flex items-center gap-2">
                    {currentSelectedCookbook.is_public ? (
                      <Globe className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    {currentSelectedCookbook.name}
                  </span>
                ) : (
                  "Select a cookbook"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {uniqueCookbooks.map(cookbook => (
                <SelectItem key={cookbook.id} value={cookbook.id}>
                  {cookbook.name} 
                  {cookbook.user_id === 'guest' && ' (Unsaved)'}
                  {cookbook.is_owner && ' (Owner)'}
                  {cookbook.is_collaborator && ' (Collaborator)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {uniqueCookbooks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-sm">
              No cookbooks yet. Create your first one!
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mt-4">
                <h4 className="font-medium flex items-center gap-2">
                  {currentSelectedCookbook?.name || 'No Cookbook Selected'}
                  {currentSelectedCookbook && (
                    <Badge variant="secondary" className="text-xs">
                      {currentSelectedCookbook.is_public ? (
                        <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public</span>
                      ) : (
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private
                        </span>
                      )}
                    </Badge>
                  )}
                  {currentSelectedCookbook?.is_owner && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">Owner</Badge>
                  )}
                  {currentSelectedCookbook?.is_collaborator && (
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700">Collaborator</Badge>
                  )}
                </h4>
                <div className="flex items-center gap-2">
                  {currentSelectedCookbook && (
                    <Button variant="ghost" size="sm" onClick={() => setShowManageRecipesDialog(true)} disabled={isLoadingCurrentRecipes}>
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  )}
                  {canManageCollaborators && currentSelectedCookbook && (
                    <Button variant="ghost" size="sm" onClick={() => handleManageCollaborators(currentSelectedCookbook)}>
                      <Users className="h-4 w-4" />
                    </Button>
                  )}
                  {canEditCookbook && currentSelectedCookbook && (
                    <Button variant="ghost" size="sm" onClick={() => handleEditCookbook(currentSelectedCookbook)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDeleteCookbook && currentSelectedCookbook && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the cookbook "{currentSelectedCookbook.name}" and all recipes within it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteCookbook(currentSelectedCookbook.id, currentSelectedCookbook.name)}
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
              {currentSelectedCookbook?.description && (
                <p className="text-sm text-muted-foreground">
                  {currentSelectedCookbook.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-cookbooks"
                    checked={selectedCookbookIds.size === uniqueCookbooks.length && uniqueCookbooks.length > 0}
                    onCheckedChange={toggleSelectAllCookbooks}
                  />
                  <Label htmlFor="select-all-cookbooks" className="text-sm font-medium">
                    Select All ({selectedCookbookIds.size})
                  </Label>
                </div>
                {selectedCookbookIds.size > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={loading}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedCookbookIds.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Bulk Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedCookbookIds.size} selected cookbook(s)? This action cannot be undone and will also delete all recipes within them.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDeleteCookbooks} className="bg-destructive hover:bg-destructive/90">
                          {loading ? 'Deleting...' : 'Confirm Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handlePlanWithCookbook} 
                  disabled={!currentSelectedCookbook || isLoadingCurrentRecipes}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Plan with this Cookbook
                </Button>
                <Button 
                  onClick={handleExportCookbookRecipes} 
                  disabled={!currentSelectedCookbook || isLoadingCurrentRecipes || (recipesToDisplay?.length || 0) === 0}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Export Recipes
                </Button>
              </div>

              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
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
                      {recipesToDisplay.map(recipe => (
                        <SortableRecipeItem 
                          key={recipe.id} 
                          recipe={recipe} 
                          onClick={handleViewRecipeDetails}
                          onRemove={handleRemoveRecipe}
                          canRemove={canAddRemoveRecipes}
                        />
                      ))}
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
              {currentSelectedCookbook && (
                <Button 
                  onClick={() => setShowManageRecipesDialog(true)} 
                  disabled={isLoadingCurrentRecipes}
                  className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Open Selected Cookbook
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <UserAuth open={showAuthDialog} onOpenChange={setShowAuthDialog} onAuthSuccess={handleAuthSuccess} />

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

      <Dialog open={showEditCookbookDialog} onOpenChange={setShowEditCookbookDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cookbook</DialogTitle>
          </DialogHeader>
          {editingCookbook && (
            <div className="space-y-4">
              <Input
                placeholder="Cookbook name"
                value={editingCookbookName}
                onChange={(e) => setEditingCookbookName(e.target.value)}
                disabled={isUpdatingCookbook}
              />
              <Textarea
                placeholder="Description (optional)"
                value={editingCookbookDescription}
                onChange={(e) => setNewCookbookDescription(e.target.value)}
                disabled={isUpdatingCookbook}
                rows={3}
              />
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-cookbook-public"
                  checked={editingCookbookIsPublic}
                  onCheckedChange={setEditingCookbookIsPublic}
                  disabled={isUpdatingCookbook}
                />
                <Label htmlFor="edit-cookbook-public">
                  {editingCookbookIsPublic ? (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" /> Public
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" /> Private
                    </span>
                  )}
                </Label>
              </div>
              <Button onClick={handleUpdateCookbook} disabled={isUpdatingCookbook} className="w-full">
                {isUpdatingCookbook ? 'Updating...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Collaborator Dialog */}
      <Dialog open={showInviteCollaboratorDialog} onOpenChange={setShowInviteCollaboratorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Invite Collaborator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invite a friend to collaborate on "{currentSelectedCookbook?.name}". They will be able to add and remove recipes.
            </p>
            <Input
              type="email"
              placeholder="Collaborator's email address"
              value={collaboratorEmail}
              onChange={(e) => setCollaboratorEmail(e.target.value)}
              disabled={isInvitingCollaborator}
            />
            <Button onClick={handleInviteCollaborator} disabled={isInvitingCollaborator || !collaboratorEmail.trim()} className="w-full">
              {isInvitingCollaborator ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Collaborators Dialog */}
      <Dialog open={showManageCollaboratorsDialog} onOpenChange={setShowManageCollaboratorsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Manage Collaborators for "{cookbookToManageCollaborators?.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {canManageCollaborators && (
              <Button onClick={() => setShowInviteCollaboratorDialog(true)} className="w-full">
                <UserPlus className="h-4 w-4 mr-2" /> Invite New Collaborator
              </Button>
            )}
            <h3 className="font-semibold text-sm mt-4">Current Collaborators:</h3>
            {isLoadingCollaborators ? (
              <div className="text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                Loading collaborators...
              </div>
            ) : collaborators && collaborators.length > 0 ? (
              <div className="space-y-2">
                {collaborators.map(collab => (
                  <div key={collab.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{collab.users.username || collab.users.email}</span>
                      <Badge variant="secondary" className="text-xs">{collab.status}</Badge>
                      <Badge variant="outline" className="text-xs">{collab.role}</Badge>
                    </div>
                    {canManageCollaborators && collab.user_id !== user?.id && ( // Cannot remove self via this dialog
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Collaborator?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove "{collab.users.username || collab.users.email}" from "{cookbookToManageCollaborators?.name}"?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleRemoveCollaborator(collab.user_id, collab.users.username || collab.users.email)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No collaborators yet. Invite some!</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Recipes Dialog */}
      <Dialog open={showManageRecipesDialog} onOpenChange={setShowManageRecipesDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5" /> Manage Recipes in "{currentSelectedCookbook?.name}"
            </DialogTitle>
          </DialogHeader>
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
                  {recipesToDisplay.map(recipe => (
                    <SortableRecipeItem 
                      key={recipe.id} 
                      recipe={recipe} 
                      onClick={handleViewRecipeDetails}
                      onRemove={handleRemoveRecipe}
                      canRemove={canAddRemoveRecipes}
                    />
                  ))}
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
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CookbookManager;