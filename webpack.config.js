const webpack = require('webpack');
const package = require('./package.json');

module.exports = {
  output: {
    library: 'Featureflow',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          'babel-loader'
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(package.version)
    })
  ]
};
