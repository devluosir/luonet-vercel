/**
 * 本地ESLint插件 - 项目特定规则
 */

module.exports = {
  rules: {
    'no-spread-in-onchange': {
      meta: {
        type: 'problem',
        docs: {
          description: "禁止在onChange回调中扩展data对象，推荐使用最小补丁",
          category: 'Best Practices',
        },
        messages: {
          avoid: "不要在 {{callee}} 中扩展 '{{varName}}'。请使用最小补丁: onChange({{ field: value }})"
        },
        schema: []
      },
      create(context) {
        return {
          CallExpression(node) {
            // 检查函数调用参数
            if (!node.arguments?.length) return;
            
            const [firstArg] = node.arguments;
            if (firstArg?.type !== 'ObjectExpression') return;
            
            // 查找对象中的扩展表达式
            const spreadProps = firstArg.properties.filter(
              prop => prop.type === 'SpreadElement'
            );
            
            if (spreadProps.length === 0) return;
            
            // 检查调用者名称
            const calleeName = node.callee?.name || node.callee?.property?.name;
            if (!calleeName || !/onChange/i.test(calleeName)) return;
            
            // 检查扩展的变量名
            for (const spread of spreadProps) {
              const varName = spread.argument?.name;
              if (varName === 'data' || varName === 'quotation' || /Data$/.test(varName)) {
                context.report({
                  node: spread,
                  messageId: 'avoid',
                  data: {
                    callee: calleeName,
                    varName: varName
                  }
                });
              }
            }
          }
        };
      }
    }
  }
};
