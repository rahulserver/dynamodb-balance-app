import AWS from 'aws-sdk';
import { transact } from '../../../src/lib/functions/transact';

// Configure AWS SDK for live DynamoDB
AWS.config.update({
  region: 'us-east-1',
});

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const TRANSACTION_TABLE = 'Transactions';
const BALANCE_TABLE = 'UserBalances';

// Add this type for AWS errors
interface AWSError {
  code: string;
  message: string;
}

describe('transact Function (using live AWS DynamoDB)', () => {
  // Track test documents for cleanup
  const testData = {
    transactions: new Set<string>(), // track idempotentKeys
    balances: new Set<string>(), // track userIds
  };

  beforeAll(async () => {
    const dynamodb = new AWS.DynamoDB();

    // Check and create Transaction table if needed
    try {
      await dynamodb.describeTable({ TableName: TRANSACTION_TABLE }).promise();
      console.log(`Table ${TRANSACTION_TABLE} already exists`);
    } catch (err) {
      const awsError = err as AWSError;
      if (awsError.code === 'ResourceNotFoundException') {
        console.log(`Creating table ${TRANSACTION_TABLE}...`);
        await dynamodb
          .createTable({
            TableName: TRANSACTION_TABLE,
            KeySchema: [{ AttributeName: 'idempotentKey', KeyType: 'HASH' }],
            AttributeDefinitions: [
              { AttributeName: 'idempotentKey', AttributeType: 'S' },
            ],
            BillingMode: 'PAY_PER_REQUEST',
          })
          .promise();

        await dynamodb
          .waitFor('tableExists', { TableName: TRANSACTION_TABLE })
          .promise();
        console.log(`Table ${TRANSACTION_TABLE} created successfully`);
      } else {
        throw err;
      }
    }

    // Check and create Balance table if needed
    try {
      await dynamodb.describeTable({ TableName: BALANCE_TABLE }).promise();
      console.log(`Table ${BALANCE_TABLE} already exists`);
    } catch (err) {
      const awsError = err as AWSError;
      if (awsError.code === 'ResourceNotFoundException') {
        console.log(`Creating table ${BALANCE_TABLE}...`);
        await dynamodb
          .createTable({
            TableName: BALANCE_TABLE,
            KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
            AttributeDefinitions: [
              { AttributeName: 'userId', AttributeType: 'S' },
            ],
            BillingMode: 'PAY_PER_REQUEST',
          })
          .promise();

        await dynamodb
          .waitFor('tableExists', { TableName: BALANCE_TABLE })
          .promise();
        console.log(`Table ${BALANCE_TABLE} created successfully`);
      } else {
        throw err;
      }
    }
  });

  beforeEach(() => {
    // Reset tracking sets
    testData.transactions.clear();
    testData.balances.clear();
  });

  afterEach(async () => {
    // Clean up only test-created documents
    const transactionDeletes = Array.from(testData.transactions).map((key) => ({
      DeleteRequest: { Key: { idempotentKey: key } },
    }));

    const balanceDeletes = Array.from(testData.balances).map((key) => ({
      DeleteRequest: { Key: { userId: key } },
    }));

    if (transactionDeletes.length > 0) {
      await dynamoDb
        .batchWrite({
          RequestItems: { [TRANSACTION_TABLE]: transactionDeletes },
        })
        .promise();
    }

    if (balanceDeletes.length > 0) {
      await dynamoDb
        .batchWrite({
          RequestItems: { [BALANCE_TABLE]: balanceDeletes },
        })
        .promise();
    }
  });

  it('should throw an error for duplicate idempotentKey', async () => {
    const testId = 'test_transact_1';
    testData.transactions.add(testId);

    await dynamoDb
      .put({
        TableName: TRANSACTION_TABLE,
        Item: {
          idempotentKey: testId,
          userId: 'test_user_1',
          amount: 100,
          type: 'credit',
        },
      })
      .promise();

    await expect(
      transact({
        idempotentKey: testId,
        userId: 'test_user_1',
        amount: 100,
        type: 'credit',
      }),
    ).rejects.toThrow(
      'Duplicate transaction: This idempotentKey has already been used.',
    );
  });

  it('should process a credit transaction successfully', async () => {
    const testUserId = 'test_user_2';
    const testTransactionId = '2'; // This was the missing tracking

    // Track both the user and transaction
    testData.balances.add(testUserId);
    testData.transactions.add(testTransactionId);

    await dynamoDb
      .put({
        TableName: BALANCE_TABLE,
        Item: { userId: testUserId, balance: 200 },
      })
      .promise();

    await transact({
      idempotentKey: testTransactionId,
      userId: testUserId,
      amount: 100,
      type: 'credit',
    });

    const balance = await dynamoDb
      .get({ TableName: BALANCE_TABLE, Key: { userId: testUserId } })
      .promise();
    expect(balance.Item?.balance).toBe(300);
  });

  it('should process a debit transaction successfully', async () => {
    const testUserId = 'test_user_3';
    const testTransactionId = '3'; // This was the missing tracking

    // Track both the user and transaction
    testData.balances.add(testUserId);
    testData.transactions.add(testTransactionId);

    await dynamoDb
      .put({
        TableName: BALANCE_TABLE,
        Item: { userId: testUserId, balance: 200 },
      })
      .promise();

    await transact({
      idempotentKey: testTransactionId,
      userId: testUserId,
      amount: 50,
      type: 'debit',
    });

    const balance = await dynamoDb
      .get({ TableName: BALANCE_TABLE, Key: { userId: testUserId } })
      .promise();
    expect(balance.Item?.balance).toBe(150);
  });

  it('should throw an error for insufficient balance on debit', async () => {
    const testUserId = 'test_user_4';
    const testTransactionId = '4'; // This was the missing tracking

    // Track both the user and transaction (even though transaction might fail)
    testData.balances.add(testUserId);
    testData.transactions.add(testTransactionId);

    await dynamoDb
      .put({
        TableName: BALANCE_TABLE,
        Item: { userId: testUserId, balance: 50 },
      })
      .promise();

    await expect(
      transact({
        idempotentKey: testTransactionId,
        userId: testUserId,
        amount: 100,
        type: 'debit',
      }),
    ).rejects.toThrow(
      'Insufficient balance: Cannot process debit transaction.',
    );
  });
});
