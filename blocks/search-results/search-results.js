import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import { addToCart } from '../../scripts/cart.js';

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

  setTimeout(() => {
    const { connectSearchBox } = instantsearch.connectors;
    const { hits, pagination, configure } = instantsearch.widgets;

    const searchClient = algoliasearch(
      appId,
      apiKey,
    );

    const search = instantsearch({
      searchClient,
      indexName,
      stateMapping: instantsearch.stateMappings.singleIndex(indexName)
    });

    // Mount a virtual search box to manipulate InstantSearch's `query` UI
    // state parameter.
    const virtualSearchBox = connectSearchBox(() => {});

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
          item(hit, { html, components }) {
            return html`
                <div class="product-card">
                  <img class="product-card__image" src="${hit.image}" alt="${hit.name}" />
                  <div class="product-card__category">${hit.categories.lvl0}</div>
                  <div class="product-card__name">${components.Highlight({ attribute: 'name', hit })}</div>
                  ${hit.brand
    ? html`<div class="vendor">
                      <span class="vendor-label">By</span> <span style="color: #00b207;">${hit.brand}</span>
                  </div>`
    : ''
}
                  <div class="product-card__footer">
                      <div class="price-container">
                          <span class="current-price">${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(hit.price)}</span>
                      </div>
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
              </div>`;
          },
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

    // Handle "Add to cart" button clicks using event delegation
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

        const cartItem = addToCart(productData);
        if (cartItem) {
          // Visual feedback - match agent experience
          const originalText = addToCartButton.textContent;
          addToCartButton.textContent = 'Added!';
          addToCartButton.style.backgroundColor = '#00b207';
          addToCartButton.style.color = '#ffffff';

          setTimeout(() => {
            addToCartButton.textContent = originalText;
            addToCartButton.style.backgroundColor = '';
            addToCartButton.style.color = '';
          }, 1000);
        }
      }
    });
  }, 500);
}
