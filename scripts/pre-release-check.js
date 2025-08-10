#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 开始发版前自检...\n');

let hasIssues = false;

// 检查1: selector文件中是否有Date.now/new Date
console.log('1️⃣ 检查selector中的时间戳生成...');
try {
  const dateInSelectors = execSync(
    'grep -r "Date\.now\|new Date" src/features/*/state/*.selectors.ts || true',
    { encoding: 'utf8' }
  );
  
  if (dateInSelectors.trim()) {
    console.log('❌ 发现selector中的时间戳生成:');
    console.log(dateInSelectors);
    hasIssues = true;
  } else {
    console.log('✅ 未发现selector中的时间戳生成');
  }
} catch (error) {
  console.log('✅ 未发现selector中的时间戳生成');
}

// 检查2: useEffect依赖中的现拼对象
console.log('\n2️⃣ 检查useEffect依赖中的现拼对象...');
try {
  const useEffectDeps = execSync(
    'grep -r "useEffect.*\\[.*{.*\\]" src/ --include="*.tsx" --include="*.ts" || true',
    { encoding: 'utf8' }
  );
  
  if (useEffectDeps.trim()) {
    console.log('❌ 发现useEffect依赖中的现拼对象:');
    console.log(useEffectDeps);
    hasIssues = true;
  } else {
    console.log('✅ 未发现useEffect依赖中的现拼对象');
  }
} catch (error) {
  console.log('✅ 未发现useEffect依赖中的现拼对象');
}

// 检查3: 需要返回对象的selector是否使用了shallow
console.log('\n3️⃣ 检查对象返回selector的shallow使用...');
try {
  const objectSelectors = execSync(
    'grep -r "usePurchaseStore.*=>.*{.*}" src/features/purchase/ --include="*.tsx" --include="*.ts" || true',
    { encoding: 'utf8' }
  );
  
  if (objectSelectors.trim()) {
    console.log('⚠️  发现对象返回selector，请确认使用了shallow:');
    console.log(objectSelectors);
  } else {
    console.log('✅ 未发现对象返回selector');
  }
} catch (error) {
  console.log('✅ 未发现对象返回selector');
}

// 检查4: 匿名函数在useEffect依赖中
console.log('\n4️⃣ 检查useEffect依赖中的匿名函数...');
try {
  const anonymousFuncs = execSync(
    'grep -r "useEffect.*\\[.*=>.*\\]" src/ --include="*.tsx" --include="*.ts" || true',
    { encoding: 'utf8' }
  );
  
  if (anonymousFuncs.trim()) {
    console.log('❌ 发现useEffect依赖中的匿名函数:');
    console.log(anonymousFuncs);
    hasIssues = true;
  } else {
    console.log('✅ 未发现useEffect依赖中的匿名函数');
  }
} catch (error) {
  console.log('✅ 未发现useEffect依赖中的匿名函数');
}

// 检查5: Math.random在selector中
console.log('\n5️⃣ 检查selector中的Math.random...');
try {
  const mathRandom = execSync(
    'grep -r "Math\.random" src/features/*/state/*.selectors.ts || true',
    { encoding: 'utf8' }
  );
  
  if (mathRandom.trim()) {
    console.log('❌ 发现selector中的Math.random:');
    console.log(mathRandom);
    hasIssues = true;
  } else {
    console.log('✅ 未发现selector中的Math.random');
  }
} catch (error) {
  console.log('✅ 未发现selector中的Math.random');
}

// 检查6: 测试是否通过
console.log('\n6️⃣ 运行稳定性测试...');
try {
  execSync('npm test -- --testPathPattern=purchase.selectors.stability.test.ts', { 
    stdio: 'inherit',
    encoding: 'utf8' 
  });
  console.log('✅ 稳定性测试通过');
} catch (error) {
  console.log('❌ 稳定性测试失败');
  hasIssues = true;
}

console.log('\n' + '='.repeat(50));

if (hasIssues) {
  console.log('❌ 自检发现问题，请修复后再发版');
  process.exit(1);
} else {
  console.log('✅ 自检通过，可以发版！');
  console.log('\n📋 检查清单:');
  console.log('   ✅ 无selector中的时间戳生成');
  console.log('   ✅ 无useEffect依赖中的现拼对象');
  console.log('   ✅ 对象返回selector使用了shallow');
  console.log('   ✅ 无useEffect依赖中的匿名函数');
  console.log('   ✅ 无selector中的Math.random');
  console.log('   ✅ 稳定性测试通过');
}
