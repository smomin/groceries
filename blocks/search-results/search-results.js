import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import {
  getTextContent,
  createAlgoliaClient,
  handleAddToCart,
} from '../../scripts/blocks-utils.js';
import { loadBlock, decorateBlock } from '../../scripts/aem.js';

const SUPPORTED_FACET_WIDGETS = ['refinementList', 'menu', 'menuSelect', 'hierarchicalMenu'];

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
    source: 'source',
    hasFacets: 'hasFacets',
  };
  return keyMap[normalized] || '';
}

function getSearchResultsConfig(block) {
  const config = {
    appId: '',
    apiKey: '',
    placeholderText: '',
    layoutTemplate: '',
    source: '',
    hasFacets: false,
  };

  const knownKeys = new Set([
    'appId',
    'apiKey',
    'placeholderText',
    'layoutTemplate',
    'source',
    'hasFacets',
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

function getFacetConfig(facetBlock) {
  const widgetType = getTextContent(facetBlock.children[0]);
  const facetTitle = getTextContent(facetBlock.children[1]);
  const facetName = getTextContent(facetBlock.children[2]);

  if (!widgetType || !SUPPORTED_FACET_WIDGETS.includes(widgetType)) {
    return null;
  }

  if (widgetType === 'hierarchicalMenu') {
    return null;
  }

  if (!facetName) {
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
    panel, refinementList, menu, menuSelect, hierarchicalMenu,
  } = widgets;

  const widgetFactories = {
    refinementList,
    menu,
    menuSelect,
    hierarchicalMenu,
  };

  const widgetFactory = widgetFactories[facetConfig.widgetType];
  if (!widgetFactory) return null;

  const widgetParams = {
    container,
  };

  if (facetConfig.widgetType === 'hierarchicalMenu') {
    if (!Array.isArray(facetConfig.attributes) || facetConfig.attributes.length === 0) {
      return null;
    }
    widgetParams.attributes = facetConfig.attributes;
  } else {
    if (!facetConfig.facetName) return null;
    widgetParams.attribute = facetConfig.facetName;
  }

  const widget = widgetFactory(widgetParams);

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
  const config = getSearchResultsConfig(block);
  const { appId, apiKey, layoutTemplate, source, hasFacets } = config;
  

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

    const sourceModule = await import(`./sources/${source}.js`);
    const searchIndexConfig = {
      indexName: sourceModule.SOURCE_INDEX_NAME,
      hitTemplate: sourceModule.SOURCE_HIT_TEMPLATE,
      noResultsTemplate: sourceModule.SOURCE_NO_RESULTS_TEMPLATE,
      facetConfigs: sourceModule.SOURCE_FACET_CONFIGS,
    };

    const {
      indexName,
      hitTemplate,
      noResultsTemplate,
      facetConfigs,
    } = searchIndexConfig;

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
    const { default: itemTemplateFunction } = await import(`./templates/hit/${hitTemplate}.js`);
    const { default: noResultsTemplateFunction } = await import(`./templates/noresults/${noResultsTemplate}.js`);
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
