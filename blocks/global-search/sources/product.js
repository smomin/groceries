import { transformProductImagePath, formatPrice } from '../../../scripts/blocks-utils.js';

export const SOURCE_INDEX_NAME = 'SW_Groceries_Products';

function itemTemplate({
  item, html, components,
}) {
  const productImage = transformProductImagePath(item.image);
  // eslint-disable-next-line no-underscore-dangle
  const autocompleteIndexName = item.__autocomplete_indexName;
  // eslint-disable-next-line no-underscore-dangle
  const autocompleteQueryId = item.__autocomplete_queryID;
  return html`
    <div data-indexname="${autocompleteIndexName}"
         data-insights-query-id="${autocompleteQueryId}"
         data-insights-object-id="${item.objectID}"
         class="algolia-analytics search-hit search-hit--product">
      <a href="/products?pid=${item.objectID}"
         class="search-hit__thumb-link product-click"
         tabindex="-1"
         aria-hidden="true">
        <img
          class="search-hit__thumb search-hit__thumb--product"
          src="${productImage}"
          alt=""
        />
      </a>
      <div class="search-hit__body">
        <a href="/products?pid=${item.objectID}"
           class="search-hit__title-link product-click">
          <h6 class="search-hit__title">${components.Highlight({ hit: item, attribute: 'name' })}</h6>
          ${item.brand ? html`<p class="search-hit__meta">${item.brand}</p>` : ''}
        </a>
        <div class="search-hit__price-row">
          <p class="search-hit__price">${formatPrice(item.price)}</p>
          <button class="search-hit__add-btn"
                  type="button"
                  aria-label="Add to cart"
                  title="Add to cart"
                  data-product-id="${item.objectID}"
                  data-product-name="${item.name}"
                  data-product-price="${item.price}"
                  data-product-description="${item.description || item.name}"
                  data-product-image="${productImage}">
            <span class="search-hit__cart-icon" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>`;
}

function noResultsTemplate({ state, render }, root) {
  render(`No products found for "${state.query}".`, root);
}

export default function source(
  searchClient,
  getAlgoliaResults,
  userToken,
) {
  return ({ searchQuery }) => ({
    sourceId: 'products',
    getItems() {
      return getAlgoliaResults({
        searchClient,
        queries: [
          {
            indexName: SOURCE_INDEX_NAME,
            params: {
              query: searchQuery,
              hitsPerPage: 4,
              analytics: true,
              enablePersonalization: true,
              clickAnalytics: true,
              ...(userToken ? { userToken } : {}),
            },
          },
        ],
      });
    },
    getItemUrl({ item }) {
      return `/products?pid=${item.objectID}`;
    },
    templates: {
      header({ createElement }) {
        return createElement(
          'div',
          {},
          createElement(
            'span',
            {
              className: 'aa-SourceHeaderTitle',
            },
            'Products',
          ),
          createElement('div', {
            className: 'aa-SourceHeaderLine',
          }),
        );
      },
      item: itemTemplate,
      noResults: noResultsTemplate,
    },
  });
}
