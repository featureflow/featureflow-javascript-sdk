const webpackConfig = require('./webpack.config.js');

module.exports = function(config) {
  config.set({
    files: [
      'tests.webpack.js'
    ],
    
    preprocessors: {
      'tests.webpack.js': [ 'webpack', 'sourcemap' ]
    },
    
    reporters: ['mocha'],
    
    frameworks: ['mocha', 'chai', 'sinon'],
    
    browsers: ['Chrome'],
    
    webpack: webpackConfig,

    failOnEmptyTestSuite: false,
    
    webpackServer: {
      noInfo: true
    }
  });
};
