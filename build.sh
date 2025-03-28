#!/bin/bash

# 代码打包压缩脚本

echo "开始安装依赖..."
npm install

echo "开始打包压缩代码..."
npm run build

echo "打包完成！文件已输出到dist目录"
echo "可以通过以下命令查看dist目录大小:"
echo "du -sh dist/"