import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instant-search.js';

export default function decorate(block) {
  const { algoliasearch, instantsearch } = window;
  const {
    searchBox, hits, configure, panel, refinementList, pagination,
  } = instantsearch.widgets;
  const params = new URL(document.location).searchParams;
  const query = params.get('query');

  block.innerHTML = `
    <div class="container">
      <div class="search-panel">
        <div class="search-panel__filters">
          <div id="brand-list"></div>
        </div>

        <div class="search-panel__results">
          <div id="searchbox"></div>
          <div id="hits"></div>
          <div id="pagination"></div>
        </div>
      </div>
    </div>
  `;

  const searchClient = algoliasearch(
    '0EXRPAXB56',
    '4350d61521979144d2012720315f5fc6',
  );

  const search = instantsearch({
    indexName: 'WKND_Commerce_PROD_US_EN_Pages',
    searchClient,
    insights: true,
    routing: {
      stateMapping: {
        stateToRoute(uiState) {
          return {
            query: uiState.WKND_Commerce_PROD_US_EN_Pages.query,
          };
        },
        routeToState(routeState) {
          return {
            WKND_Commerce_PROD_US_EN_Pages: {
              query: routeState.query,
            },
          };
        },
      },
    },
  });

  search.addWidgets([
    searchBox({
      container: '#searchbox',
      placeholder: 'Enter your query',
      autofocus: false,
      searchAsYouType: true,
      searchParameters: {
        query,
      },
    }),
    hits({
      container: '#hits',
      templates: {
        item: (hit, { html, components }) => html`
          <article>
            <h1>${components.Highlight({ hit, attribute: 'title' })}</h1>
            <p>${components.Highlight({ hit, attribute: 'description' })}</p>
          </article>
        `,
      },
    }),
    configure({
      hitsPerPage: 8,
    }),
    panel({
      templates: { header: 'brand' },
    })(refinementList)({
      container: '#brand-list',
      attribute: 'brand',
    }),
    pagination({
      container: '#pagination',
    }),
  ]);

  search.start();
}
