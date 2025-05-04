# Frontend Overview

The Ava Portfolio Manager frontend is a modern, reactive web application built with Next.js, TypeScript, and TailwindCSS. It provides an intuitive interface for users to interact with the autonomous agent system, manage their DeFi portfolios, and monitor system activities.

## Architecture

The frontend is built using a component-based architecture with Next.js App Router, emphasizing:

- **Type Safety**: Fully typed with TypeScript for code quality and developer experience
- **Component Reusability**: Modular components for consistent UI/UX
- **Responsive Design**: Mobile-first approach with TailwindCSS for responsive layouts
- **Performance Optimization**: Server components, code splitting, and optimized assets
- **Real-time Updates**: WebSocket connections for live updates from agents

## Technology Stack

The frontend utilizes a modern technology stack:

- **Framework**: Next.js 14+
- **Language**: TypeScript
- **Styling**: TailwindCSS with shadcn/ui component library
- **State Management**: React Context API and custom hooks
- **Real-time Communication**: WebSocket for agent events
- **Forms**: React Hook Form with zod validation
- **Data Fetching**: React Query for server state management
- **Authentication**: Web3 wallet integration

## Key Components

### Layout Components

- **Navbar**: Application navigation and wallet connection
- **Footer**: Site-wide footer with links and information
- **Layout**: Page layouts with responsive containers
- **Sidebar**: Contextual navigation and tools

### UI Components

- **Chain Selector**: Blockchain network selection interface
- **Agent Cards**: Visual representation of available agents
- **System Events Log**: Real-time display of system events
- **Chat Interface**: Natural language interaction with agents
- **Portfolio Dashboard**: Overview of portfolio performance
- **Transaction History**: Record of executed transactions

### Functional Components

- **WebSocket Client**: Manages real-time communication with backend
- **Authentication Provider**: Handles wallet connection and authentication
- **Theme Provider**: Manages application theming
- **Toast Notifications**: User notifications system
- **Modal System**: Application-wide modal management

## Page Structure

The application follows a logical page structure:

- **Home Page**: Introduction and getting started
- **App Page**: Main application interface with agent interaction
- **Portfolio Page**: Detailed portfolio analytics
- **Settings Page**: User preferences and configuration
- **Bridge Page**: Cross-chain asset transfer interface
- **Transactions Page**: Detailed transaction history
- **Agent Details Page**: Information about specific agents

## State Management

The frontend implements several state management patterns:

### Global State

Global application state is managed using React Context:

```typescript
// Example of agent state context
export interface AgentState {
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  activeAgent: string | null;
  systemEvents: SystemEvent[];
}

export const AgentContext = createContext<{
  state: AgentState;
  dispatch: React.Dispatch<AgentAction>;
}>({
  state: initialState,
  dispatch: () => null
});

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(agentReducer, initialState);
  
  return (
    <AgentContext.Provider value={{ state, dispatch }}>
      {children}
    </AgentContext.Provider>
  );
}
```

### Local State

Component-specific state uses React hooks:

```typescript
// Example of local state in a component
function ChainSelector({ onChainSelect, selectedChain }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chains, setChains] = useState<Chain[]>(SUPPORTED_CHAINS);
  
  // Component logic
}
```

### Server State

Server data is managed with React Query:

```typescript
// Example of React Query usage
function usePortfolioData(address: string) {
  return useQuery({
    queryKey: ['portfolio', address],
    queryFn: () => fetchPortfolioData(address),
    staleTime: 60 * 1000, // 1 minute
  });
}
```

## Real-time Communication

The frontend maintains real-time communication with the backend through WebSockets:

```typescript
// Example of WebSocket usage
function useAgentWebSocket() {
  const { dispatch } = useContext(AgentContext);
  
  useEffect(() => {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');
    
    socket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'SYSTEM_EVENT') {
        dispatch({ type: 'ADD_SYSTEM_EVENT', payload: data });
      } else if (data.type === 'AGENT_RESPONSE') {
        dispatch({ type: 'SET_AGENT_RESPONSE', payload: data });
      }
    };
    
    return () => {
      socket.close();
    };
  }, [dispatch]);
}
```

## User Interface Components

### Chat Interface

The Chat Interface is the primary method for interacting with the agent system:

- **Message History**: Displays conversation history with agents
- **Input Area**: Text input for user queries and commands
- **Suggested Prompts**: Pre-defined prompts for common operations
- **Agent Selection**: Selection of the agent to interact with
- **Collaboration Type Indicators**: Visual cues for message types

### Portfolio Dashboard

The Portfolio Dashboard provides portfolio analytics:

- **Asset Allocation**: Visual breakdown of portfolio allocation
- **Performance Metrics**: Historical performance data
- **Risk Assessment**: Risk analysis and recommendations
- **Active Positions**: Overview of current positions
- **Yield Opportunities**: Suggested yield optimization strategies

### System Events Panel

The System Events Panel shows real-time system activities:

- **Agent Activities**: Actions being performed by agents
- **Transaction Status**: Status of pending and completed transactions
- **System Notifications**: Important system notifications
- **Error Alerts**: Critical errors and issues
- **Task Progress**: Progress indicators for long-running tasks

## Responsive Design

The UI is designed to work across different device sizes:

- **Mobile**: Optimized layout for small screens with bottom navigation
- **Tablet**: Adaptive layout with collapsed sidebars
- **Desktop**: Full layout with expanded features and panels
- **Large Desktop**: Enhanced layout with additional data visualization

## Accessibility

The application follows accessibility best practices:

- **Semantic HTML**: Proper HTML structure for screen readers
- **Keyboard Navigation**: Full keyboard support for all interactions
- **ARIA Attributes**: Appropriate ARIA roles and attributes
- **Focus Management**: Clear focus indicators and logical tab order
- **Color Contrast**: WCAG-compliant color contrast ratios

## Theming

The UI supports theming with:

- **Dark Mode**: Low-light optimized interface
- **Light Mode**: Bright interface for daylight conditions
- **Color Customization**: Customizable accent colors
- **Consistent Design Language**: Uniform design patterns throughout

## Frontend-Backend Integration

The frontend integrates with the backend through:

- **REST API**: Standard REST endpoints for data operations
- **WebSockets**: Real-time communication for live updates
- **Authentication**: Secure authentication via wallet signatures
- **Error Handling**: Standardized error handling and display

## Performance Optimization

The application includes several performance optimizations:

- **Code Splitting**: Dynamic imports for route-based code splitting
- **Image Optimization**: Next.js image optimization for optimal delivery
- **Bundle Size Management**: Careful dependency management
- **Memoization**: Strategic component memoization for re-render optimization
- **Server Components**: Next.js server components for reduced client-side JavaScript

## Development Workflow

The frontend development follows a structured workflow:

- **Component-First Development**: Building and testing components in isolation
- **Type-Driven Development**: Using TypeScript types to guide implementation
- **Responsive-First Approach**: Designing for mobile before desktop
- **Accessibility-Aware Development**: Considering accessibility from the start
- **Performance Monitoring**: Regular performance audits and optimizations

## Future Enhancements

Planned frontend enhancements include:

- **Advanced Data Visualization**: Enhanced charts and graphs for portfolio analysis
- **Customizable Dashboards**: User-configurable dashboard layouts
- **Multi-Account Support**: Managing multiple accounts and portfolios
- **Advanced Notification System**: Customizable alerts and notifications
- **Offline Support**: Progressive Web App features for offline functionality 