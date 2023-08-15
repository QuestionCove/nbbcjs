module.exports = {
    mode: 'production',
    devtool: 'source-map',
    entry: './src/nbbc.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            "@babel/typescript",
                            ['@babel/preset-env', {
                                targets: "defaults"
                                //TODO: Look into creating a seperate legacy build with `targets: "> 0.25%, not dead"`
                            }]
                        ]
                    }
                },
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