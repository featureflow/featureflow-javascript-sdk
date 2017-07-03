import uglify from 'rollup-plugin-uglify';
import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

const plugins = [
  json(),
  babel(),
  nodeResolve({
    jsnext: true,
    main: true,
    browser: true,
  }),
  commonjs()
];

export default [{
  entry: 'src/index.js',
  dest: 'dist/featureflow.js',
  moduleName: 'Featureflow',
  format: 'iife',
  plugins: plugins
}, {
  entry: 'src/index.js',
  dest: 'dist/featureflow.min.js',
  moduleName: 'Featureflow',
  format: 'iife',
  plugins:plugins.concat(
    uglify()
  )
}];