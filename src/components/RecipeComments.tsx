import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Send, User, Clock, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/contexts/AppContext';

interface Comment {
  id: string;
  recipe_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users: { // Joined user data
    username: string;
    email: string;
    avatar_url?: string;
  };
}

interface RecipeCommentsProps {
  recipeId: string;
  isRecipePublic: boolean; // Indicates if the parent cookbook is public
}

const RecipeComments: React.FC<RecipeCommentsProps> = ({ recipeId, isRecipePublic }) => {
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  const [newCommentContent, setNewCommentContent] = useState('');

  const { data: comments, isLoading, error } = useQuery<Comment[]>({
    queryKey: ['recipeComments', recipeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users(username, email, avatar_url)
        `)
        .eq('recipe_id', recipeId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('You must be logged in to comment.');
      const { data, error } = await supabase
        .from('comments')
        .insert({
          recipe_id: recipeId,
          user_id: user.id,
          content: content,
        })
        .select(`
          *,
          users(username, email, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as Comment;
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData<Comment[]>(['recipeComments', recipeId], (oldComments) => {
        return oldComments ? [...oldComments, newComment] : [newComment];
      });
      setNewCommentContent('');
      toast({ title: 'Comment added!', description: 'Your comment has been posted.' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to add comment', description: err.message, variant: 'destructive' });
    },
  });

  const handleAddComment = () => {
    if (!newCommentContent.trim()) {
      toast({ title: 'Empty comment', description: 'Please write something before posting.', variant: 'destructive' });
      return;
    }
    addCommentMutation.mutate(newCommentContent.trim());
  };

  const canComment = user && (isRecipePublic || (user && user.id === comments?.[0]?.users?.id)); // Only allow commenting if logged in and recipe is public or user owns it

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading comments...
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
          {comments.map((comment) => (
            <Card key={comment.id} className="p-3 bg-muted/30 border-border/50">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 mb-2">
                  {comment.users?.avatar_url ? (
                    <img src={comment.users.avatar_url} alt={comment.users.username || comment.users.email} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                      {comment.users?.username?.charAt(0).toUpperCase() || comment.users?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="font-semibold text-sm">{comment.users?.username || comment.users?.email?.split('@')[0] || 'Anonymous'}</span>
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-foreground">{comment.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground text-sm py-4">No comments yet. Be the first to share your thoughts!</p>
      )}

      {user ? (
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Add a comment..."
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            disabled={addCommentMutation.isPending}
          />
          <Button onClick={handleAddComment} disabled={addCommentMutation.isPending || !newCommentContent.trim()}>
            {addCommentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <p className="text-center text-muted-foreground text-sm mt-4">Sign in to leave a comment.</p>
      )}
    </div>
  );
};

export default RecipeComments;