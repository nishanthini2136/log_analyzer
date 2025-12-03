import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000/api/analyze';
const TEST_FILE = path.join(__dirname, 'test.log');

// Create a test log file
fs.writeFileSync(TEST_FILE, 'Test log entry\nError: Something went wrong\n');

async function testUpload() {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE));

    console.log('Uploading test file...');
    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    console.log('✅ Success!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('❌ Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testUpload();
