import { transformRecipeImagePath } from '../../../../scripts/blocks-utils.js';

export function itemTemplateFunction(hit, { html, components }) {    
  const recipeName = hit.name || hit.title || 'Recipe';
  const recipeImage = transformRecipeImagePath(hit.image || hit.imageUrl || '');
  const recipeCategory = hit.category || hit.cuisine || '';
  const recipeDescription = hit.description || hit.summary || '';
  const recipeTime = hit.cookingTime || hit.time || hit.prepTime || '';
  const recipeServings = hit.servings || '';
  const recipeUrl = `/recipes.html?rid=${hit.objectID}`;

  // Try to highlight name attribute, fallback to title if name doesn't exist
  const highlightAttribute = hit.name ? 'name' : (hit.title ? 'title' : null);
  const recipeNameDisplay = highlightAttribute 
    ? components.Highlight({ attribute: highlightAttribute, hit })
    : recipeName;

  return html`
    <div class="recipe-card algolia-analytics" data-insights-query-id="${hit.__queryID}" data-insights-object-id="${hit.objectID}" data-insights-position="${hit.__position}">
      ${recipeImage ? html`<img class="recipe-card__image" src="${recipeImage}" alt="${recipeName}" />` : ''}
      ${recipeCategory ? html`<div class="recipe-card__category">${recipeCategory}</div>` : ''}
      <div class="recipe-card__name">${recipeNameDisplay}</div>
      ${recipeDescription ? html`<div class="recipe-card__description">${recipeDescription.length > 100 ? recipeDescription.substring(0, 100) + '...' : recipeDescription}</div>` : ''}
      <div class="recipe-card__meta">
        ${recipeTime ? html`<div class="recipe-meta-item"><strong>Time:</strong> ${recipeTime}</div>` : ''}
        ${recipeServings ? html`<div class="recipe-meta-item"><strong>Servings:</strong> ${recipeServings}</div>` : ''}
      </div>
      <div class="recipe-card__footer">
        <a href="${recipeUrl}" class="recipe-view-btn">
          <span>View Recipe</span>
        </a>
      </div>
    </div>`;
}