import { getCurrentBalance } from '../../../src/lib/functions/getCurrentBalance';
import AWSMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import { GetItemInput } from 'aws-sdk/clients/dynamodb';

const BALANCE_TABLE = 'UserBalances';

describe('getCurrentBalance', () => {
  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
  });

  afterEach(() => {
    AWSMock.restore('DynamoDB.DocumentClient');
  });

  it('should return the balance from DynamoDB when available', async () => {
    AWSMock.mock(
      'DynamoDB.DocumentClient',
      'get',
      (params: GetItemInput, callback: Function) => {
        expect(params.TableName).toBe(BALANCE_TABLE);
        expect(params.Key).toEqual({ userId: '1' });
        callback(null, { Item: { balance: 150 } });
      },
    );

    const balance = await getCurrentBalance({ userId: '1' });
    expect(balance).toBe(150);
  });

  it('should return the default balance when no data is found in DynamoDB', async () => {
    AWSMock.mock(
      'DynamoDB.DocumentClient',
      'get',
      (_: GetItemInput, callback: Function) => {
        callback(null, {}); // Simulate no item found
      },
    );

    const balance = await getCurrentBalance({ userId: '1' });
    expect(balance).toBe(100); // Default balance
  });

  it('should throw an error when userId is missing', async () => {
    await expect(getCurrentBalance({ userId: '' })).rejects.toThrow(
      'Invalid input: userId is required.',
    );
  });
});
