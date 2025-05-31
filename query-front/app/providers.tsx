'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, WagmiProvider, createConfig } from 'wagmi';
import { foundry, sepolia } from 'wagmi/chains';

const config = createConfig({
  chains: [foundry, sepolia],
  transports: {
    [foundry.id]: http(),
    [sepolia.id]: http(),
    
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 