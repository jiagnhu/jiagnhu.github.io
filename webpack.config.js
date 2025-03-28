const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const WebpackServiceWorkerAssetsPlugin = require('./js/webpack-sw-assets-plugin');
let distPath = '';

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    devServer: {
      static: {
        directory: path.join(__dirname, './'),
      },
      hot: true,
      port: 3000,
      open: true,
      compress: true,
      historyApiFallback: true,
      client: {
        webSocketTransport: "ws"
      }
    },
    entry: {
      main: './js/app.js',
      customCarousel: './js/custom-carousel.js',
      nfc: './js/nfc.js',
      videoCacheManager: './js/video-cache-manager.js',
      rem: './js/rem.js',
      db: './js/db.js',
      updateNotification: './js/update-notification.js',
      // 移除sw.js作为入口点，改为使用CopyPlugin复制
      // 添加CSS入口点
      styles: ['./css/style.css', './css/custom-carousel.css', './css/nfc.css', './css/modal.css']
    },
    output: {
      filename: distPath + 'js/[name].[contenthash].js',
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/'
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction
            }
          },
          extractComments: false
        }),
        new CssMinimizerPlugin()
      ],
      splitChunks: {
        chunks: 'all',
        name: 'vendors'
      }
    },
    module: {
      rules: [

        {
          test: /\.js$/,
          exclude: [/node_modules/, /sw\.js$/],
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader'
          ]
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|webp|ico)$/i,
          type: 'asset',
          generator: {
            filename: distPath + 'images/[name].[hash][ext]'
          }
        },
        {
          test: /\.(mp4|webm|ogg)$/i,
          type: 'asset/resource',
          generator: {
            filename: distPath + 'video/[name].[hash][ext]'
          }
        }
      ]
    },
    plugins: [
      new CleanWebpackPlugin(),
      new MiniCssExtractPlugin({
        filename: distPath + 'css/[name].[contenthash].css'
      }),
      new HtmlWebpackPlugin({
        template: './index.html',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false,
        inject: true
      }),
      new HtmlWebpackPlugin({
        filename: 'offline.html',
        template: './offline.html',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false,
        inject: true
      }),
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: '' },
          { from: 'favicon.ico', to: '' },
          { from: 'images', to: 'images' },
          { from: 'video', to: 'video' },
          { from: 'sw.js', to: 'sw.js' }
        ]
      }),
      new WebpackServiceWorkerAssetsPlugin({
        swPath: 'sw.js',
        swTemplatePath: 'sw.js',
        scriptImports: {
          // 格式: [原路径]: [源文件标识]
          '/js/db.js': 'db'  // 左边为模板中的路径，右边为实际源码文件名
        }
    })
    ]
  };
};