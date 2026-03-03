export function source(itemTemplate, noResultsTemplate) {
  return ({ searchClient, indexName, searchQuery }) => {
    return {
      sourceId: 'products',
      getItems() {
        return getAlgoliaResults({
          searchClient,
          queries: [
            {
              indexName,
              params: {
                query: searchQuery,
                hitsPerPage: 6,
                analytics: true,
                enablePersonalization: true,
                clickAnalytics: true,
              },
            },
          ],
        });
      },
      getItemUrl({ item }) {
        return `/products?pid=${item.objectID}`;
      },
      templates: {
        header({ createElement }) {
          return createElement(
            'div',
            {},
            createElement(
              'span',
              {
                className: 'aa-SourceHeaderTitle',
              },
              'Products',
            ),
            createElement('div', {
              className: 'aa-SourceHeaderLine',
            }),
          );
        },
        item: itemTemplate,
        noResults: noResultsTemplate,
      },
    };
  }
} 