import AWS from 'aws-sdk';
import { getCurrentBalance } from '../../../src/lib/functions/getCurrentBalance';

// Configure AWS SDK for live DynamoDB
AWS.config.update({
  region: 'us-east-1',
});

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const BALANCE_TABLE = 'UserBalances';

describe('getCurrentBalance Function (using live AWS DynamoDB)', () => {
  // Add array to track test documents
  const testUserIds: string[] = [];

  // Remove table creation/deletion since we're using existing table
  beforeAll(async () => {
    // Verify table exists
    const dynamodb = new AWS.DynamoDB();
    await dynamodb.describeTable({ TableName: BALANCE_TABLE }).promise();
  });

  beforeEach(async () => {
    // No cleanup needed at start of test
    testUserIds.length = 0; // Reset our tracking array
  });

  afterEach(async () => {
    // Only delete documents created during tests
    const deleteRequests = testUserIds.map((userId) => ({
      DeleteRequest: { Key: { userId } },
    }));

    if (deleteRequests.length > 0) {
      await dynamoDb
        .batchWrite({ RequestItems: { [BALANCE_TABLE]: deleteRequests } })
        .promise();
    }
  });

  it('should return the balance from DynamoDB when available', async () => {
    const testUserId = 'test_user_1'; // Use specific test prefix
    testUserIds.push(testUserId); // Track this document

    await dynamoDb
      .put({
        TableName: BALANCE_TABLE,
        Item: { userId: testUserId, balance: 150 },
      })
      .promise();

    const balance = await getCurrentBalance({ userId: testUserId });
    expect(balance).toBe(150);
  });

  it('should return the default balance when no data is found in DynamoDB', async () => {
    const testUserId = 'test_user_2'; // Use specific test prefix
    testUserIds.push(testUserId); // Track this even though we don't create it

    const balance = await getCurrentBalance({ userId: testUserId });
    expect(balance).toBe(100); // Default balance
  });

  it('should throw an error when userId is missing', async () => {
    await expect(getCurrentBalance({ userId: '' })).rejects.toThrow(
      'Invalid input: userId is required.',
    );
  });
});
