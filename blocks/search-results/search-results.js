import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import {
  getTextContent,
  createAlgoliaClient,
  handleAddToCart,
} from '../../scripts/blocks-utils.js';
import { loadBlock, decorateBlock } from '../../scripts/aem.js';

const SUPPORTED_FACET_WIDGETS = ['refinementList', 'menu', 'menuSelect'];
const DEFAULT_SOURCE_CONFIG = {
  indexName: 'SW_Groceries_Products',
  hitTemplate: 'productTemplate',
  noResultsTemplate: 'productTemplate',
};

function withDefaultSourceConfig(sourceConfig = {}) {
  return {
    indexName: sourceConfig.indexName || DEFAULT_SOURCE_CONFIG.indexName,
    hitTemplate: sourceConfig.hitTemplate || DEFAULT_SOURCE_CONFIG.hitTemplate,
    noResultsTemplate: sourceConfig.noResultsTemplate || DEFAULT_SOURCE_CONFIG.noResultsTemplate,
  };
}

function getSearchBox(placeholder) {
  const { searchBox } = instantsearch.widgets;
  const { connectSearchBox } = instantsearch.connectors;
  return (placeholder) ? searchBox({
    container: '#searchbox',
    placeholder,
  }) : connectSearchBox(() => {})({});
}

function normalizeConfigKey(key = '') {
  const normalized = key.trim().toLowerCase();
  const keyMap = {
    appid: 'appId',
    apikey: 'apiKey',
    placeholdertext: 'placeholderText',
    layout: 'layoutTemplate',
    source: 'sourceName',
  };
  return keyMap[normalized] || '';
}

function getSearchResultsConfig(block) {
  const config = {
    appId: '',
    apiKey: '',
    placeholderText: '',
    layoutTemplate: 'mainTemplate',
    sourceName: '',
  };

  const knownKeys = new Set([
    'appId',
    'apiKey',
    'placeholderText',
    'layoutTemplate',
    'sourceName',
  ]);

  const authoredContainer = block.querySelector('.search-results');
  const candidateRows = Array.from(authoredContainer?.children || block.children || []);

  candidateRows.forEach((row) => {
    if ((row.children?.length || 0) < 2) return;
    const key = normalizeConfigKey(row.children[0].textContent || '');
    if (!key || !knownKeys.has(key)) return;
    const value = row.children[1].textContent?.trim() || '';
    if (value) {
      config[key] = value;
    }
  });

  if (!config.appId && block.children?.[0]) {
    config.appId = block.children[0].textContent?.trim() || '';
  }
  if (!config.apiKey && block.children?.[1]) {
    config.apiKey = block.children[1].textContent?.trim() || '';
  }

  return config;
}

function getLayoutTemplate(htmlElement) {
  const layoutBlock = Array.from(htmlElement.children)
    .find((child) => child.classList?.contains('layout'));

  if (layoutBlock?.children?.[0]) {
    return getTextContent(layoutBlock.children[0]);
  }

  const layoutRow = Array.from(htmlElement.children)
    .find((row) => {
      const cells = Array.from(row.children || []).map((cell) => getTextContent(cell));
      return cells.length >= 2 && cells[0] === 'layout';
    });

  if (layoutRow) {
    return getTextContent(layoutRow.children[1]);
  }

  return 'mainTemplate';
}

function getSearchIndex(htmlElement) {
  const index = Array.from(htmlElement.children)
    .find((child) => child.classList?.contains('search-index')) || htmlElement.children[3];
  const indexName = getTextContent(index?.children?.[0]);
  const hitTemplate = getTextContent(index?.children?.[1]);
  const noResultsTemplate = getTextContent(index?.children?.[2]);
  return { indexName, hitTemplate, noResultsTemplate };
}

function getSourceName(htmlElement) {
  const sourceBlock = Array.from(htmlElement.children)
    .find((child) => child.classList?.contains('source'));

  if (sourceBlock?.children?.[0]) {
    return getTextContent(sourceBlock.children[0]);
  }

  const sourceRow = Array.from(htmlElement.children)
    .find((row) => {
      const cells = Array.from(row.children || []).map((cell) => getTextContent(cell));
      return cells.length >= 2 && cells[0] === 'source';
    });

  if (sourceRow) {
    return getTextContent(sourceRow.children[1]);
  }

  return '';
}

function getFacetConfig(facetBlock) {
  const widgetType = getTextContent(facetBlock.children[0]);
  const facetTitle = getTextContent(facetBlock.children[1]);
  const facetName = getTextContent(facetBlock.children[2]);

  if (!widgetType || !facetName || !SUPPORTED_FACET_WIDGETS.includes(widgetType)) {
    return null;
  }

  return { widgetType, facetTitle, facetName };
}

