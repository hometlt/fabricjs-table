const path = require('path');

module.exports = {
    devtool: "source-map",
    mode: "development",
    optimization: {
        minimize: false
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
         extensions: ['.tsx', '.ts', '.js'],
    },
    entry: ["regenerator-runtime/runtime.js",'./demo.ts'],
    output: {
        filename: 'demo.js',
        path: path.resolve(__dirname, ''),
    }
};
