const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VehicleInspectionCertification", function () {
  let contract;
  let owner;
  let other;

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();
    const ContractFactory = await ethers.getContractFactory("VehicleInspectionCertification");
    contract = await ContractFactory.deploy();
    await contract.waitForDeployment();
  });

  it("should deploy with the correct owner", async () => {
    expect(await contract.owner()).to.equal(owner.address);
  });

  it("should issue a certificate", async () => {
    const plate = "RAB123C";
    const center = "Nyamirambo Center";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now

    const tx = await contract.issueCertificate(plate, center, expiry);
    await tx.wait();

    const cert = await contract.getCertificate(plate);
    expect(cert.vehiclePlate).to.equal(plate);
    expect(cert.inspectionCenter).to.equal(center);
    expect(cert.expiryDate).to.equal(BigInt(expiry));
    expect(cert.isValid).to.equal(true);
    expect(cert.revokedDate).to.equal(0n);
  });

  it("should revoke a certificate", async () => {
    const plate = "RAB123C";
    const center = "Nyamirambo Center";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    await contract.issueCertificate(plate, center, expiry);
    const revokeTx = await contract.revokeCertificate(plate);
    await revokeTx.wait();

    const cert = await contract.getCertificate(plate);
    expect(cert.isValid).to.equal(false);
    expect(cert.revokedDate).to.be.greaterThan(0n);
  });

  it("should return total certificates", async () => {
    await contract.issueCertificate("RAB123C", "Kigali Center", 1900000000);
    await contract.issueCertificate("RAC456B", "Huye Center", 1900000000);
    const total = await contract.getTotalCertificates();
    expect(total).to.equal(2n);
  });

  it("should revert if non-owner tries to issue", async () => {
    const contractWithOther = contract.connect(other);
    await expect(
      contractWithOther.issueCertificate("XYZ789", "Other Center", 1900000000)
    ).to.be.revertedWith("Only the owner can perform this action");
  });
});
