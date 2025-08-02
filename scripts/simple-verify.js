const fs = require('fs');
const path = require('path');

// 读取dashboard页面文件
const dashboardPath = path.join(__dirname, '../src/app/dashboard/page.tsx');
const content = fs.readFileSync(dashboardPath, 'utf8');

const lines = content.split('\n');

console.log('Dashboard页面简化验证:');
console.log('===================');

// 检查第523行和第534行
console.log(`第523行: ${lines[522].trim()}`);
console.log(`第534行: ${lines[533].trim()}`);
console.log('');

// 检查这些行是否包含条件return
if (lines[522].includes('if') && lines[522].includes('return')) {
  console.log('✅ 第523行包含条件return');
} else {
  console.log('❌ 第523行不包含条件return');
}

if (lines[533].includes('if') && lines[533].includes('return')) {
  console.log('✅ 第534行包含条件return');
} else {
  console.log('❌ 第534行不包含条件return');
}

console.log('');

// 检查hooks是否都在这些条件return之前
const hooks = [];
for (let i = 0; i < 522; i++) {
  const line = lines[i];
  if (line.includes('useState(') || 
      line.includes('useEffect(') || 
      line.includes('useCallback(') || 
      line.includes('useMemo(') ||
      line.includes('useSession(') ||
      line.includes('useRouter(') ||
      line.includes('usePermissionStore(')) {
    
    const hookType = line.match(/use(\w+)/)?.[1] || 'Unknown';
    hooks.push({
      line: i + 1,
      type: hookType
    });
  }
}

console.log(`在条件return之前找到 ${hooks.length} 个hooks:`);
hooks.forEach((hook, index) => {
  console.log(`${index + 1}. 第${hook.line}行: ${hook.type}`);
});

// 检查条件return之后是否有hooks
const hooksAfterReturn = [];
for (let i = 523; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('useState(') || 
      line.includes('useEffect(') || 
      line.includes('useCallback(') || 
      line.includes('useMemo(') ||
      line.includes('useSession(') ||
      line.includes('useRouter(') ||
      line.includes('usePermissionStore(')) {
    
    const hookType = line.match(/use(\w+)/)?.[1] || 'Unknown';
    hooksAfterReturn.push({
      line: i + 1,
      type: hookType
    });
  }
}

if (hooksAfterReturn.length > 0) {
  console.log('');
  console.log('❌ 发现hooks在条件return之后:');
  hooksAfterReturn.forEach(hook => {
    console.log(`   第${hook.line}行: ${hook.type}`);
  });
} else {
  console.log('');
  console.log('✅ 所有hooks都在条件return之前，结构正确！');
}

console.log('');
console.log('验证完成！'); 