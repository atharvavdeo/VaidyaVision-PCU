"use client";

import { useState, useCallback } from "react";
import { RotateCcw, Trophy } from "lucide-react";

type CellValue = "pill" | "capsule" | null;
type Board = CellValue[];

// Simple AI opponent
function getAIMove(board: Board): number {
    // Check if AI can win
    const winMove = findWinningMove(board, "capsule");
    if (winMove !== -1) return winMove;
    // Block player win
    const blockMove = findWinningMove(board, "pill");
    if (blockMove !== -1) return blockMove;
    // Take center
    if (board[4] === null) return 4;
    // Take corners
    const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
    // Take any
    const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
    return empty[Math.floor(Math.random() * empty.length)];
}

function findWinningMove(board: Board, player: CellValue): number {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
        const cells = [board[a], board[b], board[c]];
        const playerCount = cells.filter((v) => v === player).length;
        const nullCount = cells.filter((v) => v === null).length;
        if (playerCount === 2 && nullCount === 1) {
            if (board[a] === null) return a;
            if (board[b] === null) return b;
            if (board[c] === null) return c;
        }
    }
    return -1;
}

function checkWinner(board: Board): { winner: CellValue; line: number[] } | null {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: [a, b, c] };
        }
    }
    return null;
}

// Pill SVG (player marker)
function PillIcon({ size = 32, glow = false }: { size?: number; glow?: boolean }) {
    return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={`transition-all duration-300 ${glow ? "drop-shadow-[0_0_6px_rgba(45,58,30,0.5)]" : ""}`}>
            <rect x="8" y="4" width="24" height="32" rx="12" ry="12"
                fill="none" stroke="#2D3A1E" strokeWidth="2.5" />
            <rect x="8" y="4" width="24" height="16" rx="12" ry="12"
                fill="#2D3A1E" />
            <rect x="8" y="16" width="24" height="4" fill="#2D3A1E" />
            <rect x="8" y="20" width="24" height="16" rx="12" ry="12"
                fill="#D9E5D6" stroke="#2D3A1E" strokeWidth="2.5" />
            <line x1="8" y1="20" x2="32" y2="20" stroke="#2D3A1E" strokeWidth="1.5" />
        </svg>
    );
}

// Capsule SVG (AI marker)
function CapsuleIcon({ size = 32, glow = false }: { size?: number; glow?: boolean }) {
    return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={`transition-all duration-300 ${glow ? "drop-shadow-[0_0_6px_rgba(180,90,60,0.5)]" : ""}`}>
            <ellipse cx="20" cy="20" rx="16" ry="10"
                fill="none" stroke="#8B5E3C" strokeWidth="2.5" transform="rotate(-45 20 20)" />
            <clipPath id="capsuleLeft">
                <rect x="0" y="0" width="20" height="40" />
            </clipPath>
            <clipPath id="capsuleRight">
                <rect x="20" y="0" width="20" height="40" />
            </clipPath>
            <ellipse cx="20" cy="20" rx="16" ry="10"
                fill="#C4956A" transform="rotate(-45 20 20)" clipPath="url(#capsuleLeft)" />
            <ellipse cx="20" cy="20" rx="16" ry="10"
                fill="#E8D5C4" stroke="#8B5E3C" strokeWidth="2.5" transform="rotate(-45 20 20)" clipPath="url(#capsuleRight)" />
            <line x1="8" y1="32" x2="32" y2="8" stroke="#8B5E3C" strokeWidth="1.5" />
        </svg>
    );
}

