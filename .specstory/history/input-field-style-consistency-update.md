## SpecStory

## Input Field Style Consistency Update (2025/1/12 20:02:18)

_**User**_

请把按输入框的样式，调成与登陆框的输入框一样。
@Codebase 

---

_**Assistant**_

要将 `ProfileModal` 组件中的输入框样式调整为与登录框的输入框样式一致，我们需要参考登录页面的输入框样式，并将其应用到 `ProfileModal` 中。

以下是 `ProfileModal` 中的输入框样式更新：

```typescript:src/components/profile/ProfileModal.tsx
<form onSubmit={handleChangePassword} className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      当前密码
    </label>
    <input
      type="password"
      required
      className="appearance-none block w-full px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-base"
      value={passwordForm.currentPassword}
      onChange={(e) => setPasswordForm({
        ...passwordForm,
        currentPassword: e.target.value
      })}
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      新密码
    </label>
    <input
      type="password"
      required
      className="appearance-none block w-full px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-base"
      value={passwordForm.newPassword}
      onChange={(e) => setPasswordForm({
        ...passwordForm,
        newPassword: e.target.value
      })}
    />
  </div>
</form>
```

### 主要更改点：

- 使用 `appearance-none` 来移除默认的浏览器样式。
- 设置 `px-3 py-3` 以匹配登录框的内边距。
- 使用 `bg-gray-50 dark:bg-gray-700` 和 `border-gray-200 dark:border-gray-600` 来匹配背景和边框颜色。
- 使用 `rounded-xl` 以匹配圆角样式。
- 使用 `placeholder-gray-400 dark:placeholder-gray-500` 来匹配占位符颜色。
- 设置 `text-gray-900 dark:text-white text-base` 以匹配文本颜色和大小。

这样，`ProfileModal` 中的输入框样式就与登录框的输入框样式一致了。

---



---

