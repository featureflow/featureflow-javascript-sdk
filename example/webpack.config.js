var webpack = require('webpack');
var path = require("path");

var HtmlWebpackPlugin = require('html-webpack-plugin');
var HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
  template: path.join(__dirname,'/src/index.html'),
  filename: 'index.html',
  inject: 'body'
})

module.exports = {
  devtool: 'eval',
  entry: [path.join(__dirname, "/src/index.js")],
  output: {
    path: path.join(__dirname,'/dist'),
    publicPath: '',
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          'babel-loader'
        ],
      }
    ]
  },
  devtool: 'inline-source-map',
  plugins: [
    HTMLWebpackPluginConfig,
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: Infinity,
      filename: 'vendor.bundle.js'
    }),
    new webpack.DefinePlugin({
      'process.env': { NODE_ENV: JSON.stringify('development') }
    }),
  ]
};