export default function PillTicTacToe() {
    const [board, setBoard] = useState<Board>(Array(9).fill(null));
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<CellValue>(null);
    const [winLine, setWinLine] = useState<number[]>([]);
    const [score, setScore] = useState({ player: 0, ai: 0, draws: 0 });
    const [isAIThinking, setIsAIThinking] = useState(false);

    const resetGame = useCallback(() => {
        setBoard(Array(9).fill(null));
        setGameOver(false);
        setWinner(null);
        setWinLine([]);
        setIsAIThinking(false);
    }, []);

    const handleClick = useCallback((index: number) => {
        if (board[index] || gameOver || isAIThinking) return;

        const newBoard = [...board];
        newBoard[index] = "pill";
        setBoard(newBoard);

        // Check player win
        const result = checkWinner(newBoard);
        if (result) {
            setWinner(result.winner);
            setWinLine(result.line);
            setGameOver(true);
            setScore((s) => ({ ...s, player: s.player + 1 }));
            return;
        }

        // Check draw
        if (newBoard.every((c) => c !== null)) {
            setGameOver(true);
            setScore((s) => ({ ...s, draws: s.draws + 1 }));
            return;
        }

        // AI move
        setIsAIThinking(true);
        setTimeout(() => {
            const aiIndex = getAIMove(newBoard);
            if (aiIndex === undefined || aiIndex === -1) {
                setGameOver(true);
                setScore((s) => ({ ...s, draws: s.draws + 1 }));
                setIsAIThinking(false);
                return;
            }
            newBoard[aiIndex] = "capsule";
            setBoard([...newBoard]);

            const aiResult = checkWinner(newBoard);
            if (aiResult) {
                setWinner(aiResult.winner);
                setWinLine(aiResult.line);
                setGameOver(true);
                setScore((s) => ({ ...s, ai: s.ai + 1 }));
            } else if (newBoard.every((c) => c !== null)) {
                setGameOver(true);
                setScore((s) => ({ ...s, draws: s.draws + 1 }));
            }
            setIsAIThinking(false);
        }, 400);
    }, [board, gameOver, isAIThinking]);

    return (
        <div className="bg-white border border-sage-200 rounded-xl p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-olive-900 flex items-center gap-2">
                        <span className="text-lg">💊</span>
                        Pill vs Capsule
                    </h3>
                    <p className="text-xs text-olive-500 mt-0.5">Take a break — play a quick round!</p>
                </div>
                <button
                    onClick={resetGame}
                    className="p-2 text-olive-500 hover:text-olive-700 hover:bg-sage-100 rounded-lg transition-colors"
                    title="New Game"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Score */}
            <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                    <PillIcon size={18} />
                    <span className="text-sm font-bold text-olive-900">{score.player}</span>
                </div>
                <div className="text-xs text-olive-400 font-medium">
                    {score.draws > 0 && `${score.draws} draw${score.draws > 1 ? "s" : ""}`}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-olive-900">{score.ai}</span>
                    <CapsuleIcon size={18} />
                </div>
            </div>

            {/* Board */}
            <div className="grid grid-cols-3 gap-1.5 mx-auto" style={{ maxWidth: "180px" }}>
                {board.map((cell, i) => {
                    const isWinCell = winLine.includes(i);
                    return (
                        <button
                            key={i}
                            onClick={() => handleClick(i)}
                            disabled={!!cell || gameOver || isAIThinking}
                            className={`
                                w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-200
                                ${isWinCell
                                    ? "bg-olive-100 ring-2 ring-olive-500 scale-105"
                                    : cell
                                        ? "bg-sage-50 border border-sage-200"
                                        : "bg-sage-50 border border-sage-200 hover:bg-sage-100 hover:border-olive-400 cursor-pointer"
                                }
                                ${!cell && !gameOver && !isAIThinking ? "hover:scale-105" : ""}
                            `}
                        >
                            {cell === "pill" && <PillIcon size={28} glow={isWinCell} />}
                            {cell === "capsule" && <CapsuleIcon size={28} glow={isWinCell} />}
                        </button>
                    );
                })}
            </div>

            {/* Status */}
            <div className="mt-4 text-center">
                {gameOver ? (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                        winner === "pill"
                            ? "bg-green-100 text-green-700"
                            : winner === "capsule"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-sage-100 text-olive-600"
                    }`}>
                        {winner === "pill" && <><Trophy className="w-3 h-3" /> You win!</>}
                        {winner === "capsule" && <>Capsule wins!</>}
                        {!winner && <>It&apos;s a draw!</>}
                    </div>
                ) : isAIThinking ? (
                    <p className="text-xs text-olive-500 animate-pulse">Capsule is thinking...</p>
                ) : (
                    <p className="text-xs text-olive-500">Your turn — place a pill!</p>
                )}
            </div>
        </div>
    );
}
