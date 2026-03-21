
const fs = require('fs');
const path = require('path');

async function testEndpoints() {
    const baseUrl = 'http://localhost:3000';

    console.log("🚀 Starting Backend Verification...\n");

    // 1. Test AI Treatment
    try {
        console.log("Testing POST /api/ai/treatment...");
        const res = await fetch(`${baseUrl}/api/ai/treatment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                diagnosis: "Glioma",
                age: 45,
                sex: "Male",
                findings: "Mass in left temporal lobe"
            })
        });
        if (res.ok) {
            const data = await res.json();
            console.log("✅ Treatment API Success:", JSON.stringify(data).substring(0, 100) + "...");
        } else {
            console.error("❌ Treatment API Failed:", res.status, await res.text());
        }
    } catch (e) {
        console.error("❌ Treatment API Error:", e.message);
    }
    console.log("-".repeat(20));

    // 2. Test AI Report
    try {
        console.log("Testing POST /api/ai/report...");
        const res = await fetch(`${baseUrl}/api/ai/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modality: "brain",
                diagnosis: "Glioblastoma",
                findings: "Large enhancing mass with edema",
                language: "en"
            })
        });
        if (res.ok) {
            const data = await res.json();
            console.log("✅ Report API Success:", JSON.stringify(data).substring(0, 100) + "...");
        } else {
            console.error("❌ Report API Failed:", res.status, await res.text());
        }
    } catch (e) {
        console.error("❌ Report API Error:", e.message);
    }
    console.log("-".repeat(20));

    // 3. Test Predict Proxy
    try {
        console.log("Testing POST /api/ml-proxy (Proxy)...");
        // Create dummy file for FormData
        const formData = new FormData();
        const blob = new Blob(["fake image"], { type: "image/jpeg" });
        formData.append("file", blob, "test.jpg");
        formData.append("modality", "brain");

        const res = await fetch(`${baseUrl}/api/ml-proxy`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            console.log("✅ Predict Proxy Success:", JSON.stringify(data));
        } else {
            console.error("❌ Predict Proxy Failed:", res.status, await res.text());
        }
    } catch (e) {
        console.error("❌ Predict Proxy Error:", e.message);
    }
}

testEndpoints();
