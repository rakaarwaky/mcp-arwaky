export interface CommandMetric {
  command: string;
  durationMs: number;
  success: boolean;
  timestamp: string;
}

const metrics: CommandMetric[] = [];

export function recordMetric(metric: CommandMetric) {
  metrics.push(metric);
}

export function getMetrics() {
  return metrics;
}

export function formatPrometheusMetrics(): string {
  let output = '# HELP cmf_command_duration_ms duration of command execution\n';
  output += '# TYPE cmf_command_duration_ms summary\n';
  
  for (const m of metrics) {
    output += `cmf_command_duration_ms{command="${m.command}",success="${m.success}"} ${m.durationMs}\n`;
  }
  
  output += '\n# HELP cmf_command_total Total number of commands executed\n';
  output += '# TYPE cmf_command_total counter\n';
  
  const counts: Record<string, number> = {};
  for (const m of metrics) {
    const key = `command="${m.command}",success="${m.success}"`;
    counts[key] = (counts[key] || 0) + 1;
  }
  
  for (const [labels, count] of Object.entries(counts)) {
    output += `cmf_command_total{${labels}} ${count}\n`;
  }
  
  return output;
}
