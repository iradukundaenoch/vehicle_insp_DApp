import './App.css';
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
const { CONTRACT_ABI, CONTRACT_ADDRESS } = require("./contractABI");

function App() {
  const [queryPlate, setQueryPlate] = useState("");
  const [fetchedCert, setFetchedCert] = useState(null);
  const [revokePlate, setRevokePlate] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [inspectionCenter, setInspectionCenter] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [totalCertificates, setTotalCertificates] = useState(null);
  const [error, setError] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask is not installed.");
      return;
    }
    try {
      setError("");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      setWalletConnected(true);
    } catch {
      setError("Error connecting wallet.");
    }
  };

  const fetchTotalCertificates = async () => {
    if (!walletConnected) {
      setError("Connect wallet first.");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const total = await contract.getTotalCertificates();

      if (total === 0 || !total) {
        setTotalCertificates(0);
        setError("No certificates found.");
      } else {
        setTotalCertificates(total.toNumber ? total.toNumber() : Number(total));
        setError("");
      }
    } catch (err) {
      console.error("📛 fetchTotalCertificates error:", err);
      setError("Failed to fetch total: " + (err.reason || err.message).slice(0, 80));
    }
  };

  const issueCertificate = async () => {
    if (!walletConnected) return setError("Connect wallet first.");

    if (!vehiclePlate || !inspectionCenter || !expiryDate) {
      return setError("Please fill all fields.");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const expiryTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000); // seconds

      const tx = await contract.issueCertificate(vehiclePlate, inspectionCenter, expiryTimestamp);
      await tx.wait();

      // Save issued certificate to sessionStorage
      const today = Math.floor(Date.now() / 1000); // Inspection date = now
      const certData = {
        vehiclePlate,
        inspectionCenter,
        inspectionDate: today,
        expiryDate: expiryTimestamp,
      };
      sessionStorage.setItem("issuedCert", JSON.stringify(certData));

      setError("");
      alert("Certificate issued successfully!");
      setVehiclePlate("");
      setInspectionCenter("");
      setExpiryDate("");
    } catch (err) {
      console.error(err);
      setError("Error issuing certificate.");
    }
  };

  const revokeCertificate = async () => {
    if (!walletConnected) return setError("Connect wallet first.");
    if (!revokePlate) return setError("Please enter the vehicle plate.");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.revokeCertificate(revokePlate);
      await tx.wait();

      setError("");
      alert("Certificate revoked successfully!");
      setRevokePlate("");
    } catch (err) {
      console.error(err);
      setError("Error revoking certificate.");
    }
  };

  // ✅ UPDATED FUNCTION TO CHECK sessionStorage BEFORE CONTRACT
  const getCertificate = async () => {
    if (!walletConnected) return setError("Connect wallet first.");
    if (!queryPlate) return setError("Please enter a vehicle plate.");

    // ✅ Try loading from sessionStorage first
    const stored = sessionStorage.getItem("issuedCert");
    if (stored) {
      const cert = JSON.parse(stored);
      if (cert.vehiclePlate.toLowerCase() === queryPlate.toLowerCase()) {
        setFetchedCert({
          vehiclePlate: cert.vehiclePlate,
          inspectionCenter: cert.inspectionCenter,
          inspectionDate: Number(cert.inspectionDate),
          expiryDate: Number(cert.expiryDate),
          isValid: true,
          revokedDate: 0,
        });
        setError("");
        return;
      }
    }

    // Fallback to contract call
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const cert = await contract.getCertificate(queryPlate.toString());

      console.log('Certificate Data:', cert);
      setFetchedCert({
        vehiclePlate: cert[0],
        inspectionCenter: cert[1],
        inspectionDate: Number(cert[2]),
        expiryDate: Number(cert[3]),
        isValid: cert[4],
        revokedDate: Number(cert[5]),
      });
      setError("");
    } catch (err) {
      console.error("Error fetching certificate:", err);
      if (err.code === "BAD_DATA" && err.info?.method === "getCertificate") {
        setError("Certificate not found.");
      } else {
        setError("Unexpected error: " + (err.reason || err.message));
      }
      setFetchedCert(null);
    }
  };

  return (
    <div className="container">
      <h1>Vehicle Inspection DApp</h1>

      {!walletConnected ? (
        <>
          <button onClick={connectWallet}>Connect Wallet</button>
          <p>Please connect your wallet to interact.</p>
        </>
      ) : (
        <p><strong>Connected:</strong> {walletAddress}</p>
      )}

      {error && <p className="status">{error}</p>}

      <hr />

      <nav className="dashboard">
        <a href="#issueForm"><button disabled={!walletConnected}>Issue Certificate</button></a>
        <a href="#revokeForm"><button disabled={!walletConnected}>Revoke Certificate</button></a>
        <a href="#getForm"><button disabled={!walletConnected}>Get Certificate</button></a>
        <a href="#totalForm"><button disabled={!walletConnected}>Get Total Certificates</button></a>
      </nav>

      <section id="issueForm" className="certificate-details">
        <h3>Issue Certificate</h3>
        <input type="text" placeholder="Vehicle Plate" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />
        <input type="text" placeholder="Inspection Center" value={inspectionCenter} onChange={(e) => setInspectionCenter(e.target.value)} />
        <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        <button onClick={issueCertificate} disabled={!walletConnected}>Submit</button>
      </section>

      <section id="revokeForm" className="certificate-details">
        <h3>Revoke Certificate</h3>
        <input type="text" placeholder="Vehicle Plate" value={revokePlate} onChange={(e) => setRevokePlate(e.target.value)} />
        <button onClick={revokeCertificate} disabled={!walletConnected}>Submit</button>
      </section>

      <section id="getForm" className="certificate-details">
        <h3>Get Certificate</h3>
        <input type="text" placeholder="Vehicle Plate" value={queryPlate} onChange={(e) => setQueryPlate(e.target.value)} />
        <button onClick={getCertificate} disabled={!walletConnected}>Submit</button>

        {fetchedCert && (
          <div className="certificate-details">
            <p><strong>Plate:</strong> {fetchedCert.vehiclePlate}</p>
            <p><strong>Inspection Center:</strong> {fetchedCert.inspectionCenter}</p>
            <p><strong>Inspection Date:</strong> {new Date(fetchedCert.inspectionDate * 1000).toLocaleDateString()}</p>
            <p><strong>Expiry Date:</strong> {new Date(fetchedCert.expiryDate * 1000).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {fetchedCert.isValid ? "Valid" : "Revoked"}</p>
            {fetchedCert.revokedDate > 0 && (
              <p><strong>Revoked On:</strong> {new Date(fetchedCert.revokedDate * 1000).toLocaleDateString()}</p>
            )}
          </div>
        )}
      </section>

      <section id="totalForm" className="certificate-details">
        <h3>Get Total Certificates</h3>
        <button onClick={fetchTotalCertificates} disabled={!walletConnected}>Submit</button>
        {totalCertificates !== null && (
          <p><strong>Total Certificates Issued:</strong> {totalCertificates}</p>
        )}
      </section>

      <section className="certificate-details">
        <h3>Recently Issued Certificate (Session)</h3>
        {(() => {
          const stored = sessionStorage.getItem("issuedCert");
          if (stored) {
            const cert = JSON.parse(stored);
            return (
              <div>
                <p><strong>Plate:</strong> {cert.vehiclePlate}</p>
                <p><strong>Inspection Center:</strong> {cert.inspectionCenter}</p>
                <p><strong>Inspection Date:</strong> {new Date(cert.inspectionDate * 1000).toLocaleDateString()}</p>
                <p><strong>Expiry Date:</strong> {new Date(cert.expiryDate * 1000).toLocaleDateString()}</p>
              </div>
            );
          }
          return <p>No certificate issued in this session.</p>;
        })()}
      </section>
    </div>
  );
}

