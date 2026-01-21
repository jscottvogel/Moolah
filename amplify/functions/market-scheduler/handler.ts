import type { EventBridgeHandler } from 'aws-lambda';

export const handler: EventBridgeHandler<any, any, any> = async (event) => {
    console.log('Market Scheduler triggered', event);
    // Logic to enqueue messages to SQS
};
