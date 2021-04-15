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
  entry: [path.join(__dirname, "/src/indexes6.js")],
  output: {
    path: path.join(__dirname,'/dist'),
    publicPath: '',
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: "defaults" }]
            ]
          }
        }
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