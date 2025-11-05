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

function formatIngredients(ingredients) {
  if (Array.isArray(ingredients)) {
    return ingredients;
  }
  if (typeof ingredients === 'string') {
    return ingredients.split(',').map(item => item.trim()).filter(item => item);
  }
  return [];
}

function formatInstructions(instructions) {
  if (Array.isArray(instructions)) {
    return instructions;
  }
  if (typeof instructions === 'string') {
    return instructions.split(/\n+/).map(item => item.trim()).filter(item => item);
  }
  return [];
}

export default function decorate(block) {
  const recipeContainer = document.createElement('div');
  recipeContainer.className = 'recipe-container';
  recipeContainer.innerHTML = `
    <div class="recipe-loading">Loading recipe...</div>
    <div class="recipe-error" style="display: none;"></div>
    <div class="recipe-content" style="display: none;">
      <div class="recipe-image-wrapper">
        <picture class="recipe-image"></picture>
      </div>
      <div class="recipe-details">
        <h1 class="recipe-name"></h1>
        <div class="recipe-category"></div>
        <div class="recipe-meta"></div>
        <div class="recipe-description"></div>
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

  const { appId, apiKey } = getCredentials(block);
  const indexName = getIndexName(block);
  const recipeId = getRecipeId();

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

    index.getObject(recipeId)
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
          const img = document.createElement('img');
          img.src = recipe.image || recipe.imageUrl;
          img.alt = recipe.name || recipe.title || 'Recipe image';
          img.loading = 'eager';
          const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
          moveInstrumentation(img, optimizedPic.querySelector('img'));
          pictureElement.replaceWith(optimizedPic);
        } else {
          imageWrapper.style.display = 'none';
        }

        // Set ingredients
        const ingredientsList = recipeContainer.querySelector('.recipe-ingredients-list');
        const ingredients = formatIngredients(recipe.ingredients || recipe.ingredient || []);
        if (ingredients.length > 0) {
          ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            ingredientsList.appendChild(li);
          });
        } else {
          const ingredientsSection = recipeContainer.querySelector('.recipe-ingredients-section');
          ingredientsSection.style.display = 'none';
        }

        // Set instructions
        const instructionsList = recipeContainer.querySelector('.recipe-instructions-list');
        const instructions = formatInstructions(recipe.instructions || recipe.steps || recipe.directions || []);
        if (instructions.length > 0) {
          instructions.forEach(instruction => {
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
        errorDiv.textContent = `Error loading recipe: ${error.message || 'Recipe not found'}`;
        // eslint-disable-next-line no-console
        console.error('Error fetching recipe:', error);
      });
  }, 500);
}

