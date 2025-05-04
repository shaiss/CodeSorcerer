import React, { FC, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from './ui/button';

type Props = {
    handlePromptClick: (prompt: string) => void;
}

const ExamplePrompts: FC<Props> = ({ handlePromptClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    // Sample prompts data
    const samplePrompts = [
        { icon: "💱", text: "I have 10 AVAX and want to optimize my portfolio between lending, liquidity provision, and trading. What's the best strategy right now?" },
        { icon: "💱", text: "bridge 0.0001 ETH from BaseSepolia to ArbitriumSepolia using cdp agent kit" },
        { icon: "📈", text: "Create investment plan with 1 ETH to make 500 USDC" },
        { icon: "🔄", text: "Find me the best opportunity on Zircuit and deposit 0.0001 ETH" },
        { icon: "💰", text: "Find best yield farming opportunities" },
        { icon: "📊", text: "Analyze my portfolio performance" },
        { icon: "📉", text: "Show price chart for PEPE" },
        { icon: "🏦", text: "Deposit 100 USDC to Aave" },
        { icon: "💎", text: "Find undervalued NFT collections on Base" },
        { icon: "🔍", text: "Check my wallet health" },
        { icon: "⚡", text: "Find gas-optimized DEX route" }
    ];

    const [showAllPrompts, setShowAllPrompts] = useState(false);

    const visiblePrompts = showAllPrompts ? samplePrompts : samplePrompts.slice(0, 4);

    const handlePromptSelection = (prompt: string) => {
        handlePromptClick(prompt);
        setIsOpen(false);
    };

    return (
        <div className='flex items-end justify-end pr-4 pb-2'>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger className='border rounded-lg px-2 py-1'>
                    Show Examples
                </DialogTrigger>
                <DialogContent className='bg-black'>
                    <DialogHeader>
                        <DialogTitle>Example Prompts:</DialogTitle>
                        {visiblePrompts.map((prompt, index) => (
                            <Button
                                key={index}
                                onClick={() => handlePromptSelection(prompt.text)}
                                className="flex items-center gap-2 px-3 py-2 text-sm bg-black/20 hover:bg-black/30 text-gray-300 rounded-lg  backdrop-blur-sm border border-white/10"
                            >
                                <span>{prompt.icon}</span>
                                <span>{prompt.text}</span>
                            </Button>
                        ))}
                        <Button
                            onClick={() => setShowAllPrompts(!showAllPrompts)}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-black/20 hover:bg-black/30 text-gray-300 rounded-lg transition-colors duration-200 backdrop-blur-sm border border-white/10"
                        >
                            <span>ℹ️</span>
                            <span>{showAllPrompts ? 'Less' : 'More'}</span>
                        </Button>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ExamplePrompts;