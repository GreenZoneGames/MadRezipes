import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/use-toast'; // Import toast for notifications

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
  categorized_ingredients?: CategorizedIngredients; // Changed to snake_case
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string; // Changed to snake_case
  servings?: number;
  meal_type?: string; // Changed to snake_case
  cookbook_id?: string; // Changed to snake_case
}

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  user: User | null;
  cookbooks: Cookbook[];
  selectedCookbook: Cookbook | null;
  friends: Friend[];
  guestCookbooks: Cookbook[]; // New state for guest cookbooks
  guestRecipes: Recipe[]; // New state for guest recipes
  setGuestRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>; // Added to default context
  setSelectedCookbook: (cookbook: Cookbook | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string, securityQuestion?: string, securityAnswer?: string) => Promise<void>;
  signOut: () => Promise<void>;
  createCookbook: (name: string, description?: string) => Promise<Cookbook | null>;
  addFriend: (email: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  addRecipeToCookbook: (recipe: Recipe, cookbookId: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  syncGuestDataToUser: () => Promise<void>; // New function to sync guest data
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  user: null,
  cookbooks: [],
  selectedCookbook: null,
  friends: [],
  guestCookbooks: [],
  guestRecipes: [],
  setGuestRecipes: () => {}, // Dummy function added here
  setSelectedCookbook: () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  createCookbook: async () => null,
  addFriend: async () => {},
  removeFriend: async () => {},
  addRecipeToCookbook: async () => {},
  sendPasswordResetEmail: async () => {},
  syncGuestDataToUser: async () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [selectedCookbook, setSelectedCookbook] = useState<Cookbook | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [guestCookbooks, setGuestCookbooks] = useState<Cookbook[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('guestCookbooks');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [guestRecipes, setGuestRecipes] = useState<Recipe[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('guestRecipes');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guestCookbooks', JSON.stringify(guestCookbooks));
    }
  }, [guestCookbooks]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guestRecipes', JSON.stringify(guestRecipes));
    }
  }, [guestRecipes]);

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

  const syncGuestDataToUser = useCallback(async () => {
    if (!user || (guestCookbooks.length === 0 && guestRecipes.length === 0)) {
      return;
    }

    console.log('Syncing guest data to user account...');
    const cookbookIdMap: { [guestId: string]: string } = {};
    const newCookbooks: Cookbook[] = [];
    const newRecipes: Recipe[] = [];

    try {
      // 1. Insert guest cookbooks
      for (const guestCb of guestCookbooks) {
        const { data: newCb, error: cbError } = await supabase
          .from('cookbooks')
          .insert({ name: guestCb.name, description: guestCb.description, user_id: user.id })
          .select()
          .single();
        
        if (cbError) {
          console.error('Error inserting guest cookbook:', cbError);
          continue;
        }
        cookbookIdMap[guestCb.id] = newCb.id;
        newCookbooks.push(newCb);
      }

      // 2. Insert guest recipes
      for (const guestRecipe of guestRecipes) {
        const newCookbookId = guestRecipe.cookbook_id ? cookbookIdMap[guestRecipe.cookbook_id] : null;
        
        const { error: recipeError } = await supabase
          .from('recipes')
          .insert({
            user_id: user.id,
            cookbook_id: newCookbookId,
            title: guestRecipe.title,
            ingredients: guestRecipe.ingredients,
            instructions: guestRecipe.instructions,
            url: guestRecipe.url,
            image: guestRecipe.image,
            cook_time: guestRecipe.cook_time,
            servings: guestRecipe.servings,
            meal_type: guestRecipe.meal_type,
            categorized_ingredients: guestRecipe.categorized_ingredients,
          });
        
        if (recipeError) {
          console.error('Error inserting guest recipe:', recipeError);
          continue;
        }
        newRecipes.push(guestRecipe); // Just for logging/confirmation, actual data comes from DB reload
      }

      console.log(`Synced ${newCookbooks.length} cookbooks and ${newRecipes.length} recipes.`);
      
      // Clear guest data after successful sync
      setGuestCookbooks([]);
      setGuestRecipes([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('guestCookbooks');
        localStorage.removeItem('guestRecipes');
      }

      // Invalidate queries to refetch user's actual data from Supabase
      queryClient.invalidateQueries({ queryKey: ['cookbooks', user.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', user.id] });

    } catch (error) {
      console.error('Error syncing guest data:', error);
    }
  }, [user, guestCookbooks, guestRecipes, queryClient]);

  const checkUser = useCallback(async () => {
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
          // Sync guest data after user is set and their data is loaded
          if (guestCookbooks.length > 0 || guestRecipes.length > 0) {
            syncGuestDataToUser();
          }
        }
      } else {
        setUser(null);
        setCookbooks([]); // Clear Supabase cookbooks if logged out
        setFriends([]); // Clear Supabase friends if logged out
      }
    } catch (error) {
      console.error('Check user error:', error);
    }
  }, [guestCookbooks, guestRecipes, syncGuestDataToUser]);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      checkUser(); // Re-check user on auth state change
    });

    return () => subscription.unsubscribe();
  }, [checkUser]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // checkUser will handle setting user and syncing data
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username?: string, securityQuestion?: string, securityAnswer?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      
      if (data.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email.trim(),
            username: username?.trim(),
            security_question: securityQuestion,
            security_answer: securityAnswer?.trim()
          });
        
        if (insertError) {
          console.error('Error inserting user data:', insertError);
          // Even if insert fails, user is created in auth.users, so proceed
        }
      }
      // checkUser will handle setting user and syncing data
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
    setGuestCookbooks([]); // Clear guest data on explicit sign out
    setGuestRecipes([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('guestCookbooks');
      localStorage.removeItem('guestRecipes');
    }
  };

  const createCookbook = async (name: string, description?: string): Promise<Cookbook | null> => {
    if (!user) {
      // Guest mode: create in local storage
      const newGuestCookbook: Cookbook = {
        id: uuidv4(),
        name,
        description,
        user_id: 'guest', // Placeholder for guest user
      };
      setGuestCookbooks(prev => [...prev, newGuestCookbook]);
      return newGuestCookbook;
    }
    
    try {
      const { data, error } = await supabase
        .from('cookbooks')
        .insert({ name, description, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      setCookbooks(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Create cookbook error:', error);
      throw error;
    }
  };

  const addFriend = async (email: string) => {
    if (!user) return; // Friends always require a user
    
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
    if (!user) return; // Friends always require a user
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId)
        .eq('user_id', user.id); // Ensure user owns the friend relationship
      
      if (error) throw error;
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (error) {
      console.error('Remove friend error:', error);
      throw error;
    }
  };

  const addRecipeToCookbook = async (recipe: Recipe, cookbookId: string) => {
    if (!user) {
      // Guest mode: add to local storage
      const isDuplicate = guestRecipes.some(
        (r) => r.cookbook_id === cookbookId && r.title === recipe.title && r.url === recipe.url
      );

      if (isDuplicate) {
        toast({
          title: 'Duplicate Recipe',
          description: `"${recipe.title}" is already in this cookbook.`,
          variant: 'destructive',
        });
        return;
      }

      const newGuestRecipe: Recipe = {
        ...recipe,
        id: recipe.id || uuidv4(), // Ensure recipe has an ID
        cookbook_id: cookbookId,
      };
      setGuestRecipes(prev => [...prev, newGuestRecipe]);
      toast({
        title: 'Recipe Added!',
        description: `${recipe.title} has been added to your temporary cookbook. Sign in to save it permanently!`,
      });
      return;
    }
    
    try {
      // Check for duplicate in Supabase
      const { data: existingRecipes, error: fetchError } = await supabase
        .from('recipes')
        .select('id')
        .eq('user_id', user.id)
        .eq('cookbook_id', cookbookId)
        .eq('title', recipe.title)
        .eq('url', recipe.url);

      if (fetchError) throw fetchError;

      if (existingRecipes && existingRecipes.length > 0) {
        toast({
          title: 'Duplicate Recipe',
          description: `"${recipe.title}" is already in this cookbook.`,
          variant: 'destructive',
        });
        return;
      }

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
          cook_time: recipe.cook_time,
          servings: recipe.servings,
          meal_type: recipe.meal_type,
          categorized_ingredients: recipe.categorized_ingredients,
        })
        .select()
        .single();
      
      if (error) throw error;
      console.log('Recipe added to cookbook:', data);
      toast({
        title: 'Recipe Added!',
        description: `${recipe.title} has been added to your cookbook.`,
      });
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
        guestCookbooks,
        guestRecipes,
        setGuestRecipes,
        setSelectedCookbook,
        signIn,
        signUp,
        signOut,
        createCookbook,
        addFriend,
        removeFriend,
        addRecipeToCookbook,
        sendPasswordResetEmail,
        syncGuestDataToUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};