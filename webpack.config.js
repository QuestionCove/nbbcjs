module.exports = {
    mode: 'production',
    //devtool: 'source-map',
    entry: './src/nbbc.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        fallback: {
            "fs": false
        }
    },
    output: {
        filename: 'nbbc.js',
        path: __dirname+'/build/dist',
        library: {
            type: 'window'
        }
    }
};