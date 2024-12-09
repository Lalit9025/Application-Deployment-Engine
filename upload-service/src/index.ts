
import express from "express";
import cors from "cors";
import simpleGit from "simple-git";
import { generate } from "./utils";
import { getAllFiles } from "./file";
import path from "path";
import { uploadFile } from "./aws";
import { createClient } from "redis";
const publisher = createClient();
publisher.connect();

const subscriber = createClient();
subscriber.connect();

const app = express();
app.use(cors())
app.use(express.json());

app.post("/deploy", async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const id = generate(); // asd12
    await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));

    const files = getAllFiles(path.join(__dirname, `output/${id}`));
    console.log("lalit", files)

    files.forEach(async (file) => {
        // Get the relative path, starting from the 'output' folder
        const relativePath = path.relative(path.join(__dirname), file);
    
        // Normalize the relative path to use forward slashes
        const normalizedRelativePath = relativePath.replace(/\\/g, '/');
    
        // Ensure the path includes 'output' as the prefix in S3
        await uploadFile(normalizedRelativePath, file);
    });
    
    

    await new Promise((resolve) => setTimeout(resolve, 5000))
    publisher.lPush("build-queue", id);
 
    publisher.hSet("status", id, "uploaded");

    res.json({
        id: id
    })

});

app.get("/status", async (req, res) => {
    const id = req.query.id;
    const response = await subscriber.hGet("status", id as string);
    res.json({
        status: response
    })
})

app.listen(3000, ()=>{
    console.log("server started")
});
