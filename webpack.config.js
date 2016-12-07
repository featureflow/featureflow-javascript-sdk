const webpack = require('webpack');
const package = require('./package.json');

module.exports = {
  output: {
    library: 'Featureflow',
    libraryTarget: 'umd'
  },
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(package.version)
    })
  ]
};
