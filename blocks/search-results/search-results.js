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
    <div class="products-grid">
      <div>
        <div id="hits"></div>
        <div id="pagination"></div>
      </div>
    </div>
  `;
  block.appendChild(searchContainer);

  const { appId, apiKey } = getCredentials(block);
  const { placeholder } = getSearchBox(block);
  const { indexName, hitTemplate, noResultsTemplate } = getSearchIndex(block);

  setTimeout(function() {
    const { connectSearchBox } = instantsearch.connectors;
    const { hierarchicalMenu, hits, pagination } = instantsearch.widgets;

    const searchClient = algoliasearch.searchClient(
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
      hits({
        container: "#hits",
        cssClasses: {
          list: 'products-grid',
          root: 'container',
        },
        templates: {
          item(hit, { html, components }) {
            return html`
                <div class="product-card">
                  <img class="product-card__image" src="${hit.image}" alt="${hit.name}" />
                  <div class="product-card__category">${hit.categories.lvl0}</div>
                  <div class="product-card__name">${components.Highlight({ attribute: "name", hit })}</div>
                  ${hit.brand ? 
                    html `<div class="vendor">
                      <span class="vendor-label">By</span> <span style="color: #00b207;">${hit.brand}</span>
                  </div>`
                  : ''
                  }
                  <div class="product-card__footer">
                      <div class="price-container">
                          <span class="current-price">${new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD'
                              }).format(hit.price)}</span>
                      </div>
                      <button class="add-btn">
                          <span class="cart-icon"></span>
                          <span>Add</span>
                      </button>
                  </div>
              </div>`;
          },
        },
      }),
      pagination({
        container: "#pagination",
        showFirst: false,
        showLast: false,
        templates: {
          previous: '‹ Previous',
          next: 'Next ›',
        },
        scrollTo: document.querySelector(".products-grid")
      }),
    ]);

    search.start();

    window['searchInstance'] = search;
  }, 500);
}
