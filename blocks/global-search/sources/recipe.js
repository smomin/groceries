export function source(itemTemplate, noResultsTemplate) {
  return ({ searchClient, indexName, searchQuery }) => {
    return {
      sourceId: 'recipes',
      getItems() {
        return getAlgoliaResults({
          searchClient,
          queries: [
            {
              indexName,
              params: {
                query: searchQuery,
                hitsPerPage: 4,
                analytics: true,
                enablePersonalization: true,
                clickAnalytics: true,
              },
            },
          ],
        });
      },
      getItemUrl({ item }) {
        return `/recipes?rid=${item.objectID}`;
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
              'Recipes',
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