/* eslint strict: 0 */
'use strict';

const common = require('./webpack.common');
const path = require('path');

module.exports = {

  mode: 'production',

  optimization: {
    minimize: false
  },

  devtool: 'source-map',

  entry: './test/test.js',

  output: {
    path: path.resolve('./build/test'),
    pathinfo: true,
    filename: 'test.bundle.js'
  },

  resolve: {
    modules: ["node_modules"],
    alias: {
      'mailreader-parser': path.resolve('./node_modules/mailreader/src/mailreader-parser'),
      'emailjs-stringencoding': path.resolve('./src/lib/emailjs-stringencoding')
    }
  },

  externals: {
    jquery: 'jQuery'
  },

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
      options: {
        presets: ['react', 'env']
      }
    },
    {
      test: /\.css$/,
      use: [{
        loader: 'style-loader'
      },
      {
        loader: 'css-loader',
        options: {
          url: false
        }
      }]
    },
    {
      test: /\.less$/,
      use: [{
        loader: "style-loader"
      }, {
        loader: "css-loader"
      }, {
        loader: "less-loader"
      }]
    },
    {
      test: /\.(woff2?|ttf|svg|eot)(\?v=\d+\.\d+\.\d+)?$/,
      loader: 'file-loader'
    }]
  },

  plugins: common.plugins()

};
