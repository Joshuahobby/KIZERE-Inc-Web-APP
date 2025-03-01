import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ItemTracker contract...");

  const ItemTracker = await ethers.getContractFactory("ItemTracker");
  const itemTracker = await ItemTracker.deploy();

  await itemTracker.waitForDeployment();

  const address = await itemTracker.getAddress();
  console.log("ItemTracker deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
