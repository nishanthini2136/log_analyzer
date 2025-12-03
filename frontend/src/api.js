import axios from 'axios';

const ANALYZE_URL = 'http://localhost:5000/api/analyze';

export async function analyzeLogFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(ANALYZE_URL, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}
