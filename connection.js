const productionConnection = require('./productionConnection');
const developmentConnection = require('./developmentConnection');

if (process.env.NODE_ENV === "production") {
  // for production
  module.exports = productionConnection;
} else {
  //for devlopment mode;
  module.exports = developmentConnection;
}
