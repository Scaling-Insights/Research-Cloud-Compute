import http from 'k6/http';
import { check, sleep } from 'k6';

// The amount of VUs to ramp up to
let target = 450;
// The amount of time to ramp up to the target amount of VUs
let rampupTime = "5s";
// Endpoint
let endpoint = 'http://localhost:3000/';

export const options = {
  scenarios: {
    rampUp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
          { duration: rampupTime, target: target },
      ],
      tags: { rampUp: 'true' }, // Tag the rampUp scenario
    },
    instantLoad: {
      executor: 'constant-vus',
      vus: target, 
      duration: '60s',
      startTime: rampupTime, // This makes instantLoad wait for rampUp to complete
      tags: { rampUp: 'false' }, // Tag the instantLoad scenario 
    },
  },
  thresholds: {
    'http_req_failed{rampUp:false}': [{ threshold: 'rate==0', abortOnFail: true }], // HTTP errors should be less than 1%, aborts test
    'http_req_duration{rampUp:false}': [{ threshold: 'p(95)<1000', abortOnFail: true }], // 95% of requests should be below 400ms
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'], // Exclude rampUp from summary stats
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
  const loginResponse = http.post(endpoint + '/auth/login', loginPayload, { headers: loginHeaders });

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
    streamUID: 'testStreamUID',
    videoLength: 60,
    title: 'Tech Trends of 2024',
    tags: ['meow', 'neeBas'],
    publicationStatus: 'public',
    type: 'short',
  });

  // Upload request
  const uploadResponse = http.post(endpoint + '/content/upload', uploadPayload, { headers: authHeaders });
  check(uploadResponse, {
    'upload successful': (res) => res.status === 201,
  });

  const getRangePayload = JSON.stringify({
    rangeMin: 0,
    rangeMax: 3,
  });

  // Range content request
  const allResponse = http.post(endpoint + '/content/get-range', getRangePayload, { headers: authHeaders });
  check(allResponse, {
    'fetch all successful': (res) => res.status === 201,
  });

  if(allResponse.timings.duration > 950){
    console.log(`All Response: ${allResponse.status} | Duration: ${allResponse.timings.duration}ms`);
  }
  if(uploadResponse.timings.duration > 950){
    console.log(`Upload Response: ${uploadResponse.status} | Duration: ${uploadResponse.timings.duration}ms`);
  }

  sleep(1);
}
