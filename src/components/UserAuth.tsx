import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, LogIn, UserPlus, HelpCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface UserAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const securityQuestions = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was your favorite food as a child?"
];

const UserAuth: React.FC<UserAuthProps> = ({ open, onOpenChange }) => {
  const { signIn, signUp } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    if (!isLogin && (!username.trim() || !securityQuestion || !securityAnswer.trim())) {
      toast({
        title: 'Registration Incomplete',
        description: 'Please fill in all registration fields including security question.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });
        
        if (error) throw error;
        
        toast({
          title: '🍽️ Welcome back!',
          description: 'Successfully signed in to MadRezipes.'
        });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              username: username.trim(),
              security_question: securityQuestion,
              security_answer: securityAnswer.trim()
            }
          }
        });
        
        if (error) throw error;
        
        if (data.user) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: email.trim(),
              username: username.trim(),
              security_question: securityQuestion,
              security_answer: securityAnswer.trim()
            });
          
          if (insertError) {
            console.error('Error inserting user data:', insertError);
          }
        }
        
        toast({
          title: '🎉 Account created!',
          description: 'Welcome to MadRezipes! Start building your recipe collection.'
        });
      }
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: isLogin ? 'Sign in failed' : 'Registration failed',
        description: error.message || 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setShowPasswordReset(false);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {isLogin ? 'Sign In to MadRezipes' : 'Join MadRezipes'}
          </DialogTitle>
        </DialogHeader>
        
        {!showPasswordReset ? (
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            
            {!isLogin && (
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            )}
            
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              disabled={loading}
            />
            
            {!isLogin && (
              <>
                <Select value={securityQuestion} onValueChange={setSecurityQuestion} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a security question" />
                  </SelectTrigger>
                  <SelectContent>
                    {securityQuestions.map((question, index) => (
                      <SelectItem key={index} value={question}>
                        {question}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input
                  type="text"
                  placeholder="Security answer"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  disabled={loading}
                />
              </>
            )}
            
            <Button 
              onClick={handleAuth} 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
            
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                onClick={switchMode}
                className="w-full"
                disabled={loading}
              >
                {isLogin ? 'Need an account? Register' : 'Have an account? Sign In'}
              </Button>
              
              {isLogin && (
                <Button
                  variant="ghost"
                  onClick={() => setShowPasswordReset(true)}
                  className="w-full text-sm"
                  disabled={loading}
                >
                  <HelpCircle className="h-4 w-4 mr-1" />
                  Forgot Password?
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your email and answer your security question to reset your password.
            </p>
            
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            
            <Select value={securityQuestion} onValueChange={setSecurityQuestion} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select your security question" />
              </SelectTrigger>
              <SelectContent>
                {securityQuestions.map((question, index) => (
                  <SelectItem key={index} value={question}>
                    {question}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="text"
              placeholder="Security answer"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              disabled={loading}
            />
            
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            
            <Button 
              onClick={() => {
                toast({
                  title: '🔒 Password Reset',
                  description: 'Password reset functionality will be implemented with backend integration.'
                });
              }}
              className="w-full" 
              disabled={loading}
            >
              Reset Password
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setShowPasswordReset(false)}
              className="w-full"
              disabled={loading}
            >
              Back to Sign In
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserAuth;