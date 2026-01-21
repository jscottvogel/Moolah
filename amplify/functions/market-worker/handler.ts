import type { SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = async (event) => {
    console.log('Market Worker triggered', JSON.stringify(event));
    for (const record of event.Records) {
        console.log('Processing message', record.body);
    }
};
