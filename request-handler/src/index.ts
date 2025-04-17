import express from "express";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    region: process.env.AWS_REGION
})

const app = express();

app.get("/*", async (req, res) => {
    // id.100xdevs.com
    try {
        const host = req.hostname;

        const id = host.split(".")[0];
        const filePath = req.path;

        const command = new GetObjectCommand({
            Bucket: "codedrive",
            Key: `dist/${id}${filePath}`
        });
        const response = await s3Client.send(command);
        
        const type = filePath.endsWith("html") ? "text/html" : filePath.endsWith("css") ? "text/css" : "application/javascript"
        res.set("Content-Type", type);

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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});