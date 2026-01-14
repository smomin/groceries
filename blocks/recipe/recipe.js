import '../../scripts/lib-algoliasearch.js';
import { getTextContent, getCredentials, getIndexName, getParamFromUrl, createAlgoliaClient, fetchObjectById, createImageElement, transformRecipeImagePath } from '../../scripts/blocks-utils.js';

function extractIngredientsFromSteps(steps) {
  if (!Array.isArray(steps)) {
    return [];
  }

  const ingredientsMap = new Map();

  steps.forEach((step) => {
    if (step.ingredient) {
      const key = step.ingredient.toLowerCase().trim();
      const quantity = step.quantity || '';
      const unit = step.unit || '';
      
      if (ingredientsMap.has(key)) {
        const existing = ingredientsMap.get(key);
        // Only try to sum quantities if both have numeric values
        if (quantity && !isNaN(parseFloat(quantity)) && existing.quantity && !isNaN(parseFloat(existing.quantity))) {
          existing.quantity = (parseFloat(existing.quantity) + parseFloat(quantity)).toString();
        } else if (quantity && !existing.quantity) {
          existing.quantity = quantity;
          existing.unit = unit;
        }
      } else {
        ingredientsMap.set(key, {
          ingredient: step.ingredient,
          quantity: quantity,
          unit: unit,
        });
      }
    }
  });

  return Array.from(ingredientsMap.values());
}

function formatIngredients(ingredients, steps) {
  // If ingredients array exists, use it
  if (Array.isArray(ingredients) && ingredients.length > 0) {
    return ingredients;
  }

  // If steps array exists, extract ingredients from it
  if (Array.isArray(steps) && steps.length > 0) {
    return extractIngredientsFromSteps(steps);
  }

  // Fallback to string parsing
  if (typeof ingredients === 'string') {
    return ingredients.split(',').map(item => item.trim()).filter(item => item);
  }

  return [];
}

function formatInstructions(steps) {
  if (Array.isArray(steps)) {
    // Handle steps as array of objects with title and explanation
    return steps.map((step) => {
      if (typeof step === 'object' && step !== null) {
        // Use explanation field which contains HTML content
        if (step.explanation) {
          return step.explanation;
        }
        // Fallback to title if explanation is not available
        if (step.title) {
          return step.title;
        }
      }
      // Fallback for string steps
      if (typeof step === 'string') {
        return step;
      }
      return '';
    }).filter(item => item);
  }

  // Fallback to string parsing
  if (typeof steps === 'string') {
    return steps.split(/\n+/).map(item => item.trim()).filter(item => item);
  }

  return [];
}

