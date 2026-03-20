import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import {
  createAlgoliaClient,
  getAlgoliaUserTokenFromCookie,
  handleAddToCart,
  normalizeBlockConfigKey,
  extractProductDataFromButton,
  loadLayoutTemplate,
} from '../../scripts/blocks-utils.js';

const CONFIG_KEY_MAP = {
  appid: 'appId',
  apikey: 'apiKey',
  placeholdertext: 'placeholderText',
  layout: 'layoutTemplate',
  layouttemplate: 'layoutTemplate',
  source: 'source',
  hasfacets: 'hasFacets',
  classname: 'className',
};

const CONFIG_KEYS = new Set(Object.values(CONFIG_KEY_MAP));

function getSearchBox(placeholder) {
  const { searchBox } = instantsearch.widgets;
  const { connectSearchBox } = instantsearch.connectors;
  return placeholder
    ? searchBox({ container: '#searchbox', placeholder })
    : connectSearchBox(() => {})({});
}

function getSearchResultsConfig(block) {
  const config = {
    appId: '',
    apiKey: '',
    placeholderText: '',
    layoutTemplate: '',
    source: '',
    hasFacets: false,
    className: '',
  };

  const authoredContainer = block.querySelector('.search-results');
  const candidateRows = Array.from(authoredContainer?.children || block.children || []);

  candidateRows.forEach((row) => {
    if ((row.children?.length || 0) < 2) return;
    const key = normalizeBlockConfigKey(row.children[0].textContent || '', CONFIG_KEY_MAP);
    if (!key || !CONFIG_KEYS.has(key)) return;
    const value = row.children[1].textContent?.trim() || '';
    if (value) config[key] = (key === 'hasFacets') ? value === 'true' : value;
  });

  if (!config.appId && block.children?.[0]) {
    config.appId = block.children[0].textContent?.trim() || '';
  }
  if (!config.apiKey && block.children?.[1]) {
    config.apiKey = block.children[1].textContent?.trim() || '';
  }

  return config;
}

function removeConfigFromBlock(block) {
  const container = block.querySelector('.search-results') ?? block;
  Array.from(container.children ?? []).forEach((row) => {
    if ((row.children?.length ?? 0) < 2) return;
    const key = normalizeBlockConfigKey(row.children[0].textContent ?? '', CONFIG_KEY_MAP);
    if (key && CONFIG_KEYS.has(key)) row.remove();
  });
}

function createFacetWidget(widgets, facetConfig, container) {
  const {
    panel, refinementList, menu, menuSelect, hierarchicalMenu, rangeSlider,
  } = widgets;

  const widgetFactory = {
    refinementList, menu, menuSelect, hierarchicalMenu, rangeSlider,
  }[facetConfig.widgetType];
  if (!widgetFactory) return null;

  const widgetParams = { container };
  const { widgetType } = facetConfig;

  if (widgetType === 'hierarchicalMenu') {
    if (!Array.isArray(facetConfig.attributes) || facetConfig.attributes.length === 0) return null;
    widgetParams.attributes = facetConfig.attributes;
  } else {
    if (!facetConfig.facetName) return null;
    widgetParams.attribute = facetConfig.facetName;
  }

  if (widgetType === 'rangeSlider') {
    ['min', 'max', 'step', 'precision', 'tooltips', 'pips'].forEach((key) => {
      if (facetConfig[key] === undefined) return;
      const isNumericRangeOption = ['min', 'max', 'step', 'precision'].includes(key);
      if (isNumericRangeOption) {
        const numericValue = Number(facetConfig[key]);
        widgetParams[key] = Number.isFinite(numericValue) ? numericValue : facetConfig[key];
      } else {
        widgetParams[key] = facetConfig[key];
      }
    });
  } else {
    ['limit', 'showMore', 'showMoreLimit'].forEach((key) => {
      if (facetConfig[key] !== undefined) widgetParams[key] = facetConfig[key];
    });
  }

  if (!facetConfig.facetTitle) return widgetFactory(widgetParams);

  return panel({ templates: { header: facetConfig.facetTitle } })(widgetFactory)(widgetParams);
}

function coerceNumericRefinements(helper, attributes = []) {
  if (!helper?.state?.numericRefinements || attributes.length === 0) return;
  const { numericRefinements } = helper.state;
  let hasChanges = false;
  const nextRefinements = { ...numericRefinements };

  attributes.forEach((attribute) => {
    const attributeRefinements = numericRefinements[attribute];
    if (!attributeRefinements) return;

    const nextAttributeRefinements = { ...attributeRefinements };
    Object.entries(attributeRefinements).forEach(([operator, values]) => {
      if (!Array.isArray(values)) return;
      const castedValues = values.map((value) => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : value;
      });
      const changed = castedValues.some((value, index) => value !== values[index]);
      if (changed) {
        nextAttributeRefinements[operator] = castedValues;
        hasChanges = true;
      }
    });

    nextRefinements[attribute] = nextAttributeRefinements;
  });

  if (hasChanges) {
    helper.setQueryParameter('numericRefinements', nextRefinements);
  }
}

