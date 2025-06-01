import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, BookOpen, Plus, Share2, Printer, Copy, Loader2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import QuickShareRecipe from '../QuickShareRecipe';
import AddRecipeToCookbookDialog from './AddRecipeToCookbookDialog';
import CopyCookbookDialog from './CopyCookbookDialog';

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
}

const RecipeActions: React.FC<RecipeActionsProps> = ({ recipe, onAddToShoppingList, onRecipeAdded }) => {
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
            h1 { color: #e67e22; font-size: 28px; margin-bottom: 15px; }
            h2 { color: #3498db; font-size: 20px; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            img { max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px; }
            ul, ol { list-style-position: inside; padding-left: 0; margin-bottom: 20px; }
            li { margin-bottom: 8px; line-height: 1.5; }
            .meta { font-size: 14px; color: #777; margin-bottom: 20px; }
            .meta span { margin-right: 15px; }
            .category-badge { 
              display: inline-block; 
              padding: 4px 8px; 
              border-radius: 12px; 
              font-size: 10px; 
              font-weight: bold; 
              margin-right: 5px; 
              margin-bottom: 5px;
              background-color: #f0f0f0; /* Default light background */
              color: #555; /* Default dark text */
            }
            .category-proteins { background-color: #ffe0e0; color: #c0392b; }
            .category-vegetables { background-color: #e0ffe0; color: #27ae60; }
            .category-fruits { background-color: #fffbe0; color: #f39c12; }
            .category-grains { background-color: #f5e6cc; color: #d35400; }
            .category-dairy { background-color: #e0f0ff; color: #2980b9; }
            .category-spices { background-color: #f0e0ff; color: #8e44ad; }
            .category-other { background-color: #e0e0e0; color: #7f8c8d; }
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
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          🛒 Add to List
        </Button>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => setShowAddCookbookDialog(true)}
      >
        <BookOpen className="h-4 w-4 mr-1" />
        Add to Cookbook
      </Button>
      {user && (
        <QuickShareRecipe recipe={recipe}>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 flex items-center gap-1"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </QuickShareRecipe>
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
          className="flex-1 flex items-center gap-1 text-purple-500 hover:text-purple-600 border-purple-300"
          onClick={() => setShowCopyCookbookDialog(true)}
        >
          <Copy className="h-4 w-4" />
          Copy Cookbook
        </Button>
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