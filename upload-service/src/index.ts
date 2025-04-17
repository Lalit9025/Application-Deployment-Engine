
import express from "express";
import cors from "cors";
import simpleGit from "simple-git";
import { generate } from "./utils";
import { getAllFiles } from "./file";
import path from "path";
import { uploadFile } from "./aws";
import { createClient } from "redis";
import dotenv from "dotenv";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
dotenv.config();


const sqs = new SQSClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

const dynamodb = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

const app = express();
app.use(cors())
app.use(express.json());

app.post("/deploy", async (req, res) => {
    try {
            const repoUrl = req.body.repoUrl;
        const id = generate(); // asd12

        await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));

        const files = getAllFiles(path.join(__dirname, `output/${id}`));
        console.log("lalit", files)

        // files.forEach(async (file) => {
        //     // Get the relative path, starting from the 'output' folder
        //     const relativePath = path.relative(path.join(__dirname), file);
        
        //     // Normalize the relative path to use forward slashes
        //     const normalizedRelativePath = relativePath.replace(/\\/g, '/');
        
        //     // Ensure the path includes 'output' as the prefix in S3
        //     await uploadFile(normalizedRelativePath, file);
        // });
        await Promise.all(files.map(async (file) => {
            const relativePath = path.relative(path.join(__dirname), file);
            const normalizedRelativePath = relativePath.replace(/\\/g, '/');
            return uploadFile(normalizedRelativePath, file);
        }));
        await dynamodb.send(new PutItemCommand({
            TableName: 'deployment-status',
            Item: {
                'id': { S: id },
                'status': { S: 'uploaded' },
                'timestamp': { N: Date.now().toString() }
            }
        }));

        await sqs.send(new SendMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody: JSON.stringify({ id }),
            MessageGroupId: id, // Required for FIFO queues
            MessageDeduplicationId: id // Required for FIFO queues
        }));

        res.json({
            id: id
        })
    } catch (error) {
        console.error('Deployment failed:', error);
        res.status(500).json({ error: 'Deployment failed' });
    }

});

app.get("/status", async (req, res) => {
    // const id = req.query.id;
    // const response = await subscriber.hGet("status", id as string);
    // res.json({
    //     status: response
    // })
    try {
        const id = req.query.id;
        const response = await dynamodb.send(new GetItemCommand({
            TableName: 'deployment-status',
            Key: {
                'id': { S: id as string }
            }
        }));

        if (!response.Item) {
            return res.status(404).json({ error: 'Deployment not found' });
        }

        res.json({
            status: response.Item.status.S,
            timestamp: parseInt(response.Item.timestamp.N || '0')
        });
    } catch (error) {
        console.error('Status check failed:', error);
        res.status(500).json({ error: 'Status check failed' });
    }
})

app.listen(3000, ()=>{
    console.log("server started")
});
