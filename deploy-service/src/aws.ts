import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import dotenv from "dotenv";
dotenv.config();

const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    region: process.env.AWS_REGION
})

// output/asdasd
export async function downloadS3Folder(prefix: string) {
    const command = new ListObjectsV2Command({
        Bucket: "codedrive",
        Prefix: prefix
    });

    const allFiles = await s3Client.send(command);
    
    // 
    const allPromises = allFiles.Contents?.map(async ({Key}) => {
        return new Promise(async (resolve) => {
            if (!Key) {
                resolve("");
                return;
            }
            const finalOutputPath = path.join(__dirname, Key);
            const outputFile = fs.createWriteStream(finalOutputPath);
            const dirName = path.dirname(finalOutputPath);
            if (!fs.existsSync(dirName)){
                fs.mkdirSync(dirName, { recursive: true });
            }

            const getObjectCommand = new GetObjectCommand({
                Bucket: "codedrive",
                Key
            });
            const response = await s3Client.send(getObjectCommand);
            if (response.Body instanceof Readable){
                response.Body?.pipe(outputFile).on("finish", () => {
                    resolve("");
                })
            } else {
                const bodyContents = await response.Body?.transformToByteArray();
                if (bodyContents) {
                    fs.writeFileSync(finalOutputPath, Buffer.from(bodyContents));
                    resolve("");
                } 
            }
            
        })
    }) || []
    console.log("awaiting");

    await Promise.all(allPromises?.filter(x => x !== undefined));
}

export function copyFinalDist(id: string) {
    const folderPath = path.join(__dirname, `output/${id}/build`);
    if (!fs.existsSync(folderPath)) {
        throw new Error(`Build directory not found at: ${folderPath}`);
    }
    const allFiles = getAllFiles(folderPath);
    // allFiles.forEach(file => {
    //     uploadFile(`dist/${id}/` + file.slice(folderPath.length + 1), file);
    // })
    return Promise.all(allFiles.map(file => {
        const relativePath = `dist/${id}/` + file.slice(folderPath.length + 1);
        return uploadFile(relativePath, file);
    }));
}

const getAllFiles = (folderPath: string) => {
    let response: string[] = [];

    const allFilesAndFolders = fs.readdirSync(folderPath);allFilesAndFolders.forEach(file => {
        const fullFilePath = path.join(folderPath, file);
        if (fs.statSync(fullFilePath).isDirectory()) {
            response = response.concat(getAllFiles(fullFilePath))
        } else {
            response.push(fullFilePath);
        }
    });
    return response;
}

const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    try {
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: "codedrive",
                Key: fileName,
                Body: fileContent,
            },
        });

        const response = await upload.done();
        console.log('upload completed', response);
        return response;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

