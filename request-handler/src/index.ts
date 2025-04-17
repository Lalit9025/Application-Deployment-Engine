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
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject'
    };
    return mimeTypes[ext] || 'application/octet-stream';
};
app.get("/", (req, res) => {
    res.send('Welcome to Application Deployment Engine. Please provide a deployment ID.');
});
app.get("/site", async (req, res) => {
    try {
        const id = req.query.id as string;
        const file = req.query.file as string || 'index.html';

        if (!id) {
            return res.status(400).send('Missing deployment ID');
        }

        console.log("ID:", id);
        console.log("Requested File:", file);

        // Construct the S3 key
        const s3Key = `dist/${id}/${file}`;
        console.log("S3 Key:", s3Key);

        const command = new GetObjectCommand({
            Bucket: "codedrive",
            Key: s3Key
        });

        try {
            const response = await s3Client.send(command);
            
            res.set({
                'Content-Type': getMimeType(s3Key),
                'Content-Disposition': 'inline',
                'Cache-Control': file.startsWith('static/') ? 'public, max-age=31536000' : 'no-cache'
            });
            
            if (response.Body) {
                const responseStream = await response.Body.transformToByteArray();
                res.send(Buffer.from(responseStream));
            } else {
                res.status(404).send('File not found');
            }
        } catch (error) {
        
            if (file !== 'index.html') {
                const indexCommand = new GetObjectCommand({
                    Bucket: "codedrive",
                    Key: `dist/${id}/index.html`
                });

                try {
                    const indexResponse = await s3Client.send(indexCommand);
                    res.set({
                        'Content-Type': 'text/html',
                        'Content-Disposition': 'inline',
                        'Cache-Control': 'no-cache'
                    });
                    
                    if (indexResponse.Body) {
                        const responseStream = await indexResponse.Body.transformToByteArray();
                        res.send(Buffer.from(responseStream));
                    } else {
                        res.status(404).send('Application not found');
                    }
                } catch (indexError) {
                    res.status(404).send('Application not found');
                }
            } else {
                res.status(404).send('File not found');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/static/:type/:file", async (req, res) => {
    try {
        const { type, file } = req.params;
        const id = req.query.id as string || req.get('Referer')?.split('id=')[1];

        if (!id) {
            return res.status(400).send('Missing deployment ID');
        }

        const s3Key = `dist/${id}/static/${type}/${file}`;
        console.log("Static file request:", s3Key);

        const command = new GetObjectCommand({
            Bucket: "codedrive",
            Key: s3Key
        });

        const response = await s3Client.send(command);
        res.set({
            'Content-Type': getMimeType(file),
            'Content-Disposition': 'inline',
            'Cache-Control': 'public, max-age=31536000'
        });

        if (response.Body) {
            const responseStream = await response.Body.transformToByteArray();
            res.send(Buffer.from(responseStream));
        } else {
            res.status(404).send('File not found');
        }
    } catch (error) {
        console.error('Error serving static file:', error);
        res.status(404).send('File not found');
    }
});

app.get("/favicon.ico", async (req, res) => {
    try {
        const id = req.query.id as string || req.get('Referer')?.split('id=')[1];
        if (!id) {
            return res.status(404).send('Favicon not found');
        }

        const command = new GetObjectCommand({
            Bucket: "codedrive",
            Key: `dist/${id}/favicon.ico`
        });

        const response = await s3Client.send(command);
        res.set({
            'Content-Type': 'image/x-icon',
            'Cache-Control': 'public, max-age=31536000'
        });

        if (response.Body) {
            const responseStream = await response.Body.transformToByteArray();
            res.send(Buffer.from(responseStream));
        } else {
            res.status(404).send('Favicon not found');
        }
    } catch (error) {
        console.error('Error serving favicon:', error);
        res.status(404).send('Favicon not found');
    }
});

app.get("/manifest.json", async (req, res) => {
    console.log
    try {
        const id = req.query.id as string || req.get('Referer')?.split('id=')[1];
        if (!id) {
            return res.status(404).send('Manifest not found');
        }

        const command = new GetObjectCommand({
            Bucket: "codedrive",
            Key: `dist/${id}/manifest.json`
        });

        const response = await s3Client.send(command);
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
        });

        if (response.Body) {
            const responseStream = await response.Body.transformToByteArray();
            res.send(Buffer.from(responseStream));
        } else {
            res.status(404).send('Manifest not found');
        }
    } catch (error) {
        console.error('Error serving manifest:', error);
        res.status(404).send('Manifest not found');
    }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});