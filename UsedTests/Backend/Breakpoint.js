import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  executor: 'ramping-arrival-rate',
  stages: [
    { duration: '1m', target: 600 }, // slowly ramp up for 30 minutes. target is amount of virtual users that all send 2 requests every second
  ],
  thresholds: {
    http_req_failed: [{ threshold: 'rate==0', abortOnFail: true }], // HTTP errors should be less than 1%, aborts test
    http_req_duration: [{ threshold: 'p(95)<5000', abortOnFail: true }],                                 // 95% of requests should be below 400ms
  },
};

export function setup() {
  const loginPayload = JSON.stringify({
    email: '2',
    password: '2',
  });

  const loginHeaders = {
    'Content-Type': 'application/json',
  };

  // Login Request
  const loginResponse = http.post('http://localhost:3000//auth/login', loginPayload, { headers: loginHeaders });

  // Verify login success and extract JWT token
  const isLoginSuccessful = check(loginResponse, {
    'login successful': (res) => res.status === 200 && res.json('accessToken') !== undefined,
  });

  if (!isLoginSuccessful) {
    throw new Error('Login failed');
  }

  return loginResponse.json('accessToken'); 
}

// Main function executed by each VU
export default function (authToken) {

  const authHeaders = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  const uploadPayload = JSON.stringify({
    description: 'A brief overview of the latest trends in technology for 2024.',
    thumbnailLink: 'https://example.com/thumbnail1.jpg',
    videoLink: 'https://example.com/meow.mp4',
    streamUID: 'sdfbkjsfdbdsfjbfdsj',
    videoLength: 60,
    title: 'Tech Trends of 2024',
    tags: ['meow', 'neeBas'],
    publicationStatus: 'public',
    type: 'short',
  });

  // Upload request
  const uploadResponse = http.post('http://localhost:3000//content/upload', uploadPayload, { headers: authHeaders });
  check(uploadResponse, {
    'upload successful': (res) => res.status === 201,
  });

  const getRangePayload = JSON.stringify({
    rangeMin: 0,
    rangeMax: 3,
  });

  // Range content request
  const allResponse = http.post('http://localhost:3000//content/get-range', getRangePayload, { headers: authHeaders });
  check(allResponse, {
    'fetch all successful': (res) => res.status === 201,
  });

  console.log(`Upload Response: ${uploadResponse.status} | Duration: ${uploadResponse.timings.duration}ms`);
  console.log(`All Response: ${allResponse.status} | Duration: ${allResponse.timings.duration}ms`);

  sleep(1);
}
