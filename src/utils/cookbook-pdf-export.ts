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

export const exportCookbookRecipesToPDF = async (recipes: Recipe[], cookbookName: string) => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;
  const margin = 15;
  const lineHeight = 5;

  const addPageHeader = (title: string, subtitle: string) => {
    doc.setFillColor(41, 37, 36);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setTextColor(251, 146, 60);
    doc.setFontSize(22);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(subtitle, pageWidth / 2, 22, { align: 'center' });
    yPos = 30;
  };

  addPageHeader(`${cookbookName} Recipes`, `Generated on ${new Date().toLocaleDateString()}`);

  if (recipes.length === 0) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('No recipes found in this cookbook.', pageWidth / 2, yPos + 20, { align: 'center' });
  } else {
    for (const recipe of recipes) {
      if (yPos + 100 > pageHeight - margin) { // Estimate space needed for a recipe card
        doc.addPage();
        addPageHeader(`${cookbookName} Recipes (cont.)`, `Generated on ${new Date().toLocaleDateString()}`);
      }

      // Recipe Title
      doc.setTextColor(251, 146, 60);
      doc.setFontSize(16);
      doc.text(recipe.title, margin, yPos);
      yPos += lineHeight * 1.5;

      // Recipe Meta (Cook Time, Servings, Meal Type, URL)
      doc.setTextColor(150, 150, 150);
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
        try {
          const img = new Image();
          img.src = recipe.image;
          await new Promise((resolve, reject) => {
            img.onload = () => {
              const imgWidth = 60; // Fixed width for image
              const imgHeight = (img.height / img.width) * imgWidth;
              if (yPos + imgHeight + 10 > pageHeight - margin) {
                doc.addPage();
                addPageHeader(`${cookbookName} Recipes (cont.)`, `Generated on ${new Date().toLocaleDateString()}`);
              }
              doc.addImage(img, 'JPEG', margin, yPos, imgWidth, imgHeight);
              yPos += imgHeight + 5;
              resolve(null);
            };
            img.onerror = () => {
              console.warn(`Failed to load image for PDF: ${recipe.image}`);
              resolve(null); // Resolve even on error to not block PDF generation
            };
          });
        } catch (e) {
          console.error('Error adding image to PDF:', e);
        }
      }

      // Ingredients
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('Ingredients:', margin, yPos);
      yPos += lineHeight;
      doc.setFontSize(10);
      recipe.ingredients.forEach(ingredient => {
        if (yPos + lineHeight > pageHeight - margin) {
          doc.addPage();
          addPageHeader(`${cookbookName} Recipes (cont.)`, `Generated on ${new Date().toLocaleDateString()}`);
          doc.setTextColor(255, 255, 255);
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
      doc.setTextColor(255, 255, 255);
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
            addPageHeader(`${cookbookName} Recipes (cont.)`, `Generated on ${new Date().toLocaleDateString()}`);
            doc.setTextColor(255, 255, 255);
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