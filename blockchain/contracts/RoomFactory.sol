// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Room.sol";

contract RoomFactory {
    event RoomCreated(
        address indexed roomAddress,
        address indexed creator,
        string exerciseType,
        uint256 stakeAmount,
        uint256 duration,
        uint256 indexed roomId
    );

    struct RoomInfo {
        address roomAddress;
        address creator;
        string exerciseType;
        uint256 stakeAmount;
        uint256 duration;
        uint256 createdAt;
        bool active;
    }

    mapping(uint256 => RoomInfo) public rooms;
    mapping(address => uint256[]) public userRooms;
    uint256 public nextRoomId;

    function createRoom(
        string calldata exerciseType,
        uint256 stakeAmount,
        uint256 duration,
        string calldata exerciseConfig // JSON string with angles, landmarks for transparency
    ) external payable returns (address roomAddress, uint256 roomId) {
        require(msg.value == stakeAmount, "Must stake the required amount");
        require(duration > 0, "Duration must be greater than 0");
        require(bytes(exerciseType).length > 0, "Exercise type required");

        roomId = nextRoomId++;
        
        Room newRoom = new Room{value: msg.value}(
            msg.sender,
            exerciseType,
            stakeAmount,
            duration,
            exerciseConfig
        );
        
        roomAddress = address(newRoom);
        
        rooms[roomId] = RoomInfo({
            roomAddress: roomAddress,
            creator: msg.sender,
            exerciseType: exerciseType,
            stakeAmount: stakeAmount,
            duration: duration,
            createdAt: block.timestamp,
            active: true
        });
        
        userRooms[msg.sender].push(roomId);
        
        emit RoomCreated(roomAddress, msg.sender, exerciseType, stakeAmount, duration, roomId);
    }

    function getRoomInfo(uint256 roomId) external view returns (RoomInfo memory) {
        return rooms[roomId];
    }

    function getUserRooms(address user) external view returns (uint256[] memory) {
        return userRooms[user];
    }

    function getAllActiveRooms() external view returns (uint256[] memory) {
        uint256[] memory activeRooms = new uint256[](nextRoomId);
        uint256 count = 0;
        
        for (uint256 i = 0; i < nextRoomId; i++) {
            if (rooms[i].active) {
                activeRooms[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeRooms[i];
        }
        
        return result;
    }
}