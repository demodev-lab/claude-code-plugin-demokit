/**
 * lib/core barrel export
 */
const platform = require('./platform');
const config = require('./config');
const io = require('./io');
const cache = require('./cache');
const file = require('./file');
const debug = require('./debug');

module.exports = {
  platform,
  config,
  io,
  cache,
  file,
  debug,
};
