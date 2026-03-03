import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-autocomplete.js';
import '../../scripts/lib-autocomplete-plugin-query-suggestions.js';
import '../../scripts/lib-autocomplete-plugin-recent-searches.js';
import {
  getTextContent,
  getCredentials,
  createAlgoliaClient,
  getParamFromUrl,
  transformRecipeImagePath,
  transformProductImagePath,
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

function getSearchBox(htmlElement) {
  const placeholder = getTextContent(htmlElement.children[3]);
  return { placeholder };
}

function getSearchIndex(htmlElement) {
  const index = htmlElement.children[4];
  const indexName = getTextContent(index.children[0]);
  const hitTemplate = getTextContent(index.children[1]);
  const noResultsTemplate = getTextContent(index.children[2]);
  return { indexName, hitTemplate, noResultsTemplate };
}

export default function decorate(block) {
  // if (block.children.length > 3) {
  //   const { autocomplete, getAlgoliaResults } = window['@algolia/autocomplete-js'];
  //   const { createQuerySuggestionsPlugin } = window['@algolia/autocomplete-plugin-query-suggestions'];
  //   const { createLocalStorageRecentSearchesPlugin } = window['@algolia/autocomplete-plugin-recent-searches'];

  //   const { appId, apiKey } = getCredentials(block);
  //   const { placeholder } = getSearchBox(block);


  //   const { indexName, hitTemplate, noResultsTemplate } = getSearchIndex(block); // hitTemplate and noResultsTemplate not used

  //   // Set the InstantSearch index UI state from external events.
  //   const setInstantSearchUiState = (indexUiState) => {
  //     // Only update UI state if InstantSearch instance exists (e.g., on search results page)
  //     if (window.searchInstance && typeof window.searchInstance.setUiState === 'function') {
  //       window.searchInstance.setUiState((uiState) => ({
  //         ...uiState,
  //         [indexName]: {
  //           ...uiState[indexName],
  //           // We reset the page when the search state changes.
  //           page: 1,
  //           ...indexUiState,
  //         },
  //       }));
  //     }
  //   };

  //   const searchClient = createAlgoliaClient(appId, apiKey);

  //   // const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
  //   //   key: 'navbar',
  //   //   limit: 3,
  //   //   transformSource({ source }) {
  //   //     return {
  //   //       ...source,
  //   //       templates: {
  //   //         ...source.templates,
  //   //         header({ createElement }) {
  //   //           return createElement(
  //   //             'div',
  //   //             {},
  //   //             createElement(
  //   //               'span',
  //   //               {
  //   //                 className: 'aa-SourceHeaderTitle',
  //   //               },
  //   //               'Recent Searches',
  //   //             ),
  //   //             createElement('div', {
  //   //               className: 'aa-SourceHeaderLine',
  //   //             }),
  //   //           );
  //   //         },
  //   //       },
  //   //     };
  //   //   },
  //   // });

  //   // const querySuggestionsPlugin = createQuerySuggestionsPlugin({
  //   //   searchClient,
  //   //   indexName: `${indexName}_query_suggestions`,
  //   //   categoryAttribute: [indexName, 'facets', 'exact_matches', 'categories'],
  //   //   getSearchParams() {
  //   //     return {
  //   //       hitsPerPage: 3,
  //   //     };
  //   //   },
  //   //   transformSource({ source }) {
  //   //     return {
  //   //       ...source,
  //   //       // eslint-disable-next-line no-unused-vars, no-underscore-dangle
  //   //       onSelect({ item, setQuery: _setQuery }) {
  //   //         // eslint-disable-next-line no-underscore-dangle
  //   //         if (item.__autocomplete_qsCategory) {
  //   //           // eslint-disable-next-line no-underscore-dangle
  //   //           setInstantSearchUiState({ menu: { categories: item.__autocomplete_qsCategory } });
  //   //         }
  //   //       },
  //   //       templates: {
  //   //         ...source.templates,
  //   //         header({ createElement }) {
  //   //           return createElement(
  //   //             'div',
  //   //             {},
  //   //             createElement(
  //   //               'span',
  //   //               {
  //   //                 className: 'aa-SourceHeaderTitle',
  //   //               },
  //   //               'Suggestions',
  //   //             ),
  //   //             createElement('div', {
  //   //               className: 'aa-SourceHeaderLine',
  //   //             }),
  //   //           );
  //   //         },
  //   //       },
  //   //     };
  //   //   },
  //   // });

  //   const autocompleteContainer = document.createElement('div');
  //   autocompleteContainer.id = 'autocomplete';

  //   block.appendChild(autocompleteContainer);

  //   setTimeout(async () => {
  //     // Code to be executed after 3 seconds

  //     const { itemTemplateFunction } = await import(`./templates/${hitTemplate}.js`);
  //     const itemTemplate = (item, { components, html }) => itemTemplateFunction(item, {
  //       html,
  //       components
  //     });




  //     const autocompleteInstance = autocomplete({
  //       container: '#autocomplete',
  //       shouldPanelOpen: false,
  //       placeholder,
  //       openOnFocus: true,
  //       // plugins: [recentSearchesPlugin, querySuggestionsPlugin],
  //       initialState: {
  //         query: getParamFromUrl('search') || '',
  //       },
  //       onSubmit({ state }) {
  //         setInstantSearchUiState({ query: state.query });
  //       },
  //       onReset() {
  //         setInstantSearchUiState({ query: '' });
  //       },
  //       onStateChange({ prevState, state }) {
  //         if (prevState.query !== state.query) {
  //           setInstantSearchUiState({ query: state.query });
  //         }
  //       },
  //       getSources({ query: searchQuery }) {
  //         return [
  //           // {
  //           //   sourceId: 'recipes',
  //           //   getItems() {
  //           //     return getAlgoliaResults({
  //           //       searchClient,
  //           //       queries: [
  //           //         {
  //           //           indexName,
  //           //           params: {
  //           //             query: searchQuery,
  //           //             hitsPerPage: 4,
  //           //             analytics: true,
  //           //             enablePersonalization: true,
  //           //             clickAnalytics: true,
  //           //           },
  //           //         },
  //           //       ],
  //           //     });
  //           //   },
  //           //   getItemUrl({ item }) {
  //           //     return `/recipes?rid=${item.objectID}`;
  //           //   },
  //           //   templates: {
  //           //     header({ createElement }) {
  //           //       return createElement(
  //           //         'div',
  //           //         {},
  //           //         createElement(
  //           //           'span',
  //           //           {
  //           //             className: 'aa-SourceHeaderTitle',
  //           //           },
  //           //           'Recipes',
  //           //         ),
  //           //         createElement('div', {
  //           //           className: 'aa-SourceHeaderLine',
  //           //         }),
  //           //       );
  //           //     },
  //           //     item({ item, components, html }) {
  //           //       const recipeImage = item.image ? transformRecipeImagePath(item.image) : '';
  //           //       return html`<a
  //           //           data-insights-query-id="${item.__autocomplete_queryID}" 
  //           //           data-insights-object-id="${item.objectID}" 
  //           //           href="/recipes?rid=${item.objectID}"
  //           //           class="u-flex u-align algolia-analytics"
  //           //           style="text-decoration: none; color: inherit;"
  //           //         >
  //           //           ${recipeImage ? html`<img
  //           //             src="${recipeImage}"
  //           //             width="28px"
  //           //             alt="${item.name || 'Recipe'}"
  //           //           />` : ''}
  //           //           <h6>
  //           //             ${components.Highlight({
  //           //               hit: item,
  //           //               attribute: 'name',
  //           //             })}
  //           //           </h6>
  //           //         </a>`;
  //           //     },
  //           //   },
  //           // },
  //           source({ searchClient, indexName, searchQuery }),
  //         ];
  //       },
  //       navigator: {
  //         navigate({ itemUrl }) {
  //           window.location.assign(itemUrl);
  //         },
  //         navigateNewTab({ itemUrl }) {
  //           const windowReference = window.open(itemUrl, '_blank', 'noopener');

  //           if (windowReference) {
  //             windowReference.focus();
  //           }
  //         },
  //         navigateNewWindow({ itemUrl }) {
  //           window.open(itemUrl, '_blank', 'noopener');
  //         },
  //       },
  //       render({ elements, render, html }, root) {
  //         const {
  //           recentSearchesPlugin: recentPlugin,
  //           querySuggestionsPlugin: suggestionsPlugin,
  //         } = elements;
  //         render(
  //           html`
  //           <div class="aa-PanelLayout aa-Panel--scrollable">
  //               <div class="recipes-col">${elements.recipes}</div>
  //               <div class="products-col">${elements.products}</div>
  //               <div class="query-recent-col">
  //                 ${suggestionsPlugin}
  //                 ${recentPlugin}
  //               </div>
  //           </div>
  //           `,
  //           root,
  //         );
  //       },
  //     });

  //     // This keeps Autocomplete aware of state changes coming from routing
  //     // and updates its query accordingly
  //     window.addEventListener('popstate', () => {
  //       if (window.searchInstance?.helper?.state?.query) {
  //         autocompleteInstance.setQuery(window.searchInstance.helper.state.query);
  //       }
  //     });

  //     // Close the autocomplete panel when scrolling
  //     let scrollTimeout;
  //     const handleScroll = () => {
  //       // Clear any existing timeout
  //       clearTimeout(scrollTimeout);
  //       // Debounce to avoid excessive calls
  //       scrollTimeout = setTimeout(() => {
  //         // Try to close via setIsOpen if available
  //         if (autocompleteInstance.setIsOpen) {
  //           autocompleteInstance.setIsOpen(false);
  //         }
  //         // Also blur the input to ensure panel closes (since openOnFocus is true)
  //         const autocompleteEl = document.querySelector('#autocomplete');
  //         if (autocompleteEl) {
  //           const input = autocompleteEl.querySelector('input');
  //           if (input) {
  //             input.blur();
  //           }
  //         }
  //       }, 10);
  //     };

  //     window.addEventListener('scroll', handleScroll, { passive: true });
  //   }, 500);
  // }
}
