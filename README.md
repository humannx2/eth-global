# 🏋️‍♂️ FitStake – AI-Verified Fitness Competitions on Web3

> **Stake. Move. Win.**  
> Real-time pose detection meets blockchain staking for verifiable fitness competitions.

---

## � What We Built

FitStake is a **Web3 fitness competition platform** that combines AI-powered pose verification with on-chain staking. Users can create fitness rooms, stake crypto, and compete in real-time workouts verified by MediaPipe pose detection and dynamic scoring algorithms.

### ✨ **Live Features**

- **📷 Real-time Pose Detection:** MediaPipe runs in-browser for instant rep counting
- **🎯 Dynamic Form Scoring:** Advanced algorithm analyzing Range of Motion, Tempo, and Consistency  
- **💰 Stake-to-Compete:** Create or join rooms with crypto stakes
- **📱 Mobile-First UI:** Responsive design with auto-closing sidebar
- **⚡ Performance Optimized:** 10 FPS detection with frame limiting
- **🔒 On-Chain Verification:** Smart contracts handle stakes and payouts

---

## 🏗️ Architecture

```
[📱 Browser Camera] → [🤖 MediaPipe Pose Detection] → [📊 Dynamic Scoring]
                                    ↓
[💻 Next.js Frontend] ← [⛓️ Smart Contracts] → [💰 Reward Distribution]
```

### **Tech Stack**

- **Frontend:** Next.js 15, TypeScript, shadcn/ui, Tailwind CSS
- **Pose Detection:** MediaPipe Tasks Vision v0.10.3
- **Blockchain:** Hardhat 3, Solidity, viem, wagmi v2
- **Networks:** Sepolia Testnet, Polygon (planned)
- **Package Management:** PNPM workspaces

---

## 🎮 How It Works

### **1. Create Competition Room**

- Set exercise type (squats, pushups, bicep curls)
- Define stake amount and duration
- Deploy room contract on-chain

### **2. Real-Time Workout**

- Camera captures pose landmarks
- MediaPipe counts reps with pose angle analysis
- Dynamic scoring based on:
  - **Range of Motion (40%)** - How deep/complete each rep is
  - **Tempo Control (35%)** - Proper speed and timing
  - **Form Consistency (25%)** - Smoothness and control

### **3. On-Chain Settlement**

- Submit workout results to smart contract
- Automated reward distribution to top performers
- Transparent, verifiable competition outcomes

---

## 🚀 Quick Start

### **Prerequisites**

- Node.js 18+
- PNPM package manager
- MetaMask or Web3 wallet

### **Installation**

```bash
git clone <repo-url>
cd eth-global
pnpm install
```

### **Development**

```bash
# Start web frontend
pnpm -F web dev

# Deploy contracts (separate terminal)
pnpm -F blockchain hardhat ignition deploy ignition/modules/RoomFactory.ts --network sepolia

# Generate contract types
pnpm -F web wagmi generate
```

### **Access the App**

Open `http://localhost:3000` and:

1. Connect your wallet (Sepolia testnet)
2. Create a new fitness room
3. Start camera and begin workout
4. Watch real-time rep counting and scoring!

---

## 💡 Key Innovations

### **🤖 Advanced Pose Analysis**

- **Multi-angle Detection:** Tracks 33 pose landmarks in real-time
- **Exercise-Specific Logic:** Custom angle calculations for different workouts
- **Intelligent Rep Counting:** Peak detection with configurable thresholds
- **Form Quality Scoring:** Fit-wise inspired algorithm for comprehensive analysis

### **⚡ Performance Optimizations**

- **Frame Rate Limiting:** Optimized to 10 FPS to prevent browser crashes
- **Monotonic Timestamps:** Solved MediaPipe timestamp conflicts
- **Rep-Based Analysis:** Scoring only on completed reps, not every frame
- **Smart Logging:** Detailed debugging without console spam

### **📱 Mobile-First Design**

- **Responsive Sidebar:** Auto-hiding on mobile with logo button
- **Statistics Cards:** Separate cards for rep count and form score
- **Touch-Friendly Controls:** Large buttons and intuitive navigation
- **Accessibility:** Screen reader support with proper ARIA labels

---

## 🏆 Current Implementation Status

### ✅ **Completed**

- [x] Real-time MediaPipe pose detection
- [x] Dynamic scoring algorithm (ROM + Tempo + Consistency)
- [x] Smart contract room system
- [x] Mobile-responsive UI with statistics cards
- [x] Performance optimizations and error handling
- [x] Wallet integration with wagmi v2

### 🔄 **In Progress**

- [ ] AI agent verification layer
- [ ] IPFS session storage
- [ ] Multi-user competition logic
- [ ] Advanced anti-cheat mechanisms

### 🗺️ **Roadmap**

- [ ] Live multiplayer competitions
- [ ] Wearable device integration
- [ ] ZK-proof verification
- [ ] Cross-chain deployment
- [ ] SDK for third-party integration

---

## 🛠️ Technical Details

### **Smart Contracts**

```solidity
// Core contracts in /blockchain
RoomFactory.sol     // Factory for creating competition rooms
Room.sol           // Individual competition logic
```

### **Frontend Structure**

```
/web/src/
├── components/
│   ├── MediaPipeWorkout.tsx     // Main workout interface
│   ├── AppSidebar.tsx          // Navigation with mobile support
│   └── ui/                     // shadcn/ui components
├── lib/
│   ├── mediapipe-utils.ts      // Pose detection & scoring logic
│   ├── wagmi.ts               // Web3 configuration
│   └── contracts.ts           // Contract interactions
└── app/
    └── (app)/room/            // Competition pages
```

### **Pose Detection Pipeline**

1. **Camera Stream:** Browser MediaStream API
2. **Pose Landmarks:** MediaPipe extracts 33 3D points
3. **Angle Calculation:** Custom geometric calculations for exercise-specific joints
4. **Rep Detection:** Peak finding algorithm with configurable thresholds
5. **Form Scoring:** Multi-factor analysis with weighted components

---

## 🏅 Demo Highlights

- **🎯 Accurate Rep Counting:** Tested across different exercise types
- **📊 Real-time Scoring:** Instant feedback on form quality  
- **💳 Wallet Integration:** Seamless Web3 onboarding
- **📱 Mobile Experience:** Works great on phones and tablets
- **⚡ Performance:** Smooth 10 FPS detection without lag

---

## 👥 Contributing

This is a hackathon project showcasing the potential of AI-verified fitness competitions on blockchain. The codebase demonstrates key concepts and can be extended for production use.

---

## ⚠️ Disclaimers

- **Testnet Only:** Currently deployed on Sepolia testnet
- **Demo Purpose:** Simplified verification for hackathon scope
- **No Financial Advice:** Educational project only

---

### � **Our Vision**

*"Making fitness competitions trustless, transparent, and rewarding through AI verification and blockchain technology."*
