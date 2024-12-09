import express from "express";
import { S3 } from "aws-sdk";

const s3 = new S3({
    accessKeyId: "AKIAXNGUVNOCDT3T7OEO",
    secretAccessKey: "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",
    region: "eu-north-1"
})

const app = express();

app.get("/*", async (req, res) => {
    // id.100xdevs.com
    const host = req.hostname;

    const id = host.split(".")[0];
    const filePath = req.path;

    const contents = await s3.getObject({
        Bucket: "codedrive",
        Key: `dist/${id}${filePath}`
    }).promise();
    
    const type = filePath.endsWith("html") ? "text/html" : filePath.endsWith("css") ? "text/css" : "application/javascript"
    res.set("Content-Type", type);

    res.send(contents.Body);
})

app.listen(3001);