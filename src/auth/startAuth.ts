// import open from 'open';

// // Example CLI usage
// async function startAuth() {
//     try {
//         // 1. Initialize auth session
//         const response = await fetch('http://localhost:3000/api/auth/start', {
//             method: 'POST',
//         });

//         const { data } = await response.json();
//         const { deviceCode, loginUrl, verifyUrl } = data;

//         // 2. Open browser for user to authenticate
//         console.log('Opening browser for authentication...');
//         await open(loginUrl);

//         // 3. Poll verify endpoint until auth completes
//         console.log('Waiting for authentication...');

//         while (true) {
//             const verifyResponse = await fetch(verifyUrl, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({ deviceCode })
//             });

//             if (verifyResponse.ok) {
//                 const { token } = await verifyResponse.json();
//                 return token;
//             }

//             await new Promise(resolve => setTimeout(resolve, 3000));
//         }
//     } catch (error) {
//         console.error('Authentication failed:', error);
//         throw error;
//     }
// }
import open from 'open';
import axios from 'axios';
import ora from 'ora';

const API_URL = 'http://localhost:3000/api';

export async function initiateDeviceAuth(): Promise<{deviceCode: string, userCode: string}> {
    try {
        // Get device and user codes from /api/device
        const response = await axios.post(`${API_URL}/device`);
        const { 
            device_code: deviceCode,
            user_code: userCode, 
            verification_uri_complete: verificationUrl
        } = response.data;
        
        console.log(`\nYour device code: ${userCode}`);
        console.log('Opening browser for verification...');
        
        await open(verificationUrl);
        
        return { deviceCode, userCode };
    } catch (error) {
        console.error('Failed to initiate device auth:', error);
        throw error;
    }
}

export async function pollForToken(deviceCode: string): Promise<string> {
    const spinner = ora('Waiting for device verification...').start();
    
    while (true) {
        try {
            const response = await axios.post(`${API_URL}/device/token`, {
                device_code: deviceCode // Note: API expects device_code
            });
            
            if (response.data.access_token) {
                spinner.succeed('Device verified successfully!');
                return response.data.access_token;
            }
        } catch (error: any) {
            if (error.response?.data?.error === 'authorization_pending') {
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
            
            spinner.fail(`Authentication failed: ${error.response?.data?.error || error.message}`);
            throw error;
        }
    }
}
