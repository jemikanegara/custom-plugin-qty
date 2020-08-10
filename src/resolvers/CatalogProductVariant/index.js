export default {
    sold: async (node) => {
        const { sold } = node || {};
        if(!sold) return 0;
        else return sold;
    },
    qty: async (node, args, context) => { 
        const { variantId, shopId } = node
        const qty = await context.queries.inventoryByVariant(context, { shopId, variantId })
        return qty || {}
    }
}