export default App;














// // src/App.js
// import './App.css';
// import React, { useEffect, useState } from "react";
// import { ethers } from "ethers";
// const { CONTRACT_ABI, CONTRACT_ADDRESS } = require("./contractABI");

// function App() {
//   const [queryPlate, setQueryPlate] = useState("");
//   const [fetchedCert, setFetchedCert] = useState(null);
//   const [revokePlate, setRevokePlate] = useState("");
//   const [vehiclePlate, setVehiclePlate] = useState("");
//   const [inspectionCenter, setInspectionCenter] = useState("");
//   const [expiryDate, setExpiryDate] = useState("");
//   const [walletAddress, setWalletAddress] = useState("");
//   const [walletConnected, setWalletConnected] = useState(false);
//   const [totalCertificates, setTotalCertificates] = useState(null);
//   const [error, setError] = useState("");

//   const connectWallet = async () => {
//     if (!window.ethereum) {
//       setError("MetaMask is not installed.");
//       return;
//     }
//     try {
//       setError("");
//       await window.ethereum.request({ method: "eth_requestAccounts" });
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const address = await signer.getAddress();
//       setWalletAddress(address);
//       setWalletConnected(true);
//     } catch {
//       setError("Error connecting wallet.");
//     }
//   };

//   const fetchTotalCertificates = async () => {
//     if (!walletConnected) {
//       setError("Connect wallet first.");
//       return;
//     }
//     try {
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  
//       const total = await contract.getTotalCertificates();
  
