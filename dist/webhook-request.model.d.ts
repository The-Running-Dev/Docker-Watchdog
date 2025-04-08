export interface WebhookRequest {
    event: string;
    data: {
        projectOrContainerId: string;
        hardReset: boolean;
        isTest: boolean;
    };
}
