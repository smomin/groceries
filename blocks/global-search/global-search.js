import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-autocomplete.js';
import '../../scripts/lib-autocomplete-plugin-query-suggestions.js';
import '../../scripts/lib-autocomplete-plugin-recent-searches.js';
import {
  getTextContent,
  getCredentials,
  createAlgoliaClient,
  getParamFromUrl
} from '../../scripts/blocks-utils.js';

export const SearchEvents = {
  QUERY_CHANGE: 'search:query:change',
  QUERY_SUBMIT: 'search:query:submit',
  INSTANTSEARCH_READY: 'search:instantsearch:ready',
  AUTOCOMPLETE_READY: 'search:autocomplete:ready',
  SEARCH_START: 'search:start',
  SEARCH_COMPLETE: 'search:complete',
  ERROR: 'search:error',
};

function getSearchIndex(htmlElement, count) {
  const index = htmlElement.children[count];
  const indexName = getTextContent(index.children[0]);
  const hitTemplate = getTextContent(index.children[1]);
  const noResultsTemplate = getTextContent(index.children[2]);
  return { indexName, hitTemplate, noResultsTemplate };
}

function getLayoutTemplate(htmlElement) {
  const layoutTemplate = getTextContent(htmlElement.children[2]);
  return { layoutTemplate };
}

function getSourceNames(htmlElement) {
  const sourceNames = getTextContent(htmlElement.children[3]);
  return { sourceNames };
}

function getQuerySuggestionsIndexName(htmlElement) {
  const querySuggestionsIndexName = getTextContent(htmlElement.children[4]);
  return { querySuggestionsIndexName };
}

function getPlaceholder(htmlElement) {
  const placeholder = getTextContent(htmlElement.children[5]);
  return { placeholder };
}

export default async function decorate(block) {
  if (block.children.length > 3) {
    const { autocomplete, getAlgoliaResults } = window['@algolia/autocomplete-js'];
    const { createQuerySuggestionsPlugin } = window['@algolia/autocomplete-plugin-query-suggestions'];
    const { createLocalStorageRecentSearchesPlugin } = window['@algolia/autocomplete-plugin-recent-searches'];

    const { appId, apiKey } = getCredentials(block);
    const { placeholder } = getPlaceholder(block);
    const { layoutTemplate } = getLayoutTemplate(block);

    const searchClient = createAlgoliaClient(appId, apiKey);
    const { layoutTemplateFunction } = await import(`./templates/layout/${layoutTemplate}.js`);
    const { sourceNames } = getSourceNames(block);
    const { querySuggestionsIndexName } = getQuerySuggestionsIndexName(block);

    const sources = await Promise.all(sourceNames.split(',').map(async (sourceName, index) => {
      const { source } = await import(`./sources/${sourceName}.js`);
      const { indexName, hitTemplate, noResultsTemplate } = getSearchIndex(block, index + 6);

      const { itemTemplateFunction } = await import(`./templates/hit/${hitTemplate}.js`);
      const { noResultsTemplateFunction } = await import(`./templates/noresults/${noResultsTemplate}.js`);
      const sourceFunction = source(searchClient, getAlgoliaResults, indexName, itemTemplateFunction, noResultsTemplateFunction);
      return { source: sourceFunction, indexName };
    })) || [];

    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.id = 'autocomplete';

    block.appendChild(autocompleteContainer);

    // Set the InstantSearch index UI state from external events.
    const setInstantSearchUiState = (indexUiState) => {
      // Only update UI state if InstantSearch instance exists (e.g., on search results page)
      if (window.searchInstance && typeof window.searchInstance.setUiState === 'function') {
        window.searchInstance.setUiState((uiState) => {
          sources.forEach(source => {
            uiState[source.indexName] = {
              ...uiState[source.indexName],
              page: 1,
              ...indexUiState,
            };
          });
          return uiState;
        });
      }
    };

    const plugins = [];
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
    plugins.push(recentSearchesPlugin);

    if (querySuggestionsIndexName) {
      const querySuggestionsPlugin = createQuerySuggestionsPlugin({
        searchClient,
        indexName: querySuggestionsIndexName,
        categoryAttribute: ['facets', 'exact_matches', 'categories'],
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
                setInstantSearchUiState({ menu: { categories: item.__autocomplete_qsCategory } });
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
      plugins.push(querySuggestionsPlugin);
    }

    setTimeout(async () => {
      // Code to be executed after 3 seconds
      const autocompleteInstance = autocomplete({
        container: '#autocomplete',
        shouldPanelOpen: false,
        placeholder,
        openOnFocus: true,
        plugins,
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
            ...sources.map(source => source.source({ searchQuery })),
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
        render: layoutTemplateFunction
      });

      // This keeps Autocomplete aware of state changes coming from routing
      // and updates its query accordingly
      window.addEventListener('popstate', () => {
        if (window.searchInstance?.helper?.state?.query) {
          autocompleteInstance.setQuery(window.searchInstance.helper.state.query);
        }
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
