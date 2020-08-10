import Logger from "@reactioncommerce/logger";
import orderIsApproved from "./utils/orderIsApproved.js";

/**
 * @summary Get all order items
 * @param {Object} order The order
 * @returns {Object[]} Order items from all fulfillment groups in a single array
 */
function getAllOrderItems(order) {
  return order.shipping.reduce((list, group) => [...list, ...group.items], []);
}

/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
export default function qtyStartup(context) {
  const { appEvents, collections } = context;
  const { Products } = collections;

  // Decrement after order cancelled
  appEvents.on("afterOrderCancel", async ({ order }) => {
    const isOrderApproved = orderIsApproved(order);
    const allOrderItems = getAllOrderItems(order);

    const bulkWriteOperations = [];

    if(!isOrderApproved) return null

    // Sold only added if order is approved
    if (isOrderApproved) {
      allOrderItems.forEach((item) => {
        bulkWriteOperations.push({
          updateOne: {
            filter: {
              "_id": item.variantId
            },
            update: {
              $inc: {
                sold: -item.quantity
              }
            }
          }
        });
      });
    } 

    if (bulkWriteOperations.length === 0) return;

    await Products.bulkWrite(bulkWriteOperations, { ordered: false })
      .then(() => (
        Promise.all(allOrderItems.map((item) => (
          appEvents.emit("afterSoldDecrement", {
            variant: item
          })
        )))
      ))
      .catch((error) => {
        Logger.error(error, "Bulk write error in simple-inventory afterOrderCancel listener");
      });
  });

  // Add sold property to variant
  // Do this after order created because create variant doesn't emit any event
  appEvents.on("afterOrderCreate", async ({ order }) => {
    const allOrderItems = getAllOrderItems(order);

    const bulkWriteOperations = allOrderItems.map((item) => ({
      updateOne: {
        filter: {
          "_id": item.variantId
        },
        update: {
          $inc: {
            sold: 0
          }
        }
      }
    }));

    if (bulkWriteOperations.length === 0) return;

    await Products.bulkWrite(bulkWriteOperations, { ordered: false })
      .then(() => (
        Promise.all(allOrderItems.map((item) => (
          appEvents.emit("afterSoldInit", {
            variant: item
          })
        )))
      ))
      .catch((error) => {
        Logger.error(error, "Bulk write error in simple-inventory afterOrderCreate listener");
      });
  });

  // Increment when order payment approved
  appEvents.on("afterOrderApprovePayment", async ({ order }) => {
    // We only decrease the inventory quantity after the final payment is approved
    if (!orderIsApproved(order)) return;

    const allOrderItems = getAllOrderItems(order);

    const bulkWriteOperations = allOrderItems.map((item) => ({
      updateOne: {
        filter: {
          "_id": item.variantId
        },
        update: {
          $inc: {
            sold: +item.quantity,
          }
        }
      }
    }));

    if (bulkWriteOperations.length === 0) return;

    await Products.bulkWrite(bulkWriteOperations, { ordered: false })
      .then(() => (
        Promise.all(allOrderItems.map((item) => (
          appEvents.emit("afterSoldIncrement", {
            variant: item
          })
        )))
      ))
      .catch((error) => {
        Logger.error(error, "Bulk write error in simple-inventory afterOrderApprovePayment listener");
      });
  });
}
