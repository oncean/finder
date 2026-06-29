const EPOCH = 1704067200000n; // 2024-01-01 00:00:00 UTC
const WORKER_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_WORKER_ID = (1n << WORKER_ID_BITS) - 1n;
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;
const WORKER_ID_SHIFT = SEQUENCE_BITS;
const TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS;

type WorkerIdSource = 'SNOWFLAKE_WORKER_ID' | 'INSTANCE_ID' | 'HOSTNAME' | 'fallback';

type WorkerIdInfo = {
  workerId: bigint;
  source: WorkerIdSource;
  sourceValue: string;
};

function hashToWorkerId(value: string): bigint {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % Number(MAX_WORKER_ID + 1n);
  }

  return BigInt(hash);
}

function parseExplicitWorkerId(rawWorkerId: string): bigint {
  const workerId = BigInt(rawWorkerId);

  if (workerId < 0n || workerId > MAX_WORKER_ID) {
    throw new Error(`SNOWFLAKE_WORKER_ID 必须在 0 到 ${MAX_WORKER_ID.toString()} 之间`);
  }

  return workerId;
}

function readWorkerIdInfo(): WorkerIdInfo {
  const explicitWorkerId = process.env.SNOWFLAKE_WORKER_ID;

  if (explicitWorkerId !== undefined && explicitWorkerId !== '') {
    return {
      workerId: parseExplicitWorkerId(explicitWorkerId),
      source: 'SNOWFLAKE_WORKER_ID',
      sourceValue: explicitWorkerId,
    };
  }

  const instanceId = process.env.INSTANCE_ID;
  if (instanceId !== undefined && instanceId !== '') {
    return {
      workerId: hashToWorkerId(instanceId),
      source: 'INSTANCE_ID',
      sourceValue: instanceId,
    };
  }

  const hostname = process.env.HOSTNAME;
  if (hostname !== undefined && hostname !== '') {
    return {
      workerId: hashToWorkerId(hostname),
      source: 'HOSTNAME',
      sourceValue: hostname,
    };
  }

  const fallbackValue = 'default-instance';
  return {
    workerId: hashToWorkerId(fallbackValue),
    source: 'fallback',
    sourceValue: fallbackValue,
  };
}

class SnowflakeIdGenerator {
  private readonly workerIdInfo = readWorkerIdInfo();
  private lastTimestamp = -1n;
  private sequence = 0n;

  getWorkerIdInfo(): WorkerIdInfo {
    return this.workerIdInfo;
  }

  nextId(): string {
    let timestamp = this.currentTimestamp();

    if (timestamp < this.lastTimestamp) {
      throw new Error('系统时钟回拨，无法生成 Snowflake ID');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & MAX_SEQUENCE;

      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    return (
      ((timestamp - EPOCH) << TIMESTAMP_SHIFT) |
      (this.workerIdInfo.workerId << WORKER_ID_SHIFT) |
      this.sequence
    ).toString();
  }

  private currentTimestamp(): bigint {
    return BigInt(Date.now());
  }

  private waitNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = this.currentTimestamp();

    while (timestamp <= lastTimestamp) {
      timestamp = this.currentTimestamp();
    }

    return timestamp;
  }
}

const snowflakeIdGenerator = new SnowflakeIdGenerator();

export function generateSnowflakeId(): string {
  return snowflakeIdGenerator.nextId();
}

export function getSnowflakeWorkerInfo() {
  const info = snowflakeIdGenerator.getWorkerIdInfo();

  return {
    workerId: info.workerId.toString(),
    source: info.source,
    sourceValue: info.sourceValue,
  };
}
