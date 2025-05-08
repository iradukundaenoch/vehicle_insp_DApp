// src/contractABI.js
const certJson = require("./abis/VehicleInspectionCertification.json");

module.exports = {
  CONTRACT_ABI: certJson.abi,                  // <-- this is the array
  CONTRACT_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
};
