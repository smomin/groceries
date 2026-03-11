import { transformProductImagePath } from '../../../scripts/blocks-utils.js';

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
         class="algolia-analytics">
      <a href="/products?pid=${item.objectID}"
         class="u-flex u-align product-click"
         style="text-decoration: none; color: inherit;">
        <img src="${productImage}" width="28px" alt="${item.name || 'Product'}"
        />
        <h6>${components.Highlight({ hit: item, attribute: 'name' })}</h6>
      </a>
    </div>`;
}

function noResultsTemplate({ state, render }, root) {
  render(`No products found for "${state.query}".`, root);
}

export default function source(
  searchClient,
  getAlgoliaResults,
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
              hitsPerPage: 6,
              analytics: true,
              enablePersonalization: true,
              clickAnalytics: true,
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
