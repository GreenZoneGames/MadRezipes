import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingCart, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
}

interface MealPlan {
  id: string;
  date: string;
  mealType: string;
  recipeId: string;
  servings?: number;
}

interface ShoppingListProps {
  recipes: Recipe[];
  onShoppingListChange?: (ingredients: string[]) => void;
  mealPlan?: MealPlan[];
}

const ShoppingList: React.FC<ShoppingListProps> = ({ recipes, onShoppingListChange, mealPlan = [] }) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showByCategory, setShowByCategory] = useState(true);

  const calculateIngredientsWithServings = () => {
    const ingredientMap = new Map<string, number>();
    const categoryMap = new Map<string, string>();
    
    if (mealPlan.length > 0) {
      mealPlan.forEach(meal => {
        const recipe = recipes.find(r => r.id === meal.recipeId);
        if (recipe) {
          const servingMultiplier = meal.servings && recipe.servings 
            ? meal.servings / recipe.servings 
            : 1;
          
          recipe.ingredients.forEach(ingredient => {
            const key = ingredient.toLowerCase().trim();
            const currentAmount = ingredientMap.get(key) || 0;
            ingredientMap.set(key, currentAmount + servingMultiplier);
            
            if (recipe.categorizedIngredients) {
              for (const [category, items] of Object.entries(recipe.categorizedIngredients)) {
                if (items.some(item => item.toLowerCase().trim() === key)) {
                  categoryMap.set(key, category);
                  break;
                }
              }
            }
          });
        }
      });
    } else {
      recipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
          const key = ingredient.toLowerCase().trim();
          const currentAmount = ingredientMap.get(key) || 0;
          ingredientMap.set(key, currentAmount + 1);
          
          if (recipe.categorizedIngredients) {
            for (const [category, items] of Object.entries(recipe.categorizedIngredients)) {
              if (items.some(item => item.toLowerCase().trim() === key)) {
                categoryMap.set(key, category);
                break;
              }
            }
          }
        });
      });
    }
    
    return Array.from(ingredientMap.entries()).map(([ingredient, amount]) => ({
      ingredient,
      amount: Math.ceil(amount),
      category: categoryMap.get(ingredient) || 'other'
    }));
  };

  const ingredientsWithAmounts = calculateIngredientsWithServings();
  const uniqueIngredients = ingredientsWithAmounts.map(item => item.ingredient);

  const groupedIngredients = ingredientsWithAmounts.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof ingredientsWithAmounts>);

  const categoryColors = {
    proteins: 'bg-red-100 text-red-800 border-red-200',
    vegetables: 'bg-green-100 text-green-800 border-green-200',
    fruits: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    grains: 'bg-amber-100 text-amber-800 border-amber-200',
    dairy: 'bg-blue-100 text-blue-800 border-blue-200',
    spices: 'bg-purple-100 text-purple-800 border-purple-200',
    other: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const categoryIcons = {
    proteins: '🥩',
    vegetables: '🥕',
    fruits: '🍎',
    grains: '🌾',
    dairy: '🥛',
    spices: '🌿',
    other: '📦'
  };

  useEffect(() => {
    if (onShoppingListChange) {
      onShoppingListChange(uniqueIngredients);
    }
  }, [uniqueIngredients, onShoppingListChange]);

  const handleToggleItem = (ingredient: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(ingredient)) {
      newChecked.delete(ingredient);
    } else {
      newChecked.add(ingredient);
    }
    setCheckedItems(newChecked);
  };

  const getIngredientIcon = (ingredient: string) => {
    const lower = ingredient.toLowerCase();
    if (lower.includes('apple')) return '🍎';
    if (lower.includes('carrot')) return '🥕';
    if (lower.includes('milk')) return '🥛';
    if (lower.includes('bread')) return '🍞';
    if (lower.includes('chicken') || lower.includes('beef')) return '🥩';
    if (lower.includes('fish')) return '🐟';
    if (lower.includes('egg')) return '🥚';
    if (lower.includes('cheese')) return '🧀';
    if (lower.includes('tomato')) return '🍅';
    if (lower.includes('onion')) return '🧅';
    if (lower.includes('pepper')) return '🌶️';
    if (lower.includes('garlic')) return '🧄';
    if (lower.includes('herb') || lower.includes('basil')) return '🌿';
    if (lower.includes('oil')) return '🫒';
    if (lower.includes('salt')) return '🧂';
    return '🥄';
  };

  if (recipes.length === 0) {
    return (
      <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShoppingCart className="h-5 w-5 text-orange-500" />
            Shopping List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 bg-gradient-to-br from-orange-50/30 to-red-50/30 rounded-lg border border-dashed border-orange-200">
            <ShoppingCart className="h-12 w-12 text-orange-400 mx-auto mb-2" />
            <p className="text-muted-foreground animate-fade-in">
              🍳 Add some delicious recipes to generate your shopping list!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const checkedCount = checkedItems.size;
  const totalCount = uniqueIngredients.length;
  const progressPercentage = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return (
    <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ShoppingCart className="h-5 w-5 text-orange-500" />
          Shopping List
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-300">
            🥕 {uniqueIngredients.length} items
          </Badge>
          <button
            onClick={() => setShowByCategory(!showByCategory)}
            className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
          >
            {showByCategory ? '📋 List View' : '📦 Category View'}
          </button>
        </CardTitle>
        {totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>✅ Progress: {checkedCount}/{totalCount} items</span>
              <span>{Math.round(progressPercentage)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {showByCategory ? (
            Object.entries(groupedIngredients).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm border ${categoryColors[category as keyof typeof categoryColors]}`}>
                  <span>{categoryIcons[category as keyof typeof categoryIcons]}</span>
                  {category.charAt(0).toUpperCase() + category.slice(1)} ({items.length})
                </div>
                {items.map((item, index) => (
                  <div key={`${category}-${index}`} className="flex items-center space-x-3 p-3 ml-4 rounded-lg hover:bg-gradient-to-r hover:from-orange-50/30 hover:to-red-50/30 transition-all duration-200">
                    <Checkbox 
                      checked={checkedItems.has(item.ingredient)}
                      onCheckedChange={() => handleToggleItem(item.ingredient)}
                      className="border-orange-300"
                    />
                    <span className="text-lg">{getIngredientIcon(item.ingredient)}</span>
                    <label className={`text-sm font-medium cursor-pointer flex-1 ${
                      checkedItems.has(item.ingredient) 
                        ? 'line-through text-muted-foreground' 
                        : 'text-foreground hover:text-orange-600'
                    }`}>
                      {item.ingredient}
                      {item.amount > 1 && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          ×{item.amount}
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            ))
          ) : (
            ingredientsWithAmounts.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gradient-to-r hover:from-orange-50/30 hover:to-red-50/30 transition-all duration-200">
                <Checkbox 
                  checked={checkedItems.has(item.ingredient)}
                  onCheckedChange={() => handleToggleItem(item.ingredient)}
                  className="border-orange-300"
                />
                <span className="text-lg">{getIngredientIcon(item.ingredient)}</span>
                <label className={`text-sm font-medium cursor-pointer flex-1 ${
                  checkedItems.has(item.ingredient) 
                    ? 'line-through text-muted-foreground' 
                    : 'text-foreground hover:text-orange-600'
                }`}>
                  {item.ingredient}
                  {item.amount > 1 && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      ×{item.amount}
                    </span>
                  )}
                </label>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShoppingList;