import express from 'express';
import process from 'process';
import { exec } from 'child_process';

const app = express();
const PORT: number = Number(process.env.PORT) || 4000;

app.use(express.json());

app.post("/webhook", (req: express.Request, res: express.Response) => {
    console.log("Received Webhook:", req.body);

    exec("docker-compose up -d", (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
            console.error(`Error Executing Docker-Compose: ${error.message}`);
            
            return res.status(500).json({ message: "Error Executing Docker-Compose", error: error.message });
        }
        
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
        }
        
        console.log(`Docker-Compose Output: ${stdout}`);
        
        res.json({ message: "Docker-Compose Executed Successfully", output: stdout });
    });
});

app.listen(PORT, () => {
    console.log(`Webhook Listener Running on Port ${PORT}`);
}).on("error", (err) => {
    console.error("Failed to Start Server:", err);
});