const path = require('path');
const pak = require('../package.json');

/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
  dependencies: {
    [pak.name]: {
      root: path.join(__dirname, '..'),
    },
  },
};
