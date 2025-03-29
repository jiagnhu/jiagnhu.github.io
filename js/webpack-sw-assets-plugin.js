class WebpackServiceWorkerAssetsPlugin {
  constructor(options = {}) {
      this.options = {
          swPath: 'sw.js',
          swTemplatePath: './sw.js',
          scriptImports: {}, // 新增配置项：需要替换的脚本映射
          ...options
      };
  }

  apply(compiler) {
      compiler.hooks.emit.tapAsync(
          'WebpackServiceWorkerAssetsPlugin',
          (compilation, callback) => {
              try {
                  // ============ 基础配置 ============
                  const publicPath = compilation.outputOptions.publicPath || '/';
                  const normalizedPublicPath = publicPath.endsWith('/') 
                      ? publicPath 
                      : publicPath + '/';

                  // ============ 资源路径替换器 ============
                  const createPathReplacer = (originalPath) => {
                      // 查找匹配的打包后资源
                      const [matchedAsset] = Object.entries(compilation.assets)
                          .find(([filename]) => {
                              // 匹配逻辑：文件名包含原始文件名且扩展名相同
                              const originalBasename = path.basename(originalPath);
                              return filename.includes(originalBasename)
                          }) || [];

                      if (!matchedAsset) {
                          compilation.errors.push(
                              new Error(`找不到匹配的资源: ${originalPath}`)
                          );
                          return originalPath; // 返回原路径避免破坏语法
                      }

                      // 构建完整路径
                      return `${normalizedPublicPath}${matchedAsset}`;
                  };

                  // ============ 文件处理流程 ============
                  const fs = require('fs');
                  const path = require('path');
                  const templatePath = path.resolve(
                      compiler.options.context || process.cwd(),
                      this.options.swTemplatePath
                  );

                  // 读取模板内容
                  let swContent = fs.readFileSync(templatePath, 'utf8');

                  // ============ 执行动态替换 ============
                  // 替换 CACHE_ASSETS 数组（原有逻辑）
                  const CACHE_ASSETS_REGEX = /const\s+CACHE_ASSETS\s*=\s*\[[\s\S]*?\]/;
                  const dynamicAssets = Object.keys(compilation.assets)
                      .filter(filename => !filename.endsWith('.map'))
                      .map(filename => `'${normalizedPublicPath}${filename}'`);

                  const coreAssets = [
                      `'${normalizedPublicPath}'`,
                      `'${normalizedPublicPath}index.html'`,
                      `'${normalizedPublicPath}offline.html'`,
                      `'${normalizedPublicPath}manifest.json'`
                  ];
                  // 删除dynamicAssets中的所有包含 '.DS_Store'字符串
                  dynamicAssets.splice(0, dynamicAssets.length, ...dynamicAssets.filter(a => !a.includes('.DS_Store')));

                  const newCacheContent = [
                      'const CACHE_ASSETS = [',
                      ...coreAssets.map(a => `  ${a},`),
                      ...dynamicAssets.map(a =>  `  ${a},`),
                      ']'
                  ].join('\n');
                  swContent = swContent.replace(CACHE_ASSETS_REGEX, newCacheContent);

                  // 新增：替换 importScripts 路径
                  Object.entries(this.options.scriptImports).forEach(
                      ([original, target]) => {
                      const originalPath = original.startsWith('/') 
                          ? original.slice(1) 
                          : original;
                      const newPath = createPathReplacer(target || originalPath);
                      
                      const importRegex = new RegExp(
                          `importScripts\\(['"]${original}['"]\\)`,
                          'g'
                      );
                      
                      swContent = swContent.replace(
                          importRegex, 
                          `importScripts('${newPath}')`
                      );
                  });

                  // ============ 输出处理 ============
                  compilation.assets[this.options.swPath] = {
                      source: () => swContent,
                      size: () => Buffer.byteLength(swContent, 'utf8')
                  };

                  callback();
              } catch (error) {
                  compilation.errors.push(
                      new Error(`ServiceWorker插件错误: ${error.message}`)
                  );
                  callback();
              }
          }
      );
  }
}

module.exports = WebpackServiceWorkerAssetsPlugin;