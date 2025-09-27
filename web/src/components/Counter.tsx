'use client'

import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { counterAbi } from '@/lib/wagmi-generated'

// This would be your deployed contract address
const COUNTER_ADDRESS = process.env.NEXT_PUBLIC_COUNTER_ADDRESS as `0x${string}`

export function Counter() {
  const { address, isConnected } = useAccount()
  const [incrementValue, setIncrementValue] = useState('')

  // Read the current counter value with type safety
  const { data: currentValue, refetch: refetchValue } = useReadContract({
    address: COUNTER_ADDRESS,
    abi: counterAbi,
    functionName: 'x',
  })

  // Write contract hooks with type safety
  const { 
    writeContract: increment, 
    data: incrementHash, 
    isPending: isIncrementPending 
  } = useWriteContract()

  const { 
    writeContract: incrementByAmount, 
    data: incrementByHash, 
    isPending: isIncrementByPending 
  } = useWriteContract()

  // Wait for transaction confirmations
  const { isLoading: isIncrementConfirming } = useWaitForTransactionReceipt({
    hash: incrementHash,
  })

  const { isLoading: isIncrementByConfirming } = useWaitForTransactionReceipt({
    hash: incrementByHash,
  })

  const handleIncrement = () => {
    if (!COUNTER_ADDRESS) return
    
    increment({
      address: COUNTER_ADDRESS,
      abi: counterAbi,
      functionName: 'inc',
    })
  }

  const handleIncrementBy = () => {
    if (!COUNTER_ADDRESS || !incrementValue) return
    
    const value = BigInt(incrementValue)
    
    incrementByAmount({
      address: COUNTER_ADDRESS,
      abi: counterAbi,
      functionName: 'incBy',
      args: [value],
    })
  }

  if (!isConnected) {
    return (
      <div className="p-6">
        <p>Please connect your wallet to interact with the counter.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter DApp</h2>
      
      <div className="mb-4">
        <p className="text-lg">
          Current Value: <span className="font-mono text-blue-600">
            {currentValue?.toString() || '0'}
          </span>
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleIncrement}
          disabled={isIncrementPending || isIncrementConfirming}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isIncrementPending || isIncrementConfirming ? 'Incrementing...' : 'Increment by 1'}
        </button>

        <div className="flex space-x-2">
          <input
            type="number"
            value={incrementValue}
            onChange={(e) => setIncrementValue(e.target.value)}
            placeholder="Enter amount"
            className="flex-1 border border-gray-300 rounded px-3 py-2"
          />
          <button
            onClick={handleIncrementBy}
            disabled={isIncrementByPending || isIncrementByConfirming || !incrementValue}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {isIncrementByPending || isIncrementByConfirming ? 'Incrementing...' : 'Increment By'}
          </button>
        </div>
      </div>

      <button
        onClick={() => refetchValue()}
        className="mt-4 w-full bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-4 rounded"
      >
        Refresh Value
      </button>
    </div>
  )
}