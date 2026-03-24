export const SOURCE_INDEX_NAME = 'SW_Groceries_Products';
export const SOURCE_HIT_TEMPLATE = 'productTemplate';
export const SOURCE_NO_RESULTS_TEMPLATE = 'productTemplate';
export const SOURCE_FACET_CONFIGS = [
  {
    widgetType: 'menu',
    facetTitle: 'Category',
    facetName: 'categories.lvl1',
    transformItems: (items) => items.map((item) => ({
      ...item,
      label: item.label.replace(/^Default Category\s*>\s*/, ''),
    })),
  },
  {
    widgetType: 'refinementList',
    facetTitle: 'Status',
    facetName: 'status',
  },
  {
    widgetType: 'refinementList',
    facetTitle: 'Visibility',
    facetName: 'visibility',
  },
];