function getFacetConfigs(htmlElement) {
  return Array.from(htmlElement.children)
    .filter((child) => child.classList?.contains('search-facet'))
    .map((facetBlock) => getFacetConfig(facetBlock))
    .filter(Boolean);
}

function createFacetWidget(widgets, facetConfig, container) {
  const {
    panel, refinementList, menu, menuSelect,
  } = widgets;

  const widgetFactories = {
    refinementList,
    menu,
    menuSelect,
  };

  const widgetFactory = widgetFactories[facetConfig.widgetType];
  if (!widgetFactory) return null;

  const widget = widgetFactory({
    container,
    attribute: facetConfig.facetName,
  });

  if (!facetConfig.facetTitle) {
    return widget;
  }

  return panel({
    templates: {
      header: facetConfig.facetTitle,
    },
  })(widget);
}

export default function decorate(block) {
  decorateBlock(block);
  loadBlock(block);
  const config = getSearchResultsConfig(block);
  const appId = config.appId;
  const apiKey = config.apiKey;
  const layoutTemplate = config.layoutTemplate || getLayoutTemplate(block);
  const sourceName = config.sourceName || getSourceName(block);
  const fallbackSearchIndexConfig = getSearchIndex(block);
  const facetConfigs = getFacetConfigs(block);
  const hasFacets = facetConfigs.length > 0;

  setTimeout(async () => {
    let layoutTemplateFunction;
    try {
      ({ default: layoutTemplateFunction } = await import(`./templates/layout/${layoutTemplate}.js`));
    } catch {
      ({ default: layoutTemplateFunction } = await import('./templates/layout/mainTemplate.js'));
    }

    const {
      hits, pagination, configure,
    } = instantsearch.widgets;

    let searchIndexConfig = fallbackSearchIndexConfig;
    if (sourceName) {
      try {
        const sourceModule = await import(`./sources/${sourceName}.js`);
        searchIndexConfig = {
          indexName: sourceModule.SOURCE_INDEX_NAME,
          hitTemplate: sourceModule.SOURCE_HIT_TEMPLATE,
          noResultsTemplate: sourceModule.SOURCE_NO_RESULTS_TEMPLATE,
        };
      } catch {
        searchIndexConfig = fallbackSearchIndexConfig;
      }
    }

    const {
      indexName,
      hitTemplate,
      noResultsTemplate,
    } = withDefaultSourceConfig(searchIndexConfig);

    const searchContainer = document.createElement('div');
    searchContainer.innerHTML = layoutTemplateFunction({
      indexName,
      hasFacets,
    });
    block.appendChild(searchContainer);

    const searchClient = createAlgoliaClient(appId, apiKey);
    const search = instantsearch({
      searchClient,
      indexName,
      stateMapping: instantsearch.stateMappings.singleIndex(indexName),
    });

    const searchBox = getSearchBox(config.placeholderText);
    let itemTemplateFunction;
    let noResultsTemplateFunction;
    try {
      ({ default: itemTemplateFunction } = await import(`./templates/hit/${hitTemplate}.js`));
    } catch {
      ({ default: itemTemplateFunction } = await import('./templates/hit/productTemplate.js'));
    }
    try {
      ({ default: noResultsTemplateFunction } = await import(`./templates/noresults/${noResultsTemplate}.js`));
    } catch {
      ({ default: noResultsTemplateFunction } = await import('./templates/noresults/productTemplate.js'));
    }
    const facetsContainer = searchContainer.querySelector('#facets');
    const facetWidgets = [];

    if (facetsContainer) {
      facetConfigs.forEach((facetConfig, facetIndex) => {
        const facetContainer = document.createElement('div');
        facetContainer.id = `search-facet-${facetIndex}`;
        facetContainer.classList.add('search-facet-widget');
        facetsContainer.appendChild(facetContainer);

        const widget = createFacetWidget(
          instantsearch.widgets,
          facetConfig,
          `#${facetContainer.id}`,
        );

        if (widget) {
          facetWidgets.push(widget);
        }
      });
    }

    search.addWidgets([
      searchBox,
      configure({
        hitsPerPage: 12,
        analytics: true,
        enablePersonalization: true,
        clickAnalytics: true,
      }),
      ...facetWidgets,
      hits({
        container: '#hits',
        cssClasses: {
          list: 'products-grid',
          root: 'container',
        },
        templates: {
          item: itemTemplateFunction,
          noResults: noResultsTemplateFunction,
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
        scrollTo: '#hits',
      }),
    ]);

    search.start();

    window.searchInstance = search;

    // Handle "Add to cart" button clicks using event delegation (only for products)
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

        handleAddToCart(addToCartButton, productData);
      }
    });
  }, 500);
}
