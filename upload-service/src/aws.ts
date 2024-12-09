import { S3 } from "aws-sdk";
import fs from "fs";

const s3 = new S3({
    accessKeyId: "",
    secretAccessKey: "",
    region: ""
})

export const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    
    // Normalize the fileName to use forward slashes
    const normalizedFileName = fileName.replace(/\\/g, '/');

    const response = await s3.upload({
        Body: fileContent,
        Bucket: "codedrive",
        Key: normalizedFileName, // Use the normalized file name
    }).promise();

    console.log(response);
};


