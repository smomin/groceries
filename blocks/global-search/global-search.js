import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-autocomplete.js';
import '../../scripts/lib-autocomplete-plugin-query-suggestions.js';
import '../../scripts/lib-autocomplete-plugin-recent-searches.js';
import { getTextContent, getCredentials, createAlgoliaClient, getParamFromUrl } from '../../scripts/blocks-utils.js';

export const SearchEvents = {
  QUERY_CHANGE: 'search:query:change',
  QUERY_SUBMIT: 'search:query:submit',
  INSTANTSEARCH_READY: 'search:instantsearch:ready',
  AUTOCOMPLETE_READY: 'search:autocomplete:ready',
  SEARCH_START: 'search:start',
  SEARCH_COMPLETE: 'search:complete',
  ERROR: 'search:error',
};

function getLayoutTemplate(htmlElement) {
  const layoutTemplate = getTextContent(htmlElement.children[2]);
  return { layoutTemplate };
}

function getSearchBox(htmlElement) {
  const placeholder = getTextContent(htmlElement.children[3]);
  return { placeholder };
}

function getSearchIndex(htmlElement) {
  const index = htmlElement.children[4];
  const indexName = getTextContent(index.children[0]);
  const hitTemplate = getTemplate(index.children[1]);
  const noResultsTemplate = getTemplate(index.children[2]);
  return { indexName, hitTemplate, noResultsTemplate };
}

function getTemplate(htmlElement) {
  return htmlElement ? getTextContent(htmlElement) : null;
}


