export const SOURCE_INDEX_NAME = 'SW_Groceries_Products';
export const SOURCE_HIT_TEMPLATE = 'productTemplate';
export const SOURCE_NO_RESULTS_TEMPLATE = 'productTemplate';
export const SOURCE_FACET_CONFIGS = [
  {
    widgetType: 'hierarchicalMenu',
    attributes: [
      "categories.lvl0",
      "categories.lvl1",
      "categories.lvl2",
      "categories.lvl3",
    ]
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
