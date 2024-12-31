import { getCurrentBalance } from '../../../src/lib/functions/getCurrentBalance';
import AWSMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

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
      (params: DocumentClient.GetItemInput, callback: Function) => {
        expect(params.TableName).toBe(BALANCE_TABLE);
        expect(params.Key).toEqual({ userId: '1' });
        callback(null, { Item: { balance: 150 } });
      },
    );
    // ... rest of the test
  });
});
