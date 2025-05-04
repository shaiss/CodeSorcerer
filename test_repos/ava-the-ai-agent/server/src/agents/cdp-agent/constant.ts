export const PREDICTION_CONTRACT_ADDRESS =
  "0x92763d4e9129810db322d9ef030fdfc0b4bcb80c";

export const PREDICTION_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_usdc",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "EnforcedPause",
    type: "error",
  },
  {
    inputs: [],
    name: "ExpectedPause",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [],
    name: "ReentrancyGuardReentrantCall",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "SafeERC20FailedOperation",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "predictionId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "bettor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "choice",
        type: "bool",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "BetPlaced",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "PlatformFeesWithdrawn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "predictionId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "creator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "question",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "imageUri",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "resolutionTime",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "bettingEndTime",
        type: "uint256",
      },
    ],
    name: "PredictionCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "predictionId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "outcome",
        type: "bool",
      },
    ],
    name: "PredictionResolved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "predictionId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "bettor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "WinningsClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Withdrawal",
    type: "event",
  },
  {
    inputs: [],
    name: "MAX_BETTING_DURATION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_RESOLUTION_DURATION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_URI_LENGTH",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_BETTING_DURATION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_RESOLUTION_BUFFER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "PLATFORM_FEE",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "bets",
    outputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "choice",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "claimed",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_predictionId",
        type: "uint256",
      },
    ],
    name: "claimWinnings",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_question",
        type: "string",
      },
      {
        internalType: "string",
        name: "_imageUri",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_bettingDuration",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_resolutionDuration",
        type: "uint256",
      },
    ],
    name: "createPrediction",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getActivePredictions",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "creator",
            type: "address",
          },
          {
            internalType: "string",
            name: "question",
            type: "string",
          },
          {
            internalType: "string",
            name: "imageUri",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "resolutionTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "bettingEndTime",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isResolved",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "outcome",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "totalYesAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalNoAmount",
            type: "uint256",
          },
        ],
        internalType: "struct PredictionMarketplace.PredictionView[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllPredictions",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "creator",
            type: "address",
          },
          {
            internalType: "string",
            name: "question",
            type: "string",
          },
          {
            internalType: "string",
            name: "imageUri",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "resolutionTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "bettingEndTime",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isResolved",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "outcome",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "totalYesAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalNoAmount",
            type: "uint256",
          },
        ],
        internalType: "struct PredictionMarketplace.PredictionView[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_predictionId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_bettor",
        type: "address",
      },
    ],
    name: "getBetDetails",
    outputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "choice",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "claimed",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_predictionId",
        type: "uint256",
      },
    ],
    name: "getPredictionDetails",
    outputs: [
      {
        internalType: "address",
        name: "creator",
        type: "address",
      },
      {
        internalType: "string",
        name: "question",
        type: "string",
      },
      {
        internalType: "string",
        name: "imageUri",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "resolutionTime",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "bettingEndTime",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isResolved",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "outcome",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "totalYesAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalNoAmount",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalUserBalances",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
    ],
    name: "getUserBets",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "creator",
            type: "address",
          },
          {
            internalType: "string",
            name: "question",
            type: "string",
          },
          {
            internalType: "string",
            name: "imageUri",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "resolutionTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "bettingEndTime",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isResolved",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "outcome",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "totalYesAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalNoAmount",
            type: "uint256",
          },
        ],
        internalType: "struct PredictionMarketplace.PredictionView[]",
        name: "predictionViews",
        type: "tuple[]",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "choice",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "claimed",
            type: "bool",
          },
        ],
        internalType: "struct PredictionMarketplace.Bet[]",
        name: "userBets",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
    ],
    name: "getUserCreatedPredictions",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "creator",
            type: "address",
          },
          {
            internalType: "string",
            name: "question",
            type: "string",
          },
          {
            internalType: "string",
            name: "imageUri",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "resolutionTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "bettingEndTime",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isResolved",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "outcome",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "totalYesAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalNoAmount",
            type: "uint256",
          },
        ],
        internalType: "struct PredictionMarketplace.PredictionView[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_predictionId",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "_choice",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_sender",
        type: "address",
      },
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "predictionCounter",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "predictions",
    outputs: [
      {
        internalType: "address",
        name: "creator",
        type: "address",
      },
      {
        internalType: "string",
        name: "question",
        type: "string",
      },
      {
        internalType: "string",
        name: "imageUri",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "resolutionTime",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "bettingEndTime",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isResolved",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "outcome",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "totalYesAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalNoAmount",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "exists",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_predictionId",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "_outcome",
        type: "bool",
      },
    ],
    name: "resolvePrediction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "usdc",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "userBalances",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
    ],
    name: "withdrawPlatformFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
