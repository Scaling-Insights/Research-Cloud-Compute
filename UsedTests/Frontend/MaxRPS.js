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

// Main function executed by each VU
export default function () {
  // Upload request
  const loginPageResponse = http.get(endpoint + '/');
  check(loginPageResponse, {
    'login successful': (res) => res.status === 200,
  });

  // Upload request
  const contentPageResponse = http.get(endpoint + '/channel');
  check(contentPageResponse, {
    'fetch all successful': (res) => res.status === 200,
  });

  // Range content request
  const contentCreatePageResponse = http.get(endpoint + '/channel/create');
  check(contentCreatePageResponse, {
    'upload successful': (res) => res.status === 200,
  });

  if(contentPageResponse.timings.duration > 950){
    console.log(`Content page Response: ${contentPageResponse.status} | Duration: ${contentPageResponse.timings.duration}ms`);
  }
  if(contentCreatePageResponse.timings.duration > 950){
    console.log(`Create page Response: ${contentCreatePageResponse.status} | Duration: ${contentCreatePageResponse.timings.duration}ms`);
  }
  if(loginPageResponse.timings.duration > 950){
    console.log(`Login page Response: ${loginPageResponse.status} | Duration: ${loginPageResponse.timings.duration}ms`);
  }

  sleep(1);
}
