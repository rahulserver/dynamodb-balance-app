import AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
// Initialize DynamoDB Document Client
const dynamoDb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1', // Update to your desired AWS region
});

const BALANCE_TABLE = 'UserBalances';
export const getCurrentBalance = async (input: {
  userId: string;
}): Promise<number> => {
  const { userId } = input;

  if (!userId) {
    throw new Error('Invalid input: userId is required.');
  }

  const params: DocumentClient.GetItemInput = {
    TableName: BALANCE_TABLE,
    Key: { userId },
  };

  const DEFAULT_BALANCE = 0;

  const result = await dynamoDb.get(params).promise();
  return result.Item?.balance ?? DEFAULT_BALANCE;
};
