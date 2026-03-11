import { transformRecipeImagePath } from '../../../scripts/blocks-utils.js';

export const SOURCE_INDEX_NAME = 'SW-Groceries-PROD-US-EN-Recipes';

function itemTemplate({
  item, html, components,
}) {
  const recipeImage = item.image ? transformRecipeImagePath(item.image) : '';
  // eslint-disable-next-line no-underscore-dangle
  const autocompleteIndexName = item.__autocomplete_indexName;
  // eslint-disable-next-line no-underscore-dangle
  const autocompleteQueryId = item.__autocomplete_queryID;
  return html`
      <div data-indexname="${autocompleteIndexName}"
           data-insights-query-id="${autocompleteQueryId}"
           data-insights-object-id="${item.objectID}"
           class="algolia-analytics">
        <a href="/recipes?rid=${item.objectID}"
           class="u-flex u-align recipe-click"
           style="text-decoration: none; color: inherit;">
          <img src="${recipeImage}" width="28px" alt="${item.name || 'Recipe'}"
          />
          <h6>${components.Highlight({ hit: item, attribute: 'name' })}</h6>
        </a>
      </div>`;
}

function noResultsTemplate({ state, render }, root) {
  render(`No recipes found for "${state.query}".`, root);
}

export default function source(
  searchClient,
  getAlgoliaResults,
) {
  return ({ searchQuery }) => ({
    sourceId: 'recipes',
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
            },
          },
        ],
      });
    },
    getItemUrl({ item }) {
      return `/recipes?rid=${item.objectID}`;
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
            'Recipes',
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
