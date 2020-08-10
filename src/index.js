import pkg from "../package.json";
import schemas from "./schemas/index.js";
import queries from "./queries/index.js";
import resolvers from "./resolvers/index.js";
import qtyPreStartup from "./preStartup.js";
import qtyStartup from "./startup.js";
/**
 * @summary Import and call this function to add this plugin to your API.
 * @param {ReactionAPI} app The ReactionAPI instance
 * @returns {undefined}
 */
export default async function register(app) {
  await app.registerPlugin({
    label: "Custom plugin qty",
    name: "qty",
    version: pkg.version,
    catalog: {
      customPublishedProductFields: ["qty"],
      customPublishedProductVariantFields: ["sold"]
    },
    functionsByType: {
      preStartup: [qtyPreStartup],
      startup: [qtyStartup],
    },
    graphQL: {
      schemas,
      resolvers
    },
    queries,
  });
}
