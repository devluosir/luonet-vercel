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
  const [hasShown2048Message, setHasShown2048Message] = useState(false);
  const [highestAchievedNumber, setHighestAchievedNumber] = useState(0);
  const [game2048Score, setGame2048Score] = useState(0);
  const [game2048HighScore, setGame2048HighScore] = useState(0);

  // 触摸和鼠标手势状态
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [mouseStart, setMouseStart] = useState<{ x: number; y: number } | null>(null);
  const [mouseEnd, setMouseEnd] = useState<{ x: number; y: number } | null>(null);

  // 从localStorage获取最高分和游戏进度
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 获取最高分
      const saved = localStorage.getItem('404SnakeHighScore');
      if (saved) {
        setHighScore(parseInt(saved));
      }
      const saved2048 = localStorage.getItem('2048HighScore');
      if (saved2048) {
        setGame2048HighScore(parseInt(saved2048));
      }
      
      // 获取五子棋游戏进度
      const savedGomoku = localStorage.getItem('gomokuGameState');
      if (savedGomoku) {
        try {
          const gomokuState = JSON.parse(savedGomoku);
          setGomokuBoard(gomokuState.board || Array(15).fill(null).map(() => Array(15).fill(null)));
          setCurrentPlayer(gomokuState.currentPlayer || 'black');
          setGameWinner(gomokuState.gameWinner || null);
          setGameDraw(gomokuState.gameDraw || false);
        } catch (error) {
          console.error('加载五子棋进度失败:', error);
        }
      }
      
      // 获取2048游戏进度
      const saved2048Game = localStorage.getItem('2048GameState');
      if (saved2048Game) {
        try {
          const game2048State = JSON.parse(saved2048Game);
          setBoard(game2048State.board || Array(5).fill(null).map(() => Array(5).fill(0)));
          setGame2048Active(game2048State.gameActive || false);
          setGame2048Over(game2048State.gameOver || false);
          setGame2048Won(game2048State.gameWon || false);
          setGame2048Score(game2048State.score || 0);
          setHighestAchievedNumber(game2048State.highestAchievedNumber || 0);
        } catch (error) {
          console.error('加载2048进度失败:', error);
        }
      }
    }
  }, []);

  // 自动保存五子棋游戏进度
  useEffect(() => {
    if (typeof window !== 'undefined' && gomokuBoard.some(row => row.some(cell => cell !== null))) {
      saveGomokuProgress();
    }
  }, [gomokuBoard, currentPlayer, gameWinner, gameDraw]);

  // 自动保存2048游戏进度
  useEffect(() => {
    if (typeof window !== 'undefined' && game2048Active) {
      save2048Progress();
    }
  }, [board, game2048Active, game2048Over, game2048Won, game2048Score]);

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
      // 游戏结束时保存进度
      setTimeout(() => saveGomokuProgress(), 0);
      return;
    }

    // 检查平局
    if (isBoardFull(newBoard)) {
      setGameDraw(true);
      // 游戏结束时保存进度
      setTimeout(() => saveGomokuProgress(), 0);
      return;
    }

    setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
    // 每次落子后保存进度
    setTimeout(() => saveGomokuProgress(), 0);
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

  // 保存五子棋游戏进度
  const saveGomokuProgress = () => {
    if (typeof window !== 'undefined') {
      const gomokuState = {
        board: gomokuBoard,
        currentPlayer,
        gameWinner,
        gameDraw
      };
      localStorage.setItem('gomokuGameState', JSON.stringify(gomokuState));
    }
  };

  // 保存2048游戏进度
  const save2048Progress = () => {
    if (typeof window !== 'undefined') {
      const game2048State = {
        board,
        gameActive: game2048Active,
        gameOver: game2048Over,
        gameWon: game2048Won,
        score: game2048Score,
        highestAchievedNumber
      };
      localStorage.setItem('2048GameState', JSON.stringify(game2048State));
    }
  };

  const resetGomoku = () => {
    setGomokuBoard(Array(15).fill(null).map(() => Array(15).fill(null)));
    setCurrentPlayer('black');
    setGameWinner(null);
    setGameDraw(false);
    // 清除保存的进度
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gomokuGameState');
    }
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
    // 游戏开始时保存进度
    setTimeout(() => save2048Progress(), 0);
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
      // 移动后保存进度
      setTimeout(() => save2048Progress(), 0);
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

  // 检查是否达到新的里程碑
  const checkNewMilestone = (board: number[][]) => {
    const currentMax = Math.max(...board.flat());
    const milestones = [2048, 4096, 8192, 16384, 32768, 65536];
    
    for (const milestone of milestones) {
      if (currentMax >= milestone && milestone > highestAchievedNumber) {
        return milestone;
      }
    }
    return null;
  };

  // 处理手势方向
  const handleSwipe = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!game2048Active || game2048Over) return;

    const moved = moveAndMerge(board, direction);
    
    if (moved) {
      // 使用setTimeout确保状态更新后再检查
      setTimeout(() => {
        // 检查是否达到新的里程碑
        const newMilestone = checkNewMilestone(board);
        if (newMilestone) {
          setHighestAchievedNumber(newMilestone);
          setGame2048Won(true);
          setHasShown2048Message(true);
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

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseStart) {
      setMouseEnd({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleMouseUp = () => {
    if (!mouseStart || !mouseEnd) return;

    const distanceX = mouseStart.x - mouseEnd.x;
    const distanceY = mouseStart.y - mouseEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
    const minSwipeDistance = 50; // 鼠标滑动需要更大的距离

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
      console.error('Mouse swipe error:', error);
    }

    setMouseStart(null);
    setMouseEnd(null);
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

  // 全局鼠标事件监听器，确保鼠标滑动在整个游戏区域都能工作
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (mouseStart) {
        setMouseEnd({
          x: e.clientX,
          y: e.clientY
        });
      }
    };

    const handleGlobalMouseUp = () => {
      if (mouseStart) {
        handleMouseUp();
      }
    };

    if (game2048Active && !game2048Over) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [game2048Active, game2048Over, mouseStart]);

  const reset2048Game = () => {
    setGame2048Active(false);
    setGame2048Over(false);
    setGame2048Won(false);
    setHasShown2048Message(false);
    setHighestAchievedNumber(0);
    setGame2048Score(0);
    setBoard(Array(5).fill(null).map(() => Array(5).fill(0)));
    // 清除保存的进度
    if (typeof window !== 'undefined') {
      localStorage.removeItem('2048GameState');
    }
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

      {/* 游戏容器 - 保持正方形比例，以先到达的边界为基准 */}
      <div className="w-full h-full flex flex-col justify-center items-center px-2 sm:px-4 py-4 sm:py-8">
        <div className="w-full h-full flex flex-col justify-center items-center">
          {/* 游戏选项卡 - 保持正方形比例优化 */}
          <div className="w-full">
            <div className="flex justify-center mb-3 sm:mb-6 px-2">
              <div className="bg-white rounded-xl shadow-lg p-1 border border-gray-200 w-full max-w-[320px] sm:max-w-none">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('gomoku')}
                    className={`flex-1 px-3 sm:px-8 py-2.5 sm:py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-1.5 sm:space-x-2 text-sm sm:text-base ${
                      activeTab === 'gomoku'
                        ? 'bg-gradient-to-r from-slate-500 to-gray-500 text-white shadow-sm'
                        : 'bg-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Square className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>五子棋</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('game2048')}
                    className={`flex-1 px-3 sm:px-8 py-2.5 sm:py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-1.5 sm:space-x-2 text-sm sm:text-base ${
                      activeTab === 'game2048'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
                        : 'bg-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>2048</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 游戏区域 - 保持正方形比例，以先到达的边界为基准 */}
            <div className="rounded-xl p-0 lg:p-8 flex justify-center items-center w-full h-full">
                              {activeTab === 'gomoku' ? (
                  <div className="text-center w-full h-full flex flex-col justify-center items-center">
                    {/* 棋盘 - 保持正方形比例 */}
                    <div className="inline-block bg-gradient-to-br from-slate-100 to-gray-100 p-1 lg:p-6 rounded-2xl border-0 shadow-lg relative w-full max-w-full flex justify-center">

                    <div className="gap-0 bg-gradient-to-br from-amber-50 to-yellow-50 p-0.5 sm:p-1 rounded-xl border-0 w-full aspect-square relative" style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(15, 1fr)',
                      gridTemplateRows: 'repeat(15, 1fr)',
                      pointerEvents: 'auto',
                      maxWidth: 'min(100vw - 2rem, 80vh - 2rem)',
                      maxHeight: 'min(100vw - 2rem, 80vh - 2rem)',
                      overflow: 'visible'
                    }}>
                      {/* 绘制棋盘网格线 */}
                      <div className="absolute inset-0 pointer-events-none">
                        {/* 内部网格线 - 延伸到粗边框 */}
                        {Array.from({ length: 13 }, (_, i) => (
                          <div
                            key={`v-inner-${i}`}
                            className="absolute bg-gray-300"
                            style={{
                              left: `${(i + 1.5) * (100 / 15)}%`,
                              top: `${50 / 15}%`,
                              width: '2px',
                              height: `${(14 / 15) * 100}%`
                            }}
                          />
                        ))}
                        {Array.from({ length: 13 }, (_, i) => (
                          <div
                            key={`h-inner-${i}`}
                            className="absolute bg-gray-300"
                            style={{
                              top: `${(i + 1.5) * (100 / 15)}%`,
                              left: `${50 / 15}%`,
                              height: '2px',
                              width: `${(14 / 15) * 100}%`
                            }}
                          />
                        ))}
                        
                        {/* 边缘线 - 根据棋子位置动态绘制 */}
                        {/* 上边缘线 - 从最左棋子到最右棋子 */}
                        <div
                          className="absolute bg-gray-400"
                          style={{
                            left: `${(0.5) * (100 / 15)}%`,
                            top: `${(0.5) * (100 / 15)}%`,
                            width: `${(14) * (100 / 15)}%`,
                            height: '3px'
                          }}
                        />
                        {/* 下边缘线 - 从最左棋子到最右棋子 */}
                        <div
                          className="absolute bg-gray-400"
                          style={{
                            left: `${(0.5) * (100 / 15)}%`,
                            top: `${(14.5) * (100 / 15)}%`,
                            width: `${(14) * (100 / 15)}%`,
                            height: '3px'
                          }}
                        />
                        {/* 左边缘线 - 从最上棋子到最下棋子 */}
                        <div
                          className="absolute bg-gray-400"
                          style={{
                            left: `${(0.5) * (100 / 15)}%`,
                            top: `${(0.5) * (100 / 15)}%`,
                            width: '3px',
                            height: `${(14) * (100 / 15)}%`
                          }}
                        />
                        {/* 右边缘线 - 从最上棋子到最下棋子 */}
                        <div
                          className="absolute bg-gray-400"
                          style={{
                            left: `${(14.5) * (100 / 15)}%`,
                            top: `${(0.5) * (100 / 15)}%`,
                            width: '3px',
                            height: `${(14) * (100 / 15)}%`
                          }}
                        />
                      </div>

                      {/* 点击区域 - 交叉点 */}
                      {Array.from({ length: 15 }, (_, rowIndex) =>
                        Array.from({ length: 15 }, (_, colIndex) => (
                          <button
                            key={`${rowIndex}-${colIndex}`}
                            onClick={() => handleGomokuClick(rowIndex, colIndex)}
                            disabled={!!gomokuBoard[rowIndex][colIndex] || !!gameWinner || gameDraw}
                            className={`absolute transition-all duration-200 ${
                              gomokuBoard[rowIndex][colIndex] ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-200 hover:bg-opacity-50'
                            }`}
                            style={{
                              left: `${(colIndex + 0.5) * (100 / 15)}%`,
                              top: `${(rowIndex + 0.5) * (100 / 15)}%`,
                              transform: 'translate(-50%, -50%)',
                              width: 'min(4vw, 4vh, 36px)',
                              height: 'min(4vw, 4vh, 36px)',
                              borderRadius: '50%',
                              zIndex: 1
                            }}
                            title={`${rowIndex},${colIndex} - ${gomokuBoard[rowIndex][colIndex] || 'empty'}`}
                          />
                        ))
                      )}

                      {/* 棋子显示 */}
                      {gomokuBoard.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                          cell && (
                            <div
                              key={`stone-${rowIndex}-${colIndex}`}
                              className={`absolute transition-all duration-200 shadow-xl ${
                                cell === 'black' 
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' 
                                  : 'bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600'
                              }`}
                              style={{
                                left: `${(colIndex + 0.5) * (100 / 15)}%`,
                                top: `${(rowIndex + 0.5) * (100 / 15)}%`,
                                transform: 'translate(-50%, -50%)',
                                width: 'min(5vw, 5vh, 50px)',
                                height: 'min(5vw, 5vh, 50px)',
                                borderRadius: '50%',
                                zIndex: 2,
                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                              }}
                            />
                          )
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

                  {/* 游戏控制区域 - 保持正方形比例优化 */}
                  <div className="mt-2 sm:mt-4 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6">

                    {!gameWinner && !gameDraw && (
                      <div className="flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-xl px-2 sm:px-4 py-1.5 sm:py-3 shadow-md">
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
                      className="bg-gradient-to-r from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600 text-white font-semibold py-1.5 sm:py-3 px-3 sm:px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center space-x-2 text-sm sm:text-base"
                    >
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>重新开始</span>
                    </button>
                  </div>
                </div>
                            ) : (
                <div className="text-center w-full h-full flex flex-col justify-center items-center">
                  {/* 2048游戏区域 - 保持正方形比例 */}
                  <div 
                    className="inline-block bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-1 lg:p-6 rounded-2xl border-0 shadow-lg w-full max-w-full flex justify-center"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ touchAction: 'none', userSelect: 'none' }}
                  >
                    <div className="gap-1 sm:gap-2 bg-slate-200 border-0 rounded-xl shadow-inner p-2 sm:p-3 w-full aspect-square" style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gridTemplateRows: 'repeat(5, 1fr)',
                      maxWidth: 'min(100vw - 2rem, 70vh - 2rem)',
                      maxHeight: 'min(100vw - 2rem, 70vh - 2rem)'
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

                  {/* 2048游戏控制提示 - 保持正方形比例优化 */}
                  {game2048Active && (
                    <div className="mt-2 sm:mt-4 text-center hidden sm:block">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        支持键盘方向键、WASD、触摸滑动和鼠标拖拽
                      </p>
                    </div>
                  )}

                  {/* 2048游戏控制按钮 - 保持正方形比例优化 */}
                  <div className="mt-2 sm:mt-4 w-full">
                    {!game2048Active ? (
                      <div className="flex justify-center">
                        <button
                          onClick={init2048Game}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-sm sm:text-base"
                        >
                          开始游戏
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 sm:space-y-0">
                        {/* 统计信息 - 保持正方形比例优化 */}
                        <div className="grid grid-cols-3 gap-1 sm:gap-2 sm:flex sm:justify-center sm:space-x-3">
                          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 shadow-sm">
                            <p className="text-blue-700 font-medium text-xs text-center">分数</p>
                            <p className="text-blue-800 font-bold text-xs text-center">{game2048Score}</p>
                          </div>
                          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 shadow-sm">
                            <p className="text-indigo-700 font-medium text-xs text-center">最高分</p>
                            <p className="text-indigo-800 font-bold text-xs text-center">{game2048HighScore}</p>
                          </div>
                          <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 shadow-sm">
                            <p className="text-green-700 font-medium text-xs text-center">最高数字</p>
                            <p className="text-green-800 font-bold text-xs text-center">{Math.max(...board.flat())}</p>
                          </div>
                        </div>
                        
                        {/* 重新开始按钮 - 保持正方形比例优化 */}
                        <div className="flex justify-center sm:justify-end pt-1.5 sm:pt-0">
                          <button
                            onClick={reset2048Game}
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 text-sm"
                          >
                            重新开始
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 游戏结束提示 - 保持正方形比例优化 */}
                  {game2048Over && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-2xl p-4">
                      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl text-center w-full max-w-[280px] sm:max-w-[320px]">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">游戏结束</h3>
                        <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">最终分数: {game2048Score}</p>
                        <button
                          onClick={reset2048Game}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-sm sm:text-base w-full"
                        >
                          再来一局
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 游戏获胜提示 - 保持正方形比例优化 */}
                  {game2048Won && !game2048Over && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-2xl p-4">
                      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl text-center w-full max-w-[280px] sm:max-w-[320px]">
                        <h3 className="text-xl sm:text-2xl font-bold text-green-600 mb-3 sm:mb-4">恭喜！</h3>
                        <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">你达到了{highestAchievedNumber}！游戏继续，挑战更高分数！</p>
                        <button
                          onClick={() => {
                            setGame2048Won(false);
                            // 不重置hasShown2048Message，这样就不会再次显示提示
                          }}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-sm sm:text-base w-full"
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