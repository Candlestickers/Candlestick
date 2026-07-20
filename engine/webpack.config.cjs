const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/Wick.js',
  output: {
    filename: 'wickengine.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new webpack.ProvidePlugin({
      Wick: [require.resolve('./src/Wick.js'), 'Wick']
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      }
    ]
  },
  resolve: {
    modules: ['node_modules']
  }
};