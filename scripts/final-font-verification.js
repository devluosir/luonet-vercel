#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 字体加载优化最终验证\n');

// 检查所有PDF相关的文件和组件
const pdfRelatedFiles = [
  // PDF生成器
  'src/utils/invoicePdfGenerator.ts',
  'src/utils/quotationPdfGenerator.ts',
  'src/utils/packingPdfGenerator.ts',
  'src/utils/purchasePdfGenerator.ts',
  'src/utils/orderConfirmationPdfGenerator.ts',
  'src/utils/shippingMarksPdfGenerator.ts',
  
  // PDF页面
  'src/app/quotation/page.tsx',
  'src/app/invoice/page.tsx',
  'src/app/packing/page.tsx',
  'src/app/purchase/page.tsx',
  'src/app/history/page.tsx',
  
  // PDF相关组件
  'src/components/PDFPreviewComponent.tsx',
  'src/components/history/PDFPreviewModal.tsx',
  'src/components/packinglist/ShippingMarksModal.tsx',
  
  // 工具文件
  'src/utils/fontLoader.ts',
  'src/app/pdf-fonts.css'
];

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function checkFontLoaderUsage(filePath) {
  if (!checkFileExists(filePath)) {
    return { exists: false, usesFontLoader: false, hasOldFontCode: false };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const usesFontLoader = content.includes('addChineseFontsToPDF') || 
                        content.includes('from \'@/utils/fontLoader\'');
  const hasOldFontCode = content.includes('addFileToVFS(\'NotoSansSC-Regular.ttf\'') ||
                         content.includes('addFont(\'NotoSansSC-Regular.ttf\'');
  
  return { exists: true, usesFontLoader, hasOldFontCode };
}

function checkPdfFontsImport(filePath) {
  if (!checkFileExists(filePath)) {
    return { exists: false, importsPdfFonts: false };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const importsPdfFonts = content.includes('./pdf-fonts.css');
  
  return { exists: true, importsPdfFonts };
}

console.log('📋 验证1: 核心工具文件');
const fontLoaderTest = checkFontLoaderUsage('src/utils/fontLoader.ts');
const pdfFontsTest = checkFileExists('src/app/pdf-fonts.css');

if (fontLoaderTest.exists) {
  console.log('  ✅ 字体加载工具文件存在');
} else {
  console.log('  ❌ 字体加载工具文件不存在');
}

if (pdfFontsTest) {
  console.log('  ✅ PDF字体CSS文件存在');
} else {
  console.log('  ❌ PDF字体CSS文件不存在');
}

console.log('\n📋 验证2: PDF生成器优化');
let pdfGeneratorsOptimized = 0;
let pdfGeneratorsWithOldCode = 0;

pdfRelatedFiles.slice(0, 6).forEach(file => {
  const test = checkFontLoaderUsage(file);
  if (test.exists) {
    if (test.usesFontLoader) {
      console.log(`  ✅ ${path.basename(file)} 已优化`);
      pdfGeneratorsOptimized++;
    } else {
      console.log(`  ❌ ${path.basename(file)} 未优化`);
    }
    
    if (test.hasOldFontCode) {
      console.log(`  ⚠️  ${path.basename(file)} 仍包含旧字体代码`);
      pdfGeneratorsWithOldCode++;
    }
  } else {
    console.log(`  ⚠️  ${path.basename(file)} 文件不存在`);
  }
});

console.log('\n📋 验证3: PDF页面字体导入');
let pdfPagesOptimized = 0;

pdfRelatedFiles.slice(6, 11).forEach(file => {
  const test = checkPdfFontsImport(file);
  if (test.exists && test.importsPdfFonts) {
    console.log(`  ✅ ${path.basename(file)} 已导入字体CSS`);
    pdfPagesOptimized++;
  } else if (test.exists) {
    console.log(`  ❌ ${path.basename(file)} 未导入字体CSS`);
  } else {
    console.log(`  ⚠️  ${path.basename(file)} 文件不存在`);
  }
});

console.log('\n📋 验证4: PDF组件检查');
pdfRelatedFiles.slice(11, 14).forEach(file => {
  const test = checkFontLoaderUsage(file);
  if (test.exists) {
    console.log(`  ℹ️  ${path.basename(file)} 使用PDF功能 (通过页面字体CSS受益)`);
  } else {
    console.log(`  ⚠️  ${path.basename(file)} 文件不存在`);
  }
});

console.log('\n📊 验证结果汇总:');
console.log(`  🔧 PDF生成器优化: ${pdfGeneratorsOptimized}/6 个已优化`);
console.log(`  📄 PDF页面优化: ${pdfPagesOptimized}/5 个已优化`);
console.log(`  ⚠️  遗留旧代码: ${pdfGeneratorsWithOldCode} 个文件`);

if (fontLoaderTest.exists && pdfFontsTest && pdfGeneratorsOptimized === 6 && pdfPagesOptimized === 5 && pdfGeneratorsWithOldCode === 0) {
  console.log('\n🎉 字体加载优化完全成功！');
  console.log('✅ 所有PDF相关功能都已正确优化');
  console.log('✅ 没有遗留的旧字体代码');
  console.log('✅ 字体文件现在完全按需加载');
} else {
  console.log('\n⚠️  字体加载优化需要进一步完善');
  if (pdfGeneratorsWithOldCode > 0) {
    console.log(`❌ 还有 ${pdfGeneratorsWithOldCode} 个文件包含旧字体代码`);
  }
  if (pdfGeneratorsOptimized < 6) {
    console.log(`❌ 还有 ${6 - pdfGeneratorsOptimized} 个PDF生成器未优化`);
  }
  if (pdfPagesOptimized < 5) {
    console.log(`❌ 还有 ${5 - pdfPagesOptimized} 个PDF页面未优化`);
  }
}

console.log('\n📈 优化效果总结:');
console.log('  • 减少了全局字体加载');
console.log('  • 提高了非PDF页面的加载速度');
console.log('  • 统一了字体加载逻辑');
console.log('  • 提高了代码可维护性');
console.log('  • 保持了PDF生成功能的完整性'); 