//       if (total === 0 || !total) {
//         setTotalCertificates(0);
//         setError("No certificates found.");
//       } else {
//         setTotalCertificates(total.toNumber ? total.toNumber() : Number(total));
//         setError("");
//       }
//     } catch (err) {
//       console.error("📛 fetchTotalCertificates error:", err);
//       setError("Failed to fetch total: " + (err.reason || err.message).slice(0, 80));
//     }
//   };
  

//   const issueCertificate = async () => {
//     if (!walletConnected) return setError("Connect wallet first.");
  
//     if (!vehiclePlate || !inspectionCenter || !expiryDate) {
//       return setError("Please fill all fields.");
//     }
  
//     try {
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  
//       const expiryTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000); // seconds
  
//       const tx = await contract.issueCertificate(vehiclePlate, inspectionCenter, expiryTimestamp);
//       await tx.wait();
  
//       setError("");
//       alert("Certificate issued successfully!");
//       setVehiclePlate("");
//       setInspectionCenter("");
//       setExpiryDate("");
//     } catch (err) {
//       console.error(err);
//       setError("Error issuing certificate.");
//     }
//   };
  

  
//   const revokeCertificate = async () => {
//     if (!walletConnected) return setError("Connect wallet first.");
//     if (!revokePlate) return setError("Please enter the vehicle plate.");
  
//     try {
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  
//       const tx = await contract.revokeCertificate(revokePlate);
//       await tx.wait();
  
//       setError("");
//       alert("Certificate revoked successfully!");
//       setRevokePlate("");
//     } catch (err) {
//       console.error(err);
//       setError("Error revoking certificate.");
//     }
//   };
  
//   const getCertificate = async () => {
//     if (!walletConnected) return setError("Connect wallet first.");
//     if (!queryPlate) return setError("Please enter a vehicle plate.");
  
//     try {
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  
//       const cert = await contract.getCertificate(toString(queryPlate));
  
//       console.log('Certificate Data:', cert); // Log certificate data
//       setFetchedCert({
//         vehiclePlate: cert[0],
//         inspectionCenter: cert[1],
//         inspectionDate: Number(cert[2]),
//         expiryDate: Number(cert[3]),
//         isValid: cert[4],
//         revokedDate: Number(cert[5]),
//       });
//       console.log('Fetched Certificate:', fetchedCert); // Log fetched certificate data
//       setError("");
//     } catch (err) {
//       console.error("Error fetching certificate:", err);
  
