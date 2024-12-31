import { transact } from '../../../src/lib/functions/transact';
import AWSMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const BALANCE_TABLE = 'UserBalances';
const TRANSACTION_TABLE = 'Transactions';

describe('transact Function', () => {
  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
  });

  afterEach(() => {
    AWSMock.restore('DynamoDB.DocumentClient');
  });

  it('should throw an error for duplicate idempotentKey', async () => {
    AWSMock.mock(
      'DynamoDB.DocumentClient',
      'get',
      (params: DocumentClient.GetItemInput, callback: Function) => {
        if (params.TableName === TRANSACTION_TABLE) {
          callback(null, { Item: { idempotentKey: '1' } });
        } else {
          callback(null, {});
        }
      },
    );

    await expect(
      transact({
        idempotentKey: '1',
        userId: '1',
        amount: 100,
        type: 'credit',
      }),
    ).rejects.toThrow(
      'Duplicate transaction: This idempotentKey has already been used.',
    );
  });

  it('should process a credit transaction successfully', async () => {
    AWSMock.mock(
      'DynamoDB.DocumentClient',
      'get',
      (params: DocumentClient.GetItemInput, callback: Function) => {
        if (params.TableName === TRANSACTION_TABLE) {
          callback(null, {});
        } else if (params.TableName === BALANCE_TABLE) {
          callback(null, { Item: { balance: 200 } });
        }
      },
    );

    AWSMock.mock(
      'DynamoDB.DocumentClient',
      'transactWrite',
      (params: DocumentClient.TransactWriteItemsInput, callback: Function) => {
        expect(params.TransactItems[1]?.Update?.UpdateExpression).toContain(
          'SET balance = :newBalance',
        );
        expect(
          params.TransactItems[1]?.Update?.ExpressionAttributeValues?.[
            ':newBalance'
          ],
        ).toBe(300);
        callback(null, {});
      },
    );

    await transact({
      idempotentKey: '2',
      userId: '1',
      amount: 100,
      type: 'credit',
    });
  });

  it('should process a debit transaction successfully', async () => {
    AWSMock.mock(
      'DynamoDB.DocumentClient',
      'get',
      (params: DocumentClient.GetItemInput, callback: Function) => {
        if (params.TableName === TRANSACTION_TABLE) {
          callback(null, {});
        } else if (params.TableName === BALANCE_TABLE) {
          callback(null, { Item: { balance: 200 } });
        }
      },
    );

    AWSMock.mock(
      'DynamoDB.DocumentClient',
      'transactWrite',
      (params: DocumentClient.TransactWriteItemsInput, callback: Function) => {
        expect(params.TransactItems[1]?.Update?.UpdateExpression).toContain(
          'SET balance = :newBalance',
        );
        expect(
          params.TransactItems[1]?.Update?.ExpressionAttributeValues?.[
            ':newBalance'
          ],
        ).toBe(150);
        callback(null, {});
      },
    );

    await transact({
      idempotentKey: '3',
      userId: '1',
      amount: 50,
      type: 'debit',
    });
  });

  it('should throw an error for insufficient balance on debit', async () => {
    AWSMock.mock(
      'DynamoDB.DocumentClient',
      'get',
      (params: DocumentClient.GetItemInput, callback: Function) => {
        if (params.TableName === TRANSACTION_TABLE) {
          callback(null, {});
        } else if (params.TableName === BALANCE_TABLE) {
          callback(null, { Item: { balance: 50 } });
        }
      },
    );

    await expect(
      transact({ idempotentKey: '4', userId: '1', amount: 100, type: 'debit' }),
    ).rejects.toThrow(
      'Insufficient balance: Cannot process debit transaction.',
    );
  });

  it('should throw an error for invalid input', async () => {
    await expect(
      transact({ idempotentKey: '', userId: '1', amount: 100, type: 'credit' }),
    ).rejects.toThrow(
      'Invalid input: All fields are required and must be valid.',
    );
  });
});
