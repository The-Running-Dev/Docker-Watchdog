import express from 'express';

export const apiKeyAuth = (APIKey: string) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const apiKey = req.headers['x-api-key'];

        if (apiKey && apiKey === APIKey) {
            next();
        } else {            
            res.status(403).json({ message: "Forbidden: Invalid API Key" });
        }
    };
};
