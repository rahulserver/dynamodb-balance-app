import AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
const dynamoDb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1', // Update to your desired AWS region
});

const TRANSACTION_TABLE = 'Transactions';

export const transact = async (input: {
  idempotentKey: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
}): Promise<void> => {
  const { idempotentKey, userId, amount, type } = input;

  if (!idempotentKey) {
    throw new Error('Idempotent key is required');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  if (!['credit', 'debit'].includes(type)) {
    throw new Error('Transaction type must be either "credit" or "debit"');
  }

  const transactionParams: DocumentClient.GetItemInput = {
    TableName: TRANSACTION_TABLE,
    Key: { idempotentKey },
  };

  const transactionResult = await dynamoDb.get(transactionParams).promise();

  if (transactionResult.Item) {
    throw new Error(
      'Duplicate transaction: This idempotentKey has already been used.',
    );
  }
};
