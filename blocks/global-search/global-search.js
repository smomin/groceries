import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-autocomplete.js';
import '../../scripts/lib-autocomplete-plugin-query-suggestions.js';
import '../../scripts/lib-autocomplete-plugin-recent-searches.js';
import {
  getTextContent,
  createAlgoliaClient,
  getParamFromUrl,
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

function parseSourceConfigsFromRows(rows) {
  return rows
    .map((row) => {
      const cells = Array.from(row.children || []).map((cell) => getTextContent(cell));
      if (cells.length < 3) return null;
      const [indexName, hitTemplate, noResultsTemplate] = cells;
      if (!indexName || !hitTemplate || !noResultsTemplate) return null;
      return { indexName, hitTemplate, noResultsTemplate };
    })
    .filter(Boolean);
}

function getGlobalSearchConfig(block) {
  const config = {
    appId: '',
    apiKey: '',
    layoutTemplate: '',
    sourceNames: '',
    querySuggestionsIndexName: '',
    placeholder: '',
    sourceConfigs: [],
  };

  const rows = Array.from(block.children || []);
  const knownKeys = new Set([
    'appId',
    'apiKey',
    'layoutTemplate',
    'sources',
    'querySuggestionsIndexName',
  ]);
  const sourceRows = [];

  rows.forEach((row) => {
    const cells = Array.from(row.children || []).map((cell) => getTextContent(cell));
    if (!cells.length) return;

    if (cells.length >= 2 && knownKeys.has(cells[0])) {
      const [, value = ''] = cells;
      if (cells[0] === 'sources') config.sourceNames = value;
      else config[cells[0]] = value;
      return;
    }

    if (cells.length === 1 && !config.placeholder) {
      [config.placeholder] = cells;
      return;
    }

    if (cells.length >= 3) {
      sourceRows.push(row);
    }
  });

  config.sourceConfigs = parseSourceConfigsFromRows(sourceRows);

  return config;
}

export default async function decorate(block) {
  if (block.children.length > 3) {
    const { autocomplete, getAlgoliaResults } = window['@algolia/autocomplete-js'];
    const { createQuerySuggestionsPlugin } = window['@algolia/autocomplete-plugin-query-suggestions'];
    const { createLocalStorageRecentSearchesPlugin } = window['@algolia/autocomplete-plugin-recent-searches'];

    const {
      appId,
      apiKey,
      placeholder,
      layoutTemplate,
      sourceNames,
      querySuggestionsIndexName,
      sourceConfigs,
    } = getGlobalSearchConfig(block);

    const searchClient = createAlgoliaClient(appId, apiKey);
    const { default: layoutTemplateFunction } = await import(`./templates/layout/${layoutTemplate}.js`);

    const normalizedSourceNames = sourceNames
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    if (!appId || !apiKey || !layoutTemplate || !normalizedSourceNames.length) {
      return;
    }

    const sources = await Promise.all(normalizedSourceNames.map(async (sourceName, index) => {
      const { default: source } = await import(`./sources/${sourceName}.js`);
      const { indexName, hitTemplate, noResultsTemplate } = sourceConfigs[index] || {};
      if (!indexName || !hitTemplate || !noResultsTemplate) return null;

      const { default: itemTemplateFunction } = await import(`./templates/hit/${hitTemplate}.js`);
      const { default: noResultsTemplateFunction } = await import(`./templates/noresults/${noResultsTemplate}.js`);
      const sourceFunction = source(
        searchClient,
        getAlgoliaResults,
        indexName,
        itemTemplateFunction,
        noResultsTemplateFunction,
      );
      return { source: sourceFunction, indexName };
    })) || [];
    const validSources = sources.filter(Boolean);

    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.id = 'autocomplete';

    block.appendChild(autocompleteContainer);

    // Set the InstantSearch index UI state from external events.
    const setInstantSearchUiState = (indexUiState) => {
      // Only update UI state if InstantSearch instance exists (e.g., on search results page)
      if (window.searchInstance && typeof window.searchInstance.setUiState === 'function') {
        window.searchInstance.setUiState((uiState) => {
          validSources.forEach((source) => {
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
            ...validSources.map((source) => source.source({ searchQuery })),
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
        render: layoutTemplateFunction,
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
