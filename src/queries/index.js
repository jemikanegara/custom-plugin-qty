export default {
    inventoryByVariant: async (context, { shopId, variantId }) => {
      const { collections } = context
      const { SimpleInventory } = collections;

      const qty = await SimpleInventory.findOne({ 
        "productConfiguration.productVariantId": variantId,
        shopId
     }) 

     return qty
    }
};