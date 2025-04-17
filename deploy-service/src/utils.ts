import { exec, spawn } from "child_process";
import path from "path";
import fs from "fs";


export function buildProject(id: string) {
    return new Promise((resolve) => {
        const child = exec(`cd ${path.join(__dirname, `output/${id}`)} && npm install && npm run build`)

        child.stdout?.on('data', function(data) {
            console.log('stdout: ' + data);
        });
        child.stderr?.on('data', function(data) {
            console.log('stderr: ' + data);
        });

        child.on('close', function(code) {
           resolve("")
        });

    })

}
export async function cleanupOutputFolder(id: string) {
    const outputPath = path.join(__dirname, 'output', id);
    try {
        fs.rmSync(outputPath, { recursive: true, force: true });
        console.log(`Cleaned up output folder for ID: ${id}`);
    } catch (error) {
        console.error(`Failed to cleanup output folder for ID ${id}:`, error);
    }
}