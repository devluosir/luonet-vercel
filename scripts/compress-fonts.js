const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 字体文件路径
const fontDir = path.join(__dirname, '../public/fonts');
const outputDir = path.join(__dirname, '../public/fonts/compressed');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 压缩字体文件
function compressFontFile(filename) {
  const inputPath = path.join(fontDir, filename);
  const outputPath = path.join(outputDir, filename + '.gz');
  
  if (!fs.existsSync(inputPath)) {
    console.log(`❌ 字体文件不存在: ${filename}`);
    return;
  }
  
  const inputBuffer = fs.readFileSync(inputPath);
  const compressedBuffer = zlib.gzipSync(inputBuffer);
  
  fs.writeFileSync(outputPath, compressedBuffer);
  
  const originalSize = inputBuffer.length;
  const compressedSize = compressedBuffer.length;
  const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
  
  console.log(`✅ ${filename}:`);
  console.log(`   原始大小: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   压缩后: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   压缩率: ${compressionRatio}%`);
  console.log('');
}

// 主函数
function main() {
  console.log('🎨 开始压缩字体文件...\n');
  
  const fontFiles = [
    'NotoSansSC-Regular.ttf',
    'NotoSansSC-Bold.ttf'
  ];
  
  fontFiles.forEach(compressFontFile);
  
  console.log('🎉 字体压缩完成！');
  console.log('📁 压缩文件保存在: public/fonts/compressed/');
  console.log('💡 建议: 考虑使用 Web Font Loader 或 font-display: swap 来优化字体加载');
}

main(); 