import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  username?: string;
}

interface Cookbook {
  id: string;
  name: string;
  description?: string;
  user_id: string;
}

interface Friend {
  id: string;
  email: string;
  status: 'pending' | 'accepted';
}

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
  categorizedIngredients?: CategorizedIngredients;
  instructions: string[];
  url: string;
  image?: string;
  cookTime?: string;
  servings?: number;
  mealType?: string;
  cookbookId?: string; // Added cookbookId
}

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  user: User | null;
  cookbooks: Cookbook[];
  selectedCookbook: Cookbook | null;
  friends: Friend[];
  setSelectedCookbook: (cookbook: Cookbook | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string, securityQuestion?: string, securityAnswer?: string) => Promise<void>;
  signOut: () => Promise<void>;
  createCookbook: (name: string, description?: string) => Promise<void>;
  addFriend: (email: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  shareRecipe: (recipeId: string, friendId: string) => Promise<void>;
  addRecipeToCookbook: (recipe: Recipe, cookbookId: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>; // New function
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  user: null,
  cookbooks: [],
  selectedCookbook: null,
  friends: [],
  setSelectedCookbook: () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  createCookbook: async () => {},
  addFriend: async () => {},
  removeFriend: async () => {},
  shareRecipe: async () => {},
  addRecipeToCookbook: async () => {},
  sendPasswordResetEmail: async () => {}, // Default for new function
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [selectedCookbook, setSelectedCookbook] = useState<Cookbook | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();
        
        if (userData) {
          setUser(userData);
          loadCookbooks(userData.id);
          loadFriends(userData.id);
        }
      }
    } catch (error) {
      console.error('Check user error:', error);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userError) {
        // Create user record if it doesn't exist
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ email })
          .select()
          .single();
        if (createError) throw createError;
        setUser(newUser);
        loadCookbooks(newUser.id);
      } else {
        setUser(userData);
        loadCookbooks(userData.id);
        loadFriends(userData.id);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username?: string, securityQuestion?: string, securityAnswer?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({ 
          email, 
          username,
          security_question: securityQuestion,
          security_answer: securityAnswer
        })
        .select()
        .single();
      
      if (userError) throw userError;
      setUser(userData);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCookbooks([]);
    setSelectedCookbook(null);
    setFriends([]);
  };

  const loadCookbooks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('cookbooks')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      setCookbooks(data || []);
    } catch (error) {
      console.error('Load cookbooks error:', error);
    }
  };

  const loadFriends = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      console.error('Load friends error:', error);
    }
  };

  const createCookbook = async (name: string, description?: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('cookbooks')
        .insert({ name, description, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      setCookbooks(prev => [...prev, data]);
    } catch (error) {
      console.error('Create cookbook error:', error);
    }
  };

  const addFriend = async (email: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('friends')
        .insert({ user_id: user.id, email, status: 'pending' })
        .select()
        .single();
      
      if (error) throw error;
      setFriends(prev => [...prev, data]);
    } catch (error) {
      console.error('Add friend error:', error);
      throw error;
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);
      
      if (error) throw error;
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (error) {
      console.error('Remove friend error:', error);
      throw error;
    }
  };

  const shareRecipe = async (recipeId: string, friendId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('shared_recipes')
        .insert({ recipe_id: recipeId, shared_by: user.id, shared_with: friendId });
      
      if (error) throw error;
    } catch (error) {
      console.error('Share recipe error:', error);
      throw error;
    }
  };

  const addRecipeToCookbook = async (recipe: Recipe, cookbookId: string) => {
    if (!user) throw new Error('User not authenticated.');
    
    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          cookbook_id: cookbookId,
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          url: recipe.url,
          image: recipe.image,
          cook_time: recipe.cookTime,
          servings: recipe.servings,
          meal_type: recipe.mealType,
          categorized_ingredients: recipe.categorizedIngredients,
        })
        .select()
        .single();
      
      if (error) throw error;
      console.log('Recipe added to cookbook:', data);
    } catch (error) {
      console.error('Error adding recipe to cookbook:', error);
      throw error;
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error) {
      console.error('Password reset email error:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        user,
        cookbooks,
        selectedCookbook,
        friends,
        setSelectedCookbook,
        signIn,
        signUp,
        signOut,
        createCookbook,
        addFriend,
        removeFriend,
        shareRecipe,
        addRecipeToCookbook,
        sendPasswordResetEmail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};