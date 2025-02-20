function removeLinesContaining(str, target) {
	return str.split('\n').filter(line => !line.includes(target)).join('\n');
}

async function scanFingerprints(wfpContent) {
	const boundary = '------------------------' + Math.random().toString(36).substring(2, 15);

	const formData = [
		`--${boundary}`,
		'Content-Disposition: form-data; name="file"; filename="scan.wfp"',
		'Content-Type: text/plain',
		'',
		wfpContent,
		`--${boundary}--`,
		''
	].join('\r\n');

	try {
		const response = await fetch('https://osskb.org/api/scan/direct', {
method: 'POST',
headers: {
'Accept': '*/*',
'Content-Type': `multipart/form-data; boundary=${boundary}`,
'Content-Length': Buffer.byteLength(formData),
'User-Agent': 'SCANOSS_AI_Shim/0.0.1'
},
body: formData
});

const text = await response.text();

const parsedData = JSON.parse(text);
const idValue = parsedData["generated.code"][0].id;

if (idValue == 'none') {
	return "no Open Source matches"
}
return "an Open Source match type: "+jsonObject[0].id;

} catch (error) {
	console.error('Error scanning fingerprints:', error);
	throw error;
}
}

function fingerprintCode(content, maxSize = 65536) {
	const ASCII_0 = 48;
	const ASCII_9 = 57;
	const ASCII_A = 65;
	const ASCII_Z = 90;
	const ASCII_a = 97;
	const ASCII_z = 122;
	const ASCII_LF = 10;
	const GRAM = 30;
	const WINDOW = 64;

	// Normalize characters function
	function normalize(byte) {
		if (byte < ASCII_0 || byte > ASCII_z) return 0;
		if (byte <= ASCII_9 || byte >= ASCII_a) return byte;
		if (byte >= ASCII_A && byte <= ASCII_Z) return byte + 32;
		return 0;
	}

	// Find minimum hash in window
	function minHexArray(array) {
		return array.reduce((min, curr) => curr < min ? curr : min, 'ffffffff');
	}

	// CRC32C implementation
	let CRC_TABLE = [];
	function makeCRCTable() {
		for (let n = 0; n < 256; n++) {
			let c = n;
			for (let k = 0; k < 8; k++) {
				c = c & 1 ? 0x82f63b78 ^ (c >>> 1) : c >>> 1;
			}
			CRC_TABLE[n] = c;
		}
	}
	makeCRCTable();

	function crc32c(buffer) {
		let crc = 0 ^ -1;
		for (let i = 0; i < buffer.length; i++) {
			crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
		}
		return (crc ^ -1) >>> 0;
	}

	function crc32cHex(buffer) {
		return crc32c(buffer).toString(16).padStart(8, '0');
	}

	// Convert input to Buffer if it isn't already
	const inputBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

	// Calculate MD5 header
	const crypto = require('crypto');
	const md5 = crypto.createHash('md5').update(inputBuffer).digest('hex');
	let wfp = `file=${md5},${inputBuffer.length},generated.code\n`;

	// Calculate fingerprints
	let gram = Buffer.alloc(0);
	const window = [];
	let line = 1;
	let minHash = 'ffffffff';
	let lastHash = 'ffffffff';
	let lastLine = 0;
	let output = '';

	for (let i = 0; i < inputBuffer.length; i++) {
		const byte = inputBuffer[i];
		if (byte === ASCII_LF) {
			line += 1;
		} else {
			const normalized = normalize(byte);
			if (normalized) {
				gram = Buffer.concat([gram, Buffer.from([normalized])]);

				if (gram.length >= GRAM) {
					const gramCrc32 = crc32cHex(gram);
					window.push(gramCrc32);

					if (window.length >= WINDOW) {
						minHash = minHexArray(window);
						if (minHash !== lastHash) {
							const crcHex = crc32cHex(Buffer.from(minHash, 'hex'));

							if (lastLine !== line) {
								if (output.length > 0) {
									wfp += output + '\n';
								}
								output = `${line}=${crcHex}`;
							} else {
								output += `,${crcHex}`;
							}
							lastLine = line;
							lastHash = minHash;
						}
						window.shift();
					}
					gram = gram.slice(1);
				}
			}
		}
	}

	if (output.length > 0) {
		wfp += output + '\n';
	}

	// Truncate if exceeding max size
	if (wfp.length > maxSize) {
		let truncateIndex = maxSize;
		while (truncateIndex > 0 && wfp[truncateIndex] !== '\n') {
			truncateIndex--;
		}
		wfp = wfp.substring(0, truncateIndex + 1);
	}

	return wfp;
}

module.exports = {
    fingerprintCode,
    scanFingerprints,
    removeLinesContaining
};
