import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string; // Changed to snake_case
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string; // Changed to snake_case
}

interface MealPlan {
  date: string;
  recipe: Recipe;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
}

interface ShoppingListPDFProps {
  mealPlan: MealPlan[];
  selectedMonth: string;
}

const ShoppingListPDF: React.FC<ShoppingListPDFProps> = ({ mealPlan, selectedMonth }) => {
  const calculateMonthlyIngredients = () => {
    const ingredientMap = new Map<string, number>();
    
    mealPlan.forEach(meal => {
      meal.recipe.ingredients.forEach(ingredient => {
        const key = ingredient.toLowerCase().trim();
        const currentAmount = ingredientMap.get(key) || 0;
        ingredientMap.set(key, currentAmount + 1);
      });
    });
    
    return Array.from(ingredientMap.entries())
      .map(([ingredient, amount]) => ({
        ingredient,
        amount: Math.ceil(amount)
      }))
      .sort((a, b) => a.ingredient.localeCompare(b.ingredient));
  };

  const getIngredientIcon = (ingredient: string) => {
    const lower = ingredient.toLowerCase();
    if (lower.includes('apple') || lower.includes('fruit')) return '🍎';
    if (lower.includes('carrot') || lower.includes('vegetable')) return '🥕';
    if (lower.includes('milk') || lower.includes('dairy')) return '🥛';
    if (lower.includes('bread') || lower.includes('flour')) return '🍞';
    if (lower.includes('meat') || lower.includes('chicken') || lower.includes('beef')) return '🥩';
    if (lower.includes('fish') || lower.includes('salmon')) return '🐟';
    if (lower.includes('egg')) return '🥚';
    if (lower.includes('cheese')) return '🧀';
    if (lower.includes('tomato')) return '🍅';
    if (lower.includes('onion')) return '🧅';
    if (lower.includes('pepper')) return '🌶️';
    if (lower.includes('garlic')) return '🧄';
    if (lower.includes('herb') || lower.includes('basil') || lower.includes('parsley')) return '🌿';
    if (lower.includes('oil') || lower.includes('olive')) return '🫒';
    if (lower.includes('salt') || lower.includes('spice')) return '🧂';
    return '🥄';
  };

  const generatePDF = () => {
    const ingredients = calculateMonthlyIngredients();
    const currentDate = new Date().toLocaleDateString();
    
    // Create a printable HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shopping List - ${selectedMonth}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa; }
            .header { text-align: center; margin-bottom: 30px; padding: 20px; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .title { font-size: 28px; color: #28a745; margin-bottom: 10px; }
            .subtitle { color: #6c757d; font-size: 16px; }
            .stats { display: flex; justify-content: center; gap: 20px; margin: 20px 0; }
            .stat { background: #e9ecef; padding: 10px 20px; border-radius: 8px; text-align: center; }
            .ingredients-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
            .ingredient-item { display: flex; align-items: center; padding: 12px; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
            .ingredient-icon { font-size: 20px; margin-right: 12px; }
            .ingredient-text { flex: 1; font-size: 14px; }
            .ingredient-amount { background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 12px; }
            @media print { body { background: white; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">🛒 Monthly Shopping List</div>
            <div class="subtitle">${selectedMonth} - Generated on ${currentDate}</div>
            <div class="stats">
              <div class="stat">
                <div style="font-size: 20px; font-weight: bold; color: #28a745;">${ingredients.length}</div>
                <div style="font-size: 12px; color: #6c757d;">Unique Items</div>
              </div>
              <div class="stat">
                <div style="font-size: 20px; font-weight: bold; color: #007bff;">${mealPlan.length}</div>
                <div style="font-size: 12px; color: #6c757d;">Planned Meals</div>
              </div>
            </div>
          </div>
          
          <div class="ingredients-grid">
            ${ingredients.map(item => `
              <div class="ingredient-item">
                <span class="ingredient-icon">${getIngredientIcon(item.ingredient)}</span>
                <span class="ingredient-text">${item.ingredient}</span>
                ${item.amount > 1 ? `<span class="ingredient-amount">×${item.amount}</span>` : ''}
              </div>
            `).join('')}
          </div>
          
          <div class="footer">
            <p>🍽️ Happy cooking! This list covers all ingredients for your ${selectedMonth} meal plan.</p>
            <p>📱 Generated by your Meal Planning App</p>
          </div>
        </body>
      </html>
    `;
    
    // Open in new window for printing/saving
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const ingredients = calculateMonthlyIngredients();

  if (mealPlan.length === 0) {
    return (
      <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Download className="h-5 w-5 text-primary" />
            Monthly Shopping List PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg border border-dashed border-border">
            <ShoppingCart className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">
              📋 Generate a meal plan to create your shopping list!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Download className="h-5 w-5 text-primary" />
          Monthly Shopping List PDF
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            🛒 {ingredients.length} items
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Combined ingredients for your {selectedMonth} meal plan
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border border-border rounded-lg">
            <div>
              <div className="text-sm font-medium text-primary">📊 Monthly Summary</div>
              <div className="text-xs text-muted-foreground">
                {ingredients.length} unique ingredients • {mealPlan.length} planned meals
              </div>
            </div>
            <Button 
              onClick={generatePDF}
              className="bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-600 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              📄 Download PDF
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {ingredients.slice(0, 12).map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-background/60 rounded border border-border/50">
                <span className="text-lg">{getIngredientIcon(item.ingredient)}</span>
                <span className="text-sm flex-1">{item.ingredient}</span>
                {item.amount > 1 && (
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                    ×{item.amount}
                  </Badge>
                )}
              </div>
            ))}
            {ingredients.length > 12 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-2">
                ... and {ingredients.length - 12} more items in the PDF
              </div>
            )}
          </div>
        </CardContent>
    </Card>
  );
};

export default ShoppingListPDF;