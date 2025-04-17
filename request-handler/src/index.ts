import express from "express";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    region: process.env.AWS_REGION
})

const app = express();

const getMimeType = (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'application/octet-stream';
};

app.get("/*", async (req, res) => {
    // id.100xdevs.com
    try {
        // const host = req.hostname;
        // console.log("host", host)

        // const id = host.split(".")[0];
        // console.log("id", id)
        // const filePath = req.path;
        // console.log("filePath", filePath)
        const pathParts = req.path.split('/');
        console.log("pathParts", pathParts)
        const id = pathParts[1]; // Get the first path segment
        
        if (!id) {
            return res.status(404).send('Deployment ID not found');
        }

        // Remove the ID from the path to get the file path
        const filePath = pathParts.slice(2).join('/') || 'index.html';
        
        console.log({
            id,
            filePath,
            fullPath: `dist/${id}/${filePath}`
        });

        const command = new GetObjectCommand({
            Bucket: "codedrive",
            Key: `dist/${id}${filePath}`
        });
        const response = await s3Client.send(command);
        
        const type = filePath.endsWith("html") ? "text/html" : filePath.endsWith("css") ? "text/css" : "application/javascript"
        res.set("Content-Type", getMimeType(filePath));

        if (response.Body) {
            const responseStream = await response.Body.transformToByteArray();
            res.send(Buffer.from(responseStream));
        } else {
            res.status(404).send('File not found');
        }
    } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).send('Internal Server Error');
    }
})
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});