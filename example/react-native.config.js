const path = require('path');
const pak = require('../package.json');

/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
  dependencies: {
    ...(process.env.NO_FLIPPER ? { 'react-native-flipper': { platforms: { ios: null } } } : {}),
    [pak.name]: {
      root: path.join(__dirname, '..'),
    },
  },
};
