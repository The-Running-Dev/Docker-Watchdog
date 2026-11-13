// shared/models/webhook-response.model.ts

export interface WebhookResponse {
    success: boolean;
    message: string;
    details?: string;
    projectOrContainerId: string;
    config?: string
}