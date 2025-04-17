import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    region: process.env.AWS_REGION
});


export const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    
    const normalizedFileName = fileName.replace(/\\/g, '/');

    try {
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: "codedrive",
                Key: normalizedFileName,
                Body: fileContent,
            },
        });
        const response = await upload.done();
        console.log('upload completed');
        return response;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }

};


