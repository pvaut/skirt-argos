import { processWithWait } from "../../processWithWait";
import { TpMemFile } from "./interface";


export async function loadMemFile(file: File): Promise<TpMemFile> {
    const memFile: TpMemFile = await processWithWait("Reading source file", async () => {

        const CHUNK_SIZE = 1000 * 1000 * 50;

        const chunks: ArrayBuffer[] = [];
        let offset = 0;
        while (offset < file.size) {
            console.log(`==> Reading file chunk at offset=${offset / 1E6} Mb`)
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            const chunk = await slice.arrayBuffer();
            chunks.push(chunk);
            offset += chunk.byteLength;
        }
        return { chunks };

    });
    return memFile;
}