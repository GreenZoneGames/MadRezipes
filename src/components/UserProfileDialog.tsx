import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, LogOut, Mail, Edit, Save, BookOpen, Heart, Loader2, Globe, Lock, Trash2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const profileSchema = z.object({
  username: z.string().min(1, { message: 'Username is required.' }).optional().or(z.literal('')),
  avatar_url: z.string().url({ message: 'Must be a valid URL.' }).optional().or(z.literal('')),
  bio: z.string().max(200, { message: 'Bio cannot exceed 200 characters.' }).optional().or(z.literal('')),
  favorite_recipe_id: z.string().optional().or(z.literal('')),
});

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ open, onOpenChange }) => {
  const { user, signOut, cookbooks, updateUserProfile, updateCookbookPrivacy, deleteCookbook } = useAppContext();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      avatar_url: user?.avatar_url || '',
      bio: user?.bio || '',
      favorite_recipe_id: user?.favorite_recipe_id || '',
    },
  });

  const { data: userRecipes, isLoading: isLoadingUserRecipes } = useQuery({
    queryKey: ['userRecipes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isEditingProfile,
  });

  // Effect 1: Populate form data when dialog opens or user data changes
  useEffect(() => {
    if (open && user) {
      form.reset({
        username: user.username || '',
        avatar_url: user.avatar_url || '',
        bio: user.bio || '',
        favorite_recipe_id: user.favorite_recipe_id || '',
      });
    }
  }, [open, user, form]);

  // Effect 2: Ensure dialog starts in view mode when it opens
  useEffect(() => {
    if (open) {
      setIsEditingProfile(false);
    }
  }, [open]);


  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: '👋 Goodbye!',
        description: 'Successfully signed out of MadRezipes.'
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Sign out failed',
        description: error.message || 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSaveProfile = async (values: z.infer<typeof profileSchema>) => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateUserProfile({
        username: values.username || null,
        avatar_url: values.avatar_url || null,
        bio: values.bio || null,
        favorite_recipe_id: values.favorite_recipe_id || null,
      });
      toast({
        title: 'Profile Updated!',
        description: 'Your profile has been successfully updated.'
      });
      setIsEditingProfile(false); // Exit editing mode on save
    } catch (error: any) {
      toast({
        title: 'Profile Update Failed',
        description: error.message || 'An error occurred while updating your profile.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCookbookPrivacyChange = async (cookbookId: string, isPublic: boolean) => {
    try {
      await updateCookbookPrivacy(cookbookId, isPublic);
      toast({
        title: 'Cookbook Privacy Updated',
        description: `Cookbook privacy set to ${isPublic ? 'Public' : 'Private'}.`
      });
    } catch (error: any) {
      toast({
        title: 'Privacy Update Failed',
        description: error.message || 'Failed to update cookbook privacy.',
        variant: 'destructive'
      });
    }
  };

  // Removed handleDeleteCookbook from here. It should be managed in CookbookManager/CookbookDetailsDialog.

  if (!user) {
    return null;
  }

  const displayName = user.username || user.email?.split('@')[0] || 'User';
  const favoriteRecipe = userRecipes?.find(r => r.id === user.favorite_recipe_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {!isEditingProfile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={displayName} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-xl text-foreground">{displayName}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </p>
                  {user.bio && (
                    <p className="text-sm text-muted-foreground mt-2 italic">"{user.bio}"</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>

              {favoriteRecipe && (
                <div className="p-3 bg-card rounded-lg border border-border flex items-center gap-3">
                  <Heart className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">Favorite Recipe:</p>
                    <p className="text-muted-foreground text-sm">{favoriteRecipe.title}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Your Cookbooks
                </h3>
                {cookbooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No cookbooks created yet.</p>
                ) : (
                  <div className="space-y-2">
                    {cookbooks.map(cb => (
                      <div key={cb.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="flex-1">
                          <p className="font-medium">{cb.name}</p>
                          <p className="text-xs text-muted-foreground">{cb.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`cookbook-privacy-${cb.id}`} className="text-sm text-muted-foreground">
                            {cb.is_public ? 'Public' : 'Private'}
                          </Label>
                          <Switch
                            id={`cookbook-privacy-${cb.id}`}
                            checked={cb.is_public}
                            onCheckedChange={(checked) => handleCookbookPrivacyChange(cb.id, checked)}
                          />
                          {/* Removed AlertDialog for deleting cookbook from here */}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(handleSaveProfile)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...form.register('username')} />
                {form.formState.errors.username && <p className="text-destructive text-sm">{form.formState.errors.username.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input id="avatar_url" {...form.register('avatar_url')} placeholder="https://example.com/avatar.jpg" />
                {form.formState.errors.avatar_url && <p className="text-destructive text-sm">{form.formState.errors.avatar_url.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" {...form.register('bio')} placeholder="Tell us about yourself..." rows={3} />
                {form.formState.errors.bio && <p className="text-destructive text-sm">{form.formState.errors.bio.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="favorite_recipe">Favorite Recipe</Label>
                <Select
                  value={form.watch('favorite_recipe_id') || ''}
                  onValueChange={(value) => form.setValue('favorite_recipe_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your favorite recipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingUserRecipes ? (
                      <SelectItem value="loading" disabled>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading recipes...
                      </SelectItem>
                    ) : userRecipes && userRecipes.length > 0 ? (
                      userRecipes.map(recipe => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-recipes" disabled>No recipes found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.favorite_recipe_id && <p className="text-destructive text-sm">{form.formState.errors.favorite_recipe_id.message}</p>}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSavingProfile}>
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Save Changes
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditingProfile(false)} disabled={isSavingProfile}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
          
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