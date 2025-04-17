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
// app.get("/site/:id/*", async (req, res) => {
//     try {
//         //@ts-ignore
//         const id = req.params.id;
//         //@ts-ignore

//         const requestedPath = req.params[0] || '';
//         // console.log("req", req);
//         console.log("req.params", req.params);
//         console.log("id", id);
//         let s3Key = `dist/${id}/`;
       
        
//         // if (!id || id.length !== 5) {
//         //     return res.status(404).send('Invalid deployment ID');
//         // }

//         // Get the file path from the URL (everything after the ID)
//         // If no specific file is requested, default to index.html
//         //@ts-ignore
//         let filePath = req.params[0] || 'index.html';
//         console.log("filePath", filePath);
        
//         // Remove leading slash if present
//         if (filePath.startsWith('/')) {
//             filePath = filePath.substring(1);
//         }
        
//         // If path ends with a slash or is empty, append index.html
//         if (filePath === '' || filePath.endsWith('/')) {
//             filePath += 'index.html';
//         }

//         console.log(`Fetching: dist/${id}/${filePath}`);
        
//         const command = new GetObjectCommand({
//             Bucket: "codedrive",
//             Key: `dist/${id}/index.html`
//         });
//         console.log("command", command);
        
//         try {
//             // const response = await s3Client.send(command);
            
//             // // Set the appropriate content type
//             // res.set("Content-Type", getMimeType(filePath));
            
//             // if (response.Body) {
//             //     const responseStream = await response.Body.transformToByteArray();
//             //     res.send(Buffer.from(responseStream));
//             // } else {
//             //     res.status(404).send('File not found');
//             // }
//             const response = await s3Client.send(command);
            
//             // Set proper headers for browser rendering
//             res.set({
//                 'Content-Type': 'text/html',
//                 'Content-Disposition': 'inline',
//                 'Cache-Control': 'no-cache'
//             });
            
//             if (response.Body) {
//                 const responseStream = await response.Body.transformToByteArray();
//                 res.send(Buffer.from(responseStream));
//             } else {
//                 res.status(404).send('Application not found');
//             }
//         } catch (error) {
//             // console.error(`S3 error for ${filePath}:`, s3Error);
            
//             // If file not found and not already trying index.html, try serving index.html
//             // This is important for SPA (Single Page Applications) routing
//             // if (s3Error.code === 'NoSuchKey' && !filePath.endsWith('index.html')) {
//             //     const indexCommand = new GetObjectCommand({
//             //         Bucket: "codedrive",
//             //         Key: `dist/${id}/index.html`
//             //     });
                
//             //     try {
//             //         const indexResponse = await s3Client.send(indexCommand);
//             //         res.set("Content-Type", "text/html");
                    
//             //         if (indexResponse.Body) {
//             //             const responseStream = await indexResponse.Body.transformToByteArray();
//             //             res.send(Buffer.from(responseStream));
//             //         } else {
//             //             res.status(404).send('Application not found');
//             //         }
//             //     } catch (indexError) {
//             //         res.status(404).send('Application not found');
//             //     }
//             // } else {
//             //     res.status(404).send('File not found');
//             // }
//             console.error('Error fetching file:', error);
//             res.status(404).send('Application not found');
//         }
//     } catch (error) {
//         console.error('Error serving file:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });

// Handle root path with just the ID
// app.get("/:id", async (req, res) => {
//     try {
//         const id = req.params.id;
        
//         if (!id || id.length !== 5) {
//             return res.status(404).send('Invalid deployment ID');
//         }
        
//         const command = new GetObjectCommand({
//             Bucket: "codedrive",
//             Key: `dist/${id}/index.html`
//         });
        
//         try {
//             const response = await s3Client.send(command);
//             res.set("Content-Type", "text/html");
            
//             if (response.Body) {
//                 const responseStream = await response.Body.transformToByteArray();
//                 res.send(Buffer.from(responseStream));
//             } else {
//                 res.status(404).send('Application not found');
//             }
//         } catch (error) {
//             res.status(404).send('Application not found');
//         }
//     } catch (error) {
//         console.error('Error serving index file:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });

// Handle root path
app.get("/", (req, res) => {
    res.send('Welcome to Application Deployment Engine. Please provide a deployment ID.');
});
// Replace the existing route with this one
// Replace existing routes with this one
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
            // If file not found and not index.html, try serving index.html
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
// ...existing code...

// Handle static files (CSS and JS)
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

// Handle favicon.ico
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

// Handle manifest.json
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

// Main application route (keep your existing /site route)
// ...existing code...
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});