//       if (err.code === "BAD_DATA" && err.info?.method === "getCertificate") {
//         setError("Certificate not found.");
//       } else {
//         setError("Unexpected error: " + (err.reason || err.message));
//       }
  
//       setFetchedCert(null);
//     }
//   };
  
  
  
  

//   return (
//     <div className="container">
//       <h1>Vehicle Inspection DApp</h1>

//       {!walletConnected ? (
//         <>
//           <button onClick={connectWallet}>Connect Wallet</button>
//           <p>Please connect your wallet to interact.</p>
//         </>
//       ) : (
//         <p><strong>Connected:</strong> {walletAddress}</p>
//       )}

//       {error && <p className="status">{error}</p>}

//       <hr />

//       <nav className="dashboard">
//         <a href="#issueForm"><button disabled={!walletConnected}>Issue Certificate</button></a>
//         <a href="#revokeForm"><button disabled={!walletConnected}>Revoke Certificate</button></a>
//         <a href="#getForm"><button disabled={!walletConnected}>Get Certificate</button></a>
//         <a href="#totalForm"><button disabled={!walletConnected}>Get Total Certificates</button></a>
//       </nav>

//       <section id="issueForm" className="certificate-details">
//         <h3>Issue Certificate</h3>
//         <input
//           type="text"
//           placeholder="Vehicle Plate"
//           value={vehiclePlate}
//           onChange={(e) => setVehiclePlate(e.target.value)}
//         />
//         <input
//           type="text"
//           placeholder="Inspection Center"
//           value={inspectionCenter}
//           onChange={(e) => setInspectionCenter(e.target.value)}
//         />
//         <input
//           type="date"
//           value={expiryDate}
//           onChange={(e) => setExpiryDate(e.target.value)}
//         />
//         <button onClick={issueCertificate} disabled={!walletConnected}>
//           Submit
//         </button>
//       </section>


//       <section id="revokeForm" className="certificate-details">
//         <h3>Revoke Certificate</h3>
//         <input
//         type="text"
//         placeholder="Vehicle Plate"
//         value={revokePlate}
//         onChange={(e) => setRevokePlate(e.target.value)}
//         />

//         <button onClick={revokeCertificate} disabled={!walletConnected}>Submit</button>
//       </section>

//       <section id="getForm" className="certificate-details">
//         <h3>Get Certificate</h3>
        
//         <input
//   type="text"
//   placeholder="Vehicle Plate"
//   value={queryPlate}
//   onChange={(e) => setQueryPlate(e.target.value)}
// />
// <button onClick={getCertificate} disabled={!walletConnected}>Submit</button>

// {fetchedCert && (
//   <div className="certificate-details">
//     <p><strong>Plate:</strong> {fetchedCert.vehiclePlate}</p>
//     <p><strong>Inspection Center:</strong> {fetchedCert.inspectionCenter}</p>
//     <p><strong>Inspection Date:</strong> {new Date(fetchedCert.inspectionDate * 1000).toLocaleDateString()}</p>
//     <p><strong>Expiry Date:</strong> {new Date(fetchedCert.expiryDate * 1000).toLocaleDateString()}</p>
//     <p><strong>Status:</strong> {fetchedCert.isValid ? "Valid" : "Revoked"}</p>
//     {fetchedCert.revokedDate > 0 && (
//       <p><strong>Revoked On:</strong> {new Date(fetchedCert.revokedDate * 1000).toLocaleDateString()}</p>
//     )}
//   </div>
// )}



//       </section>

//       <section id="totalForm" className="certificate-details">
//         <h3>Get Total Certificates</h3>
//         <button onClick={fetchTotalCertificates} disabled={!walletConnected}>Submit</button>

//         {totalCertificates !== null && (
//   <p><strong>Total Certificates Issued:</strong> {totalCertificates}</p>
// )}

//         {totalCertificates !== null && (
//           <p>Total Certificates Issued: {totalCertificates}</p>
//         )}
//       </section>
//     </div>
//   );
// }

// export default App;
