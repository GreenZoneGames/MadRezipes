import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Globe, Lock, Save, Loader2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface Cookbook {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  is_public: boolean;
}

interface EditCookbookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cookbook: Cookbook | null;
}

const EditCookbookDialog: React.FC<EditCookbookDialogProps> = ({ open, onOpenChange, cookbook }) => {
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  const [editingCookbookName, setEditingCookbookName] = useState('');
  const [editingCookbookDescription, setEditingCookbookDescription] = useState('');
  const [editingCookbookIsPublic, setEditingCookbookIsPublic] = useState(false);
  const [isUpdatingCookbook, setIsUpdatingCookbook] = useState(false);

  useEffect(() => {
    if (open && cookbook) {
      setEditingCookbookName(cookbook.name);
      setEditingCookbookDescription(cookbook.description || '');
      setEditingCookbookIsPublic(cookbook.is_public);
    }
  }, [open, cookbook]);

  const handleUpdateCookbook = async () => {
    if (!cookbook || !user) return;
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
        .eq('id', cookbook.id)
        .eq('user_id', user.id); // Ensure user owns the cookbook

      if (error) throw error;

      toast({
        title: 'Cookbook Updated!',
        description: `"${editingCookbookName}" has been updated.`
      });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['cookbooks', user.id] });
      queryClient.invalidateQueries({ queryKey: ['publicRecipes'] }); // Invalidate public recipes if privacy changed
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Cookbook</DialogTitle>
        </DialogHeader>
        {cookbook && (
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
              onChange={(e) => setEditingCookbookDescription(e.target.value)}
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
              {isUpdatingCookbook ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditCookbookDialog;