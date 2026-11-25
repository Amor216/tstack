process.stdout.write(JSON.stringify({ type: 'system', subtype: 'init', marker: 'first-event' }) + '\n');
setTimeout(() => process.stdout.write(JSON.stringify({ type: 'result', result: 'late', num_turns: 1 }) + '\n'), 120000);
