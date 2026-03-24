import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-autocomplete.js';
import '../../scripts/lib-autocomplete-plugin-query-suggestions.js';
import '../../scripts/lib-autocomplete-plugin-recent-searches.js';
import {
  createAlgoliaClient,
  getAlgoliaUserTokenFromCookie,
  getParamFromUrl,
  handleAddToCart,
  normalizeBlockConfigKey,
  extractProductDataFromButton,
  loadLayoutTemplate,
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

/** Source names to load when the block has no sources configured (e.g. nav has no sources row). */
const DEFAULT_SOURCE_NAMES = ['product', 'recipe'];

const CONFIG_KEY_MAP = {
  appid: 'appId',
  apikey: 'apiKey',
  placeholdertext: 'placeholderText',
  layouttemplate: 'layoutTemplate',
  querysuggestionsindexname: 'querySuggestionsIndexName',
  sources: 'sources',
};

const CONFIG_KEYS = new Set(Object.values(CONFIG_KEY_MAP));

function parseSourceConfigsFromRows(rows) {
  return rows
    .map((row) => {
      const cells = Array.from(row.children || []).map((cell) => cell.textContent?.trim() || '');
      if (!cells.length) return null;
      const sourceName = cells[cells.length - 1];
      return sourceName ? { sourceName } : null;
    })
    .filter(Boolean);
}

function parseSourceList(sourcesValue = '') {
  return sourcesValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((sourceName) => ({ sourceName }));
}

function isLeafRow(row) {
  const cells = Array.from(row.children || []);
  return cells.length >= 1 && cells.every((cell) => (cell.children?.length || 0) === 0);
}

function getConfigRows(block) {
  const authoredContainer = block.matches('.global-search') ? block : block.querySelector('.global-search');
  const authoredRows = Array.from(authoredContainer?.children || [])
    .filter((row) => (row.children?.length || 0) >= 2);
  if (authoredRows.length) return authoredRows;

  const directRows = Array.from(block.children || [])
    .filter((row) => (row.children?.length || 0) >= 2);
  if (directRows.length) return directRows;

  return Array.from(block.querySelectorAll('div'))
    .filter((row) => (row.children?.length || 0) >= 2 || isLeafRow(row));
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
  const rows = getConfigRows(block);

  const keyValueRows = rows.filter((row) => {
    if ((row.children?.length || 0) < 2) return false;
    const key = normalizeBlockConfigKey(row.children[0].textContent || '', CONFIG_KEY_MAP);
    return !!key && CONFIG_KEYS.has(key);
  });

  if (!config.placeholder) {
    const standaloneTextRow = directChildren.find((child) => {
      const hasNoElementChildren = (child.children?.length || 0) === 0;
      const text = child.textContent?.trim() || '';
      return hasNoElementChildren && !!text;
    });
    if (standaloneTextRow) config.placeholder = standaloneTextRow.textContent.trim();
  }

  let configuredSources = [];

  keyValueRows.forEach((row) => {
    const key = normalizeBlockConfigKey(row.children[0].textContent || '', CONFIG_KEY_MAP);
    const value = row.children[1].textContent?.trim() || '';
    if (key === 'sources') {
      configuredSources = parseSourceList(value);
    } else if (key === 'placeholderText') {
      config.placeholder = value;
    } else if (key) {
      config[key] = value;
    }
  });

  const sourceRows = rows.filter((row) => {
    if ((row.children?.length || 0) < 2) return false;
    const firstCell = normalizeBlockConfigKey(row.children[0].textContent || '', CONFIG_KEY_MAP);
    return !firstCell || !CONFIG_KEYS.has(firstCell);
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
    sourceConfigs: rawSourceConfigs,
  } = getGlobalSearchConfig(block);

  if (!appId || !apiKey) return;

  const sourceConfigs = rawSourceConfigs.length > 0
    ? rawSourceConfigs
    : DEFAULT_SOURCE_NAMES.map((sourceName) => ({ sourceName }));

  const searchClient = createAlgoliaClient(appId, apiKey);
  const templateBase = new URL('./templates/layout', import.meta.url).href;
  const layoutTemplateFunction = await loadLayoutTemplate(
    templateBase,
    layoutTemplate || 'mainTemplate',
  );

  const userToken = getAlgoliaUserTokenFromCookie();

  const sources = await Promise.all(sourceConfigs.map(async ({ sourceName }) => {
    if (!sourceName) return null;
    try {
      const { default: source, SOURCE_INDEX_NAME: indexName } = await import(`./sources/${sourceName}.js`);
      if (!indexName) return null;
      return { source: source(searchClient, getAlgoliaResults, userToken), indexName };
    } catch {
      return null;
    }
  }));
  const validSources = sources.filter(Boolean);

  block.innerHTML = '';

  const autocompleteContainer = document.createElement('div');
  autocompleteContainer.id = 'autocomplete';
  block.appendChild(autocompleteContainer);

  const setInstantSearchUiState = (indexUiState) => {
    if (window.searchInstance && typeof window.searchInstance.setUiState === 'function') {
      window.searchInstance.setUiState((uiState) => {
        validSources.forEach((s) => {
          uiState[s.indexName] = { ...uiState[s.indexName], page: 1, ...indexUiState };
        });
        return uiState;
      });
    }
  };

  const createSourceHeader = (createElement, title) => createElement(
    'div',
    {},
    createElement('span', { className: 'aa-SourceHeaderTitle' }, title),
    createElement('div', { className: 'aa-SourceHeaderLine' }),
  );

  const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
    key: 'navbar',
    limit: 3,
    transformSource({ source }) {
      return {
        ...source,
        templates: {
          ...source.templates,
          header({ createElement }) {
            return createSourceHeader(createElement, 'Recent Searches');
          },
        },
      };
    },
  });

  const plugins = [recentSearchesPlugin];

  if (querySuggestionsIndexName) {
    const querySuggestionsPlugin = createQuerySuggestionsPlugin({
      searchClient,
      indexName: querySuggestionsIndexName,
      categoryAttribute: ['facets', 'exact_matches', 'categories'],
      getSearchParams() { return { hitsPerPage: 3 }; },
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
              return createSourceHeader(createElement, 'Suggestions');
            },
          },
        };
      },
    });
    plugins.push(querySuggestionsPlugin);
  }

  setTimeout(async () => {
    const autocompleteInstance = autocomplete({
      container: '#autocomplete',
      shouldPanelOpen: false,
      placeholder,
      openOnFocus: true,
      plugins,
      initialState: { query: getParamFromUrl('search') || '' },
      onSubmit({ state }) { setInstantSearchUiState({ query: state.query }); },
      onReset() { setInstantSearchUiState({ query: '' }); },
      onStateChange({ prevState, state }) {
        if (prevState.query !== state.query) setInstantSearchUiState({ query: state.query });
      },
      getSources({ query: searchQuery }) {
        return validSources.map((s) => s.source({ searchQuery }));
      },
      navigator: {
        navigate({ itemUrl }) { window.location.assign(itemUrl); },
        navigateNewTab({ itemUrl }) {
          const win = window.open(itemUrl, '_blank', 'noopener');
          if (win) win.focus();
        },
        navigateNewWindow({ itemUrl }) { window.open(itemUrl, '_blank', 'noopener'); },
      },
      render: layoutTemplateFunction,
    });

    // Keep Autocomplete in sync with browser history navigation
    window.addEventListener('popstate', () => {
      if (window.searchInstance?.helper?.state?.query) {
        autocompleteInstance.setQuery(window.searchInstance.helper.state.query);
      }
    });

    // Close the autocomplete panel when scrolling (debounced)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        autocompleteInstance.setIsOpen?.(false);
        autocompleteContainer.querySelector('input')?.blur();
      }, 10);
    }, { passive: true });

    // Prevent Autocomplete blur when pressing the add-to-cart button
    const interceptAddToCart = (event) => {
      if (event.target.closest('.search-hit__add-btn')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    autocompleteContainer.addEventListener('pointerdown', interceptAddToCart, true);
    autocompleteContainer.addEventListener('mousedown', interceptAddToCart, true);

    // Handle "Add" button clicks inside the autocomplete panel
    autocompleteContainer.addEventListener('click', (event) => {
      const addToCartButton = event.target.closest('.search-hit__add-btn');
      if (!addToCartButton) return;

      event.preventDefault();
      event.stopPropagation();

      handleAddToCart(addToCartButton, extractProductDataFromButton(addToCartButton));

      // Keep the panel open after adding to cart
      const input = autocompleteContainer.querySelector('input');
      if (input && document.activeElement !== input) input.focus();
      autocompleteInstance.setIsOpen?.(true);
    });
  }, 500);
}
