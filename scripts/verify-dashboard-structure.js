const fs = require('fs');
const path = require('path');

// 读取dashboard页面文件
const dashboardPath = path.join(__dirname, '../src/app/dashboard/page.tsx');
const content = fs.readFileSync(dashboardPath, 'utf8');

const lines = content.split('\n');

// 找到组件函数的开始
let componentStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export default function DashboardPage()')) {
    componentStart = i;
    break;
  }
}

if (componentStart === -1) {
  console.log('❌ 未找到DashboardPage组件');
  process.exit(1);
}

console.log('Dashboard页面结构验证:');
console.log('=====================');
console.log(`组件开始位置: 第${componentStart + 1}行`);
console.log('');

// 找到第一个组件级别的条件return
let firstConditionalReturn = -1;
let braceCount = 0;
let inHook = false;

for (let i = componentStart; i < lines.length; i++) {
  const line = lines[i];
  
  // 检查是否进入hook函数
  if (line.includes('useEffect') || line.includes('useCallback') || line.includes('useMemo')) {
    inHook = true;
  }
  
  // 检查大括号
  if (line.includes('{')) {
    braceCount++;
  }
  if (line.includes('}')) {
    braceCount--;
    if (braceCount === 0) {
      inHook = false;
    }
  }
  
  // 只检查组件级别的条件return（不在hook函数内部，且不是注释）
  if (!inHook && line.includes('if') && line.includes('return') && !line.includes('//') && !line.trim().startsWith('//')) {
    firstConditionalReturn = i;
    break;
  }
}

if (firstConditionalReturn === -1) {
  console.log('❌ 未找到组件级别的条件return语句');
  process.exit(1);
}

console.log(`第一个组件级别条件return位置: 第${firstConditionalReturn + 1}行`);
console.log(`条件return内容: ${lines[firstConditionalReturn].trim()}`);
console.log('');

// 检查hooks是否都在条件return之前
const hooks = [];
for (let i = componentStart; i < firstConditionalReturn; i++) {
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
      type: hookType,
      content: line.trim()
    });
  }
}

console.log(`在条件return之前找到 ${hooks.length} 个hooks:`);
hooks.forEach((hook, index) => {
  console.log(`${index + 1}. 第${hook.line}行: ${hook.type}`);
});

// 检查条件return之后是否有hooks
const hooksAfterReturn = [];
for (let i = firstConditionalReturn + 1; i < lines.length; i++) {
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
      type: hookType,
      content: line.trim()
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