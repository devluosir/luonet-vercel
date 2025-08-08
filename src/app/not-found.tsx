'use client';

import { useRouter } from 'next/navigation';
import { Gamepad2, Square, RotateCcw, Play, Pause, SkipForward, Brain } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

export default function NotFound() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);
  const _router = useRouter();
  const [activeTab, setActiveTab] = useState<'gomoku' | 'game2048'>('gomoku');
  // const [score, setScore] = useState(0);
  // const [highScore, setHighScore] = useState(0);

  // 五子棋游戏状态
  const [gomokuBoard, setGomokuBoard] = useState<(null | 'black' | 'white')[][]>(
    Array(15).fill(null).map(() => Array(15).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<'black' | 'white'>('black');
  const [gameWinner, setGameWinner] = useState<'black' | 'white' | null>(null);
  const [gameDraw, setGameDraw] = useState(false);

  // 2048游戏状态
  const [board, setBoard] = useState<number[][]>(
    Array(7).fill(null).map(() => Array(7).fill(0))
  );
  const [game2048Active, setGame2048Active] = useState(false);
  const [game2048Over, setGame2048Over] = useState(false);
  const [game2048Won, setGame2048Won] = useState(false);
  // const [hasShown2048Message, setHasShown2048Message] = useState(false);
  const [highestAchievedNumber, setHighestAchievedNumber] = useState(0);
  const [game2048Score, setGame2048Score] = useState(0);
  const [game2048HighScore, setGame2048HighScore] = useState(0);

  // 推演功能状态
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(1000); // 毫秒，默认慢一点便于观察
  const [autoPlayStats, setAutoPlayStats] = useState({
    moves: 0,
    totalScore: 0,
    bestScore: 0,
    simulations: 0
  });
  const [undoStack, setUndoStack] = useState<number[][][]>([]);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoPlayingRef = useRef(false);

  // 触摸和鼠标手势状态
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [mouseStart, setMouseStart] = useState<{ x: number; y: number } | null>(null);
  const [mouseEnd, setMouseEnd] = useState<{ x: number; y: number } | null>(null);

  // 从localStorage获取最高分和游戏进度
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 获取最高分 - 暂时注释掉，因为相关状态变量已被注释
      // const saved = localStorage.getItem('404SnakeHighScore');
      // if (saved) {
      //   setHighScore(parseInt(saved));
      // }
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
      
      // 检查是否有重置标记，如果有则不恢复2048游戏进度
      const resetMark = localStorage.getItem('2048GameReset');
      if (!resetMark) {
        // 获取2048游戏进度
        const saved2048Game = localStorage.getItem('2048GameState');
        if (saved2048Game) {
          try {
            const game2048State = JSON.parse(saved2048Game);
            setBoard(game2048State.board || Array(7).fill(null).map(() => Array(7).fill(0)));
            setGame2048Active(game2048State.gameActive || false);
            setGame2048Over(game2048State.gameOver || false);
            setGame2048Won(game2048State.gameWon || false);
            setGame2048Score(game2048State.score || 0);
            setHighestAchievedNumber(game2048State.highestAchievedNumber || 0);
          } catch (error) {
            console.error('加载2048进度失败:', error);
          }
        }
      } else {
        // 如果有重置标记，清除它并初始化新游戏
        localStorage.removeItem('2048GameReset');
        setTimeout(() => {
          init2048Game();
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动保存五子棋游戏进度
  useEffect(() => {
    if (typeof window !== 'undefined' && gomokuBoard.some(row => row.some(cell => cell !== null))) {
      saveGomokuProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gomokuBoard, currentPlayer, gameWinner, gameDraw]);

  // 自动保存2048游戏进度
  useEffect(() => {
    if (typeof window !== 'undefined' && game2048Active) {
      save2048Progress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const saveGomokuProgress = useCallback(() => {
    if (typeof window !== 'undefined') {
      const gomokuState = {
        board: gomokuBoard,
        currentPlayer,
        gameWinner,
        gameDraw
      };
      localStorage.setItem('gomokuGameState', JSON.stringify(gomokuState));
    }
  }, [gomokuBoard, currentPlayer, gameWinner, gameDraw]);

  // 保存2048游戏进度
  const save2048Progress = useCallback(() => {
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
  }, [board, game2048Active, game2048Over, game2048Won, game2048Score, highestAchievedNumber]);

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
  const init2048Game = useCallback(() => {
    const newBoard = Array(7).fill(null).map(() => Array(7).fill(0));
    // 添加两个初始数字
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    setBoard([...newBoard]); // 确保状态更新
    setGame2048Score(0);
    setGame2048Over(false);
    setGame2048Won(false);
    setGame2048Active(true);
    setUndoStack([]);
    setAutoPlayStats({
      moves: 0,
      totalScore: 0,
      bestScore: 0,
      simulations: 0
    });
    setIsAutoPlaying(false);
    // 游戏开始时保存进度
    setTimeout(() => save2048Progress(), 0);
  }, [save2048Progress]);

  // 添加随机数字
  const addRandomTile = (board: number[][]) => {
    const emptyCells = [];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
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
      console.log('moveRow 输入:', row);
      const filtered = row.filter(cell => cell !== 0);
      console.log('过滤后:', filtered);
      
      for (let i = 0; i < filtered.length - 1; i++) {
        console.log(`检查位置 ${i}: ${filtered[i]} 和 ${filtered[i + 1]}`);
        if (filtered[i] === filtered[i + 1]) {
          console.log(`合并 ${filtered[i]} + ${filtered[i + 1]} = ${filtered[i] * 2}`);
          filtered[i] *= 2;
          filtered.splice(i + 1, 1);
          console.log('合并后数组:', filtered);
        }
      }
      
      while (filtered.length < 7) {
        filtered.push(0);
      }
      console.log('moveRow 输出:', filtered);
      return filtered;
    };

    if (direction === 'left' || direction === 'right') {
      for (let i = 0; i < 7; i++) {
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
      for (let j = 0; j < 7; j++) {
        let col = [newBoard[0][j], newBoard[1][j], newBoard[2][j], newBoard[3][j], newBoard[4][j], newBoard[5][j], newBoard[6][j]];
        if (direction === 'down') {
          col = col.reverse();
        }
        const newCol = moveRow(col);
        if (direction === 'down') {
          newCol.reverse();
        }
        for (let i = 0; i < 7; i++) {
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
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (board[i][j] === 0) return false;
      }
    }
    // 检查是否可以合并
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const current = board[i][j];
        if (
          (i < 6 && board[i + 1][j] === current) ||
          (j < 6 && board[i][j + 1] === current)
        ) {
          return false;
        }
      }
    }
    return true;
  };



  // 优化的评估函数 - 基于你的建议
  const evaluateBoard = (board: number[][]): number => {
    let score = 0;

    // 1. 空格数量 - 使用 log 平滑惩罚
    let emptyCount = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (board[i][j] === 0) {
          emptyCount++;
        }
      }
    }
    score += Math.log(emptyCount + 1) * 100; // 使用 log 平滑

    // 2. 合并潜力 - 鼓励同时合并多个 tile
    let mergePotential = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 6; j++) {
        if (board[i][j] !== 0 && board[i][j] === board[i][j + 1]) {
          mergePotential += board[i][j] * 2; // 相邻相同数字
        }
      }
    }
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 7; j++) {
        if (board[i][j] !== 0 && board[i][j] === board[i + 1][j]) {
          mergePotential += board[i][j] * 2; // 相邻相同数字
        }
      }
    }
    score += mergePotential * 10;

    // 3. 单调性 - 考察行/列的值是否递减或递增
    let monotonicity = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 6; j++) {
        if (board[i][j] >= board[i][j + 1] && board[i][j] !== 0) {
          monotonicity += board[i][j] - board[i][j + 1];
        }
      }
    }
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 7; j++) {
        if (board[i][j] >= board[i + 1][j] && board[i][j] !== 0) {
          monotonicity += board[i][j] - board[i + 1][j];
        }
      }
    }
    score += monotonicity * 5;

    // 4. 平滑度 - 鼓励相邻格子差值小
    let smoothness = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 6; j++) {
        if (board[i][j] !== 0 && board[i][j + 1] !== 0) {
          smoothness -= Math.abs(board[i][j] - board[i][j + 1]);
        }
      }
    }
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 7; j++) {
        if (board[i][j] !== 0 && board[i + 1][j] !== 0) {
          smoothness -= Math.abs(board[i][j] - board[i + 1][j]);
        }
      }
    }
    score += smoothness * 2;

    // 5. 角落策略 - 大数字靠角，惩罚角落之外的大 tile
    let cornerBonus = 0;
    let maxValue = 0;
    let maxValuePosition = { i: 0, j: 0 };
    
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (board[i][j] > maxValue) {
          maxValue = board[i][j];
          maxValuePosition = { i, j };
        }
      }
    }
    
    // 角落位置得分更高
    const isCorner = (maxValuePosition.i === 0 || maxValuePosition.i === 6) && 
                     (maxValuePosition.j === 0 || maxValuePosition.j === 6);
    cornerBonus = isCorner ? maxValue * 2 : -maxValue; // 角落奖励，非角落惩罚
    score += cornerBonus;

    // 6. 死路惩罚 - 移动后若空格数降低、合并数下降，判为"风险"
    let deadEndPenalty = 0;
    let validMoves = 0;
    const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
    
    for (const direction of directions) {
      const boardCopy = deepCloneBoard(board);
      if (moveAndMergeSimulation(boardCopy, direction)) {
        validMoves++;
      }
    }
    
    if (validMoves === 0) {
      deadEndPenalty = -10000; // 大幅惩罚死路
    } else if (validMoves <= 1) {
      deadEndPenalty = -1000; // 惩罚只有很少选择的情况
    }
    score += deadEndPenalty;

    return score;
  };



  // 模拟移动（不更新状态）
  const moveAndMergeSimulation = (board: number[][], direction: 'up' | 'down' | 'left' | 'right'): boolean => {
    let moved = false;

    const moveRow = (row: number[]) => {
      console.log('moveRow 输入:', row);
      const filtered = row.filter(cell => cell !== 0);
      console.log('过滤后:', filtered);
      
      for (let i = 0; i < filtered.length - 1; i++) {
        console.log(`检查位置 ${i}: ${filtered[i]} 和 ${filtered[i + 1]}`);
        if (filtered[i] === filtered[i + 1]) {
          console.log(`合并 ${filtered[i]} + ${filtered[i + 1]} = ${filtered[i] * 2}`);
          filtered[i] *= 2;
          filtered.splice(i + 1, 1);
          console.log('合并后数组:', filtered);
        }
      }
      
      while (filtered.length < 7) {
        filtered.push(0);
      }
      console.log('moveRow 输出:', filtered);
      return filtered;
    };

    if (direction === 'left' || direction === 'right') {
      for (let i = 0; i < 7; i++) {
        let row = [...board[i]];
        if (direction === 'right') {
          row = row.reverse();
        }
        const newRow = moveRow(row);
        if (direction === 'right') {
          newRow.reverse();
        }
        if (JSON.stringify(newRow) !== JSON.stringify(board[i])) {
          moved = true;
        }
        board[i] = newRow;
      }
    } else {
      for (let j = 0; j < 7; j++) {
        let col = [board[0][j], board[1][j], board[2][j], board[3][j], board[4][j], board[5][j], board[6][j]];
        if (direction === 'down') {
          col = col.reverse();
        }
        const newCol = moveRow(col);
        if (direction === 'down') {
          newCol.reverse();
        }
        for (let i = 0; i < 7; i++) {
          if (board[i][j] !== newCol[i]) {
            moved = true;
          }
          board[i][j] = newCol[i];
        }
      }
    }

    return moved;
  };

  // 模拟添加随机数字（不更新状态）
  const addRandomTileSimulation = (board: number[][]) => {
    const emptyCells = [];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
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

  // 深拷贝棋盘 - 使用 JSON 深拷贝确保完全隔离
  const deepCloneBoard = (board: number[][]): number[][] => {
    return JSON.parse(JSON.stringify(board));
  };

  // 获取最佳移动方向 - 使用纯函数，基于当前棋盘快照
  const getBestMove = (currentBoard: number[][]): 'up' | 'down' | 'left' | 'right' | null => {
    const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
    let bestDirection: 'up' | 'down' | 'left' | 'right' | null = null;
    let bestScore = -Infinity;

    // 使用深拷贝，避免影响原状态
    const boardSnapshot = deepCloneBoard(currentBoard);
    
    // 调试日志：记录输入状态
    console.log('AI决策 - 输入棋盘状态:', JSON.stringify(boardSnapshot));

    for (const direction of directions) {
      const boardCopy = deepCloneBoard(boardSnapshot);
      const moved = moveAndMergeSimulation(boardCopy, direction);
      
      if (moved) {
        // 使用 Expectimax 评估（简化版）
        const score = expectimax(boardCopy, 2, false); // 2层深度，从AI角度开始
        
        console.log(`AI决策 - ${direction}方向评估分数:`, score);

        if (score > bestScore) {
          bestScore = score;
          bestDirection = direction;
        }
      } else {
        console.log(`AI决策 - ${direction}方向无效移动`);
      }
    }

    console.log('AI决策 - 最终选择方向:', bestDirection, '分数:', bestScore);
    return bestDirection;
  };

  // 优化的 Expectimax 算法实现 - 增加深度控制和性能优化
  const expectimax = (board: number[][], depth: number, isPlayerTurn: boolean, alpha: number = -Infinity, beta: number = Infinity): number => {
    if (depth === 0 || isGameOver(board)) {
      return evaluateBoard(board);
    }

    if (isPlayerTurn) {
      // 玩家回合：尝试所有可能的移动，取最大值
      let maxScore = -Infinity;
      const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
      
      for (const direction of directions) {
        const boardCopy = deepCloneBoard(board);
        const moved = moveAndMergeSimulation(boardCopy, direction);
        
        if (moved) {
          addRandomTileSimulation(boardCopy);
          const score = expectimax(boardCopy, depth - 1, false, alpha, beta);
          maxScore = Math.max(maxScore, score);
          
          // Alpha-Beta 剪枝优化
          alpha = Math.max(alpha, score);
          if (alpha >= beta) {
            break; // Beta 剪枝
          }
        }
      }
      
      return maxScore === -Infinity ? evaluateBoard(board) : maxScore;
    } else {
      // 电脑回合：计算随机生成数字的期望值
      const emptyCells = getEmptyCells(board);
      if (emptyCells.length === 0) {
        return evaluateBoard(board);
      }

      let totalScore = 0;
      let totalWeight = 0;

      // 优化：限制随机模拟次数以提高性能
      const maxSimulations = Math.min(emptyCells.length * 2, 8); // 最多8次模拟
      const sampledCells = emptyCells.length > maxSimulations 
        ? emptyCells.sort(() => Math.random() - 0.5).slice(0, maxSimulations)
        : emptyCells;

      for (const cell of sampledCells) {
        // 90% 概率生成 2，10% 概率生成 4
        const values = [2, 4];
        const probabilities = [0.9, 0.1];

        for (let i = 0; i < values.length; i++) {
          const value = values[i];
          const probability = probabilities[i];
          const boardCopy = deepCloneBoard(board);
          boardCopy[cell.i][cell.j] = value;
          
          const score = expectimax(boardCopy, depth - 1, true, alpha, beta);
          totalScore += score * probability;
          totalWeight += probability;
        }
      }

      return totalWeight > 0 ? totalScore / totalWeight : evaluateBoard(board);
    }
  };

  // 获取空格位置
  const getEmptyCells = (board: number[][]): { i: number; j: number }[] => {
    const emptyCells = [];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (board[i][j] === 0) {
          emptyCells.push({ i, j });
        }
      }
    }
    return emptyCells;
  };

  // 检查游戏是否结束
  const isGameOver = (board: number[][]): boolean => {
    // 检查是否有空格
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (board[i][j] === 0) return false;
      }
    }
    
    // 检查是否可以合并
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const current = board[i][j];
        if (
          (i < 6 && board[i + 1][j] === current) ||
          (j < 6 && board[i][j + 1] === current)
        ) {
          return false;
        }
      }
    }
    return true;
  };

  // 自动推演控制器
  const startAutoPlay = () => {
    if (!game2048Active || game2048Over || isAutoPlaying) {
      return;
    }
    
    setIsAutoPlaying(true);
    isAutoPlayingRef.current = true;
    setAutoPlayStats(prev => ({ ...prev, moves: 0, totalScore: game2048Score }));
    
    const autoPlayStep = () => {
      // 使用ref来跟踪推演状态，避免状态更新延迟问题
      if (game2048Over || !isAutoPlayingRef.current) {
        stopAutoPlay();
        return;
      }

      // 保存当前状态用于撤销 - 使用深拷贝确保状态隔离
      setUndoStack(prev => [...prev, deepCloneBoard(board)]);
      
      // 使用当前棋盘快照进行AI决策 - 确保完全隔离
      const currentBoardSnapshot = deepCloneBoard(board);
      const bestMove = getBestMove(currentBoardSnapshot);
      
      if (bestMove) {
        console.log('AI选择移动方向:', bestMove);
        console.log('当前棋盘状态:', currentBoardSnapshot);
        
        // 使用handleSwipe确保状态正确更新
        handleSwipe(bestMove);
        setAutoPlayStats(prev => ({
          ...prev,
          moves: prev.moves + 1,
          totalScore: game2048Score,
          simulations: prev.simulations + 16 // Expectimax 2层 * 4方向 * 2回合
        }));
        
        // 等待状态更新完成后再继续下一步
        setTimeout(() => {
          if (isAutoPlayingRef.current) {
            autoPlayIntervalRef.current = setTimeout(autoPlayStep, autoPlaySpeed);
          }
        }, 100); // 增加延迟确保状态完全更新
      } else {
        // 没有有效移动，游戏结束
        console.log('没有有效移动，游戏结束');
        stopAutoPlay();
        return;
      }
    };

    // 延迟执行第一步，确保状态已更新
    setTimeout(autoPlayStep, 150);
  };



  const stopAutoPlay = () => {
    setIsAutoPlaying(false);
    isAutoPlayingRef.current = false;
    if (autoPlayIntervalRef.current) {
      clearTimeout(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
  };

  const pauseAutoPlay = () => {
    stopAutoPlay();
  };



  // 撤销功能
  const undoMove = () => {
    if (undoStack.length > 0) {
      const previousBoard = undoStack[undoStack.length - 1];
      setBoard(previousBoard.map(row => [...row]));
      setUndoStack(prev => prev.slice(0, -1));
      stopAutoPlay(); // 手动操作时停止自动推演
    }
  };

  // 单步推演
  const stepForward = () => {
    if (!game2048Active || game2048Over) return;
    
    // 使用深拷贝确保状态完全隔离
    const currentBoardSnapshot = deepCloneBoard(board);
    const bestMove = getBestMove(currentBoardSnapshot);
    
    if (bestMove) {
      console.log('单步推演 - AI选择方向:', bestMove);
      console.log('单步推演 - 当前棋盘:', currentBoardSnapshot);
      
      // 计算当前棋盘评估分数
      const currentScore = evaluateBoard(currentBoardSnapshot);
      console.log('单步推演 - 当前评估分数:', currentScore);
      
      handleSwipe(bestMove);
    } else {
      console.log('单步推演 - 没有有效移动');
    }
  };

  // 清理自动推演定时器
  useEffect(() => {
    return () => {
      if (autoPlayIntervalRef.current) {
        clearTimeout(autoPlayIntervalRef.current);
      }
    };
  }, []);

  // 测试游戏状态函数
  const testGameState = () => {
    console.log('=== 游戏状态测试 ===');
    console.log('game2048Active:', game2048Active);
    console.log('game2048Over:', game2048Over);
    console.log('isAutoPlaying:', isAutoPlaying);
    console.log('isRandomMoving:', isRandomMoving);
    console.log('board状态:', board.flat().some(cell => cell !== 0) ? '有数字' : '空棋盘');
    console.log('board内容:', board);
    console.log('==================');
  };

  // 监听 board 变化，确保状态同步
  useEffect(() => {
    if (isAutoPlayingRef.current && game2048Active && !game2048Over) {
      // 当棋盘状态变化时，可以在这里添加额外的同步逻辑
      console.log('棋盘状态已更新:', JSON.stringify(board));
    }
  }, [board, game2048Active, game2048Over]);

  // 随机移动功能 - 使用 useRef 避免 React 状态更新影响
  const [isRandomMoving, setIsRandomMoving] = useState(false);
  const isRandomMovingRef = useRef(false);
  const randomMoveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false); // 防抖机制

  const startRandomMove = () => {
    // 防抖机制，避免快速点击
    if (isProcessingRef.current) {
      console.log('正在处理中，忽略点击');
      return;
    }
    
    isProcessingRef.current = true;
    
    // 先测试游戏状态
    testGameState();
    
    console.log('尝试启动随机移动，当前状态:', { 
      game2048Active, 
      game2048Over, 
      isRandomMoving,
      boardState: board.flat().some(cell => cell !== 0) ? '有数字' : '空棋盘'
    });
    
    // 如果游戏还没开始，先初始化游戏
    if (!game2048Active) {
      console.log('游戏未开始，先初始化游戏');
      init2048Game();
      // 延迟启动随机移动，确保游戏初始化完成
      setTimeout(() => {
        isProcessingRef.current = false;
        if (!isRandomMovingRef.current) {
          startRandomMove();
        }
      }, 200);
      return;
    }
    
    if (game2048Over || isRandomMovingRef.current) {
      console.log('随机移动启动失败:', { game2048Active, game2048Over, isRandomMoving: isRandomMovingRef.current });
      isProcessingRef.current = false;
      return;
    }
    
    // 使用 ref 控制状态，避免 React 重新渲染影响
    isRandomMovingRef.current = true;
    setIsRandomMoving(true);
    console.log('开始随机移动演示');
    
    // 延迟重置处理状态
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
    
    const randomMoveStep = () => {
      // 使用 ref 检查状态，避免 React 状态更新影响
      if (!isRandomMovingRef.current) {
        console.log('随机移动被停止');
        return;
      }
      
      // 使用深拷贝检查当前状态，避免状态读取问题
      const currentBoard = deepCloneBoard(board);
      const isGameOverNow = isGameOver(currentBoard);
      
      if (isGameOverNow) {
        console.log('游戏结束，停止随机移动');
        stopRandomMove();
        return;
      }

      const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
      const randomDirection = directions[Math.floor(Math.random() * directions.length)];
      
      console.log('随机移动方向:', randomDirection);
      console.log('移动前棋盘状态:', JSON.stringify(currentBoard));
      
      // 使用深拷贝确保状态隔离
      const boardCopy = deepCloneBoard(currentBoard);
      const moved = moveAndMergeSimulation(boardCopy, randomDirection);
      
      if (moved) {
        console.log('移动后（添加随机数字前）:', JSON.stringify(boardCopy));
        
        // 添加随机数字
        addRandomTileSimulation(boardCopy);
        
        console.log('添加随机数字后:', JSON.stringify(boardCopy));
        
        // 更新真实棋盘状态
        setBoard(boardCopy);
        console.log('随机移动成功，新棋盘:', JSON.stringify(boardCopy));
        
        // 检查是否有合并发生
        const maxValue = Math.max(...boardCopy.flat());
        const totalTiles = boardCopy.flat().filter(cell => cell !== 0).length;
        const valueCounts = boardCopy.flat().reduce((acc, cell) => {
          if (cell !== 0) {
            acc[cell] = (acc[cell] || 0) + 1;
          }
          return acc;
        }, {} as Record<number, number>);
        
        console.log(`当前最大数字: ${maxValue}, 总数字个数: ${totalTiles}`);
        console.log(`数字分布:`, valueCounts);
        
        // 继续下一步随机移动
        randomMoveIntervalRef.current = setTimeout(randomMoveStep, 300);
      } else {
        // 如果无法移动，尝试其他方向
        console.log('随机移动失败，尝试其他方向');
        randomMoveIntervalRef.current = setTimeout(randomMoveStep, 100);
      }
    };

    // 立即开始随机移动
    randomMoveStep();
  };

  const stopRandomMove = () => {
    // 防抖机制，避免快速点击
    if (isProcessingRef.current) {
      console.log('正在处理中，忽略停止点击');
      return;
    }
    
    isProcessingRef.current = true;
    
    console.log('停止随机移动演示，当前状态:', { isRandomMoving, game2048Active, game2048Over });
    
    // 使用 ref 控制状态
    isRandomMovingRef.current = false;
    setIsRandomMoving(false);
    
    // 清理定时器
    if (randomMoveIntervalRef.current) {
      clearTimeout(randomMoveIntervalRef.current);
      randomMoveIntervalRef.current = null;
    }
    
    console.log('随机移动已停止');
    
    // 延迟重置处理状态
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
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

    // 如果是手动操作（不是AI推演），停止自动推演
    if (!isAutoPlayingRef.current) {
      stopAutoPlay();
    }

    const moved = moveAndMerge(board, direction);
    
    if (moved) {
      // 使用setTimeout确保状态更新后再检查，并使用深拷贝避免状态污染
      setTimeout(() => {
        // 使用深拷贝确保读取到最新状态
        const currentBoard = deepCloneBoard(board);
        
        // 检查是否达到新的里程碑
        const newMilestone = checkNewMilestone(currentBoard);
        if (newMilestone) {
          setHighestAchievedNumber(newMilestone);
          setGame2048Won(true);
          // setHasShown2048Message(true); // 暂时注释掉，因为状态变量已被注释
        }
        // 检查游戏是否结束
        if (checkGameOver(currentBoard)) {
          setGame2048Over(true);
          stopAutoPlay(); // 游戏结束时停止自动推演
          // 更新最高分
          const newScore = game2048Score;
          if (newScore > game2048HighScore) {
            setGame2048HighScore(newScore);
            if (typeof window !== 'undefined') {
              localStorage.setItem('2048HighScore', newScore.toString());
            }
          }
        }
      }, 50); // 增加延迟确保状态已完全更新
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game2048Active, game2048Over, board, game2048Won, game2048Score, game2048HighScore, isAutoPlayingRef]);

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

  const handleMouseUp = useCallback(() => {
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
  }, [mouseStart, mouseEnd, handleSwipe]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game2048Active, game2048Over, mouseStart]);

  const reset2048Game = () => {
    // 停止自动推演
    stopAutoPlay();
    
    // 清除保存的进度
    if (typeof window !== 'undefined') {
      localStorage.removeItem('2048GameState');
      // 添加一个标记，表示已经重新开始
      localStorage.setItem('2048GameReset', 'true');
    }
    
    setGame2048Active(false);
    setGame2048Over(false);
    setGame2048Won(false);
    // setHasShown2048Message(false); // 暂时注释掉，因为状态变量已被注释
    setHighestAchievedNumber(0);
    setGame2048Score(0);
    setBoard(Array(7).fill(null).map(() => Array(7).fill(0)));
    setUndoStack([]);
    setAutoPlayStats({
      moves: 0,
      totalScore: 0,
      bestScore: 0,
      simulations: 0
    });
    setIsAutoPlaying(false);
    
    // 立即初始化新游戏，确保状态完全重置
    setTimeout(() => {
      init2048Game();
      // 清除重置标记
      if (typeof window !== 'undefined') {
        localStorage.removeItem('2048GameReset');
      }
    }, 0);
  };





  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-2 sm:p-4" suppressHydrationWarning>
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
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gridTemplateRows: 'repeat(7, 1fr)',
                      maxWidth: 'min(100vw - 2rem, 70vh - 2rem)'
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
                    <div className="mt-2 sm:mt-4 text-center">
                      <div className="hidden sm:block">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          支持键盘方向键、WASD、触摸滑动和鼠标拖拽
                        </p>
                      </div>
                      <div className="sm:hidden mt-1">
                        <p className="text-xs text-gray-500">
                          💡 点击&ldquo;开始推演&rdquo;让AI自动游戏
                        </p>
                      </div>
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
                        
                        {/* 推演控制按钮 */}
                        <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-0">
                          <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                            <button
                              onClick={isAutoPlaying ? pauseAutoPlay : startAutoPlay}
                              disabled={!game2048Active || game2048Over}
                              className={`flex items-center justify-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm font-medium ${
                                isAutoPlaying
                                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
                                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                              } ${(!game2048Active || game2048Over) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isAutoPlaying ? (
                                <>
                                  <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span>暂停推演</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span>开始推演</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={stepForward}
                              disabled={!game2048Active || game2048Over || isAutoPlaying}
                              className={`flex items-center justify-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm font-medium bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white ${
                                (!game2048Active || game2048Over || isAutoPlaying) ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <SkipForward className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>单步推演</span>
                            </button>

                            <button
                              onClick={undoMove}
                              disabled={undoStack.length === 0 || isAutoPlaying}
                              className={`flex items-center justify-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm font-medium bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white ${
                                (undoStack.length === 0 || isAutoPlaying) ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>撤销</span>
                            </button>

                            <button
                              onClick={isRandomMoving ? stopRandomMove : startRandomMove}
                              disabled={!game2048Active || game2048Over}
                              className={`flex items-center justify-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm font-medium bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white ${
                                (!game2048Active || game2048Over) ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {isRandomMoving ? (
                                <>
                                  <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span>停止随机</span>
                                </>
                              ) : (
                                <>
                                  <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span>随机演示</span>
                                </>
                              )}
                            </button>


                          </div>

                          {/* 推演统计信息 */}
                          {isAutoPlaying && (
                            <div className="mt-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 text-xs">
                                <div className="text-center">
                                  <p className="text-blue-600 font-medium">推演步数</p>
                                  <p className="text-blue-800 font-bold">{autoPlayStats.moves}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-indigo-600 font-medium">模拟次数</p>
                                  <p className="text-indigo-800 font-bold">{autoPlayStats.simulations}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-green-600 font-medium">当前分数</p>
                                  <p className="text-green-800 font-bold">{autoPlayStats.totalScore}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-purple-600 font-medium">最高数字</p>
                                  <p className="text-purple-800 font-bold">{Math.max(...board.flat())}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 推演速度控制 */}
                          <div className="flex items-center justify-center space-x-2 mt-2">
                            <span className="text-xs text-gray-600">推演速度:</span>
                            <select
                              value={autoPlaySpeed}
                              onChange={(e) => setAutoPlaySpeed(Number(e.target.value))}
                              disabled={isAutoPlaying}
                              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value={200}>快速</option>
                              <option value={500}>正常</option>
                              <option value={1000}>慢速</option>
                              <option value={2000}>极慢</option>
                            </select>
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

                  {/* 推演功能帮助提示 */}
                  {game2048Active && !game2048Over && !isAutoPlaying && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 shadow-lg max-w-[250px]">
                        <div className="flex items-start space-x-2">
                          <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-blue-800">
                            <p className="font-medium mb-1">🤖 AI推演功能</p>
                            <p className="text-blue-700">
                              • 开始推演：AI自动游戏<br/>
                              • 单步推演：AI走一步<br/>
                              • 撤销：回到上一步<br/>
                              • 可随时手动干预<br/>
                              <span className="text-blue-600 font-medium">策略：Expectimax算法，智能决策</span>
                            </p>
                          </div>
                        </div>
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