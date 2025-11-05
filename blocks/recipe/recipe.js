import '../../scripts/lib-algoliasearch.js';
import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function getTextContent(htmlElement) {
  const textContent = htmlElement.textContent.trim();
  htmlElement.textContent = '';
  return textContent;
}

function getCredentials(htmlElement) {
  const appId = getTextContent(htmlElement.children[0]);
  const apiKey = getTextContent(htmlElement.children[1]);
  return { appId, apiKey };
}

function getIndexName(htmlElement) {
  const indexName = getTextContent(htmlElement.children[2]);
  return indexName;
}

function getRecipeId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('rid');
}

function extractIngredientsFromSteps(steps) {
  if (!Array.isArray(steps)) {
    return [];
  }

  const ingredientsMap = new Map();

  steps.forEach((step) => {
    if (step.ingredient && step.quantity && step.unit) {
      const key = step.ingredient;
      if (ingredientsMap.has(key)) {
        const existing = ingredientsMap.get(key);
        existing.quantity += step.quantity;
      } else {
        ingredientsMap.set(key, {
          ingredient: step.ingredient,
          quantity: step.quantity,
          unit: step.unit,
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
        // If both title and explanation exist, combine them
        if (step.title && step.explanation) {
          return `${step.title}: ${step.explanation}`;
        }
        // Otherwise use whichever is available
        if (step.explanation) {
          return step.explanation;
        }
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
  const recipeId = getRecipeId();

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
    const { algoliasearch } = window;
    const searchClient = algoliasearch(appId, apiKey);
    const index = searchClient.initIndex(indexName);

    // Fetch recipe by objectID using getObject() method (primary method)
    // Fallback to filter search if getObject is not available
    let recipePromise;

    // Primary method: Use getObject() to fetch by objectID directly
    if (typeof index.getObject === 'function') {
      recipePromise = index.getObject(recipeId)
        .catch((error) => {
          // If getObject fails, fall back to filter search
          return index.search('', {
            filters: `objectID:${recipeId}`,
            hitsPerPage: 1,
          })
            .then((result) => {
              const recipe = result.hits && result.hits.length > 0 ? result.hits[0] : null;
              if (recipe && recipe.objectID === recipeId) {
                return recipe;
              }
              throw new Error('Recipe not found');
            });
        });
    } else {
      // Fallback: Use filter search if getObject is not available
      recipePromise = index.search('', {
        filters: `objectID:${recipeId}`,
        hitsPerPage: 1,
      })
        .then((result) => {
          const recipe = result.hits && result.hits.length > 0 ? result.hits[0] : null;
          if (recipe && recipe.objectID === recipeId) {
            return recipe;
          }
          throw new Error('Recipe not found');
        });
    }

    recipePromise
      .then((recipe) => {
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
        descriptionElement.textContent = description;

        // Set recipe image
        const imageWrapper = recipeContainer.querySelector('.recipe-image-wrapper');
        const pictureElement = recipeContainer.querySelector('.recipe-image');
        if (recipe.image || recipe.imageUrl) {
          const imageUrl = recipe.image || recipe.imageUrl;
          const alt = recipe.name || recipe.title || 'Recipe image';
          
          // Check if image is from external domain (not same origin)
          try {
            const imageUrlObj = new URL(imageUrl, window.location.href);
            const isExternal = imageUrlObj.origin !== window.location.origin;
            
            if (isExternal) {
              // For external images, use simple img tag
              const img = document.createElement('img');
              img.src = imageUrl;
              img.alt = alt;
              img.loading = 'eager';
              img.style.width = '100%';
              img.style.height = 'auto';
              img.style.objectFit = 'contain';
              pictureElement.replaceWith(img);
            } else {
              // For same-domain images, use optimization
              const img = document.createElement('img');
              img.src = imageUrl;
              img.alt = alt;
              img.loading = 'eager';
              const optimizedPic = createOptimizedPicture(imageUrl, alt, false, [{ width: '750' }]);
              moveInstrumentation(img, optimizedPic.querySelector('img'));
              pictureElement.replaceWith(optimizedPic);
            }
          } catch (error) {
            // If URL parsing fails, use simple img tag
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = alt;
            img.loading = 'eager';
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.objectFit = 'contain';
            pictureElement.replaceWith(img);
          }
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
            li.textContent = instruction;
            instructionsList.appendChild(li);
          });
        } else {
          const instructionsSection = recipeContainer.querySelector('.recipe-instructions-section');
          instructionsSection.style.display = 'none';
        }
      })
      .catch((error) => {
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

