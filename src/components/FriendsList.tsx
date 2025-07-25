import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, Share2, Trash2, Check, X, MessageSquare, Loader2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { supabase } from '@/lib/supabase'; // Import supabase

interface Friend {
  id: string;
  user_id: string; // The ID of the user who sent the request
  friend_id: string; // The ID of the user who received the request
  email: string; // The email of the friend (the other user in the relationship)
  status: 'pending' | 'accepted';
  username?: string; // Add username for display
}

interface UserProfile {
  id: string;
  email: string;
  username?: string;
}

interface FriendsListProps {
  onOpenDm: (recipientId: string, recipientUsername: string) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ onOpenDm }) => {
  const { user, friends, addFriend, removeFriend, acceptFriendRequest, rejectFriendRequest } = useAppContext();
  const [friendEmail, setFriendEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddFriend = async () => {
    if (!friendEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter a friend\'s email address',
        variant: 'destructive'
      });
      return;
    }

    if (friendEmail.trim() === user?.email) {
      toast({
        title: 'Invalid Email',
        description: 'You cannot add yourself as a friend',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await addFriend(friendEmail.trim());
      setFriendEmail('');
      toast({
        title: 'Friend Request Sent',
        description: `Invitation sent to ${friendEmail.trim()}`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendEmail: string) => {
    try {
      await removeFriend(friendshipId);
      toast({
        title: 'Friend Removed',
        description: `${friendEmail} has been removed from your list`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleAcceptRequest = async (requestId: string, friendUserId: string, friendEmail: string) => {
    try {
      await acceptFriendRequest(requestId, friendUserId);
      toast({
        title: 'Friend Request Accepted',
        description: `You are now friends with ${friendEmail}!`
      });
    } catch (error: any) {
      toast({
        title: 'Error Accepting Request',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleRejectRequest = async (requestId: string, friendEmail: string) => {
    try {
      await rejectFriendRequest(requestId);
      toast({
        title: 'Friend Request Rejected',
        description: `You have declined the request from ${friendEmail}.`
      });
    } catch (error: any) {
      toast({
        title: 'Error Rejecting Request',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Fetch suggested friends
  const { data: suggestedUsers, isLoading: isLoadingSuggestions } = useQuery<UserProfile[]>({
    queryKey: ['suggestedUsers', user?.id, friends], // Re-fetch when user or friends list changes
    queryFn: async () => {
      if (!user) return [];

      // Get IDs of users who are already friends (or have pending requests) with the current user
      const existingFriendIds = new Set<string>();
      friends.forEach(f => {
        if (f.user_id === user.id) {
          existingFriendIds.add(f.friend_id);
        } else if (f.friend_id === user.id) {
          existingFriendIds.add(f.user_id);
        }
      });
      existingFriendIds.add(user.id); // Exclude current user itself

      let query = supabase
        .from('users')
        .select('id, email, username')
        .order('created_at', { ascending: false })
        .limit(5); // Limit to 5 suggestions

      if (existingFriendIds.size > 0) {
        query = query.not('id', 'in', Array.from(existingFriendIds));
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!user, // Only fetch if user is logged in
  });

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Sign in to manage friends</p>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = friends.filter(f => f.status === 'pending' && f.friend_id === user.id);
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const sentPendingRequests = friends.filter(f => f.status === 'pending' && f.user_id === user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Friends ({acceptedFriends.length})
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingRequests.length} New Request{pendingRequests.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Friend's email"
            value={friendEmail}
            onChange={(e) => setFriendEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
          />
          <Button onClick={handleAddFriend} disabled={loading} size="sm">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
        
        {pendingRequests.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h3 className="font-semibold text-sm flex items-center gap-1">
              <UserPlus className="h-4 w-4 text-primary" />
              Incoming Requests
            </h3>
            {pendingRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between p-2 border rounded bg-primary/5">
                <span className="text-sm font-medium">{request.email}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAcceptRequest(request.id, request.user_id, request.email)}
                    className="text-primary hover:text-primary/80 border-primary/50"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRejectRequest(request.id, request.email)}
                    className="text-destructive hover:text-destructive/80 border-destructive/50"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sentPendingRequests.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h3 className="font-semibold text-sm flex items-center gap-1">
              <Share2 className="h-4 w-4 text-blue-500" />
              Sent Requests
            </h3>
            {sentPendingRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between p-2 border rounded bg-blue-50/50">
                <span className="text-sm font-medium">{request.email}</span>
                <Badge variant="secondary" className="text-xs">
                  Pending
                </Badge>
              </div>
            ))}
          </div>
        )}
        
        <div className="space-y-2 border-t pt-4">
          <h3 className="font-semibold text-sm flex items-center gap-1">
            <Users className="h-4 w-4 text-primary" />
            My Friends
          </h3>
          {acceptedFriends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No friends yet. Add some to share recipes!
            </p>
          ) : (
            acceptedFriends.map(friend => (
              <div key={friend.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{friend.username || friend.email}</span>
                  <Badge variant="default" className="text-xs bg-primary/20 text-primary">
                    Accepted
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenDm(friend.friend_id === user.id ? friend.user_id : friend.friend_id, friend.username || friend.email)}
                    className="text-blue-600 hover:text-blue-800 border-blue-300"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFriend(friend.id, friend.email)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Friend Suggestions Section */}
        <div className="space-y-2 border-t pt-4">
          <h3 className="font-semibold text-sm flex items-center gap-1">
            <UserPlus className="h-4 w-4 text-primary" />
            Friend Suggestions
          </h3>
          {isLoadingSuggestions ? (
            <div className="text-center py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading suggestions...
            </div>
          ) : suggestedUsers && suggestedUsers.length > 0 ? (
            <div className="space-y-2">
              {suggestedUsers.map(suggestedUser => (
                <div key={suggestedUser.id} className="flex items-center justify-between p-2 border rounded bg-primary/5">
                  <span className="text-sm font-medium">{suggestedUser.username || suggestedUser.email}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddFriend(suggestedUser.email)}
                    disabled={loading}
                    className="text-primary hover:text-primary/80 border-primary/50"
                  >
                    <UserPlus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No new friend suggestions at the moment.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FriendsList;