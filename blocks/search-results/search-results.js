import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import { getTextContent, getCredentials, getIndexName, createAlgoliaClient, formatPrice, handleAddToCart, transformRecipeImagePath } from '../../scripts/blocks-utils.js';

function getSearchBox(htmlElement) {
  const placeholder = getTextContent(htmlElement.children[2]);
  return { placeholder };
}

function getSearchIndex(htmlElement) {
  const index = htmlElement.children[3];
  const indexName = getTextContent(index.children[0]);
  const hitTemplate = getTextContent(index.children[1]);
  const noResultsTemplate = getTextContent(index.children[2]);
  return { indexName, hitTemplate, noResultsTemplate };
}

export default function decorate(block) {
  const searchContainer = document.createElement('div');
  searchContainer.innerHTML = `
    <div class="products-grid">
      <div>
        <div id="hits"></div>
        <div id="pagination"></div>
      </div>
    </div>
  `;
  block.appendChild(searchContainer);

  const { appId, apiKey } = getCredentials(block);
  getSearchBox(block);
  const { indexName } = getSearchIndex(block);

  // Determine if this is a products or recipes index
  const isRecipesIndex = indexName === 'ag_recipes';
  const isProductsIndex = indexName === 'ag_products';

  setTimeout(() => {
    const { connectSearchBox } = instantsearch.connectors;
    const { hits, pagination, configure } = instantsearch.widgets;

    const searchClient = createAlgoliaClient(appId, apiKey);

    const search = instantsearch({
      searchClient,
      indexName,
      stateMapping: instantsearch.stateMappings.singleIndex(indexName),
    });

    // Mount a virtual search box to manipulate InstantSearch's `query` UI
    // state parameter.
    const virtualSearchBox = connectSearchBox(() => {});

    // Create product template
    const productTemplate = (hit, { html, components }) => {
      return html`
        <div class="product-card">
          <img class="product-card__image" src="${hit.image}" alt="${hit.name}" />
          <div class="product-card__category">${hit.categories?.lvl0 || ''}</div>
          <div class="product-card__name">${components.Highlight({ attribute: 'name', hit })}</div>
          ${hit.brand
            ? html`<div class="vendor">
                <span class="vendor-label">By</span> <span style="color: #00b207;">${hit.brand}</span>
              </div>`
            : ''
          }
            <div class="product-card__footer">
            <div class="price-container">
              <span class="current-price">${formatPrice(hit.price)}</span>
            </div>
            <div class="product-card__actions">
              <a href="/products?pid=${hit.objectID}" class="view-product-btn">
                View
              </a>
              <button class="add-btn" 
                      data-product-id="${hit.objectID}"
                      data-product-name="${hit.name}"
                      data-product-price="${hit.price}"
                      data-product-description="${hit.description || hit.name}"
                      data-product-image="${hit.image}">
                <span class="cart-icon"></span>
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>`;
    };

    // Create recipe template
    const recipeTemplate = (hit, { html, components }) => {
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
        <div class="recipe-card">
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
    };

    // Select template based on index type
    const itemTemplate = isRecipesIndex ? recipeTemplate : productTemplate;

    search.addWidgets([
      virtualSearchBox({}),
      configure({
        hitsPerPage: 12,
      }),
      hits({
        container: '#hits',
        cssClasses: {
          list: 'products-grid',
          root: 'container',
        },
        templates: {
          item: itemTemplate,
        },
      }),
      pagination({
        container: '#pagination',
        showFirst: false,
        showLast: false,
        templates: {
          previous: '‹ Previous',
          next: 'Next ›',
        },
        scrollTo: document.querySelector('.products-grid'),
      }),
    ]);

    search.start();

    window.searchInstance = search;

    // Handle "Add to cart" button clicks using event delegation (only for products)
    if (isProductsIndex) {
      searchContainer.addEventListener('click', (event) => {
        const addToCartButton = event.target.closest('.add-btn');
        if (addToCartButton) {
          event.preventDefault();
          event.stopPropagation();

          const productData = {
            objectID: addToCartButton.dataset.productId,
            name: addToCartButton.dataset.productName,
            price: parseFloat(addToCartButton.dataset.productPrice) || 0,
            description: addToCartButton.dataset.productDescription,
            image: addToCartButton.dataset.productImage,
          };

          handleAddToCart(addToCartButton, productData);
        }
      });
    }
  }, 500);
}
