import { jsPDF } from 'jspdf';

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
  categorized_ingredients?: CategorizedIngredients;
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string;
  cookbook_id?: string;
}

// Helper function to convert image URL to Base64
const getImageBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image ${url}: ${response.statusText}`);
      return null;
    }
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => {
        console.error(`FileReader error for ${url}`);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error converting image to base64 for ${url}:`, error);
    return null;
  }
};

export const exportCookbookRecipesToPDF = async (recipes: Recipe[], cookbookName: string) => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;
  const margin = 15;
  const lineHeight = 5;

  // Define new color palette for PDF
  const primaryColor = [36, 128, 70]; // A health-conscious green (HSL: 142.1 76.2% 36.3%)
  const textColor = [56, 63, 71]; // Dark blue-grey (HSL: 222.2 84% 4.9%)
  const mutedTextColor = [108, 117, 125]; // Medium grey (HSL: 215.4 16.3% 46.9%)
  const backgroundColor = [255, 255, 255]; // White
  const cardBackgroundColor = [248, 249, 250]; // Light grey for card backgrounds

  const addPageHeader = (title: string, subtitle: string) => {
    doc.setFillColor(...backgroundColor);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(22);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    doc.setTextColor(...mutedTextColor);
    doc.setFontSize(10);
    doc.text(subtitle, pageWidth / 2, 22, { align: 'center' });
    yPos = 30;
  };

  addPageHeader(`${cookbookName} Recipes`, `Generated on ${new Date().toLocaleDateString()}`);

  if (recipes.length === 0) {
    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.text('No recipes found in this cookbook.', pageWidth / 2, yPos + 20, { align: 'center' });
  } else {
    for (const recipe of recipes) {
      if (yPos + 100 > pageHeight - margin) { // Estimate space needed for a recipe card
        doc.addPage();
        addPageHeader(`${cookbookName} Recipes (cont.)`, `Generated on ${new Date().toLocaleDateString()}`);
      }

      // Recipe Title
      doc.setTextColor(...primaryColor);
      doc.setFontSize(16);
      doc.text(recipe.title, margin, yPos);
      yPos += lineHeight * 1.5;

      // Recipe Meta (Cook Time, Servings, Meal Type, URL)
      doc.setTextColor(...mutedTextColor);
      doc.setFontSize(9);
      let metaText = '';
      if (recipe.cook_time) metaText += `🕒 ${recipe.cook_time}  `;
      if (recipe.servings) metaText += `🍽️ ${recipe.servings} servings  `;
      if (recipe.meal_type) metaText += `🥣 ${recipe.meal_type}  `;
      if (recipe.url && recipe.url !== 'generated') metaText += `🔗 ${new URL(recipe.url).hostname}`;
      doc.text(metaText, margin, yPos);
      yPos += lineHeight;

      // Image (if available)
      if (recipe.image) {
        const imageData = await getImageBase64(recipe.image);
        if (imageData) {
          try {
            const imgWidth = 60; // Fixed width for image
            const imgHeight = (doc.internal.pageSize.getWidth() / 2) * (imgWidth / doc.internal.pageSize.getWidth()); // Placeholder ratio, actual ratio would need image dimensions
            
            if (yPos + imgHeight + 10 > pageHeight - margin) {
              doc.addPage();
              addPageHeader(`${cookbookName} Recipes (cont.)`, `Generated on ${new Date().toLocaleDateString()}`);
            }
            doc.addImage(imageData, 'JPEG', margin, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 5;
          } catch (e) {
            console.error('Error adding image to PDF:', e);
          }
        }
      }

      // Ingredients
      doc.setTextColor(...textColor);
      doc.setFontSize(12);
      doc.text('Ingredients:', margin, yPos);
      yPos += lineHeight;
      doc.setFontSize(10);
      recipe.ingredients.forEach(ingredient => {
        if (yPos + lineHeight > pageHeight - margin) {
          doc.addPage();
          addPageHeader(`${cookbookName} Recipes (cont.):`, `Generated on ${new Date().toLocaleDateString()}`);
          doc.setTextColor(...textColor);
          doc.setFontSize(12);
          doc.text('Ingredients (cont.):', margin, yPos);
          yPos += lineHeight;
          doc.setFontSize(10);
        }
        doc.text(`• ${ingredient}`, margin + 5, yPos);
        yPos += lineHeight;
      });
      yPos += lineHeight; // Add extra space after ingredients

      // Instructions
      doc.setTextColor(...textColor);
      doc.setFontSize(12);
      doc.text('Instructions:', margin, yPos);
      yPos += lineHeight;
      doc.setFontSize(10);
      recipe.instructions.forEach((instruction, index) => {
        const instructionText = `${index + 1}. ${instruction}`;
        const splitText = doc.splitTextToSize(instructionText, pageWidth - 2 * margin - 5);
        splitText.forEach((line: string) => {
          if (yPos + lineHeight > pageHeight - margin) {
            doc.addPage();
            addPageHeader(`${cookbookName} Recipes (cont.):`, `Generated on ${new Date().toLocaleDateString()}`);
            doc.setTextColor(...textColor);
            doc.setFontSize(12);
            doc.text('Instructions (cont.):', margin, yPos);
            yPos += lineHeight;
            doc.setFontSize(10);
          }
          doc.text(line, margin + 5, yPos);
          yPos += lineHeight;
        });
      });
      yPos += lineHeight * 2; // Add more space before next recipe
    }
  }

  doc.save(`${cookbookName.replace(/ /g, '-')}-recipes.pdf`);
};