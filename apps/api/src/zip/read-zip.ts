import { inflateRawSync } from "node:zlib";

/**
 * The smallest zip reader that will do.
 *
 * Two sources M3 needs arrive zipped and in no other machine-readable form:
 * INSEE publishes BPE as a zipped CSV, and the density grid as .xlsx, which is
 * itself a zip of XML. Node has no unzip, so this is here rather than in a
 * dependency — around eighty lines against a library, for two files read by a
 * command run by hand.
 *
 * It reads the central directory rather than local headers. A local header can
 * carry zeroed sizes with the real ones trailing the data (the streaming
 * writer's trick), and a reader that trusts them silently truncates. The
 * central directory is written last and always holds the true sizes.
 *
 * Everything unsupported throws. A file this cannot read must fail the ingest
 * loudly, not deliver a shortened commune list that looks plausible.
 */

/** End of central directory record, and the fields read from it. */
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const STORED = 0;
const DEFLATED = 8;
/** The EOCD is at the end, after a comment of at most 65,535 bytes. */
const MAX_COMMENT = 0xffff;

export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipError";
  }
}

/** Every file in the archive, by name. Directories are not entries. */
export function readZip(buffer: Buffer): Map<string, Buffer> {
  const eocd = findEndOfCentralDirectory(buffer);
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  if (offset === 0xffffffff) {
    throw new ZipError("Zip64 archives are not supported");
  }

  const files = new Map<string, Buffer>();

  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new ZipError(`Central directory entry ${index} is not where it says it is`);
    }

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);

    // A directory entry. Nothing to read out of it.
    if (!name.endsWith("/")) {
      files.set(name, read(buffer, name, localOffset, method, compressedSize, uncompressedSize));
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

function read(
  buffer: Buffer,
  name: string,
  localOffset: number,
  method: number,
  compressedSize: number,
  uncompressedSize: number,
): Buffer {
  // The local header repeats the name and extra field, at its own lengths —
  // the extra field routinely differs from the central directory's, so the
  // data offset must be computed from the local header rather than assumed.
  const nameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + nameLength + extraLength;
  const body = buffer.subarray(start, start + compressedSize);

  if (method === STORED) {
    return Buffer.from(body);
  }

  if (method !== DEFLATED) {
    throw new ZipError(`${name} uses compression method ${method}, which is not supported`);
  }

  const inflated = inflateRawSync(body);

  if (inflated.length !== uncompressedSize) {
    throw new ZipError(`${name} inflated to ${inflated.length} bytes, not ${uncompressedSize}`);
  }

  return inflated;
}

/** Scans back from the end for the signature, past any archive comment. */
function findEndOfCentralDirectory(buffer: Buffer): number {
  const earliest = Math.max(0, buffer.length - MAX_COMMENT - 22);

  for (let offset = buffer.length - 22; offset >= earliest; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }

  throw new ZipError("Not a zip archive: no end of central directory record");
}
