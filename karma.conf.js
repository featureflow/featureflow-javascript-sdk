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
    
    frameworks: ['mocha', 'chai', 'webpack'],
    
    browsers: ['ChromeHeadless'],
    
    customLaunchers: {
      ChromeHeadless: {
        base: 'Chrome',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--headless',
          '--disable-gpu'
        ]
      }
    },
    
    webpack: webpackConfig,

    failOnEmptyTestSuite: false,
    
    autoWatch: false,
    singleRun: true
  });
};
