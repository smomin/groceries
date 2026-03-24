import { transformRecipeImagePath } from '../../../scripts/blocks-utils.js';

export const SOURCE_INDEX_NAME = 'SW-Groceries-PROD-US-EN-Recipes';

function toPlainText(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function itemTemplate({
  item, html, components,
}) {
  const recipeImage = item.image ? transformRecipeImagePath(item.image) : '';
  const recipeDescription = toPlainText(item.description);
  // eslint-disable-next-line no-underscore-dangle
  const autocompleteIndexName = item.__autocomplete_indexName;
  // eslint-disable-next-line no-underscore-dangle
  const autocompleteQueryId = item.__autocomplete_queryID;
  return html`
      <div data-indexname="${autocompleteIndexName}"
           data-insights-query-id="${autocompleteQueryId}"
           data-insights-object-id="${item.objectID}"
           class="algolia-analytics search-hit search-hit--recipe">
        <a href="/recipes?rid=${item.objectID}"
           class="search-hit__link recipe-click">
          <img
            class="search-hit__thumb search-hit__thumb--recipe"
            src="${recipeImage}"
            alt="${item.name || 'Recipe'}"
          />
          <div class="search-hit__content">
            <h6 class="search-hit__title">${components.Highlight({ hit: item, attribute: 'name' })}</h6>
            ${recipeDescription ? html`<p class="search-hit__meta">${recipeDescription}</p>` : ''}
          </div>
        </a>
      </div>`;
}

function noResultsTemplate({ state, render }, root) {
  render(`No recipes found for "${state.query}".`, root);
}

export default function source(
  searchClient,
  getAlgoliaResults,
  userToken,
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
              ...(userToken ? { userToken } : {}),
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
      renderNoResults: noResultsTemplate,
    },
  });
}
