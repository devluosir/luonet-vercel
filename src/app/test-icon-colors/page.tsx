'use client';

export default function TestIconColors() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-8">
      <h1 className="text-2xl font-bold mb-8">图标背景色测试</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 测试图标背景色 */}
        <div className="p-4 border rounded-lg">
          <h3 className="mb-2">蓝色图标背景</h3>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded"></div>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="mb-2">绿色图标背景</h3>
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded"></div>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="mb-2">青色图标背景</h3>
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded"></div>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="mb-2">紫色图标背景</h3>
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded"></div>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="mb-2">橙色图标背景</h3>
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded"></div>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="mb-2">靛蓝色图标背景</h3>
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded"></div>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="mb-2">玫瑰色图标背景</h3>
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded"></div>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="mb-2">紫红色图标背景</h3>
          <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 dark:from-fuchsia-600 dark:to-fuchsia-700 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded"></div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={() => {
            const html = document.documentElement;
            html.classList.toggle('dark');
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          切换黑夜模式
        </button>
      </div>
    </div>
  );
}
