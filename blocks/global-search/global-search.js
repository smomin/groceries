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

function getSearchBox(htmlElement) {
  const placeholder = getTextContent(htmlElement.children[2]);
  return { placeholder };
}

function getSearchIndex(htmlElement) {
  const index = htmlElement.children[3];
  const indexName = getTextContent(index.children[0]);
  let hitTemplate = null;
  let noResultsTemplate = null;
  if (index.children[1]) {
    hitTemplate = getTextContent(index.children[1]);
  } else {
    hitTemplate = null;
  }
  if (index.children[2]) {
    noResultsTemplate = getTextContent(index.children[2]);
  } else {
    noResultsTemplate = null;
  }
  return { indexName, hitTemplate, noResultsTemplate };
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
    
    const ingredientIndexName = "ag_ingredients";

    const { appId, apiKey } = getCredentials(block);
    const { placeholder } = getSearchBox(block);
    const { indexName, hitTemplate, noResultsTemplate } = getSearchIndex(block);

    const searchClient = algoliasearch.searchClient(
      appId,
      apiKey,
    );

    const querySuggestionsPlugin = createQuerySuggestionsPlugin({
      searchClient,
      indexName: `${indexName}_query_suggestions`,
      categoryAttribute: [indexName, "facets", "exact_matches", "categories"],
      transformSource({ source }) {
        return {
          ...source,
          onSelect({ item, setQuery }) {
            if (item.__autocomplete_qsCategory) {
              setUiState({ menu: { categories: item.__autocomplete_qsCategory } });
            }
          },
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
      const { setQuery } = autocomplete({
        container: '#autocomplete',
        shouldPanelOpen: false,
        placeholder: placeholder,
        openOnFocus: true,
        // plugins: [recentSearchesPlugin, querySuggestionsPlugin],
        plugins: [querySuggestionsPlugin],
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
                        hitsPerPage: 5,
                      },
                    },
                  ],
                });
              },
              getItemUrl({ item }) {
                return `::ingredient:${item.objectID}`;
              },
              templates: {
                item({ item, components, html }) {
                  return html`<div
                    class="u-flex u-align"
                    onClick="${() => openIngredient(item.objectID)}"
                  >
                    <img
                      src="https://fxqklbpngldowtbkqezm.supabase.co/storage/v1/object/public/ingredient-images/img_ingredient_${item.objectID}.png"
                      width="28px"
                    />
                    <div>
                      ${components.Highlight({
                        hit: item,
                        attribute: "name",
                      })}
                    </div>
                  </div>`;
                },
              },
            },
            {
              sourceId: "shopping_list",
              getItems() {
                if (query.length) return [{}];
                else return [];
              },
              getItemUrl({ item }) {
                return "::shopping_list";
              },
              templates: {
                item({ item, components, html }) {
                  return html`<div
                    onClick="${() => addToShoppingList(uiState().query)}"
                    class="u-flex u-align aa-shoppingList"
                  >
                    <span class="checklist-icon"></span>Add "${query}" to shopping
                    list
                  </div>`;
                },
              },
            },
            {
              sourceId: "assistant",
              getItems() {
                if (query.length) return [{}];
                else return [];
              },
              getItemUrl({ item }) {
                return "::assistant";
              },
              templates: {
                item({ item, components, html }) {
                  return html`<div
                    onClick="${() => openAssistant()}"
                    class="u-flex u-align aa-assistant"
                  >
                    <span class="ai-icon"></span>Open "${query}" in assistant
                  </div>`;
                },
              },
            },
          ];
        },
        navigator: {
          navigate({ itemUrl }) {
            if (itemUrl === "::assistant") openAssistant();
            else if (itemUrl === "::shopping_list")
              addToShoppingList(uiState().query);
            else if (itemUrl.startsWith("::ingredient:")) {
              openIngredient(itemUrl.split("::ingredient:")[1]);
            } else window.location.assign(itemUrl);
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
      });

      // This keeps Autocomplete aware of state changes coming from routing
      // and updates its query accordingly
      window.addEventListener("popstate", () => {
        setQuery(window['searchInstance'].helper?.state.query || "");
      });
    }, 500);
  }
}
