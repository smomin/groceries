import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-autocomplete.js';
import '../../scripts/lib-autocomplete-plugin-query-suggestions.js';
import '../../scripts/lib-autocomplete-plugin-recent-searches.js';

export const SearchEvents = {
  QUERY_CHANGE: 'search:query:change',
  QUERY_SUBMIT: 'search:query:submit',
  INSTANTSEARCH_READY: 'search:instantsearch:ready',
  AUTOCOMPLETE_READY: 'search:autocomplete:ready',
  SEARCH_START: 'search:start',
  SEARCH_COMPLETE: 'search:complete',
  ERROR: 'search:error'
};

function handleSubmit(state) {
  this.dispatchEvent(SearchEvents.QUERY_SUBMIT, {
    query: state.query,
    source: 'autocomplete'
  });
  window.location.href = `search?query=${state.query}&queryID=${state.context.queryID}`;
}

function handleStateChange(state) {
  this.dispatchEvent(SearchEvents.QUERY_CHANGE, {
    query: state.query,
    source: 'autocomplete'
  });
}

function getTextContent(htmlElement) {
  const textContent = htmlElement.textContent.trim();
  htmlElement.textContent = '';
  return textContent;
}

function getCredentials(htmlElement) {
  const appId = getTextContent(htmlElement.children[0]);
  const apiKey = getTextContent(htmlElement.children[1]);
  return { appId, apiKey };
}

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

function param(name) {
  return (
    new URLSearchParams(window.location.href.split("?")[1]).get(name) || ""
  );
}

export default function decorate(block) {
  if (block.children.length > 3) {
    const { algoliasearch } = window;
    const { autocomplete, getAlgoliaResults } = window['@algolia/autocomplete-js'];
    const { createQuerySuggestionsPlugin } = window["@algolia/autocomplete-plugin-query-suggestions"];
    const { createLocalStorageRecentSearchesPlugin } = window["@algolia/autocomplete-plugin-recent-searches"];
    
    const ingredientIndexName = "ag_ingredients";

    const { appId, apiKey } = getCredentials(block);
    const { layoutTemplate } = getLayoutTemplate(block);
    const { placeholder } = getSearchBox(block);
    const { indexName, hitTemplate, noResultsTemplate } = getSearchIndex(block);

    const searchClient = algoliasearch(
      appId,
      apiKey,
    );

    const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
      key: "navbar",
      limit: 3,
      transformSource({ source }) {
        return {
          ...source,
          templates: {
            ...source.templates,
            header({ createElement }) {
              return createElement(
                'div',{},
                createElement(
                  'span',
                  {
                    className: 'aa-SourceHeaderTitle',
                  },
                  "Recent Searches"
                ),
                createElement('div', {
                  className: 'aa-SourceHeaderLine',
                })
              );
            },
          }
        };
      },
    });

    const querySuggestionsPlugin = createQuerySuggestionsPlugin({
      searchClient,
      indexName: `${indexName}_query_suggestions`,
      categoryAttribute: [indexName, "facets", "exact_matches", "categories"],
      getSearchParams() {
        return {
          hitsPerPage: 3,
        };
      },
      transformSource({ source }) {
        return {
          ...source,
          onSelect({ item, setQuery }) {
            if (item.__autocomplete_qsCategory) {
              setUiState({ menu: { categories: item.__autocomplete_qsCategory } });
            }
          },
          templates: {
            ...source.templates,
            header({ createElement }) {
              return createElement(
                'div',{},
                createElement(
                  'span',
                  {
                    className: 'aa-SourceHeaderTitle',
                  },
                  "Suggestions"
                ),
                createElement('div', {
                  className: 'aa-SourceHeaderLine',
                })
              );
            },
          }
        };
      },
    });

    const query = param(`${indexName}[query]`);

    const autocompleteContainer = document.createElement("div");
    autocompleteContainer.id = "autocomplete";

    block.appendChild(autocompleteContainer);


    // Set the InstantSearch index UI state from external events.
    function setInstantSearchUiState(indexUiState) {
      window['searchInstance'].setUiState((uiState) => ({
        ...uiState,
        [indexName]: {
          ...uiState[indexName],
          // We reset the page when the search state changes.
          page: 1,
          ...indexUiState,
        },
      }));
    }

    setTimeout(function() {
      // Code to be executed after 3 seconds
      const autocompleteInstance = autocomplete({
        container: '#autocomplete',
        shouldPanelOpen: false,
        placeholder: placeholder,
        openOnFocus: true,
        plugins: [recentSearchesPlugin, querySuggestionsPlugin],
        initialState: {
          query: param('search') || '',
        },
        onSubmit({ state }) {
          setInstantSearchUiState({ query: state.query });
        },
        onReset() {
          setInstantSearchUiState({ query: "" });
        },
        onStateChange({ prevState, state }) {
          if (prevState.query !== state.query) {
            setInstantSearchUiState({ query: state.query });
          }
        },
        getSources({ query }) {
          return [
            {
              sourceId: "ingredients",
              getItems() {
                return getAlgoliaResults({
                  searchClient,
                  queries: [
                    {
                      indexName: ingredientIndexName,
                      params: {
                        query,
                        hitsPerPage: 9,
                      },
                    },
                  ],
                });
              },
              getItemUrl({ item }) {
                return `::ingredient:${item.objectID}`;
              },
              templates: {
                header({ createElement }) {
                  return createElement(
                    'div',{},
                    createElement(
                      'span',
                      {
                        className: 'aa-SourceHeaderTitle',
                      },
                      "Ingredients"
                    ),
                    createElement('div', {
                      className: 'aa-SourceHeaderLine',
                    })
                  );
                },
                item({ item, components, html }) {
                  return html`<div
                    class="u-flex u-align"
                    onClick="${() => openIngredient(item.objectID)}"
                  >
                    <img
                      src="https://fxqklbpngldowtbkqezm.supabase.co/storage/v1/object/public/ingredient-images/img_ingredient_${item.objectID}.png"
                      width="28px"
                    />
                    <h6>
                      ${components.Highlight({
                        hit: item,
                        attribute: "name",
                      })}
                    </h6>
                  </div>`;
                },
              },
            },
          ];
        },
        navigator: {
          navigate({ itemUrl }) {
            // if (itemUrl === "::assistant") openAssistant();
            // else if (itemUrl === "::shopping_list")
            //   addToShoppingList(uiState().query);
            // else if (itemUrl.startsWith("::ingredient:")) {
            //   openIngredient(itemUrl.split("::ingredient:")[1]);
            // } else 
            window.location.assign(itemUrl);
          },
          navigateNewTab({ itemUrl }) {
            const windowReference = window.open(itemUrl, "_blank", "noopener");
      
            if (windowReference) {
              windowReference.focus();
            }
          },
          navigateNewWindow({ itemUrl }) {
            window.open(itemUrl, "_blank", "noopener");
          },
        },
        render({ elements, render, html }, root) {
          const { recentSearchesPlugin, querySuggestionsPlugin } = elements;
          render(
            html`<div class="aa-PanelLayout aa-Panel--scollable">
              <div class="ingredients-col">${elements.ingredients}</div>
              <div class="query-recent-col">
                  ${recentSearchesPlugin}
                  ${querySuggestionsPlugin}
              </div>  
            </div>`,
            root,
          );
        },
      });

      // This keeps Autocomplete aware of state changes coming from routing
      // and updates its query accordingly
      window.addEventListener("popstate", () => {
        autocompleteInstance.setQuery(window['searchInstance'].helper?.state.query || "");
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
