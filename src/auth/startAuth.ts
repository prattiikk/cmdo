import open from 'open';
import axios from 'axios';
import ora from 'ora';
import { CONFIG } from "../config"

const API_URL = CONFIG.BACKEND_URL + '/api';

export async function initiateDeviceAuth(): Promise<{ deviceCode: string, userCode: string }> {
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
