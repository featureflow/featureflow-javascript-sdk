const webpack = require('webpack');
const path = require("node:path");

const HtmlWebpackPlugin = require('html-webpack-plugin');

// Get entry point from environment variable or default to example.js
const entryPoint = process.env.ENTRY || 'example.js';
const htmlTemplate = 'example.html';
const HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
  template: path.join(__dirname, '/src', htmlTemplate),
  filename: 'index.html',
  inject: 'body'
});

module.exports = {
  devtool: 'eval-source-map',
  entry: [path.join(__dirname, '/src', entryPoint)],
  output: {
    path: path.join(__dirname, '/dist'),
    publicPath: '',
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.join(__dirname, '../tsconfig.json')
            }
          }
        ],
      },
      {
        test: /\.js$/,
        exclude: [
          /node_modules/,
          path.resolve(__dirname, '../dist')
        ],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [['@babel/preset-env', { targets: 'defaults' }]],
              ignore: [
                path.resolve(__dirname, '../dist')
              ]
            }
          }
        ],
      }
    ]
  },
  plugins: [
    HTMLWebpackPluginConfig,
    new webpack.DefinePlugin({
      'process.env': { NODE_ENV: JSON.stringify('development') }
    }),
  ],
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'dist'),
      },
      {
        directory: path.join(__dirname, 'public'),
        publicPath: '/public',
      }
    ],
    compress: true,
    port: 8182,
    hot: true,
    open: true
  }
};
