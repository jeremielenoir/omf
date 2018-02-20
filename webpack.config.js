const webpack = require("webpack");
const path = require("path");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

console.log(path.resolve(__dirname + '/dist/'));

module.exports = {
    entry : './canvas/pages/main.js',
  //  entry: './app/src/app.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname + '/dist/')
    },
    plugins: [
        new UglifyJsPlugin({
            test: /\.js($|\?)/i
        })
    ],

    module: {
        rules: [
            { test: /\.handlebars$/, loader: "handlebars-loader" },
            {
                test: /\.scss$/,
                use: [
                        {
                          loader: "style-loader" // creates style nodes from JS strings
                        }, 
                        {
                            loader: "css-loader" // translates CSS into CommonJS
                        },
                        {
                            loader: "sass-loader" // compiles Sass to CSS
                        }
                    ]
            },
            {
                test: /\.js$/,  // include .js files
                enforce: "pre", // preload the jshint loader
                exclude: /(node_modules)/, // exclude any and all files in the node_modules folder
                use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: ['env']
                            }
                        },
                        {
                            loader: "jshint-loader"
                        }
                    ]
            },
            {
                test: /\.node$/,
                use: 'node-loader'
              }
        ]},
        devServer: {
            contentBase: path.resolve(__dirname, "./dist"),
            historyApiFallback: true,
            inline: true,
            open: true,
            hot: true
        }
}