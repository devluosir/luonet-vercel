const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const stampsDir = path.join(__dirname, '../public/images');
const outputDir = path.join(__dirname, '../public/images/compressed');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const stampFiles = [
  'stamp-shanghai.png',
  'stamp-hongkong.png'
];

async function compressStamp(stampFile) {
  const inputPath = path.join(stampsDir, stampFile);
  const outputPath = path.join(outputDir, stampFile);
  
  try {
    // 获取原始文件信息
    const originalStats = fs.statSync(inputPath);
    console.log(`\n处理文件: ${stampFile}`);
    console.log(`原始大小: ${(originalStats.size / 1024).toFixed(2)} KB`);
    
    // 使用sharp压缩图片 - 调整参数以获得更好的质量
    await sharp(inputPath)
      .resize(400, 400, { // 增加到400x400，保持更好的清晰度
        fit: 'inside',
        withoutEnlargement: true
      })
      .png({ 
        quality: 90, // 提高质量到90
        compressionLevel: 6 // 降低压缩级别以保持质量
      })
      .toFile(outputPath);
    
    // 获取压缩后文件信息
    const compressedStats = fs.statSync(outputPath);
    const compressionRatio = ((originalStats.size - compressedStats.size) / originalStats.size * 100).toFixed(2);
    
    console.log(`压缩后大小: ${(compressedStats.size / 1024).toFixed(2)} KB`);
    console.log(`压缩率: ${compressionRatio}%`);
    
    return {
      originalSize: originalStats.size,
      compressedSize: compressedStats.size,
      compressionRatio: parseFloat(compressionRatio)
    };
    
  } catch (error) {
    console.error(`压缩 ${stampFile} 时出错:`, error);
    return null;
  }
}

async function main() {
  console.log('开始压缩印章图片（优化质量版本）...');
  
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  
  for (const stampFile of stampFiles) {
    const result = await compressStamp(stampFile);
    if (result) {
      totalOriginalSize += result.originalSize;
      totalCompressedSize += result.compressedSize;
    }
  }
  
  const totalCompressionRatio = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(2);
  
  console.log('\n=== 压缩总结 ===');
  console.log(`总原始大小: ${(totalOriginalSize / 1024).toFixed(2)} KB`);
  console.log(`总压缩后大小: ${(totalCompressedSize / 1024).toFixed(2)} KB`);
  console.log(`总体压缩率: ${totalCompressionRatio}%`);
  console.log(`\n压缩后的文件保存在: ${outputDir}`);
  console.log('请将压缩后的文件替换原始文件以减小PDF文件大小。');
  console.log('注意：此次压缩参数已优化，在文件大小和图片质量之间取得更好平衡。');
}

main().catch(console.error); 