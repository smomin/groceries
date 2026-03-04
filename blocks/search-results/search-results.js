import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import {
  getTextContent,
  getHTMLContent,
  getCredentials,
  getIndexName,
  createAlgoliaClient,
  formatPrice,
  handleAddToCart,
  transformRecipeImagePath,
  transformProductImagePath,
} from '../../scripts/blocks-utils.js';

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
  const { appId, apiKey } = getCredentials(block);
  getSearchBox(block);
  const { indexName, hitTemplate, noResultsTemplate } = getSearchIndex(block);

  // block.innerHTML = '';
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

  setTimeout(async () => {
    const { connectSearchBox } = instantsearch.connectors;
    const { hits, pagination, configure } = instantsearch.widgets;

    const searchClient = createAlgoliaClient(appId, apiKey);
    const search = instantsearch({
      searchClient,
      indexName,
      stateMapping: instantsearch.stateMappings.singleIndex(indexName)
    });

    // Mount a virtual search box to manipulate InstantSearch's `query` UI
    // state parameter.
    const virtualSearchBox = connectSearchBox(() => {});

    const { itemTemplateFunction } = await import(`./templates/hit/${hitTemplate}.js`);
    const { noResultsTemplateFunction } = await import(`./templates/noresults/${noResultsTemplate}.js`);

    search.addWidgets([
      virtualSearchBox({}),
      configure({
        hitsPerPage: 12,
        analytics: true,
        enablePersonalization: true,
        clickAnalytics: true,
      }),
      hits({
        container: '#hits',
        cssClasses: {
          list: 'products-grid',
          root: 'container',
        },
        templates: {
          item: itemTemplateFunction,
          noResults: noResultsTemplateFunction,
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
  }, 500);
}
