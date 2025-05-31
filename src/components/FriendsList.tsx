import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, Share2, Trash2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

interface Friend {
  id: string;
  email: string;
  status: 'pending' | 'accepted';
}

const FriendsList: React.FC = () => {
  const { user, friends, addFriend, removeFriend } = useAppContext();
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send friend request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await removeFriend(friendId);
      toast({
        title: 'Friend Removed',
        description: 'Friend has been removed from your list'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove friend',
        variant: 'destructive'
      });
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Sign in to manage friends</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Friends ({friends.length})
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
        
        <div className="space-y-2">
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No friends yet. Add some to share recipes!
            </p>
          ) : (
            friends.map(friend => (
              <div key={friend.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{friend.email}</span>
                  <Badge variant={friend.status === 'accepted' ? 'default' : 'secondary'} className="text-xs">
                    {friend.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFriend(friend.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FriendsList;