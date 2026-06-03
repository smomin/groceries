export const SOURCE_INDEX_NAME = 'SW_Groceries_Products';
export const SOURCE_HIT_TEMPLATE = 'productTemplate';
export const SOURCE_NO_RESULTS_TEMPLATE = 'productTemplate';

// `rootPath` hides the "Default Category" root node and surfaces its
// children (Baking, Candy, …) as the top level of the menu. This requires
// `categories.lvl0..lvl3` to be declared in the index's
// `attributesForFaceting`; without that, the rootPath filter would match
// zero documents and hide every product.
export const SOURCE_FACET_CONFIGS = [
  {
    widgetType: 'hierarchicalMenu',
    facetTitle: 'Category',
    attributes: [
      'categories.lvl0',
      'categories.lvl1',
      'categories.lvl2',
      'categories.lvl3',
    ],
    showParentLevel: false,
    rootPath: 'Default Category',
  },
];
