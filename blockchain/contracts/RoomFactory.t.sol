// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/RoomFactory.sol";
import "../contracts/Room.sol";

contract RoomFactoryTest is Test {
    RoomFactory public factory;
    address public creator = address(0x1);
    address public participant1 = address(0x2);
    address public participant2 = address(0x3);
    
    uint256 public constant STAKE_AMOUNT = 1 ether;
    uint256 public constant DURATION = 1 hours;
    string public constant EXERCISE_TYPE = "pushups";
    string public constant EXERCISE_CONFIG = '{"minElbowAngle":30,"maxElbowAngle":170,"minHipAngle":160}';

    function setUp() public {
        factory = new RoomFactory();
        vm.deal(creator, 10 ether);
        vm.deal(participant1, 10 ether);
        vm.deal(participant2, 10 ether);
    }

    function testCreateRoom() public {
        vm.prank(creator);
        (address roomAddress, uint256 roomId) = factory.createRoom{value: STAKE_AMOUNT}(
            EXERCISE_TYPE,
            STAKE_AMOUNT,
            DURATION,
            EXERCISE_CONFIG
        );
        
        assertTrue(roomAddress != address(0));
        assertEq(roomId, 0);
        
        RoomFactory.RoomInfo memory roomInfo = factory.getRoomInfo(roomId);
        assertEq(roomInfo.creator, creator);
        assertEq(roomInfo.stakeAmount, STAKE_AMOUNT);
        assertEq(roomInfo.exerciseType, EXERCISE_TYPE);
        assertTrue(roomInfo.active);
    }

    function testSubmitWorkout() public {
        vm.prank(creator);
        (address roomAddress, ) = factory.createRoom{value: STAKE_AMOUNT}(
            EXERCISE_TYPE,
            STAKE_AMOUNT,
            DURATION,
            EXERCISE_CONFIG
        );
        
        Room room = Room(payable(roomAddress));
        
        bytes memory signature = hex"1234";
        string memory sessionData = '{"poses":[{"landmarks":[]}],"repCount":10}';
        
        vm.prank(participant1);
        room.submitWorkout{value: STAKE_AMOUNT}(10, 85, signature, sessionData);
        
        Room.WorkoutSession[] memory sessions = room.getSessions();
        assertEq(sessions.length, 1);
        assertEq(sessions[0].repCount, 10);
        assertEq(sessions[0].formScore, 85);
        assertEq(sessions[0].participant, participant1);
    }

    function testFinalizeRoom() public {
        vm.prank(creator);
        (address roomAddress, ) = factory.createRoom{value: STAKE_AMOUNT}(
            EXERCISE_TYPE,
            STAKE_AMOUNT,
            DURATION,
            EXERCISE_CONFIG
        );
        
        Room room = Room(payable(roomAddress));
        
        // Submit workouts from participants
        bytes memory signature = hex"1234";
        
        vm.prank(participant1);
        room.submitWorkout{value: STAKE_AMOUNT}(10, 85, signature, "{}");
        
        vm.prank(participant2);
        room.submitWorkout{value: STAKE_AMOUNT}(20, 80, signature, "{}");
        
        // Fast forward time
        vm.warp(block.timestamp + DURATION + 1);
        
        uint256 participant2BalanceBefore = participant2.balance;
        
        vm.prank(creator);
        room.finalizeRoom();
        
        // Check that winner (participant2 with highest score 20*80=1600) got all rewards
        assertTrue(participant2.balance > participant2BalanceBefore);
    }
}