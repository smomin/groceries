import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import {
  getTextContent,
  getCredentials,
  createAlgoliaClient,
  handleAddToCart,
} from '../../scripts/blocks-utils.js';
import { loadBlock, decorateBlock } from '../../scripts/aem.js';

const SUPPORTED_FACET_WIDGETS = ['refinementList', 'menu', 'menuSelect'];

function getSearchBox(htmlElement) {
  const { searchBox } = instantsearch.widgets;
  const { connectSearchBox } = instantsearch.connectors;
  const searchBoxBlock = Array.from(htmlElement.children)
    .find((child) => child.classList?.contains('search-box'));
  const placeholder = getTextContent(searchBoxBlock?.children?.[0] || htmlElement.children[2]);
  return (placeholder) ? searchBox({ 
    container: '#searchbox', 
    placeholder 
  }) : connectSearchBox(() => {})({});
}

function getSearchIndex(htmlElement) {
  const index = Array.from(htmlElement.children)
    .find((child) => child.classList?.contains('search-index')) || htmlElement.children[3];
  const indexName = getTextContent(index.children[0]);
  const hitTemplate = getTextContent(index.children[1]);
  const noResultsTemplate = getTextContent(index.children[2]);
  return { indexName, hitTemplate, noResultsTemplate };
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
  const { appId, apiKey } = getCredentials(block);
  const { indexName, hitTemplate, noResultsTemplate } = getSearchIndex(block);
  const facetConfigs = getFacetConfigs(block);
  const hasFacets = facetConfigs.length > 0;

  // block.innerHTML = '';
  const searchContainer = document.createElement('div');
  searchContainer.innerHTML = `
    <div class="search-container" data-indexname="${indexName}">
      <div class="search-panel">
        ${hasFacets ? '<aside id="facets" class="search-panel__filters"></aside>' : ''}
        <div class="search-panel__results">
          <div id="searchbox"></div>
          <div id="hits"></div>
          <div id="pagination"></div>
        </div>
      </div>
    </div>
  `;
  block.appendChild(searchContainer);

  setTimeout(async () => {
    const {
      hits, pagination, configure, index,
    } = instantsearch.widgets;

    const searchClient = createAlgoliaClient(appId, apiKey);
    const search = instantsearch({
      searchClient,
      indexName,
      stateMapping: instantsearch.stateMappings.singleIndex(indexName),
    });

    const searchBox = getSearchBox(block);
    const { default: itemTemplateFunction } = await import(`./templates/hit/${hitTemplate}.js`);
    const { default: noResultsTemplateFunction } = await import(`./templates/noresults/${noResultsTemplate}.js`);
    const facetsContainer = searchContainer.querySelector('#facets');
    const facetWidgets = [];

    if (facetsContainer) {
      facetConfigs.forEach((facetConfig, index) => {
        const facetContainer = document.createElement('div');
        facetContainer.id = `search-facet-${index}`;
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
        scrollTo: document.querySelector('.products-grid'),
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
