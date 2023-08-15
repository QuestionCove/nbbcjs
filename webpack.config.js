module.exports = [{
    name: 'full',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/nbbc.ts',
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        "@babel/typescript",
                        ['@babel/preset-env', {
                            targets: "defaults"
                        }]
                    ]
                }
            },
            exclude: /node_modules/,
        }, ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        fallback: {
            "fs": false
        }
    },
    output: {
        filename: 'nbbc.js',
        path: __dirname + '/build/dist',
        library: {
            type: 'window'
        }
    },
    optimization: {
        minimize: false
    }
}, {
    name: 'minimized',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/nbbc.ts',
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        "@babel/typescript",
                        ['@babel/preset-env', {
                            targets: "defaults"
                        }]
                    ]
                }
            },
            exclude: /node_modules/,
        }, ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        fallback: {
            "fs": false
        }
    },
    output: {
        filename: 'nbbc.min.js',
        path: __dirname + '/build/dist',
        library: {
            type: 'window'
        }
    }
}, {
    name: 'full-legacy',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/nbbc.ts',
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        "@babel/typescript",
                        ['@babel/preset-env', {
                            targets: "> 0.25%, not dead"
                        }]
                    ]
                }
            },
            exclude: /node_modules/,
        }, ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        fallback: {
            "fs": false
        }
    },
    output: {
        filename: 'nbbc.legacy.js',
        path: __dirname + '/build/dist',
        library: {
            type: 'window'
        }
    },
    optimization: {
        minimize: false
    }
}, {
    name: 'min-legacy',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/nbbc.ts',
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        "@babel/typescript",
                        ['@babel/preset-env', {
                            targets: "> 0.25%, not dead"
                        }]
                    ]
                }
            },
            exclude: /node_modules/,
        }, ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        fallback: {
            "fs": false
        }
    },
    output: {
        filename: 'nbbc.legacy.min.js',
        path: __dirname + '/build/dist',
        library: {
            type: 'window'
        }
    }
}];