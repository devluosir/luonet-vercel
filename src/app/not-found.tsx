'use client';

import { useRouter } from 'next/navigation';
import { Home, ArrowRight, Gamepad2, Square, Circle, RotateCcw } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

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
    setBoard([...newBoard]); // 确保状态更新
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
        let row = [...newBoard[i]];
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
      setBoard([...newBoard]); // 确保状态更新
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

  // 检查是否获胜（移除2048限制，改为达到2048时显示祝贺但不结束游戏）
  const check2048Win = (board: number[][]) => {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (board[i][j] === 2048) return true;
      }
    }
    return false;
  };

  // 处理手势方向
  const handleSwipe = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!game2048Active || game2048Over) return;

    const moved = moveAndMerge(board, direction);
    
    if (moved) {
      // 使用setTimeout确保状态更新后再检查
      setTimeout(() => {
        // 检查是否达到2048（显示祝贺但不结束游戏）
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
      }, 0);
    }
  }, [game2048Active, game2048Over, board, game2048Won, game2048Score, game2048HighScore]);

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
    const minSwipeDistance = 30; // 降低最小滑动距离，更适合手机

    if (Math.abs(distanceX) < minSwipeDistance && Math.abs(distanceY) < minSwipeDistance) {
      return; // 滑动距离太小，忽略
    }

    try {
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
    } catch (error) {
      console.error('Swipe error:', error);
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
  }, [game2048Active, game2048Over, handleSwipe]);

  const reset2048Game = () => {
    setGame2048Active(false);
    setGame2048Over(false);
    setGame2048Won(false);
    setGame2048Score(0);
    setBoard(Array(5).fill(null).map(() => Array(5).fill(0)));
    // 延迟初始化，确保状态重置完成
    setTimeout(() => {
      init2048Game();
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-2 sm:p-4">
      {/* 顶部标题栏 - 移动端优化 */}
      <div className="absolute top-2 sm:top-6 left-2 sm:left-6 right-2 sm:right-6 flex items-center justify-between">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center space-x-1 sm:space-x-2 text-gray-500 hover:text-gray-700 transition-colors p-2"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="text-xs sm:text-sm">返回</span>
        </button>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="inline-flex items-center justify-center mx-auto w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-gray-400 to-gray-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-md">
            404
          </div>
        </div>
      </div>

      {/* 游戏容器 - 移动端优化 */}
      <div className="w-full max-w-[100vw] px-[2px] mx-auto mt-16 sm:mt-20">
        <div className="container mx-auto py-2 sm:py-4">
          {/* 游戏选项卡 - 移动端优化 */}
          <div className="w-full">
            <div className="flex justify-center mb-3 sm:mb-6">
              <div className="bg-white rounded-xl shadow-lg p-1 border border-gray-200 w-full max-w-[280px] sm:max-w-none">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('gomoku')}
                    className={`flex-1 px-2 sm:px-8 py-2 sm:py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-base ${
                      activeTab === 'gomoku'
                        ? 'bg-gradient-to-r from-slate-500 to-gray-500 text-white shadow-sm'
                        : 'bg-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Square className="w-3 h-3 sm:w-5 sm:h-5" />
                    <span>五子棋</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('game2048')}
                    className={`flex-1 px-2 sm:px-8 py-2 sm:py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-base ${
                      activeTab === 'game2048'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
                        : 'bg-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Square className="w-3 h-3 sm:w-5 sm:h-5" />
                    <span>2048</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 游戏区域 - 移动端优化 */}
            <div className="rounded-xl p-0 lg:p-8 flex justify-center w-full">
              {activeTab === 'gomoku' ? (
                <div className="text-center w-full">
                  {/* 棋盘 - 移动端响应式 */}
                  <div className="inline-block bg-gradient-to-br from-slate-100 to-gray-100 p-1 lg:p-6 rounded-2xl border-0 shadow-lg relative w-full max-w-full">

                    <div className="gap-0 bg-gradient-to-br from-slate-200 to-gray-200 p-1 sm:p-2 rounded-xl border-0 w-full max-w-full h-auto aspect-square" style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(15, 1fr)',
                      gridTemplateRows: 'repeat(15, 1fr)',
                      pointerEvents: 'auto'
                    }}>
                      {gomokuBoard.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                          <button
                            key={`${rowIndex}-${colIndex}`}
                            onClick={() => handleGomokuClick(rowIndex, colIndex)}
                            disabled={!!cell || !!gameWinner || gameDraw}
                            className={`w-full h-full border border-slate-200 transition-all duration-200 min-w-[18px] min-h-[18px] ${
                              cell ? 'cursor-not-allowed' : 'cursor-pointer'
                            } ${
                              cell === 'black' 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md' 
                                : cell === 'white' 
                                  ? 'bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 shadow-md' 
                                  : 'bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100'
                            }`}
                            style={{
                              borderRadius: cell ? '50%' : '0%',
                              margin: cell ? '1px' : '0px',
                              pointerEvents: 'auto',
                              zIndex: 1
                            }}
                            title={`${rowIndex},${colIndex} - ${cell || 'empty'}`}
                          >
                            {/* 圆形棋子 */}
                          </button>
                        ))
                      )}
                    </div>
                    
                    {/* 获胜提示覆盖层 - 移动端优化 */}
                    {(gameWinner || gameDraw) && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-2xl backdrop-blur-sm z-10">
                        <div className="bg-white rounded-2xl p-3 sm:p-8 text-center shadow-2xl mx-2 sm:mx-4 border border-gray-200 max-w-[260px] sm:max-w-none">
                          <h3 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-4">
                            {gameWinner ? '🎉 游戏结束！' : '🤝 平局！'}
                          </h3>
                          {gameWinner && (
                            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-6">
                              <span className="text-xs sm:text-lg text-gray-600">获胜者:</span>
                              <div 
                                className={`w-5 h-5 sm:w-8 sm:h-8 rounded-full shadow-md ${
                                  gameWinner === 'black' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-orange-400 to-orange-500'
                                }`}
                              />
                              <span className="font-bold text-sm sm:text-xl text-gray-800">
                                {gameWinner === 'black' ? '蓝棋' : '橙棋'}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={resetGomoku}
                            className="bg-gradient-to-r from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600 text-white font-semibold py-1 sm:py-3 px-4 sm:px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2 mx-auto text-xs sm:text-base"
                          >
                            <RotateCcw className="w-3 h-3 sm:w-5 sm:h-5" />
                            <span>再来一局</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 游戏控制区域 - 移动端优化 */}
                  <div className="mt-4 sm:mt-8 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6">

                    {!gameWinner && !gameDraw && (
                      <div className="flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-xl px-2 sm:px-4 py-1 sm:py-3 shadow-md">
                        <span className="text-gray-600 font-medium text-xs sm:text-sm">当前玩家:</span>
                        <div 
                          className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full shadow-md ${
                            currentPlayer === 'black' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-orange-400 to-orange-500'
                          }`}
                        />
                        <span className="font-bold text-gray-800 text-xs sm:text-sm">
                          {currentPlayer === 'black' ? '蓝棋' : '橙棋'}
                        </span>
                      </div>
                    )}
                    
                    <button
                      onClick={resetGomoku}
                      className="bg-gradient-to-r from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600 text-white font-semibold py-1 sm:py-3 px-3 sm:px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center space-x-2 text-xs sm:text-base"
                    >
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>重新开始</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center w-full">
                  {/* 2048游戏区域 - 移动端响应式 */}
                  <div 
                    className="inline-block bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-1 lg:p-6 rounded-2xl border-0 shadow-lg w-full max-w-full"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ touchAction: 'none' }}
                  >
                                         <div className="gap-1 sm:gap-2 bg-slate-200 border-0 rounded-xl shadow-inner p-2 sm:p-3 w-full max-w-full h-auto aspect-square" style={{ 
                       display: 'grid',
                       gridTemplateColumns: 'repeat(5, 1fr)',
                       gridTemplateRows: 'repeat(5, 1fr)'
                     }}>
                      {board.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                                                        className={`w-full h-full flex items-center justify-center font-black rounded-xl shadow-sm transition-all duration-200 min-w-[18px] min-h-[18px] ${
                              cell === 0 ? 'bg-slate-100 text-slate-400' : 
                              cell === 2 ? 'bg-gradient-to-br from-yellow-200 to-yellow-300 text-yellow-900 shadow-md' : 
                              cell === 4 ? 'bg-gradient-to-br from-orange-200 to-orange-300 text-orange-900 shadow-md' : 
                              cell === 8 ? 'bg-gradient-to-br from-red-200 to-red-300 text-red-900 shadow-md' : 
                              cell === 16 ? 'bg-gradient-to-br from-pink-200 to-pink-300 text-pink-900 shadow-md' : 
                              cell === 32 ? 'bg-gradient-to-br from-purple-200 to-purple-300 text-purple-900 shadow-md' : 
                              cell === 64 ? 'bg-gradient-to-br from-indigo-200 to-indigo-300 text-indigo-900 shadow-md' : 
                              cell === 128 ? 'bg-gradient-to-br from-blue-200 to-blue-300 text-blue-900 shadow-md' : 
                              cell === 256 ? 'bg-gradient-to-br from-cyan-200 to-cyan-300 text-cyan-900 shadow-md' : 
                              cell === 512 ? 'bg-gradient-to-br from-teal-300 to-teal-400 text-teal-900 shadow-lg' : 
                              cell === 1024 ? 'bg-gradient-to-br from-emerald-300 to-emerald-400 text-emerald-900 shadow-lg' : 
                              cell === 2048 ? 'bg-gradient-to-br from-yellow-300 to-yellow-400 text-yellow-900 shadow-xl ring-2 ring-yellow-500 animate-pulse' : 
                              cell === 4096 ? 'bg-gradient-to-br from-red-300 to-red-400 text-red-900 shadow-xl ring-2 ring-red-500 animate-pulse' : 
                              cell === 8192 ? 'bg-gradient-to-br from-purple-300 to-purple-400 text-purple-900 shadow-xl ring-2 ring-purple-500 animate-pulse' : 
                              cell === 16384 ? 'bg-gradient-to-br from-indigo-300 to-indigo-400 text-indigo-900 shadow-xl ring-2 ring-indigo-500 animate-pulse' : 
                              cell === 32768 ? 'bg-gradient-to-br from-blue-300 to-blue-400 text-blue-900 shadow-xl ring-2 ring-blue-500 animate-pulse' : 
                              cell >= 65536 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900 shadow-xl ring-2 ring-gray-500 animate-pulse' : 'bg-slate-100'
                            } ${
                              cell >= 65536 ? 'text-sm sm:text-lg lg:text-xl' : 
                              cell >= 16384 ? 'text-base sm:text-xl lg:text-2xl' : 
                              cell >= 4096 ? 'text-lg sm:text-2xl lg:text-3xl' : 
                              cell === 2048 ? 'text-lg sm:text-2xl lg:text-3xl' : 
                              cell === 1024 ? 'text-xl sm:text-3xl lg:text-4xl' : 
                              cell === 512 ? 'text-xl sm:text-3xl lg:text-4xl' : 
                              cell === 256 ? 'text-2xl sm:text-4xl lg:text-5xl' : 
                              cell === 128 ? 'text-2xl sm:text-4xl lg:text-5xl' : 
                              cell === 64 ? 'text-2xl sm:text-4xl lg:text-5xl' : 
                              cell === 32 ? 'text-3xl sm:text-5xl lg:text-6xl' : 
                              cell === 16 ? 'text-3xl sm:text-5xl lg:text-6xl' : 
                              cell === 8 ? 'text-3xl sm:text-5xl lg:text-6xl' : 
                              cell === 4 ? 'text-3xl sm:text-5xl lg:text-6xl' : 
                              cell === 2 ? 'text-3xl sm:text-5xl lg:text-6xl' : 
                              'text-3xl sm:text-5xl lg:text-6xl'
                            }`}
                          >
                            {cell !== 0 && cell}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 2048游戏控制按钮 - 移动端优化 */}
                  <div className="mt-4 sm:mt-8 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                    {!game2048Active ? (
                      <button
                        onClick={init2048Game}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-1 sm:py-3 px-3 sm:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-xs sm:text-base"
                      >
                        开始游戏
                      </button>
                    ) : (
                      <>
                        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded-xl px-2 sm:px-4 py-1 sm:py-2 shadow-md">
                          <p className="text-blue-700 font-medium text-xs sm:text-sm">分数: {game2048Score}</p>
                        </div>
                        <div className="bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-xl px-2 sm:px-4 py-1 sm:py-2 shadow-md">
                          <p className="text-indigo-700 font-medium text-xs sm:text-sm">最高分: {game2048HighScore}</p>
                        </div>
                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-xl px-2 sm:px-4 py-1 sm:py-2 shadow-md">
                          <p className="text-green-700 font-medium text-xs sm:text-sm">最高数字: {Math.max(...board.flat())}</p>
                        </div>
                        <button
                          onClick={reset2048Game}
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-1 sm:py-2 px-2 sm:px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm"
                        >
                          重新开始
                        </button>
                      </>
                    )}
                  </div>

                  {/* 游戏结束提示 - 移动端优化 */}
                  {game2048Over && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-2xl">
                      <div className="bg-white p-3 sm:p-8 rounded-2xl shadow-2xl text-center mx-4 max-w-[260px] sm:max-w-none">
                        <h3 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-4">游戏结束</h3>
                        <p className="text-gray-600 mb-3 sm:mb-6 text-xs sm:text-base">最终分数: {game2048Score}</p>
                        <button
                          onClick={reset2048Game}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-1 sm:py-3 px-3 sm:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-xs sm:text-base"
                        >
                          再来一局
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 游戏获胜提示 - 移动端优化 */}
                  {game2048Won && !game2048Over && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-2xl">
                      <div className="bg-white p-3 sm:p-8 rounded-2xl shadow-2xl text-center mx-4 max-w-[260px] sm:max-w-none">
                        <h3 className="text-lg sm:text-2xl font-bold text-green-600 mb-2 sm:mb-4">恭喜！</h3>
                        <p className="text-gray-600 mb-3 sm:mb-6 text-xs sm:text-base">你达到了2048！游戏继续，挑战更高分数！</p>
                        <button
                          onClick={() => setGame2048Won(false)}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-1 sm:py-3 px-3 sm:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-xs sm:text-base"
                        >
                          继续游戏
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