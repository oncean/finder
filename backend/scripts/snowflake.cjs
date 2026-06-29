const EPOCH = 1704067200000n;
const WORKER_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_WORKER_ID = (1n << WORKER_ID_BITS) - 1n;
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;
const WORKER_ID_SHIFT = SEQUENCE_BITS;
const TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS;

const rawWorkerId = process.env.SNOWFLAKE_WORKER_ID || process.env.INSTANCE_ID || '1';
const workerId = BigInt(rawWorkerId);

if (workerId < 0n || workerId > MAX_WORKER_ID) {
  throw new Error(`SNOWFLAKE_WORKER_ID 必须在 0 到 ${MAX_WORKER_ID.toString()} 之间`);
}

let lastTimestamp = -1n;
let sequence = 0n;

function currentTimestamp() {
  return BigInt(Date.now());
}

function waitNextMillis(last) {
  let timestamp = currentTimestamp();

  while (timestamp <= last) {
    timestamp = currentTimestamp();
  }

  return timestamp;
}

function generateSnowflakeId() {
  let timestamp = currentTimestamp();

  if (timestamp < lastTimestamp) {
    throw new Error('系统时钟回拨，无法生成 Snowflake ID');
  }

  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & MAX_SEQUENCE;

    if (sequence === 0n) {
      timestamp = waitNextMillis(lastTimestamp);
    }
  } else {
    sequence = 0n;
  }

  lastTimestamp = timestamp;

  return (
    ((timestamp - EPOCH) << TIMESTAMP_SHIFT) |
    (workerId << WORKER_ID_SHIFT) |
    sequence
  ).toString();
}

module.exports = { generateSnowflakeId };
