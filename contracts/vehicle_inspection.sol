// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VehicleInspectionCertification {

    address public owner;

    constructor() {
        owner = msg.sender; // The deployer is the system owner (e.g., RNP)
    }

    struct Certificate {
        string vehiclePlate;
        string inspectionCenter;
        uint256 inspectionDate;
        uint256 expiryDate;
        bool isValid;
        uint256 revokedDate;
    }

    Certificate[] public certificates;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    function issueCertificate(
        string memory _vehiclePlate,
        string memory _inspectionCenter,
        uint256 _expiryDate
    ) public onlyOwner {
        certificates.push(Certificate(
            _vehiclePlate,
            _inspectionCenter,
            block.timestamp,
            _expiryDate,
            true,
            0 // Not revoked
        ));
    }

    function revokeCertificate(string memory _vehiclePlate) public onlyOwner {
        for (uint i = 0; i < certificates.length; i++) {
            if (keccak256(bytes(certificates[i].vehiclePlate)) == keccak256(bytes(_vehiclePlate)) && certificates[i].isValid) {
                certificates[i].isValid = false;
                certificates[i].revokedDate = block.timestamp;
                break;
            }
        }
    }

function getCertificate(string memory _vehiclePlate) public view returns (
    string memory vehiclePlate,
    string memory inspectionCenter,
    uint256 inspectionDate,
    uint256 expiryDate,
    bool isValid,
    uint256 revokedDate
) {
    for (uint i = 0; i < certificates.length; i++) {
        if (keccak256(bytes(certificates[i].vehiclePlate)) == keccak256(bytes(_vehiclePlate))) {
            Certificate memory cert = certificates[i];
            return (
                cert.vehiclePlate,
                cert.inspectionCenter,
                cert.inspectionDate,
                cert.expiryDate,
                cert.isValid,
                cert.revokedDate
            );
        }
    }

    // No revert, just return default values
    return ("", "", 0, 0, false, 0);
}


    function getTotalCertificates() public view returns (uint256) {
        return certificates.length;
    }
}
