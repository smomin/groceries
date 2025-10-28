import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';

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

export default function decorate(block) {
  const searchContainer = document.createElement("div");
  searchContainer.innerHTML = `
    <div class="container">
      <div>
        <div id="categories"></div>
      </div>
      <div>
        <div id="hits"></div>
        <div id="pagination"></div>
      </div>
    </div>
  `;
  block.appendChild(searchContainer);

  setTimeout(function() {
    const { connectSearchBox } = instantsearch.connectors;
    const { hierarchicalMenu, hits, pagination } = instantsearch.widgets;

    const { appId, apiKey } = getCredentials(block);
    const { placeholder } = getSearchBox(block);
    const { indexName, hitTemplate, noResultsTemplate } = getSearchIndex(block);

    const searchClient = algoliasearch(
      appId,
      apiKey,
    );

    const search = instantsearch({
      searchClient,
      indexName: indexName,
      stateMapping: instantsearch.stateMappings.singleIndex(indexName),
    });

    // Mount a virtual search box to manipulate InstantSearch's `query` UI
    // state parameter.
    const virtualSearchBox = connectSearchBox(() => {});

    search.addWidgets([
      virtualSearchBox({}),
      hierarchicalMenu({
        container: "#categories",
        attributes: ["hierarchicalCategories.lvl0", "hierarchicalCategories.lvl1"],
      }),
      hits({
        container: "#hits",
        templates: {
          item(hit, { html, components }) {
            return html`
              <div>${components.Highlight({ attribute: "name", hit })}</div>
            `;
          },
        },
      }),
      pagination({
        container: "#pagination",
      }),
    ]);

    search.start();

    window['searchInstance'] = search;
  }, 500);
}
