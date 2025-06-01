import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form'; // Corrected import
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, BookOpen, Save, UtensilsCrossed } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

// Define the Zod schema for form validation
const formSchema = z.object({
  title: z.string().min(1, { message: 'Recipe title is required.' }),
  ingredients: z.string().min(1, { message: 'Ingredients are required (one per line or comma-separated).' }),
  instructions: z.string().min(1, { message: 'Instructions are required.' }),
  url: z.string().url({ message: 'Must be a valid URL.' }).optional().or(z.literal('')),
  image: z.string().url({ message: 'Must be a valid image URL.' }).optional().or(z.literal('')),
  cookTime: z.string().optional(),
  servings: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().int().positive({ message: 'Servings must be a positive number.' }).optional()
  ),
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Appetizer', 'Dessert', 'Snack']).optional().or(z.literal('')),
  cookbookId: z.string().min(1, { message: 'Please select a cookbook.' }),
});

interface ManualRecipeFormProps {
  onRecipeAdded: (recipe: any) => void;
}

const ManualRecipeForm: React.FC<ManualRecipeFormProps> = ({ onRecipeAdded }) => {
  const { user, cookbooks, guestCookbooks, createCookbook, addRecipeToCookbook } = useAppContext();
  const [showCreateCookbookDialog, setShowCreateCookbookDialog] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState('');
  const [newCookbookDescription, setNewCookbookDescription] = useState('');
  const [newCookbookIsPublic, setNewCookbookIsPublic] = useState(false);
  const [creatingCookbook, setCreatingCookbook] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allAvailableCookbooks = useMemo(() => {
    const combined = [...cookbooks, ...guestCookbooks];
    const uniqueMap = new Map<string, typeof combined[0]>();
    combined.forEach(cb => uniqueMap.set(cb.id, cb));
    return Array.from(uniqueMap.values());
  }, [user, cookbooks, guestCookbooks]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      ingredients: '',
      instructions: '',
      url: '',
      image: '',
      cookTime: '',
      servings: undefined,
      mealType: '',
      cookbookId: '',
    },
  });

  const handleCreateNewCookbook = async () => {
    if (!newCookbookName.trim()) {
      toast({ title: 'Name Required', description: 'Please enter a name for the new cookbook.', variant: 'destructive' });
      return;
    }
    setCreatingCookbook(true);
    try {
      const newCookbook = await createCookbook(newCookbookName.trim(), newCookbookDescription.trim(), newCookbookIsPublic);
      setNewCookbookName('');
      setNewCookbookDescription('');
      toast({ title: 'Cookbook Created!', description: `"${newCookbookName}" has been created.` });
      if (newCookbook) {
        form.setValue('cookbookId', newCookbook.id); // Automatically select the new cookbook
      }
      setShowCreateCookbookDialog(false);
    } catch (error: any) {
      toast({ title: 'Creation Failed', description: error.message || 'Failed to create cookbook.', variant: 'destructive' });
    } finally {
      setCreatingCookbook(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const recipeData = {
        id: uuidv4(), // Generate a unique ID for the recipe
        title: values.title,
        ingredients: values.ingredients.split('\n').map(s => s.trim()).filter(Boolean),
        instructions: values.instructions.split('\n').map(s => s.trim()).filter(Boolean),
        url: values.url || null,
        image: values.image || null,
        cook_time: values.cookTime || null,
        servings: values.servings || null,
        meal_type: values.mealType || null,
        categorized_ingredients: {}, // Manual entry doesn't categorize, leave empty or add logic later
      };

      await addRecipeToCookbook(recipeData, values.cookbookId);
      onRecipeAdded({ ...recipeData, cookbook_id: values.cookbookId }); // Notify parent component
      
      toast({
        title: 'Recipe Added!',
        description: `"${values.title}" has been successfully added to your cookbook.`
      });
      form.reset(); // Reset form fields
    } catch (error: any) {
      toast({
        title: 'Failed to Add Recipe',
        description: error.message || 'An error occurred while adding the recipe.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50 animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <UtensilsCrossed className="h-5 w-5 text-purple-500" />
          Manually Add Recipe
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          ✍️ Enter your own recipe details to add them to your collection.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipe Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Grandma's Famous Chili" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingredients (one per line or comma-separated)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="1 cup flour&#10;2 eggs&#10;..." rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions (one step per line)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="1. Preheat oven to 350°F&#10;2. Mix ingredients..." rows={7} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., https://myrecipeblog.com/chili" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., https://example.com/chili.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cookTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cook Time (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 45 min" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="servings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servings (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 6" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meal Type (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select meal type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Breakfast">Breakfast</SelectItem>
                        <SelectItem value="Lunch">Lunch</SelectItem>
                        <SelectItem value="Dinner">Dinner</SelectItem>
                        <SelectItem value="Appetizer">Appetizer</SelectItem>
                        <SelectItem value="Dessert">Dessert</SelectItem>
                        <SelectItem value="Snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cookbookId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Add to Cookbook</FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select an existing cookbook" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allAvailableCookbooks.length === 0 ? (
                          <SelectItem value="no-cookbooks" disabled>No cookbooks found</SelectItem>
                        ) : (
                          allAvailableCookbooks.map(cb => (
                            <SelectItem key={cb.id} value={cb.id}>{cb.name} {cb.user_id === 'guest' && '(Unsaved)'}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Dialog open={showCreateCookbookDialog} onOpenChange={setShowCreateCookbookDialog}>
                      <DialogTrigger asChild>
                        <Button type="button" size="sm" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Create New Cookbook
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Cookbook name"
                            value={newCookbookName}
                            onChange={(e) => setNewCookbookName(e.target.value)}
                            disabled={creatingCookbook}
                          />
                          <Textarea
                            placeholder="Description (optional)"
                            value={newCookbookDescription}
                            onChange={(e) => setNewCookbookDescription(e.target.value)}
                            disabled={creatingCookbook}
                          />
                          <Button onClick={handleCreateNewCookbook} disabled={creatingCookbook} className="w-full">
                            {creatingCookbook ? 'Creating...' : 'Create Cookbook'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
                  Adding Recipe...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Add Recipe
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ManualRecipeForm;