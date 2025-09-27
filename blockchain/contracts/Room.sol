// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Room {
    enum RoomStatus { Active, Expired, Finalized }
    
    struct WorkoutSession {
        address participant;
        uint256 repCount;
        uint256 formScore; // 0-100 scale
        uint256 timestamp;
        bytes signature;
        string sessionData; // JSON with pose data for verification
    }
    
    address public creator;
    string public exerciseType;
    uint256 public stakeAmount;
    uint256 public duration;
    uint256 public createdAt;
    uint256 public endTime;
    string public exerciseConfig; // JSON with angles, landmarks for transparency
    RoomStatus public status;

    mapping(address => bool) public hasSubmitted;
    WorkoutSession[] public sessions;
    
    
    event WorkoutSubmitted(address indexed participant, uint256 repCount, uint256 formScore);
    event RoomFinalized(address[] winners, uint256[] rewards);

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator can call this");
        _;
    }
    
    modifier onlyActive() {
        require(status == RoomStatus.Active, "Room not active");
        require(block.timestamp < endTime, "Room expired");
        _;
    }
    
    modifier onlyExpired() {
        require(block.timestamp >= endTime || status == RoomStatus.Expired, "Room not expired");
        _;
    }

    constructor(
        address _creator,
        string memory _exerciseType,
        uint256 _stakeAmount,
        uint256 _duration,
        string memory _exerciseConfig
    ) payable {
        require(msg.value == _stakeAmount, "Creator must stake the required amount");
        
        creator = _creator;
        exerciseType = _exerciseType;
        stakeAmount = _stakeAmount;
        duration = _duration;
        exerciseConfig = _exerciseConfig;
        createdAt = block.timestamp;
        endTime = createdAt + _duration;
        status = RoomStatus.Active;
    }

    function submitWorkout(
        uint256 repCount,
        uint256 formScore,
        bytes calldata signature,
        string calldata sessionData
    ) external payable onlyActive {
        require(msg.value == stakeAmount, "Must stake the required amount");
        require(!hasSubmitted[msg.sender], "Already submitted workout");
        require(formScore <= 100, "Form score must be 0-100");
        
        // TODO: Add signature verification for session data
        // For MVP, we'll trust the client-side signing
        
        WorkoutSession memory session = WorkoutSession({
            participant: msg.sender,
            repCount: repCount,
            formScore: formScore,
            timestamp: block.timestamp,
            signature: signature,
            sessionData: sessionData
        });
        
        sessions.push(session);
        hasSubmitted[msg.sender] = true;
        
        emit WorkoutSubmitted(msg.sender, repCount, formScore);
    }

    function finalizeRoom() external onlyCreator onlyExpired {
        require(status != RoomStatus.Finalized, "Room already finalized");
        
        status = RoomStatus.Finalized;
        
        // Simple reward calculation for MVP
        uint256 totalReward = address(this).balance;
        
        if (sessions.length == 0) {
            // No sessions, refund creator
            payable(creator).transfer(totalReward);
            emit RoomFinalized(new address[](0), new uint256[](0));
            return;
        }
        
        // Find best session (highest score)
        uint256 bestScore = 0;
        address winner = address(0);
        
        for (uint256 i = 0; i < sessions.length; i++) {
            uint256 score = sessions[i].repCount * sessions[i].formScore;
            if (score > bestScore) {
                bestScore = score;
                winner = sessions[i].participant;
            }
        }
        
        // For MVP, winner takes all (we can enhance this later)
        if (winner != address(0)) {
            payable(winner).transfer(totalReward);
            
            address[] memory winners = new address[](1);
            uint256[] memory rewards = new uint256[](1);
            winners[0] = winner;
            rewards[0] = totalReward;
            
            emit RoomFinalized(winners, rewards);
        }
    }

    function getParticipants() external view returns (address[] memory) {
        // Return unique participants from sessions
        address[] memory participants = new address[](sessions.length);
        for (uint256 i = 0; i < sessions.length; i++) {
            participants[i] = sessions[i].participant;
        }
        return participants;
    }
    
    function getParticipantCount() external view returns (uint256) {
        return sessions.length;
    }
    
    function getSessions() external view returns (WorkoutSession[] memory) {
        return sessions;
    }
    
    function getRoomStatus() external view returns (
        RoomStatus roomStatus,
        uint256 participantCount,
        uint256 totalStaked,
        uint256 timeRemaining
    ) {
        roomStatus = status;
        participantCount = sessions.length;
        totalStaked = address(this).balance;
        
        if (block.timestamp >= endTime) {
            timeRemaining = 0;
        } else {
            timeRemaining = endTime - block.timestamp;
        }
    }
}