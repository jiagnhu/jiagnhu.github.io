# 代码打包压缩指南

本项目已配置了webpack打包工具，可以将JavaScript和CSS代码打包压缩，减小文件体积，提高加载速度。

## 功能特点

- JavaScript代码压缩与混淆
- CSS文件压缩
- 图片和视频资源优化
- 文件名添加内容哈希，便于缓存控制
- HTML文件压缩
- 自动复制静态资源

## 使用方法

### 安装依赖

首先，需要安装项目依赖：

```bash
npm install
```

### 开发模式构建

开发模式下构建，代码不会被压缩，便于调试：

```bash
npm run dev
```

### 生产模式构建

生产模式下构建，代码会被压缩和优化，适合部署到生产环境：

```bash
npm run build
```

## 构建输出

构建完成后，所有文件会输出到 `dist` 目录，结构如下：

```
dist/
  ├── css/
  │   ├── main.[hash].css
  │   └── ...
  ├── js/
  │   ├── main.[hash].js
  │   ├── carousel.[hash].js
  │   ├── vendors.[hash].js
  │   └── ...
  ├── images/
  ├── video/
  ├── index.html
  ├── offline.html
  ├── manifest.json
  └── favicon.ico
```

## 配置说明

打包配置文件位于 `webpack.config.js`，主要配置了以下内容：

1. **入口文件**：指定了各个JS文件的入口点
2. **输出配置**：设置了输出目录和文件命名规则
3. **优化配置**：
   - 使用TerserPlugin压缩JavaScript代码
   - 使用CssMinimizerPlugin压缩CSS文件
   - 配置代码分割，提取公共模块
4. **加载器配置**：处理不同类型的文件
5. **插件配置**：
   - CleanWebpackPlugin：清理输出目录
   - MiniCssExtractPlugin：提取CSS到单独文件
   - HtmlWebpackPlugin：处理HTML文件
   - CopyPlugin：复制静态资源

## 注意事项

- 生产环境构建会自动移除console和debugger语句
- 构建过程会自动处理CSS和JavaScript的浏览器兼容性
- 静态资源（图片、视频等）会被自动复制到输出目录