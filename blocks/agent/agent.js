import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import '../../scripts/lib-instantsearch-chat.js';

export default function decorate(block) {
  const searchClient = algoliasearch(
    "0EXRPAXB56",
    "4350d61521979144d2012720315f5fc6"
  );

  // Initialize InstantSearch
  // Note: Chat widget doesn't require a traditional index, but InstantSearch needs one
  // Using a placeholder index name
  const search = instantsearch({
    searchClient,
    insights: true,
    indexName: 'ag_products',
  });

  const chat = InstantSearchChat({
      container: block,
      agentId: "6311c8de-6df5-490e-8875-7dc96d96355c",
      templates: {
        item: (hit, { html, components }) => {
          if (hit && hit.objectID) {
            return html`
              <article class="ais-Carousel-hit">
                <div class="ais-Carousel-hit-image">
                  <img src="${hit.image}" alt="${hit.name}" />
                </div>
                <h2 class="ais-Carousel-hit-title">
                  <a href="/products.html?pid=${hit.objectID}" class="ais-Carousel-hit-link">${hit.name}</a>
                </h2>
              </article>
            `;
          }
        },
      },
    });

  // Add Chat widget with container
  search.addWidgets([
    chat
  ]);

  // Start the search
  search.start();
}