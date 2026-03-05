import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import {
  getTextContent,
  getCredentials,
  createAlgoliaClient,
  handleAddToCart,
} from '../../scripts/blocks-utils.js';

function getSearchBox(htmlElement) {
  const { searchBox } = instantsearch.widgets;
  const { connectSearchBox } = instantsearch.connectors;
  const placeholder = getTextContent(htmlElement.children[2]);
  return (placeholder) ? searchBox({ 
    container: '#searchbox', 
    placeholder 
  }) : connectSearchBox(() => {})({});
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
  const { indexName, hitTemplate, noResultsTemplate } = getSearchIndex(block);

  // block.innerHTML = '';
  const searchContainer = document.createElement('div');
  searchContainer.innerHTML = `
    <div class="products-grid" data-indexname="${indexName}">
      <div>
        <div id="searchbox"></div>
        <div id="hits"></div>
        <div id="pagination"></div>
      </div>
    </div>
  `;
  block.appendChild(searchContainer);

  setTimeout(async () => {
    const {
      hits, pagination, configure, index,
    } = instantsearch.widgets;

    const searchClient = createAlgoliaClient(appId, apiKey);
    const search = instantsearch({
      searchClient,
      indexName,
      stateMapping: instantsearch.stateMappings.singleIndex(indexName),
    });

    const searchBox = getSearchBox(block);
    const { default: itemTemplateFunction } = await import(`./templates/hit/${hitTemplate}.js`);
    const { default: noResultsTemplateFunction } = await import(`./templates/noresults/${noResultsTemplate}.js`);

    search.addWidgets([
      searchBox,
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