export default function decorate(block) {
  if (block.children.length > 3) {
    const { algoliasearch } = window;
    const { autocomplete, getAlgoliaResults } = window['@algolia/autocomplete-js'];
    const { createQuerySuggestionsPlugin } = window['@algolia/autocomplete-plugin-query-suggestions'];
    const { createLocalStorageRecentSearchesPlugin } = window['@algolia/autocomplete-plugin-recent-searches'];

    const recipesIndexName = 'ag_recipes';
    const productsIndexName = 'ag_products';

    const { appId, apiKey } = getCredentials(block);
    getLayoutTemplate(block); // layoutTemplate not used
    const { placeholder } = getSearchBox(block);
    const { indexName } = getSearchIndex(block); // hitTemplate and noResultsTemplate not used

    // Set the InstantSearch index UI state from external events.
    const setInstantSearchUiState = (indexUiState) => {
      window.searchInstance.setUiState((uiState) => ({
        ...uiState,
        [indexName]: {
          ...uiState[indexName],
          // We reset the page when the search state changes.
          page: 1,
          ...indexUiState,
        },
      }));
    };

    const searchClient = createAlgoliaClient(appId, apiKey);

    const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
      key: 'navbar',
      limit: 3,
      transformSource({ source }) {
        return {
          ...source,
          templates: {
            ...source.templates,
            header({ createElement }) {
              return createElement(
                'div',
                {},
                createElement(
                  'span',
                  {
                    className: 'aa-SourceHeaderTitle',
                  },
                  'Recent Searches',
                ),
                createElement('div', {
                  className: 'aa-SourceHeaderLine',
                }),
              );
            },
          },
        };
      },
    });

    const querySuggestionsPlugin = createQuerySuggestionsPlugin({
      searchClient,
      indexName: `${indexName}_query_suggestions`,
      categoryAttribute: [indexName, 'facets', 'exact_matches', 'categories'],
      getSearchParams() {
        return {
          hitsPerPage: 3,
        };
      },
      transformSource({ source }) {
        return {
          ...source,
          // eslint-disable-next-line no-unused-vars, no-underscore-dangle
          onSelect({ item, setQuery: _setQuery }) {
            // eslint-disable-next-line no-underscore-dangle
            if (item.__autocomplete_qsCategory) {
              // eslint-disable-next-line no-underscore-dangle
              setUiState({ menu: { categories: item.__autocomplete_qsCategory } });
            }
          },
          templates: {
            ...source.templates,
            header({ createElement }) {
              return createElement(
                'div',
                {},
                createElement(
                  'span',
                  {
                    className: 'aa-SourceHeaderTitle',
                  },
                  'Suggestions',
                ),
                createElement('div', {
                  className: 'aa-SourceHeaderLine',
                }),
              );
            },
          },
        };
      },
    });

    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.id = 'autocomplete';

    block.appendChild(autocompleteContainer);

    setTimeout(() => {
      // Code to be executed after 3 seconds
      const autocompleteInstance = autocomplete({
        container: '#autocomplete',
        shouldPanelOpen: false,
        placeholder,
        openOnFocus: true,
        plugins: [recentSearchesPlugin, querySuggestionsPlugin],
        initialState: {
          query: getParamFromUrl('search') || '',
        },
        onSubmit({ state }) {
          setInstantSearchUiState({ query: state.query });
        },
        onReset() {
          setInstantSearchUiState({ query: '' });
        },
        onStateChange({ prevState, state }) {
          if (prevState.query !== state.query) {
            setInstantSearchUiState({ query: state.query });
          }
        },
        getSources({ query: searchQuery }) {
          return [
            {
              sourceId: 'recipes',
              getItems() {
                return getAlgoliaResults({
                  searchClient,
                  queries: [
                    {
                      indexName: recipesIndexName,
                      params: {
                        query: searchQuery,
                        hitsPerPage: 9,
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
                item({ item, components, html }) {
                  return html`<a
                      href="/recipes?rid=${item.objectID}"
                      class="u-flex u-align"
                      style="text-decoration: none; color: inherit;"
                    >
                      <img
                        src="${item.image}"
                        width="28px"
                      />
                      <h6>
                        ${components.Highlight({
                    hit: item,
                    attribute: 'name',
                  })}
                      </h6>
                    </a>`;
                },
              },
            },
            {
              sourceId: 'products',
              getItems() {
                return getAlgoliaResults({
                  searchClient,
                  queries: [
                    {
                      indexName: productsIndexName,
                      params: {
                        query: searchQuery,
                        hitsPerPage: 9,
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
                item({ item, components, html }) {
                  return html`<a
                      href="/products?pid=${item.objectID}"
                      class="u-flex u-align"
                      style="text-decoration: none; color: inherit;"
                    >
                      <img
                        src="${item.image}"
                        width="28px"
                      />
                      <h6>
                        ${components.Highlight({
                    hit: item,
                    attribute: 'name',
                  })}
                      </h6>
                    </a>`;
                },
              },
            },
          ];
        },
        navigator: {
          navigate({ itemUrl }) {
            window.location.assign(itemUrl);
          },
          navigateNewTab({ itemUrl }) {
            const windowReference = window.open(itemUrl, '_blank', 'noopener');

            if (windowReference) {
              windowReference.focus();
            }
          },
          navigateNewWindow({ itemUrl }) {
            window.open(itemUrl, '_blank', 'noopener');
          },
        },
        render({ elements, render, html }, root) {
          const {
            recentSearchesPlugin: recentPlugin,
            querySuggestionsPlugin: suggestionsPlugin,
          } = elements;
          render(
            html`
            <div class="aa-PanelLayout aa-Panel--scollable">
                <div class="recipes-col">${elements.recipes}</div>
                <div class="products-col">${elements.products}</div>
              <div class="query-recent-col">
                  ${recentPlugin}
                  ${suggestionsPlugin}
              </div>  
            </div>
            `,
            root,
          );
        },
      });

      // This keeps Autocomplete aware of state changes coming from routing
      // and updates its query accordingly
      window.addEventListener('popstate', () => {
        autocompleteInstance.setQuery(window.searchInstance.helper?.state.query || '');
      });

      // Close the autocomplete panel when scrolling
      let scrollTimeout;
      const handleScroll = () => {
        // Clear any existing timeout
        clearTimeout(scrollTimeout);
        // Debounce to avoid excessive calls
        scrollTimeout = setTimeout(() => {
          // Try to close via setIsOpen if available
          if (autocompleteInstance.setIsOpen) {
            autocompleteInstance.setIsOpen(false);
          }
          // Also blur the input to ensure panel closes (since openOnFocus is true)
          const autocompleteEl = document.querySelector('#autocomplete');
          if (autocompleteEl) {
            const input = autocompleteEl.querySelector('input');
            if (input) {
              input.blur();
            }
          }
        }, 10);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
    }, 500);
  }
}
