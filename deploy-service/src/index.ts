import express from "express";
import { createClient, commandOptions } from "redis";
import { ClosingError, GlideClusterClient, Logger } from "@valkey/valkey-glide";
import { copyFinalDist, downloadS3Folder } from "./aws";
import { buildProject, cleanupOutputFolder } from "./utils";
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, ChangeMessageVisibilityCommand } from "@aws-sdk/client-sqs";
import dotenv from "dotenv";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

async function extendMessageVisibility(receiptHandle: string, visibilityTimeout: number) {
    try {
        await sqs.send(new ChangeMessageVisibilityCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            ReceiptHandle: receiptHandle,
            VisibilityTimeout: visibilityTimeout
        }));
    } catch (error) {
        console.warn('Failed to extend message visibility:', error);
    }
}

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
async function updateDeploymentStatus(id: string, status: string) {
    try {
        await dynamodb.send(new UpdateItemCommand({
            TableName: 'deployment-status',
            Key: {
                'id': { S: id }
            },
            UpdateExpression: 'SET #status = :status, updatedAt = :timestamp',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': { S: status },
                ':timestamp': { N: Date.now().toString() }
            }
        }));
        console.log(`Updated status to ${status} for ID: ${id}`);
    } catch (error) {
        console.error(`Failed to update status for ID ${id}:`, error);
    }
}

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});
app.listen(PORT, () => {
    console.log(`Deploy service listening on port ${PORT}`);
});

async function main() {
    while(true){
        try {
            const receiveCommand = new ReceiveMessageCommand({
                QueueUrl: process.env.SQS_QUEUE_URL,
                MaxNumberOfMessages: 1,
                VisibilityTimeout: 120,
                WaitTimeSeconds: 20,
            });

            const response = await sqs.send(receiveCommand);

            if(!response.Messages || response.Messages.length === 0){
                console.log("No messages in queue");
                continue;
            }
            const message = response.Messages[0];
            // @ts-ignore
            const body = JSON.parse(message.Body);
            const id = body.id;
            console.log("Received message:", id);

            if(!id) continue;
            const visibilityExtender = setInterval(async () => {
                await extendMessageVisibility(message.ReceiptHandle!, 60);
            }, 30000); 

            try {
                await updateDeploymentStatus(id, 'building');
                await downloadS3Folder(`output/${id}`);
                await buildProject(id);
                await copyFinalDist(id);

                await cleanupOutputFolder(id);

                clearInterval(visibilityExtender);
                await updateDeploymentStatus(id, 'deployed');

                try {
                    await sqs.send(new DeleteMessageCommand({
                        QueueUrl: process.env.SQS_QUEUE_URL,
                        ReceiptHandle: message.ReceiptHandle
                    }));
                    console.log(`Successfully deleted message for ID: ${id}`);
                } catch (deleteError) {
                    console.error(`Failed to delete message for ID ${id}:`, deleteError);
                }

                console.log(`Successfully deployed and deleted message for ID: ${id}`);
            } catch (error) {
                clearInterval(visibilityExtender);
                console.error(`Deployment failed for ID ${id}:`, error);
                await cleanupOutputFolder(id);
                
            }
        } catch (error) {
            console.error("SQS operation failed:", error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
})
main().catch(error => {
    console.error("Application failed:", error);
    process.exit(1);
});
