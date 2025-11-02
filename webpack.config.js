const webpack = require('webpack');
const packageJSON = require('./package.json');

const version = packageJSON.version;

const banner =
`Featureflow Client v${version}
Web: https://www.featureflow.io/
Date: ${new Date().toISOString()}
Licence: Apache-2.0`;

module.exports = {
  output: {
    library: 'Featureflow',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
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
              configFile: require.resolve('./tsconfig.json')
            }
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [['@babel/preset-env', { targets: 'defaults' }]]
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(version)
    }),
    new webpack.BannerPlugin({
      entryOnly: true,
      banner: banner
    })
  ]
};
