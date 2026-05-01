


export function getCacheBustedUrl(url: string) {
    return `${url}?cacheVersion=${Date.now()}`
}


export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export async function downloadArrayBufferWithProgress(
    url: string,
    onProgress: (progress: number) => void
): Promise<ArrayBuffer> {
    const response = await fetch(getCacheBustedUrl(url));

    if (!response.ok || !response.body) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const contentLength = response.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];

    let lastReceived = -100;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
            chunks.push(value);
            received += value.length;
            if (total && (received > lastReceived + 0.02 * total)) {
                onProgress((received / total) * 100);
                lastReceived = received;
                await sleep(10);
            }
        }
    }

    // Flatten chunks into a single ArrayBuffer
    const result = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result.buffer;
}
