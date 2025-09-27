import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RoomFactoryModule = buildModule("RoomFactoryModule", (m) => {
  const roomFactory = m.contract("RoomFactory");

  return { roomFactory };
});

export default RoomFactoryModule;