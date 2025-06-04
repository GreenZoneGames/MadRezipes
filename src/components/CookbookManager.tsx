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

import CookbookDetailsDialog from './CookbookDetailsDialog'; // Import the new dialog

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
  setSelectedCookbook: (cookbook: Cookbook | null) => void; // Added setSelectedCookbook
  onRecipeAdded: (recipe: Recipe) => void; // Add this prop
}

// Sortable Item Component (kept for potential future use or if DND is needed elsewhere)
const SortableRecipeItem: React.FC<{ recipe: Recipe; onClick: (recipe: Recipe) => void; onRemove: (id: string) => void; canRemove: boolean; onRecipeAdded: (recipe: Recipe) => void; }> = ({ recipe, onClick, onRemove, canRemove, onRecipeAdded }) => {
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


const CookbookManager: React.FC<CookbookManagerProps> = ({ onRecipeRemoved, setActiveTab, setSelectedCookbook, onRecipeAdded }) => {
  const { user, cookbooks, selectedCookbook, createCookbook, guestCookbooks, guestRecipes, setGuestRecipes, syncGuestDataToUser, updateCookbookPrivacy, deleteCookbook, copyCookbook, cookbookInvitations, acceptCookbookInvitation, rejectCookbookInvitation, inviteCollaborator, removeCollaborator, updateRecipeOrder } = useAppContext();
  const queryClient = useQueryClient();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState('');
  const [newCookbookDescription, setNewCookbookDescription] = useState('');
  const [newCookbookIsPublic, setNewCookbookIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  // Removed selectedCookbookIds state as bulk delete is removed

  const [showCookbookDetailsDialog, setShowCookbookDetailsDialog] = useState(false); // New state for CookbookDetailsDialog

  const uniqueCookbooks = Array.from(new Map(
    (user ? cookbooks : guestCookbooks).map(cb => [cb.id, cb])
  ).values());

  // Use selectedCookbook from context, or default to the first unique cookbook
  const currentSelectedCookbook = selectedCookbook || (uniqueCookbooks.length > 0 ? uniqueCookbooks[0] : null);

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
        setSelectedCookbook(newCb); // Set as selected immediately
        setShowCookbookDetailsDialog(true); // Open details for the new cookbook
      }
    } catch (error: any) {
      console.error('Creation Failed:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Removed handleDeleteCookbook and handleBulkDeleteCookbooks as they are now handled in CookbookDetailsDialog

  const handleSaveToAccount = () => {
    if (!user) {
      setShowAuthDialog(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
  };

  // Removed toggleCookbookSelection and toggleSelectAllCookbooks

  const handleSelectCookbookAndOpenDetails = (cookbookId: string) => {
    const cookbook = uniqueCookbooks.find(c => c.id === cookbookId);
    if (cookbook) {
      setSelectedCookbook(cookbook);
      setShowCookbookDetailsDialog(true);
    }
  };

  return (
    <Card className="hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Cookbooks
          </div>
          <div className="flex items-center gap-2">
            {!user && guestCookbooks.length > 0 && (
              <Button size="sm" onClick={handleSaveToAccount} className="bg-primary hover:bg-primary/90">
                <Save className="h-4 w-4 mr-1" />
                Save to Account
              </Button>
            )}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
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
              <h3 className="font-semibold text-sm flex items-center gap-1 text-primary">
                <UserPlus className="h-4 w-4" /> Cookbook Invitations ({cookbookInvitations.length})
              </h3>
              {cookbookInvitations.map(invite => (
                <div key={invite.id} className="flex items-center justify-between p-2 border rounded bg-primary/5">
                  <span className="text-sm font-medium">
                    "{invite.cookbook_name}" from {invite.invited_by_username}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acceptCookbookInvitation(invite.id)}
                      className="text-primary hover:text-primary/80 border-primary/50"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rejectCookbookInvitation(invite.id)}
                      className="text-destructive hover:text-destructive/80 border-destructive/50"
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
            onValueChange={handleSelectCookbookAndOpenDetails} // Directly open details on select
          >
            <SelectTrigger>
              <SelectValue>
                {currentSelectedCookbook ? (
                  <span className="flex items-center gap-2">
                    {currentSelectedCookbook.is_public ? (
                      <Globe className="h-4 w-4 text-primary" />
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
                    <Badge variant="outline" className="text-xs bg-primary/20 text-primary">Owner</Badge>
                  )}
                  {currentSelectedCookbook?.is_collaborator && (
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700">Collaborator</Badge>
                  )}
                </h4>
                <div className="flex items-center gap-2">
                  {/* Buttons for editing, managing collaborators, etc. will be in CookbookDetailsDialog */}
                </div>
              </div>
              {currentSelectedCookbook?.description && (
                <p className="text-sm text-muted-foreground">
                  {currentSelectedCookbook.description}
                </p>
              )}

              {/* Removed bulk select and delete */}
              
              {currentSelectedCookbook && (
                <Button 
                  onClick={() => setShowCookbookDetailsDialog(true)} // Explicitly open dialog
                  className="w-full mt-4 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600"
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

      <CookbookDetailsDialog
        open={showCookbookDetailsDialog}
        onOpenChange={setShowCookbookDetailsDialog}
        cookbook={currentSelectedCookbook}
        onRecipeRemoved={onRecipeRemoved}
        setActiveTab={setActiveTab}
        onRecipeAdded={onRecipeAdded} // Pass the mandatory prop
      />
    </Card>
  );
};

export default CookbookManager;