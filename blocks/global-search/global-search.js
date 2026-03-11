import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-autocomplete.js';
import '../../scripts/lib-autocomplete-plugin-query-suggestions.js';
import '../../scripts/lib-autocomplete-plugin-recent-searches.js';
import {
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
      const cells = Array.from(row.children || []).map((cell) => cell.textContent?.trim() || '');
      if (!cells.length) return null;
      const sourceName = cells[cells.length - 1];
      if (!sourceName) return null;
      return { sourceName };
    })
    .filter(Boolean);
}

function parseSourceList(sourcesValue = '') {
  return sourcesValue
    .split(',')
    .map((sourceName) => sourceName.trim())
    .filter(Boolean)
    .map((sourceName) => ({ sourceName }));
}

function isLeafRow(row) {
  const cells = Array.from(row.children || []);
  return cells.length >= 1 && cells.every((cell) => (cell.children?.length || 0) === 0);
}

function getConfigRows(block) {
  const authoredContainer = block.matches('.global-search') ? block : block.querySelector('.global-search');
  const authoredRows = Array.from(authoredContainer?.children || []).filter((row) => (row.children?.length || 0) >= 2);
  if (authoredRows.length) {
    return authoredRows;
  }

  const directRows = Array.from(block.children || []).filter((row) => (row.children?.length || 0) >= 2);
  if (directRows.length) {
    return directRows;
  }

  return Array.from(block.querySelectorAll('div')).filter((row) => (row.children?.length || 0) >= 2 || isLeafRow(row));
}

function normalizeConfigKey(key = '') {
  const normalized = key.trim().toLowerCase();
  const keyMap = {
    appid: 'appId',
    apikey: 'apiKey',
    layouttemplate: 'layoutTemplate',
    querysuggestionsindexname: 'querySuggestionsIndexName',
    sources: 'sources',
  };
  return keyMap[normalized] || '';
}

function getGlobalSearchConfig(block) {
  const config = {
    appId: '',
    apiKey: '',
    layoutTemplate: '',
    querySuggestionsIndexName: '',
    placeholder: '',
    sourceConfigs: [],
  };

  const directChildren = Array.from(block.children || []);
  const knownKeys = new Set([
    'appId',
    'apiKey',
    'layoutTemplate',
    'querySuggestionsIndexName',
    'sources',
  ]);
  const rows = getConfigRows(block);
  const keyValueRows = rows.filter((row) => {
    if ((row.children?.length || 0) < 2) return false;
    const key = normalizeConfigKey(row.children[0].textContent || '');
    return !!key && knownKeys.has(key);
  });

  if (!config.placeholder) {
    const standaloneTextRow = directChildren.find((child) => {
      const hasNoElementChildren = (child.children?.length || 0) === 0;
      const text = child.textContent?.trim() || '';
      return hasNoElementChildren && !!text;
    });
    if (standaloneTextRow) {
      config.placeholder = standaloneTextRow.textContent.trim();
    }
  }

  let configuredSources = [];

  keyValueRows.forEach((row) => {
    const key = normalizeConfigKey(row.children[0].textContent || '');
    const value = row.children[1].textContent?.trim() || '';
    if (key === 'sources') {
      configuredSources = parseSourceList(value);
    } else if (key) {
      config[key] = value;
    }
  });

  const sourceRows = rows.filter((row) => {
    if ((row.children?.length || 0) < 2) return false;
    const firstCell = normalizeConfigKey(row.children[0].textContent || '');
    return !firstCell || !knownKeys.has(firstCell);
  });

  config.sourceConfigs = configuredSources.length
    ? configuredSources
    : parseSourceConfigsFromRows(sourceRows);

  return config;
}

export default async function decorate(block) {
  const { autocomplete, getAlgoliaResults } = window['@algolia/autocomplete-js'];
  const { createQuerySuggestionsPlugin } = window['@algolia/autocomplete-plugin-query-suggestions'];
  const { createLocalStorageRecentSearchesPlugin } = window['@algolia/autocomplete-plugin-recent-searches'];

    const {
      appId,
      apiKey,
      placeholder,
      layoutTemplate,
      querySuggestionsIndexName,
      sourceConfigs,
    } = getGlobalSearchConfig(block);

  if (!appId || !apiKey || !sourceConfigs.length) {
    return;
  }

  const searchClient = createAlgoliaClient(appId, apiKey);
  const resolvedLayoutTemplate = layoutTemplate || 'mainTemplate';
  let layoutTemplateFunction;
  try {
    ({ default: layoutTemplateFunction } = await import(`./templates/layout/${resolvedLayoutTemplate}.js`));
  } catch {
    ({ default: layoutTemplateFunction } = await import('./templates/layout/mainTemplate.js'));
  }

    const sources = await Promise.all(sourceConfigs.map(async (sourceConfig) => {
      const { sourceName } = sourceConfig;
      if (!sourceName) return null;

    try {
      const { default: source, SOURCE_INDEX_NAME: indexName } = await import(`./sources/${sourceName}.js`);
      if (!indexName) return null;
      const sourceFunction = source(
        searchClient,
        getAlgoliaResults,
      );
      return { source: sourceFunction, indexName };
    } catch {
      return null;
    }
  })) || [];
    const validSources = sources.filter(Boolean);

  block.innerHTML = '';

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
