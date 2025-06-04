import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components
import { MessageCircle, Send, Users } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import ThreadedMessage from './ThreadedMessage';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for temporary IDs

interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  recipient_id: string;
  parent_message_id?: string;
  thread_id?: string;
  message_type: 'text' | 'recipe';
  content: string;
  recipe_data?: any;
  created_at: string;
  read: boolean;
  replies?: Message[];
}

interface MessageInboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipeAdded: (recipe: any) => void; // Add this prop
}

const MessageInbox: React.FC<MessageInboxProps> = ({ open, onOpenChange, onRecipeAdded }) => {
  const { user, friends } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([]);
  // Removed loading state
  const [showCompose, setShowCompose] = useState(false);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [selectedFriend, setSelectedFriend] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
        .is('parent_message_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const messagesWithReplies = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: replies } = await supabase
            .from('messages')
            .select('*')
            .eq('thread_id', msg.thread_id || msg.id)
            .not('id', 'eq', msg.id)
            .order('created_at', { ascending: true });
          
          return { ...msg, replies: replies || [] };
        })
      );
      
      setMessages(messagesWithReplies);
    } catch (error: any) {
      toast({
        title: 'Error loading messages',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId)
        .eq('recipient_id', user?.id);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessageContent.trim() || !selectedFriend) return;
    
    setSending(true);
    const tempId = uuidv4();
    const newMsg: Message = {
      id: tempId,
      sender_id: user.id,
      sender_username: user.username || user.email?.split('@')[0] || 'User',
      recipient_id: selectedFriend,
      content: newMessageContent.trim(),
      message_type: 'text',
      created_at: new Date().toISOString(),
      read: false,
      replies: []
    };

    setMessages(prev => [newMsg, ...prev]);
    setNewMessageContent('');
    setSelectedFriend('');
    setShowCompose(false);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          sender_username: newMsg.sender_username,
          recipient_id: selectedFriend,
          content: newMsg.content,
          message_type: 'text',
          read: false
        });
      
      if (error) {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        throw error;
      }
      
      toast({
        title: 'Message sent!',
        description: 'Your message has been sent successfully.'
      });
    } catch (error: any) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!user) return;
    
    const parentMessage = messages.find(m => m.id === parentId);
    if (!parentMessage) return;
    
    const replyRecipientId = parentMessage.sender_id;
    const tempReplyId = uuidv4();
    const newReply: Message = {
      id: tempReplyId,
      sender_id: user.id,
      sender_username: user.username || user.email?.split('@')[0] || 'User',
      recipient_id: replyRecipientId,
      parent_message_id: parentId,
      thread_id: parentMessage.thread_id || parentId,
      content,
      message_type: 'text',
      created_at: new Date().toISOString(),
      read: false,
    };

    setMessages(prevMessages => prevMessages.map(msg => 
      msg.id === parentId 
        ? { ...msg, replies: [...(msg.replies || []), newReply] } 
        : msg
    ));

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          sender_username: newReply.sender_username,
          recipient_id: replyRecipientId,
          parent_message_id: parentId,
          thread_id: parentMessage.thread_id || parentId,
          content,
          message_type: 'text'
        });
      
      if (error) {
        setMessages(prevMessages => prevMessages.map(msg => 
          msg.id === parentId 
            ? { ...msg, replies: (msg.replies || []).filter(reply => reply.id !== tempReplyId) } 
            : msg
        ));
        throw error;
      }
      
      toast({
        title: 'Reply sent!',
        description: 'Your reply has been sent successfully.'
      });
    } catch (error: any) {
      toast({
        title: 'Error sending reply',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchMessages();
    }
  }, [open, user]);

  const unreadCount = messages.filter(msg => !msg.read && msg.recipient_id === user?.id).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
            </div>
            <Button
              size="sm"
              onClick={() => setShowCompose(!showCompose)}
              className="flex items-center gap-1"
            >
              <Send className="h-4 w-4" />
              New Message
            </Button>
          </div>
        </DialogHeader>
        
        {showCompose && (
          <div className="space-y-3 p-4 border rounded-lg bg-card border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Send to:</label>
              <Select value={selectedFriend} onValueChange={setSelectedFriend}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a friend..." />
                </SelectTrigger>
                <SelectContent>
                  {friends.filter(f => f.status === 'accepted').map(friend => (
                    <SelectItem key={friend.id} value={friend.friend_id === user?.id ? friend.user_id : friend.friend_id}>
                      {friend.username || friend.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Write your message..."
              value={newMessageContent}
              onChange={(e) => setNewMessageContent(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button
                onClick={sendMessage}
                disabled={sending || !newMessageContent.trim() || !selectedFriend}
              >
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCompose(false);
                  setNewMessageContent('');
                  setSelectedFriend('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        <div className="space-y-3 min-h-[200px]">
          {messages.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-xs">Start a conversation with your friends!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} onClick={() => !message.read && message.recipient_id === user?.id && markAsRead(message.id)}>
                <ThreadedMessage
                  message={message}
                  onReply={handleReply}
                  onRecipeAdded={onRecipeAdded} // Pass the prop
                />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageInbox;