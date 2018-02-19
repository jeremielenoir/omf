
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
    entry : './canvas/pages/main.js',
    output: {
        filename: 'bundle.js',
        path    : __dirname + '/dist/'
    },
    plugins: [
        new UglifyJsPlugin({
            test: /\.js($|\?)/i
        })
    ],

    module: {
        rules: [
            {
                test: /\.scss$/,
                use: [{
                    loader: "style-loader" // creates style nodes from JS strings
                }, {
                    loader: "css-loader" // translates CSS into CommonJS
                }, {
                    loader: "sass-loader" // compiles Sass to CSS
                }]
            },
             {
                 test   : /\.js$/, 
                exclude: /(node_modules)/,
                 use : {
                    loader: 'babel-loader',
                    options: {
                        presets: ['env']
                    }
                 }
                 
             },
             {
                 test   : /\.html$/, 
                 use: 'raw-loader'
             }
        ]
    }
};