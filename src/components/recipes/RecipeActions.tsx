import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, BookOpen, Plus, Share2, Printer, Copy, Loader2, Twitter, Facebook, Trash2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import QuickShareRecipe from '../QuickShareRecipe';
import AddRecipeToCookbookDialog from './AddRecipeToCookbookDialog';
import CopyCookbookDialog from './CopyCookbookDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: string;
  cookbook_id?: string;
  is_public?: boolean;
  cookbook_owner_id?: string;
}

interface RecipeActionsProps {
  recipe: Recipe;
  onAddToShoppingList?: (ingredients: string[]) => void;
  onRecipeAdded?: (recipe: Recipe) => void;
  onRemove?: (recipeId: string, cookbookId?: string) => void; // New prop for removal
}

const RecipeActions: React.FC<RecipeActionsProps> = ({ recipe, onAddToShoppingList, onRecipeAdded, onRemove }) => {
  const { user } = useAppContext();
  const [showAddCookbookDialog, setShowAddCookbookDialog] = useState(false);
  const [showCopyCookbookDialog, setShowCopyCookbookDialog] = useState(false);

  const handlePrintRecipe = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${recipe.title}</title>
          <style>
            body { font-family: sans-serif; margin: 20px; color: #333; }
            h1 { color: #28a745; font-size: 28px; margin-bottom: 15px; } /* Primary green */
            h2 { color: #007bff; font-size: 20px; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; } /* Blue for secondary headings */
            img { max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px; }
            ul, ol { list-style-position: inside; padding-left: 0; margin-bottom: 20px; }
            li { margin-bottom: 8px; line-height: 1.5; }
            .meta { font-size: 14px; color: #6c757d; margin-bottom: 20px; } /* Muted grey */
            .meta span { margin-right: 15px; }
            .category-badge { 
              display: inline-block; 
              padding: 4px 8px; 
              border-radius: 12px; 
              font-size: 10px; 
              font-weight: bold; 
              margin-right: 5px; 
              margin-bottom: 5px;
              background-color: #e9ecef; /* Light grey */
              color: #495057; /* Dark grey */
            }
            .category-proteins { background-color: #f8d7da; color: #721c24; } /* Light red */
            .category-vegetables { background-color: #d4edda; color: #155724; } /* Light green */
            .category-fruits { background-color: #fff3cd; color: #856404; } /* Light yellow */
            .category-grains { background-color: #fef8e0; color: #8a6d3b; } /* Light amber */
            .category-dairy { background-color: #cce5ff; color: #004085; } /* Light blue */
            .category-spices { background-color: #e2d9f3; color: #4b0082; } /* Light purple */
            .category-other { background-color: #e9ecef; color: #495057; } /* Light grey */
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${recipe.title}</h1>
          ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.title}" />` : ''}
          <div class="meta">
            ${recipe.cook_time ? `<span>🕒 ${recipe.cook_time}</span>` : ''}
            ${recipe.servings ? `<span>🍽️ ${recipe.servings} servings</span>` : ''}
            ${recipe.meal_type ? `<span>🥣 ${recipe.meal_type}</span>` : ''}
            ${recipe.url && recipe.url !== 'generated' ? `<span>🔗 <a href="${recipe.url}" target="_blank">${new URL(recipe.url).hostname}</a></span>` : ''}
          </div>

          <h2>Ingredients</h2>
          <ul>
            ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
          </ul>

          ${recipe.categorized_ingredients && Object.keys(recipe.categorized_ingredients).length > 0 ? `
            <h2>Categorized Ingredients</h2>
            <div>
              ${Object.entries(recipe.categorized_ingredients).map(([category, items]) => {
                if (items.length === 0) return '';
                const categoryClass = `category-${category.toLowerCase()}`;
                return `
                  <div style="margin-bottom: 10px;">
                    <span class="category-badge ${categoryClass}">${category.charAt(0).toUpperCase() + category.slice(1)} (${items.length})</span>
                    <ul style="list-style: none; padding-left: 15px; margin-top: 5px;">
                      ${items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          <h2>Instructions</h2>
          <ol>
            ${recipe.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
          </ol>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      toast({ title: '🖨️ Printing Recipe', description: `Preparing "${recipe.title}" for print.` });
    } else {
      toast({ title: 'Print Failed', description: 'Please allow pop-ups to print the recipe.', variant: 'destructive' });
    }
  };

  const handleShareTwitter = () => {
    const tweetText = `Check out this recipe: ${recipe.title} #MadRezipes #Recipe`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(recipe.url)}`;
    window.open(url, '_blank', 'width=600,height=400');
    toast({ title: 'Sharing on Twitter', description: 'Opening Twitter to share your recipe.' });
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(recipe.url)}&quote=${encodeURIComponent(recipe.title)}`;
    window.open(url, '_blank', 'width=600,height=400');
    toast({ title: 'Sharing on Facebook', description: 'Opening Facebook to share your recipe.' });
  };

  const handleRemoveClick = () => {
    if (onRemove) {
      onRemove(recipe.id, recipe.cookbook_id);
    }
  };

  const canCopyCookbook = user && recipe.is_public && recipe.cookbook_id && recipe.cookbook_owner_id !== user.id;

  return (
    <div className="flex gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(recipe.url, '_blank')}
        className="flex-1"
      >
        <ExternalLink className="h-4 w-4 mr-1" />
        View Recipe
      </Button>
      {onAddToShoppingList && (
        <Button
          variant="default"
          size="sm"
          onClick={() => onAddToShoppingList(recipe.ingredients)}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          🛒 Add to List
        </Button>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        onClick={(e) => {
          e.stopPropagation(); // Prevent drag-and-drop interference
          setShowAddCookbookDialog(true);
        }}
      >
        <BookOpen className="h-4 w-4 mr-1" />
        Add to Cookbook
      </Button>
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 flex items-center gap-1"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleShareTwitter}>
              <Twitter className="h-4 w-4 mr-2" /> Share on Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareFacebook}>
              <Facebook className="h-4 w-4 mr-2" /> Share on Facebook
            </DropdownMenuItem>
            {/* Removed Pinterest option due to unavailable icon */}
            <QuickShareRecipe recipe={recipe}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}> {/* Prevent dropdown from closing immediately */}
                <Share2 className="h-4 w-4 mr-2" /> Share In-App
              </DropdownMenuItem>
            </QuickShareRecipe>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrintRecipe}
        className="flex-1 flex items-center gap-1"
      >
        <Printer className="h-4 w-4" />
        Print
      </Button>
      {canCopyCookbook && (
        <Button
          variant="outline"
          size="sm"
          className="flex-1 flex items-center gap-1 text-primary hover:text-primary/80 border-primary/50"
          onClick={() => setShowCopyCookbookDialog(true)}
        >
          <Copy className="h-4 w-4" />
          Copy Cookbook
        </Button>
      )}
      {onRemove && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to remove this recipe?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove "{recipe.title}" from your collection.
                {recipe.cookbook_id && user && <p className="mt-2 font-medium">This recipe is also in a cookbook. It will be removed from there too.</p>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveClick} className="bg-destructive hover:bg-destructive/90">
                Remove Recipe
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AddRecipeToCookbookDialog
        recipe={recipe}
        open={showAddCookbookDialog}
        onOpenChange={setShowAddCookbookDialog}
        onRecipeAdded={onRecipeAdded || (() => {})} // Provide a default empty function if not passed
      />
      <CopyCookbookDialog
        recipe={recipe}
        open={showCopyCookbookDialog}
        onOpenChange={setShowCopyCookbookDialog}
      />
    </div>
  );
};

export default RecipeActions;