'use client';

import { useRouter } from 'next/navigation';
import { Home, ArrowRight, Gamepad2, Square, Circle, RotateCcw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function NotFound() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'gomoku' | 'game2048'>('gomoku');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // 五子棋游戏状态
  const [gomokuBoard, setGomokuBoard] = useState<(null | 'black' | 'white')[][]>(
    Array(15).fill(null).map(() => Array(15).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<'black' | 'white'>('black');
  const [gameWinner, setGameWinner] = useState<'black' | 'white' | null>(null);
  const [gameDraw, setGameDraw] = useState(false);

  // 2048游戏状态
  const [board, setBoard] = useState<number[][]>(
    Array(5).fill(null).map(() => Array(5).fill(0))
  );
  const [game2048Active, setGame2048Active] = useState(false);
  const [game2048Over, setGame2048Over] = useState(false);
  const [game2048Won, setGame2048Won] = useState(false);
  const [game2048Score, setGame2048Score] = useState(0);
  const [game2048HighScore, setGame2048HighScore] = useState(0);

  // 触摸手势状态
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  // 从localStorage获取最高分
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('404SnakeHighScore');
      if (saved) {
        setHighScore(parseInt(saved));
      }
      const saved2048 = localStorage.getItem('2048HighScore');
      if (saved2048) {
        setGame2048HighScore(parseInt(saved2048));
      }
    }
  }, []);

  const handleGomokuClick = (row: number, col: number) => {
    if (gomokuBoard[row][col] || gameWinner || gameDraw) {
      return;
    }

    const newBoard = gomokuBoard.map(row => [...row]);
    newBoard[row][col] = currentPlayer;
    setGomokuBoard(newBoard);

    // 检查胜利条件
    if (checkWin(newBoard, row, col, currentPlayer)) {
      setGameWinner(currentPlayer);
      return;
    }

    // 检查平局
    if (isBoardFull(newBoard)) {
      setGameDraw(true);
      return;
    }

    setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
  };

  const checkWin = (board: (null | 'black' | 'white')[][], row: number, col: number, player: 'black' | 'white') => {
    const directions = [
      [[0, 1], [0, -1]], // 水平
      [[1, 0], [-1, 0]], // 垂直
      [[1, 1], [-1, -1]], // 对角线
      [[1, -1], [-1, 1]] // 反对角线
    ];

    return directions.some(direction => {
      const count = 1 + 
        countDirection(board, row, col, direction[0][0], direction[0][1], player) +
        countDirection(board, row, col, direction[1][0], direction[1][1], player);
      return count >= 5;
    });
  };

  const countDirection = (board: (null | 'black' | 'white')[][], row: number, col: number, dRow: number, dCol: number, player: 'black' | 'white') => {
    let count = 0;
    let r = row + dRow;
    let c = col + dCol;

    while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) {
      count++;
      r += dRow;
      c += dCol;
    }

    return count;
  };

  const isBoardFull = (board: (null | 'black' | 'white')[][]) => {
    return board.every(row => row.every(cell => cell !== null));
  };

  const resetGomoku = () => {
    setGomokuBoard(Array(15).fill(null).map(() => Array(15).fill(null)));
    setCurrentPlayer('black');
    setGameWinner(null);
    setGameDraw(false);
  };

  // 初始化2048游戏
  const init2048Game = () => {
    const newBoard = Array(5).fill(null).map(() => Array(5).fill(0));
    // 添加两个初始数字
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    setBoard(newBoard);
    setGame2048Score(0);
    setGame2048Over(false);
    setGame2048Won(false);
    setGame2048Active(true);
  };

  // 添加随机数字
  const addRandomTile = (board: number[][]) => {
    const emptyCells = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (board[i][j] === 0) {
          emptyCells.push({ i, j });
        }
      }
    }
    if (emptyCells.length > 0) {
      const { i, j } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      board[i][j] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  // 移动和合并逻辑
  const moveAndMerge = (board: number[][], direction: 'up' | 'down' | 'left' | 'right') => {
    const newBoard = board.map(row => [...row]);
    let moved = false;
    let score = 0;

    const moveRow = (row: number[]) => {
      const filtered = row.filter(cell => cell !== 0);
      for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i + 1]) {
          filtered[i] *= 2;
          score += filtered[i];
          filtered.splice(i + 1, 1);
        }
      }
      while (filtered.length < 5) {
        filtered.push(0);
      }
      return filtered;
    };

    if (direction === 'left' || direction === 'right') {
      for (let i = 0; i < 5; i++) {
        let row = newBoard[i];
        if (direction === 'right') {
          row = row.reverse();
        }
        const newRow = moveRow(row);
        if (direction === 'right') {
          newRow.reverse();
        }
        if (JSON.stringify(newRow) !== JSON.stringify(newBoard[i])) {
          moved = true;
        }
        newBoard[i] = newRow;
      }
    } else {
      for (let j = 0; j < 5; j++) {
        let col = [newBoard[0][j], newBoard[1][j], newBoard[2][j], newBoard[3][j], newBoard[4][j]];
        if (direction === 'down') {
          col = col.reverse();
        }
        const newCol = moveRow(col);
        if (direction === 'down') {
          newCol.reverse();
        }
        for (let i = 0; i < 5; i++) {
          if (newBoard[i][j] !== newCol[i]) {
            moved = true;
          }
          newBoard[i][j] = newCol[i];
        }
      }
    }

    if (moved) {
      addRandomTile(newBoard);
      setGame2048Score(prev => prev + score);
      setBoard(newBoard);
    }

    return moved;
  };

  // 检查游戏是否结束
  const checkGameOver = (board: number[][]) => {
    // 检查是否有空格
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (board[i][j] === 0) return false;
      }
    }
    // 检查是否可以合并
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const current = board[i][j];
        if (
          (i < 4 && board[i + 1][j] === current) ||
          (j < 4 && board[i][j + 1] === current)
        ) {
          return false;
        }
      }
    }
    return true;
  };

  // 检查是否获胜
  const check2048Win = (board: number[][]) => {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (board[i][j] === 2048) return true;
      }
    }
    return false;
  };

  // 处理手势方向
  const handleSwipe = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!game2048Active || game2048Over) return;

    const moved = moveAndMerge(board, direction);
    
    if (moved) {
      // 检查是否获胜
      if (!game2048Won && check2048Win(board)) {
        setGame2048Won(true);
      }
      // 检查游戏是否结束
      if (checkGameOver(board)) {
        setGame2048Over(true);
        // 更新最高分
        const newScore = game2048Score;
        if (newScore > game2048HighScore) {
          setGame2048HighScore(newScore);
          if (typeof window !== 'undefined') {
            localStorage.setItem('2048HighScore', newScore.toString());
          }
        }
      }
    }
  };

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
    const minSwipeDistance = 50; // 最小滑动距离

    if (Math.abs(distanceX) < minSwipeDistance && Math.abs(distanceY) < minSwipeDistance) {
      return; // 滑动距离太小，忽略
    }

    if (isHorizontalSwipe) {
      if (distanceX > 0) {
        handleSwipe('left');
      } else {
        handleSwipe('right');
      }
    } else {
      if (distanceY > 0) {
        handleSwipe('up');
      } else {
        handleSwipe('down');
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // 键盘控制2048
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!game2048Active || game2048Over) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          handleSwipe('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          handleSwipe('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleSwipe('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleSwipe('right');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [game2048Active, board, game2048Over, game2048Won, game2048Score, game2048HighScore]);

  const reset2048Game = () => {
    init2048Game();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* 顶部标题栏 */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="text-sm">返回</span>
        </button>

        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 text-white text-sm font-bold rounded-full shadow-md">
            404
          </div>
          <h1 className="text-lg font-medium text-gray-600">页面丢了~~休息一下吧~~~</h1>
        </div>

        <div className="w-20"></div> {/* 占位，保持标题居中 */}
      </div>

      {/* 游戏容器 */}
      <div className="max-w-2xl mx-auto w-full mt-20">
        <div className="container mx-auto px-4 py-4">
          {/* 游戏选项卡 */}
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-xl shadow-lg p-1 border border-gray-200">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('gomoku')}
                    className={`px-8 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
                      activeTab === 'gomoku'
                        ? 'bg-gradient-to-r from-slate-500 to-gray-500 text-white shadow-sm'
                        : 'bg-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Square className="w-5 h-5" />
                    <span>五子棋</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('game2048')}
                    className={`px-8 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
                      activeTab === 'game2048'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
                        : 'bg-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Square className="w-5 h-5" />
                    <span>2048</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 游戏区域 */}
            <div className="rounded-xl p-8">
              {activeTab === 'gomoku' ? (
                <div className="text-center">
                  {/* 棋盘 */}
                  <div className="inline-block bg-gradient-to-br from-slate-100 to-gray-100 p-6 rounded-2xl border-0 shadow-lg relative">
                    <div className="gap-0 bg-gradient-to-br from-slate-200 to-gray-200 p-2 rounded-xl border-0" style={{ 
                      width: '400px', 
                      height: '400px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(15, 1fr)',
                      gridTemplateRows: 'repeat(15, 1fr)'
                    }}>
                      {gomokuBoard.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                          <button
                            key={`${rowIndex}-${colIndex}`}
                            onClick={() => handleGomokuClick(rowIndex, colIndex)}
                            disabled={!!cell || !!gameWinner || gameDraw}
                            className={`w-full h-full border border-slate-200 transition-all duration-200 ${
                              cell === 'black' 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md' 
                                : cell === 'white' 
                                  ? 'bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 shadow-md' 
                                  : 'bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100'
                            }`}
                            style={{
                              borderRadius: cell ? '50%' : '0%',
                              margin: cell ? '1px' : '0px'
                            }}
                          >
                            {/* 圆形棋子 */}
                          </button>
                        ))
                      )}
                    </div>
                    
                    {/* 获胜提示覆盖层 */}
                    {(gameWinner || gameDraw) && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl mx-4 border border-gray-200">
                          <h3 className="text-2xl font-bold text-gray-800 mb-4">
                            {gameWinner ? '🎉 游戏结束！' : '🤝 平局！'}
                          </h3>
                          {gameWinner && (
                            <div className="flex items-center justify-center space-x-3 mb-6">
                              <span className="text-lg text-gray-600">获胜者:</span>
                              <div 
                                className={`w-8 h-8 rounded-full shadow-md ${
                                  gameWinner === 'black' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-orange-400 to-orange-500'
                                }`}
                              />
                              <span className="font-bold text-xl text-gray-800">
                                {gameWinner === 'black' ? '蓝棋' : '橙棋'}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={resetGomoku}
                            className="bg-gradient-to-r from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2 mx-auto"
                          >
                            <RotateCcw className="w-5 h-5" />
                            <span>再来一局</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex items-center justify-center space-x-6">
                    {!gameWinner && !gameDraw && (
                      <div className="flex items-center space-x-3 bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-xl px-4 py-3 shadow-md">
                        <span className="text-gray-600 font-medium">当前玩家:</span>
                        <div 
                          className={`w-6 h-6 rounded-full shadow-md ${
                            currentPlayer === 'black' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-orange-400 to-orange-500'
                          }`}
                        />
                        <span className="font-bold text-gray-800">
                          {currentPlayer === 'black' ? '蓝棋' : '橙棋'}
                        </span>
                      </div>
                    )}
                    
                    <button
                      onClick={resetGomoku}
                      className="bg-gradient-to-r from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>重新开始</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  {/* 2048游戏区域 */}
                  <div 
                    className="inline-block bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 rounded-2xl border-0 shadow-lg"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ touchAction: 'none' }}
                  >
                    <div className="gap-2 bg-slate-200 border-0 rounded-xl shadow-inner p-2" style={{ 
                      width: '400px', 
                      height: '400px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gridTemplateRows: 'repeat(5, 1fr)'
                    }}>
                      {board.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`w-full h-full flex items-center justify-center text-3xl font-bold rounded-xl shadow-sm transition-all duration-200 ${
                              cell === 0 ? 'bg-slate-100 text-slate-400' : 
                              cell === 2 ? 'bg-gradient-to-br from-blue-200 to-blue-300 text-blue-800' : 
                              cell === 4 ? 'bg-gradient-to-br from-blue-300 to-blue-400 text-blue-900' : 
                              cell === 8 ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white' : 
                              cell === 16 ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 
                              cell === 32 ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' : 
                              cell === 64 ? 'bg-gradient-to-br from-blue-700 to-blue-800 text-white' : 
                              cell === 128 ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white' : 
                              cell === 256 ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' : 
                              cell === 512 ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white' : 
                              cell === 1024 ? 'bg-gradient-to-br from-purple-700 to-purple-800 text-white' : 
                              cell === 2048 ? 'bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-lg' : 'bg-slate-100'
                            }`}
                          >
                            {cell !== 0 && cell}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 2048游戏控制按钮 */}
                  <div className="mt-8 flex items-center justify-center space-x-4">
                    {!game2048Active ? (
                      <button
                        onClick={init2048Game}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                      >
                        开始游戏
                      </button>
                    ) : (
                      <>
                        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded-xl px-4 py-2 shadow-md">
                          <p className="text-blue-700 font-medium text-sm">分数: {game2048Score}</p>
                        </div>
                        <div className="bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-xl px-4 py-2 shadow-md">
                          <p className="text-indigo-700 font-medium text-sm">最高分: {game2048HighScore}</p>
                        </div>
                        <button
                          onClick={reset2048Game}
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                        >
                          重新开始
                        </button>
                      </>
                    )}
                  </div>

                  {/* 游戏结束提示 */}
                  {game2048Over && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-2xl">
                      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">游戏结束</h3>
                        <p className="text-gray-600 mb-6">最终分数: {game2048Score}</p>
                        <button
                          onClick={reset2048Game}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                        >
                          再来一局
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 游戏获胜提示 */}
                  {game2048Won && !game2048Over && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-2xl">
                      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
                        <h3 className="text-2xl font-bold text-green-600 mb-4">恭喜获胜！</h3>
                        <p className="text-gray-600 mb-6">你达到了2048！</p>
                        <button
                          onClick={reset2048Game}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                        >
                          再来一局
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 