import { terser } from "rollup-plugin-terser";
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const plugins = [
  json(),
  babel(),
  nodeResolve({
    jsnext: true,
    main: true,
    browser: true,
  }),
  commonjs(),
  terser()
];

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/featureflow.js',
      format: 'iife',
      name: 'Featureflow',
      plugins: plugins
    }
  }
]