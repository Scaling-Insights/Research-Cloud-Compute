# Automated K6 Load Testing with Virtual Users

This repository includes two components:
1. **K7 Load Test Automation**  
    This Python-based system, called **K7**, automates the execution of K6 scripts. K7 goes beyond simply ramping up the load; it determines the **approximate maximum number of stable virtual users (VUs)** that can hit every endpoint of a system every second without causing a performance breakdown.
2. **K6 Test Script**  
	A load testing script for [K6](https://k6.io/), an open-source tool from Grafana. The script simulates multiple virtual users (VUs), gradually ramps up the load, and evaluates system performance based on defined thresholds.

While K6 provides the core load testing capabilities, K7 adds advanced orchestration and automation, making the process more efficient and precise.

## Table of Contents

1. [Overview](#overview)
2. [Test Script](#test-script)
3. [Authentication Setup (Optional)](#authentication-setup-optional)
4. [Thresholds and Validation](#thresholds-and-validation)
5. [Endpoints Supported](#endpoints-supported)
6. [Run Cycle](#run-cycle)
---
## Overview
The system runs K6 load tests with two primary phases:
1. **Ramp-Up Phase**: Virtual users are gradually increased.
2. **Instant Load Phase**: A constant load of VUs is maintained.

The tests also validate that performance thresholds are met and ensure that the system can handle the specified load without issues.

In addition, the **K7 Python script** can be used to manage and execute tests with added flexibility, including verbosity (`-v`/`--verbose`) and help (`-h`/`--help`) flags.

---
### Command Line Arguments
This script accepts the following options for configuring the test:
* **`-h`/`--help`**: Returns a list of all the configuration options.
- **`-vu` / `--initial_vus`**: Set the initial number of virtual users. Lower values help when tests fail immediately.
- **`-i` / `--increment`**: Set the increment for virtual users. Smaller increments increase accuracy but take longer to determine the stable VU count. (Recommended: 100)
- **`-vr` / `--validation_runs`**: Set the number of validation runs. Default is 4.
- **`-d` / `--delay_between_tests`**: Set the delay between tests in seconds. Default is 10 seconds.
- **`-t` / `--duration`**: Set the K6 test duration in seconds. Default is 60 seconds.
- **`-rt` / `--rampup_time`**: Set the ramp-up time in seconds. Default is 15 seconds.
- - **`-f` / `--fails`**: Specify the amount of times the k6 test can fail before k7 makes a conclusion. Resets after each new k6 test.
- **`-v` / `--verbose`**: Enable verbose output, showing K6 logs.
- **`--k6_script`**: Specify the path to the K6 test script. Refer to the template for structure.

### Running the Command
You can run the script with all the arguments in a single command, like so:
```bash
python k7.py -vu 100 -i 50 -vr 5 -d 5 -t 60 -rt 30 -v --k6_script test-script.js
```

This example runs the script with the following:
- Initial 100 virtual users (`-vu 100`)
- Increment of 50 virtual users (`-i 50`)
- 5 validation runs (`-vr 5`)
- 15 seconds delay between tests (`-d 5`)
- Test duration of 120 seconds (`-t 60)
- 30 seconds ramp-up time (`-rt 30`)
- Verbose output enabled (`-v`)
- Using `test-script.js` as the K6 test script (`--k6_script test-script.js`), you can add your own test-script to this if you want.

### Notes:
- **`-v` (verbose) output** will display all K6 output.
- **`--k6_script`** should point to the K6 test script you're using.

---
## Test Script
The main test script (`test-script.js`) simulates virtual users (VUs) making HTTP GET requests. It is structured with two distinct load phases, utilizing K6's `ramping-vus` and `constant-vus` executors to manage the scaling of VUs. The only modifications required in this script are the **endpoints** and, optionally, the **setup** function if your tests need authentication or other initialization steps.

Here’s an example of the script:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration for virtual users, ramp-up, and test duration
const target = __ENV.VUS || 300;
const rampupTime = __ENV.RAMPUP || "5s";
const duration = __ENV.DURATION || "1m";

export const options = {
  scenarios: {
    rampUp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [{ duration: rampupTime, target: target }],
      tags: { rampUp: 'true' },
    },
    instantLoad: {
      executor: 'constant-vus',
      vus: target,
      duration: duration,
      startTime: rampupTime,
      tags: { rampUp: 'false' },
    },
  },
  thresholds: {
    'http_req_failed{rampUp:false}': [{ threshold: 'rate==0', abortOnFail: true }],
    'http_req_duration{rampUp:false}': [{ threshold: 'p(95)<1000', abortOnFail: true }],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'],
};

// Main function executed by each virtual user
export default function () {
  http.get('http://localhost:3000/channel');
  http.get('http://localhost:3000/channel/create');
  sleep(1); // Simulate time between requests
}
```

---
## Authentication Setup (Optional)

If your test requires JWT authentication, you can set up the login flow as follows:

```javascript
export function setup() {
  const loginHeaders = { 'Content-Type': 'application/json' };

  const loginResponse = http.post('http://localhost/auth/login', JSON.stringify({
    name: 'your_username',
    password: 'your_password',
  }), { headers: loginHeaders });

  const isLoginSuccessful = check(loginResponse, {
    'login successful': (res) => res.status === 200 && res.json('accessToken') !== undefined,
  });

  if (!isLoginSuccessful) {
    throw new Error('Login failed');
  }

  return loginResponse.json('accessToken');
}

export default function (accessToken) {
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  http.get('http://localhost:3000/channel', { headers: authHeaders });
  http.get('http://localhost:3000/channel/create', { headers: authHeaders });
  sleep(1);
}
```

---
## Thresholds and Validation
The following performance thresholds are defined for validation:
- **HTTP request failures**: The failure rate should be 0% (`rate==0`).
- **HTTP request duration**: 95% of requests should complete within 1000ms (`p(95)<1000`).

If the thresholds are exceeded, the test will be aborted.

---
## Endpoints Supported
All HTTP methods are support in K6 except for trace (which sucks anyway), for more information about this visit the [K6 docs](https://k6.io/).

---
## Run Cycle
K7 follows a systematic approach to determine the maximum stable number of virtual users (VUs) your system can handle. The process includes the following steps:

1. **Incremental Load Testing**:  
   - The test begins with the initial number of VUs specified by the `--initial_vus` argument.  
   - After each successful K6 test, K7 increases the VU count by the step size defined in `--increment`.  
   - This process repeats until the test fails, signaling the point where the system can no longer sustain the load.

2. **Retry Mechanism for Failures**:  
   - If a test fails, K7 retries the same configuration up to the limit set by the `--fails` argument.  
   - This ensures temporary issues or fluctuations do not skew the results.

3. **Refining the VU Count**:  
   - When a failure persists, K7 reduces the VU count by half of the increment value.  
   - The system is then retested with this reduced load.  
   - This back-and-forth adjustment continues until a stable VU count is identified.

4. **Validation Runs**:  
   - Once a stable configuration is found, K7 validates it by rerunning the test multiple times.  
   - The number of consecutive successful runs required is specified by the `--validation_runs` argument.  
   - If any validation test fails, the process resumes to fine-tune the VU count.

5. **Final Results**:  
   - After passing all validations, K7 reports the maximum number of stable VUs the system can support.  
   - Along with the VU count, K7 also outputs the number of lost requests from each test iteration for detailed performance analysis.

6. **Error Handling**:  
   - If a K6 test encounters an error that prevents execution, K7 immediately stops and exits with the error.  
   - This ensures critical issues are highlighted and resolved before proceeding.
  
---
