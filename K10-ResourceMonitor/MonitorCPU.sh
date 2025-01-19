#!/bin/bash

#sudo apt install sysstat
#chmod +x script.sh

# root@bijlage5-tests3-5ccdd13e112e:~# ./script.sh

# Tracking processes for command containing 'next-server'...
# Collecting per-core CPU usage over 67 seconds...

# Process tracking (average stats):
# PID: PID      Command: %CPU                           %CPU: Command %Mem:        RSS:
# PID: 5460     Command: 21.11                          %CPU: next-server %Mem:        RSS:
# PID: 14065    Command: 21.04                          %CPU: next-server %Mem:        RSS:
# PID: 19067    Command: 18.05                          %CPU: next-server %Mem:        RSS:
# PID: 22844    Command: 19.34                          %CPU: next-server %Mem:        RSS:
# PID: PID      Command: %MEM                           %CPU:        %Mem:        RSS:
# PID: 5460     Command: 6.01                           %CPU: (v     %Mem:        RSS:
# PID: 14065    Command: 5.86                           %CPU: (v     %Mem:        RSS:
# PID: 19067    Command: 5.90                           %CPU: (v     %Mem:        RSS:
# PID: 22844    Command: 5.78                           %CPU: (v     %Mem:        RSS:

# CPU usage per core (summary over 67 seconds):
# CPU %usr %nice %sys %iowait %irq %soft %steal %guest %gnice %idle
# all 80.22 0.00 6.41 0.00 0.00 4.56 0.00 0.00 0.00 8.81
# 0 80.22 0.00 6.41 0.00 0.00 4.56 0.00 0.00 0.00 8.81
# Monitoring complete. Temporary files removed.
# ===============================================

# Top shows the CPU usage of next-server
# Bottom shows the CPU usage of the system per core

# Interval and duration for monitoring
INTERVAL=1
DURATION=67

# Process to track
TARGET_COMMAND="next-server"

# Temporary files for storing stats
TEMP_CPU_FILE="cpu_usage_stats.txt"
TEMP_PIDSTAT_FILE="pidstat_stats.txt"

# Function to collect CPU usage per core
collect_cpu_usage() {
  echo "Collecting per-core CPU usage over $DURATION seconds..."
  mpstat -P ALL $INTERVAL $DURATION > "$TEMP_CPU_FILE"
}

# Function to monitor processes using pidstat
monitor_processes() {
  echo -e "\nTracking processes for command containing '$TARGET_COMMAND'..."

  # Reset the pidstat statistics (force fresh data collection)
  pidstat -r 1>/dev/null 2>&1

  # Collect data with pidstat, filtered by the target command
  pidstat -u -r -C "$TARGET_COMMAND" $INTERVAL $DURATION > "$TEMP_PIDSTAT_FILE"

  # Extract and display only the "Average:" lines from pidstat output
  echo -e "\nProcess tracking (average stats):"
  grep "Average:" "$TEMP_PIDSTAT_FILE" | awk '{
    pid=$3;
    cpu=$10;
    mem=$13;
    rss=$15;
    command=$8;
    # Print in a well-aligned format
    printf "PID: %-8s Command: %-30s %%CPU: %-6s %%Mem: %-6s RSS: %-6s\n", pid, command, cpu, mem, rss;
  }'
}

# Start both tasks in parallel
collect_cpu_usage &
CPU_TASK_PID=$!
monitor_processes &
PIDSTAT_TASK_PID=$!

# Wait for both tasks to complete
wait $CPU_TASK_PID
wait $PIDSTAT_TASK_PID

# Display the CPU usage summary
echo -e "\nCPU usage per core (summary over $DURATION seconds):"
grep "Average" "$TEMP_CPU_FILE" | awk '{for(i=2; i<=NF; i++) printf "%s ", $i; print ""}'

# Cleanup temporary files
rm -f "$TEMP_CPU_FILE" "$TEMP_PIDSTAT_FILE"

echo "Monitoring complete. Temporary files removed."
echo "==============================================="