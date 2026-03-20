import { transformRecipeImagePath } from '../../../../scripts/blocks-utils.js';

function toPlainText(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function itemTemplateFunction(hit, { html, components }) {
  const recipeName = hit.name || hit.title || 'Recipe';
  const recipeImage = transformRecipeImagePath(hit.image || hit.imageUrl || '');
  const recipeCategory = hit.category || hit.cuisine || '';
  const recipeDescription = toPlainText(hit.description || hit.summary || '');
  const recipeTime = hit.cookingTime || hit.time || hit.prepTime || '';
  const recipeServings = hit.servings || '';
  const recipeUrl = `/recipes?rid=${hit.objectID}`;
  // eslint-disable-next-line no-underscore-dangle
  const queryId = hit.__queryID;
  // eslint-disable-next-line no-underscore-dangle
  const position = hit.__position;

  // Try to highlight name attribute, fallback to title if name doesn't exist
  let highlightAttribute = null;
  if (hit.name) {
    highlightAttribute = 'name';
  } else if (hit.title) {
    highlightAttribute = 'title';
  }
  const recipeNameDisplay = highlightAttribute
    ? components.Highlight({ attribute: highlightAttribute, hit })
    : recipeName;

  return html`
    <div class="recipe-card algolia-analytics" data-insights-query-id="${queryId}" data-insights-object-id="${hit.objectID}" data-insights-position="${position}">
      ${recipeImage ? html`<img class="recipe-card__image" src="${recipeImage}" alt="${recipeName}" />` : ''}
      ${recipeCategory ? html`<div class="recipe-card__category">${recipeCategory}</div>` : ''}
      <div class="recipe-card__name">${recipeNameDisplay}</div>
      ${recipeDescription ? html`<div class="recipe-card__description">${recipeDescription.length > 100 ? `${recipeDescription.substring(0, 100)}...` : recipeDescription}</div>` : ''}
      <div class="recipe-card__meta">
        ${recipeTime ? html`<div class="recipe-meta-item"><strong>Time:</strong> ${recipeTime}</div>` : ''}
        ${recipeServings ? html`<div class="recipe-meta-item"><strong>Servings:</strong> ${recipeServings}</div>` : ''}
      </div>
      <div class="recipe-card__footer">
        <a href="${recipeUrl}" class="recipe-view-btn recipe-click">
          <span>View Recipe</span>
        </a>
      </div>
    </div>`;
}