function createNumericFacetTransformWidget(attributes = []) {
  if (!attributes.length) return null;
  return {
    init({ helper }) {
      coerceNumericRefinements(helper, attributes);
    },
    render({ helper }) {
      coerceNumericRefinements(helper, attributes);
    },
  };
}

function shouldResetRecipeDurationRefinements() {
  if (typeof window === 'undefined') return false;
  const { pathname, search = '' } = window.location;
  if (!pathname.startsWith('/recipes')) return false;
  // Respect explicit filter links that intentionally encode duration refinements.
  return !search.includes('preparationduration') && !search.includes('cookingduration');
}

function createRecipeDurationRefinementResetWidget(enabled) {
  if (!enabled) return null;
  return {
    init({ helper }) {
      const prepRefinements = helper?.state?.numericRefinements?.preparationduration;
      const cookRefinements = helper?.state?.numericRefinements?.cookingduration;
      if (!prepRefinements && !cookRefinements) return;
      helper.removeNumericRefinement('preparationduration');
      helper.removeNumericRefinement('cookingduration');
    },
  };
}

export default function decorate(block) {
  const config = getSearchResultsConfig(block);
  removeConfigFromBlock(block);
  const {
    appId,
    apiKey,
    layoutTemplate,
    source,
    hasFacets,
  } = config;

  setTimeout(async () => {
    const templateBase = new URL('./templates/layout', import.meta.url).href;
    const layoutTemplateFunction = await loadLayoutTemplate(templateBase, layoutTemplate);

    const { hits, pagination, configure } = instantsearch.widgets;

    const sourceModule = await import(`./sources/${source}.js`);
    const {
      SOURCE_INDEX_NAME: indexName,
      SOURCE_HIT_TEMPLATE: hitTemplate,
      SOURCE_NO_RESULTS_TEMPLATE: noResultsTemplate,
      SOURCE_FACET_CONFIGS: facetConfigs = [],
      SOURCE_CONFIGURE: sourceConfigure = {},
      SOURCE_NUMERIC_FACET_ATTRIBUTES: numericFacetAttributes = [],
    } = sourceModule;

    const searchContainer = document.createElement('div');
    searchContainer.innerHTML = layoutTemplateFunction({ indexName, hasFacets });
    const extraClasses = (config.className || '').trim();
    if (extraClasses) {
      searchContainer.classList.add(...extraClasses.split(/\s+/));
    }
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
    const numericFacetTransformWidget = createNumericFacetTransformWidget(numericFacetAttributes);
    const resetRecipeDurationRefinements = createRecipeDurationRefinementResetWidget(
      source === 'recipe' && shouldResetRecipeDurationRefinements(),
    );

    const userToken = getAlgoliaUserTokenFromCookie();

    if (facetsContainer) {
      facetConfigs.forEach((facetConfig, facetIndex) => {
        const facetContainer = document.createElement('div');
        facetContainer.id = `search-facet-${facetIndex}`;
        facetContainer.classList.add('search-facet-widget');
        if (facetConfig.facetName) {
          facetContainer.dataset.facetAttribute = facetConfig.facetName;
        }
        facetsContainer.appendChild(facetContainer);

        const widget = createFacetWidget(
          instantsearch.widgets,
          facetConfig,
          `#${facetContainer.id}`,
        );
        if (widget) facetWidgets.push(widget);
      });
    }

    search.addWidgets([
      searchBox,
      ...(numericFacetTransformWidget ? [numericFacetTransformWidget] : []),
      ...(resetRecipeDurationRefinements ? [resetRecipeDurationRefinements] : []),
      configure({
        hitsPerPage: 12,
        analytics: true,
        enablePersonalization: true,
        clickAnalytics: true,
        facets: ['*'],
        ...(userToken ? { userToken } : {}),
        ...sourceConfigure,
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

    // Handle "Add to cart" button clicks using event delegation
    searchContainer.addEventListener('click', (event) => {
      const addToCartButton = event.target.closest('.add-btn');
      if (!addToCartButton) return;
      event.preventDefault();
      event.stopPropagation();
      handleAddToCart(addToCartButton, extractProductDataFromButton(addToCartButton));
    });
  }, 500);
}
