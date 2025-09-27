# 🏋️‍♂️ FitStake – Verifiable On-Chain Fitness Competitions

> **Stake. Move. Win.**
> The first hackathon-ready protocol where AI agents verify real-world workouts and distribute on-chain rewards automatically.

---

## 🚩 Problem

Fitness “move-to-earn” and “stake-to-compete” apps are easily gamed. Users can cheat with pre-recorded videos, bots or other people performing the exercise.
This breaks trust and makes staking impossible.

---

## 💡 Our Solution

FitStake combines:

* **Mediapipe Pose Analysis** – counts reps & scores form locally on the device.
* **Identity Binding** – quick selfie liveness check, signed with an ephemeral device key.
* **AI Agent Verification** – off-chain agent reviews session JSON, flags anomalies, stores a trace on IPFS.
* **On-Chain Contest Contract** – holds stakes/bounties, verifies signatures, and distributes rewards automatically.

**Result:** verifiable, privacy-preserving, cheat-resistant fitness competitions.

---

## 🔑 Key Features

* **Invite-Only Rooms:** room creator funds a bounty or sets a stake; share invite link with participants.
* **Stake-to-Compete:** each participant deposits a fixed amount; winners share the pool.
* **Top-3 Weighted Rewards:** default 50 % / 30 % / 20 % split; ties auto-handled.
* **Transparent Traces:** every session has an IPFS CID with the agent’s decision log.
* **Composable:** other dApps can read the on-chain SBT/session record.

---

## 🏗 Architecture

```
[Camera + Mediapipe] 
       ↓ (session JSON + selfieHash signed with device key)
[Frontend dApp] —(tx)→ [Contest Smart Contract] 
       ↑                           ↓ (CID)
 [Agent Server verifies & pushes trace to IPFS]
```

* **Frontend:** Next.js + shadcn UI.
* **Pose & Form Scoring:** Mediapipe running in browser.
* **Smart Contracts:** Solidity on Polygon Mumbai L2.
* **Agent Server:** Node.js, runs heuristics, publishes CID to IPFS (nft.storage).

---

## ⚙️ How It Works

1. **Create Room:** Creator chooses exercise + sets bounty or stake.
2. **Join & Verify:** Participants connect wallet, run selfie liveness, do reps.
3. **Submit:** Device signs session JSON; send to agent + on-chain contract.
4. **Agent Review:** Agent outputs trace JSON + CID to contract.
5. **Finalize:** After contest ends, contract distributes pool to top-3 automatically.

---

## 🚀 Running the Demo

1. **Clone & Install**

   ```bash
   git clone https://github.com/yourorg/fitstake
   cd fitstake && yarn install
   ```
2. **Frontend**

   ```bash
   yarn dev
   ```

   Open `http://localhost:3000` and create a room.
3. **Smart Contract**

   ```bash
   npx hardhat deploy --network mumbai
   ```
4. **Agent Server**

   ```bash
   cd agent && yarn start
   ```
5. **Demo Flow**

   * Create a room with test tokens.
   * Do a few squats; see rep counter live.
   * Submit; watch agent trace + on-chain tx.
   * Finalize contest; see automatic payouts.

---

## 📝 Roadmap

* **V2:** Global rooms, ZK proof of reps, wearable integration.
* **V3:** SDK for any dApp to add verifiable physical work modules.

---

## 👥 Team

* **Exercise Science / Pose ML:** @you
* **Smart Contracts:** @teammate
* **Frontend & Agent:** @teammate

---

## ⚠️ Disclaimers

* Anti-cheat and attestation are simplified for demo purposes.
* Funds are testnet tokens only during hackathon.

---

### 🏆 Our One-Liner

> *“FitStake lets people stake crypto on their own workouts — and proves they actually did them.”*