export default function decorate(block) {
  const { appId, apiKey } = getCredentials(block);
  const indexName = getIndexName(block);
  const recipeId = getParamFromUrl('rid');

  const recipeContainer = document.createElement('div');
  recipeContainer.className = 'recipe-container';
  recipeContainer.innerHTML = `
    <nav class="recipe-breadcrumb" aria-label="Breadcrumb">
      <a href="/" class="breadcrumb-link">Home</a>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-current">Recipe</span>
    </nav>
    <div class="recipe-loading">Loading recipe...</div>
    <div class="recipe-error" style="display: none;"></div>
      <div class="recipe-content" style="display: none;">
      <div class="recipe-header-grid">
        <div class="recipe-image-wrapper">
          <picture class="recipe-image"></picture>
        </div>
        <div class="recipe-details">
          <h1 class="recipe-name"></h1>
          <div class="recipe-category"></div>
          <div class="recipe-meta"></div>
          <div class="recipe-description"></div>
        </div>
      </div>
      <div class="recipe-sections-grid">
        <div class="recipe-section recipe-ingredients-section">
          <h2 class="recipe-section-title">Ingredients</h2>
          <ul class="recipe-ingredients-list"></ul>
        </div>
        <div class="recipe-section recipe-instructions-section">
          <h2 class="recipe-section-title">Instructions</h2>
          <ol class="recipe-instructions-list"></ol>
        </div>
      </div>
    </div>
  `;
  block.textContent = '';
  block.appendChild(recipeContainer);

  if (!recipeId) {
    const errorDiv = recipeContainer.querySelector('.recipe-error');
    const loadingDiv = recipeContainer.querySelector('.recipe-loading');
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Recipe ID (rid) parameter is required in the URL.';
    return;
  }

  if (!appId || !apiKey || !indexName) {
    const errorDiv = recipeContainer.querySelector('.recipe-error');
    const loadingDiv = recipeContainer.querySelector('.recipe-loading');
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Algolia credentials and index name are required.';
    return;
  }

  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.log('[Recipe] Starting recipe fetch:', { recipeId, indexName, appId: appId ? 'present' : 'missing', apiKey: apiKey ? 'present' : 'missing' });
    const searchClient = createAlgoliaClient(appId, apiKey);

    fetchObjectById(searchClient, indexName, recipeId)
      .then((recipe) => {
        // eslint-disable-next-line no-console
        console.log('[Recipe] Recipe fetched successfully:', { objectID: recipe?.objectID, name: recipe?.name || recipe?.title });
        const loadingDiv = recipeContainer.querySelector('.recipe-loading');
        const errorDiv = recipeContainer.querySelector('.recipe-error');
        const contentDiv = recipeContainer.querySelector('.recipe-content');

        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        contentDiv.style.display = 'grid';

        // Set recipe name
        const nameElement = recipeContainer.querySelector('.recipe-name');
        nameElement.textContent = recipe.name || recipe.title || 'Recipe';

        // Update breadcrumb with recipe name
        const breadcrumbCurrent = recipeContainer.querySelector('.breadcrumb-current');
        if (breadcrumbCurrent) {
          breadcrumbCurrent.textContent = recipe.name || recipe.title || 'Recipe';
        }

        // Set recipe category
        const categoryElement = recipeContainer.querySelector('.recipe-category');
        if (recipe.category || recipe.cuisine) {
          categoryElement.textContent = recipe.category || recipe.cuisine;
          categoryElement.style.display = 'block';
        } else {
          categoryElement.style.display = 'none';
        }

        // Set recipe meta information
        const metaElement = recipeContainer.querySelector('.recipe-meta');
        const metaItems = [];

        // Handle attrs array (new format)
        if (Array.isArray(recipe.attrs) && recipe.attrs.length > 0) {
          recipe.attrs.forEach((attr) => {
            if (attr.key && attr.val) {
              metaItems.push(`<div class="recipe-meta-item"><strong>${attr.key}:</strong> ${attr.val}</div>`);
            }
          });
        }

        // Fallback to old format fields
        if (metaItems.length === 0) {
          if (recipe.servings) {
            metaItems.push(`<div class="recipe-meta-item"><strong>Servings:</strong> ${recipe.servings}</div>`);
          }
          if (recipe.cookingTime || recipe.time || recipe.prepTime) {
            const time = recipe.cookingTime || recipe.time || recipe.prepTime;
            metaItems.push(`<div class="recipe-meta-item"><strong>Time:</strong> ${time}</div>`);
          }
          if (recipe.difficulty || recipe.level) {
            const difficulty = recipe.difficulty || recipe.level;
            metaItems.push(`<div class="recipe-meta-item"><strong>Difficulty:</strong> ${difficulty}</div>`);
          }
        }

        if (metaItems.length > 0) {
          metaElement.innerHTML = metaItems.join('');
          metaElement.style.display = 'flex';
        } else {
          metaElement.style.display = 'none';
        }

        // Set recipe description
        const descriptionElement = recipeContainer.querySelector('.recipe-description');
        const description = recipe.description || recipe.summary || recipe.name || 'No description available.';
        descriptionElement.innerHTML = description;

        // Set recipe image
        const imageWrapper = recipeContainer.querySelector('.recipe-image-wrapper');
        const pictureElement = recipeContainer.querySelector('.recipe-image');
        if (recipe.image || recipe.imageUrl) {
          const imageUrl = transformRecipeImagePath(recipe.image || recipe.imageUrl);
          const alt = recipe.name || recipe.title || 'Recipe image';
          const imgElement = createImageElement(imageUrl, alt, true, [{ width: '750' }]);
          pictureElement.replaceWith(imgElement);
        } else {
          imageWrapper.style.display = 'none';
        }

        // Set ingredients
        const ingredientsList = recipeContainer.querySelector('.recipe-ingredients-list');
        const ingredients = formatIngredients(recipe.ingredients || recipe.ingredient || [], recipe.steps);
        if (ingredients.length > 0) {
          ingredients.forEach((ingredient) => {
            const li = document.createElement('li');
            // Handle both string and object formats
            if (typeof ingredient === 'string') {
              li.textContent = ingredient;
            } else if (ingredient && typeof ingredient === 'object') {
              // Format: "quantity unit ingredient" (e.g., "100 g cucumber")
              const quantity = ingredient.quantity || '';
              const unit = ingredient.unit || '';
              const name = ingredient.ingredient || ingredient.name || '';
              const formatted = [quantity, unit, name].filter(Boolean).join(' ');
              li.textContent = formatted;
            }
            ingredientsList.appendChild(li);
          });
        } else {
          const ingredientsSection = recipeContainer.querySelector('.recipe-ingredients-section');
          ingredientsSection.style.display = 'none';
        }

        // Set instructions
        const instructionsList = recipeContainer.querySelector('.recipe-instructions-list');
        const instructions = formatInstructions(recipe.steps || recipe.instructions || recipe.directions || []);
        if (instructions.length > 0) {
          instructions.forEach((instruction) => {
            const li = document.createElement('li');
            li.innerHTML = instruction;
            instructionsList.appendChild(li);
          });
        } else {
          const instructionsSection = recipeContainer.querySelector('.recipe-instructions-section');
          instructionsSection.style.display = 'none';
        }
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('[Recipe] Error fetching recipe:', { error, errorMessage: error?.message, errorStatus: error?.status, errorName: error?.name, errorStack: error?.stack, recipeId });
        const loadingDiv = recipeContainer.querySelector('.recipe-loading');
        const errorDiv = recipeContainer.querySelector('.recipe-error');
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';

        // Provide user-friendly error message
        let errorMessage = 'Recipe not found';
        if (error.message) {
          if (error.message.includes('not found') || error.status === 404) {
            errorMessage = `Recipe with ID "${recipeId}" was not found. Please check the recipe ID and try again.`;
          } else {
            errorMessage = `Error loading recipe: ${error.message}`;
          }
        }
        errorDiv.textContent = errorMessage;
      });
  }, 500);
}

