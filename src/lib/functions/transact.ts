import AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
const dynamoDb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1', // Update to your desired AWS region
});

const TRANSACTION_TABLE = 'Transactions';
const BALANCE_TABLE = 'UserBalances';
const DEFAULT_BALANCE = 100;

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
      'Duplicate transaction: This idempotentKey has already been used.' +
        idempotentKey,
    );
  }

  const balanceParams: DocumentClient.GetItemInput = {
    TableName: BALANCE_TABLE,
    Key: { userId },
  };

  const userBalance = await dynamoDb.get(balanceParams).promise();
  const currentBalance = userBalance.Item?.balance ?? DEFAULT_BALANCE;

  const newBalance =
    type === 'credit' ? currentBalance + amount : currentBalance - amount;

  if (newBalance < 0) {
    throw new Error('Insufficient balance: Cannot process debit transaction.');
  }

  const params: DocumentClient.TransactWriteItemsInput = {
    TransactItems: [
      {
        Put: {
          TableName: TRANSACTION_TABLE,
          Item: {
            idempotentKey,
            userId,
            amount,
            type,
            timestamp: new Date().toISOString(),
          },
        },
      },
      {
        Update: {
          TableName: BALANCE_TABLE,
          Key: { userId },
          UpdateExpression: 'SET balance = :newBalance',
          ExpressionAttributeValues: {
            ':newBalance': newBalance,
          },
        },
      },
    ],
  };

  await dynamoDb.transactWrite(params).promise();
};
