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
  const hitTemplate = getTextContent(index.children[1]);
  const noResultsTemplate = getTextContent(index.children[2]);
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

    const searchClient = algoliasearch(
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

    autocomplete({
      container: block,
      shouldPanelOpen: false,
      placeholder: placeholder,
      openOnFocus: true,
      // plugins: [recentSearchesPlugin, querySuggestionsPlugin],
      plugins: [querySuggestionsPlugin],
      initialState: {
        query,
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
      onStateChange({ prevState, state }) {
        sessionStorage.setItem("query", state.query);
        if (prevState.query !== state.query) {
          if (param("similar")) {
            const url = new URL(window.location.href);
            url.searchParams.delete("similar");
            window.history.pushState({}, "", url);
          }
          showSrp();
          setUiState({ query: state.query });
        }
      },
    });


    // autocomplete({
    //     container: block,
    //     placeholder: placeholder,
    //     getSources({ query }) {
    //     return [
    //         {
    //         sourceId: 'products',
    //         getItems() {
    //             return getAlgoliaResults({
    //             searchClient,
    //             queries: [
    //                 {
    //                 indexName: indexName,
    //                 clickAnalytics: true,
    //                 query,
    //                 params: {
    //                     hitsPerPage: 5,
    //                     attributesToSnippet: [
    //                     'name:10',
    //                     'description:35',
    //                     ],
    //                     snippetEllipsisText: '…',
    //                 },
    //                 },
    //             ],
    //             });
    //         },
    //         templates: {
    //             item({ item, components, html }) {
    //             return html`
    //                 <div class="aa-ItemWrapper">
    //                     <div class="aa-ItemContent">
    //                         <div class="aa-ItemIcon aa-ItemIcon--alignTop">
    //                             <img
    //                                     src="https://publish-p28413-e1512521.adobeaemcloud.com${item.image}"
    //                                     alt="${item.title}"
    //                                     width="40"
    //                                     height="40"
    //                             />
    //                         </div>
    //                         <div class="aa-ItemContentBody">
    //                             <div class="aa-ItemContentTitle">
    //                                 ${components.Highlight({
    //     hit: item,
    //     attribute: 'title',
    // })}
    //                             </div>
    //                             <div class="aa-ItemContentDescription">
    //                                 ${components.Snippet({
    //     hit: item,
    //     attribute: 'description',
    // })}
    //                             </div>
    //                         </div>
    //                         <div class="aa-ItemActions">
    //                             <button
    //                                     class="aa-ItemActionButton aa-DesktopOnly aa-ActiveOnly"
    //                                     type="button"
    //                                     title="Select"
    //                             >
    //                                 <svg
    //                                         viewBox="0 0 24 24"
    //                                         width="20"
    //                                         height="20"
    //                                         fill="currentColor"
    //                                 >
    //                                     <path
    //                                             d="M18.984 6.984h2.016v6h-15.188l3.609 3.609-1.406 1.406-6-6 6-6 1.406 1.406-3.609 3.609h13.172v-4.031z"
    //                                     />
    //                                 </svg>
    //                             </button>
    //                             <button
    //                                     class="aa-ItemActionButton"
    //                                     type="button"
    //                                     title="Add to cart"
    //                             >
    //                                 <svg
    //                                         viewBox="0 0 24 24"
    //                                         width="18"
    //                                         height="18"
    //                                         fill="currentColor"
    //                                 >
    //                                     <path
    //                                             d="M19 5h-14l1.5-2h11zM21.794 5.392l-2.994-3.992c-0.196-0.261-0.494-0.399-0.8-0.4h-12c-0.326 0-0.616 0.156-0.8 0.4l-2.994 3.992c-0.043 0.056-0.081 0.117-0.111 0.182-0.065 0.137-0.096 0.283-0.095 0.426v14c0 0.828 0.337 1.58 0.879 2.121s1.293 0.879 2.121 0.879h14c0.828 0 1.58-0.337 2.121-0.879s0.879-1.293 0.879-2.121v-14c0-0.219-0.071-0.422-0.189-0.585-0.004-0.005-0.007-0.010-0.011-0.015zM4 7h16v13c0 0.276-0.111 0.525-0.293 0.707s-0.431 0.293-0.707 0.293h-14c-0.276 0-0.525-0.111-0.707-0.293s-0.293-0.431-0.293-0.707zM15 10c0 0.829-0.335 1.577-0.879 2.121s-1.292 0.879-2.121 0.879-1.577-0.335-2.121-0.879-0.879-1.292-0.879-2.121c0-0.552-0.448-1-1-1s-1 0.448-1 1c0 1.38 0.561 2.632 1.464 3.536s2.156 1.464 3.536 1.464 2.632-0.561 3.536-1.464 1.464-2.156 1.464-3.536c0-0.552-0.448-1-1-1s-1 0.448-1 1z"
    //                                     />
    //                                 </svg>
    //                             </button>
    //                         </div>
    //                     </div>
    //                 </div>
    //             `;
    //             },
    //         },
    //         },
    //     ];
    //     },
    //     onSubmit: ({ state }) => handleSubmit(state),
    //     onStateChange: ({ state }) => handleStateChange(state),
    // });
  }
}
