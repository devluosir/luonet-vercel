const fs = require('fs');
const path = require('path');

// 读取dashboard页面文件
const dashboardPath = path.join(__dirname, '../src/app/dashboard/page.tsx');
const content = fs.readFileSync(dashboardPath, 'utf8');

// 检查hooks顺序
const hooks = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // 检查各种hooks
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
      type: hookType,
      content: line.trim()
    });
  }
}

console.log('Dashboard页面hooks顺序检查:');
console.log('========================');

hooks.forEach((hook, index) => {
  console.log(`${index + 1}. 第${hook.line}行: ${hook.type}`);
  console.log(`   内容: ${hook.content.substring(0, 80)}${hook.content.length > 80 ? '...' : ''}`);
  console.log('');
});

// 检查是否有条件性的hooks调用
const conditionalHooks = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('if') && line.includes('use') && 
      (line.includes('useState') || line.includes('useEffect') || line.includes('useCallback') || line.includes('useMemo'))) {
    conditionalHooks.push({
      line: i + 1,
      content: line.trim()
    });
  }
}

if (conditionalHooks.length > 0) {
  console.log('⚠️  发现条件性hooks调用:');
  conditionalHooks.forEach(hook => {
    console.log(`   第${hook.line}行: ${hook.content}`);
  });
} else {
  console.log('✅ 没有发现条件性hooks调用');
}

// 检查hooks是否在条件return之后
const conditionalReturns = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // 只检查条件return语句，如 if (!mounted) return null;
  if (line.includes('if') && line.includes('return') && !line.includes('//')) {
    conditionalReturns.push({
      line: i + 1,
      content: line.trim()
    });
  }
}

const hooksAfterConditionalReturn = hooks.filter(hook => {
  const firstConditionalReturn = conditionalReturns.find(ret => ret.line < hook.line);
  return firstConditionalReturn && firstConditionalReturn.line < hook.line;
});

if (hooksAfterConditionalReturn.length > 0) {
  console.log('⚠️  发现hooks在条件return语句之后:');
  hooksAfterConditionalReturn.forEach(hook => {
    console.log(`   第${hook.line}行: ${hook.type}`);
  });
} else {
  console.log('✅ 没有发现hooks在条件return语句之后');
}

console.log('\n检查完成！'); 