"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { WalletIcon, ChartBarIcon, CogIcon } from "@heroicons/react/24/outline";
import { ConnectButton, lightTheme } from "thirdweb/react";
import { client } from "@/app/client";
import { avalanche, avalancheFuji, ethereum, modeTestnet, bsc, base } from "thirdweb/chains";
import { cn } from "@/lib/utils";

// NEAR Wallet Selector imports
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupWalletConnect } from "@near-wallet-selector/wallet-connect";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupBitteWallet } from "@near-wallet-selector/bitte-wallet";
// @ts-ignore
import "@near-wallet-selector/modal-ui/styles.css";

const navItems = [
  {
    name: "Portfolio",
    href: "/",
    icon: ChartBarIcon
  },
  {
    name: "TurnkeyWallet",
    href: "/turnkey",
    icon: WalletIcon
  },
  {
    name: "Settings",
    href: "/settings",
    icon: CogIcon
  }
];

interface NavbarProps {
  className?: string;
}

// Define the Modal interface based on the API
interface ModalInterface {
  show: () => void;
  hide: () => void;
}

export function Navbar({ className }: NavbarProps) {
  const pathname = usePathname();
  const [nearWalletModal, setNearWalletModal] = useState<ModalInterface | null>(null);
  const [nearAccount, setNearAccount] = useState<string | null>(null);

  // Initialize NEAR Wallet Selector
  useEffect(() => {
    const initNearWallet = async () => {
      const walletConnect = setupWalletConnect({
        projectId: process.env['NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID'] || "",
        metadata: {
          name: "Ava The DefAi Agent",
          description: "DeFi portfolio management platform using specialized autonomous AI agents",
          url: "https://github.com/kamalbuilds/ava-the-ai-agent",
          icons: ["https://avatars.githubusercontent.com/u/37784886"],
        },
        chainId: "near:testnet",
        methods: [
          "near_signIn",
          "near_signOut",
          "near_getAccounts",
          "near_signTransaction",
          "near_signTransactions",
          "near_verifyOwner",
          "near_signMessage",
        ]
      });

      const bitteWallet =  setupBitteWallet({
        // networkId: 'mainnet',
        walletUrl: 'https://wallet.bitte.ai',
        callbackUrl: 'https://www.mywebsite.com',
        contractId: "kamalwillwin.near", //remove if you don't want limited access keys to be generated
        deprecated: false,
      });

      const selector = await setupWalletSelector({
        network: "mainnet",
        modules: [walletConnect, setupMyNearWallet(), bitteWallet],
      });

      const modal = setupModal(selector, {
        contractId: "guest-book.testnet"
      });
      
      setNearWalletModal(modal);

      // Check if user is already signed in
      const state = selector.store.getState();
      const accounts = state.accounts || [];
      
      if (accounts.length > 0 && accounts[0]?.accountId) {
        setNearAccount(accounts[0].accountId);
      }

      // Subscribe to changes
      const subscription = selector.store.observable.subscribe((state: WalletSelectorState) => {
        const accounts = state.accounts || [];
        if (accounts.length > 0 && accounts[0]?.accountId) {
          setNearAccount(accounts[0].accountId);
        } else {
          setNearAccount(null);
        }
      });

      return () => subscription.unsubscribe();
    };

    initNearWallet().catch(console.error);
  }, []);

  // Hide navbar on deck page
  if (pathname === "/deck") return null;

  const handleNearConnect = () => {
    if (nearWalletModal) {
      nearWalletModal.show();
    }
  };

  return (
    <header className={cn("relative w-full bg-black/80 backdrop-blur-md border-b border-white/10", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl text-white font-bold bg-gradient-to-r from-[var(--primary-blue)] to-[var(--secondary-blue)] bg-clip-text text-transparent">
                Ava The DefAi Agent
              </span>
            </Link>
          </div>

          <div className="hidden sm:block">
            <div className="flex items-center space-x-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors ${isActive
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute inset-0 bg-[var(--primary-blue)]/10 rounded-lg"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* NEAR Wallet Connect Button */}
            <button
              onClick={handleNearConnect}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium hover:opacity-90 transition-opacity h-10"
            >
              {nearAccount ? `${nearAccount.slice(0, 6)}...${nearAccount.slice(-4)}` : 'Connect NEAR'}
            </button>

            <ConnectButton
              client={client}
              theme={lightTheme()}
              chains={[avalancheFuji, avalanche, modeTestnet, ethereum, bsc, base]}
              connectButton={{
                style: {
                  fontSize: '0.75rem !important',
                  height: '2.5rem !important',
                },
                label: 'Sign In',
              }}
            // accountAbstraction={{
            //   chain: avalancheFuji,
            //   sponsorGas: true,
            // }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
