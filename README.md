# DynamoDB Balance Management System

A TypeScript-based balance management system using AWS DynamoDB for managing user balances and transactions.

## Prerequisites

- Node.js (v14 or higher)
- AWS Account
- AWS CLI installed and configured
- TypeScript knowledge

## AWS Setup

1. **Configure AWS Credentials**
   ```bash
   aws configure
   ```
   You'll need to enter:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., us-east-1)
   - Default output format (json)

2. **Create DynamoDB Tables**
   
   Create two tables in DynamoDB with the following specifications:

   **UserBalances Table:**
   - Table Name: UserBalances
   - Partition Key: userId (String)
   - No Sort Key needed

   **Transactions Table:**
   - Table Name: Transactions
   - Partition Key: idempotentKey (String)
   - No Sort Key needed

   You can create these tables using AWS Console or AWS CLI:
   ```bash
   # Create UserBalances table
   aws dynamodb create-table \
     --table-name UserBalances \
     --attribute-definitions AttributeName=userId,AttributeType=S \
     --key-schema AttributeName=userId,KeyType=HASH \
     --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

   # Create Transactions table
   aws dynamodb create-table \
     --table-name Transactions \
     --attribute-definitions AttributeName=idempotentKey,AttributeType=S \
     --key-schema AttributeName=idempotentKey,KeyType=HASH \
     --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
   ```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dynamodb-balance-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## Configuration

Update the AWS region in the following files if needed:
- `src/lib/functions/getCurrentBalance.ts`
- `src/lib/functions/transact.ts`

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## API Documentation

### getCurrentBalance Function

Retrieves the current balance for a user.

```typescript
const balance = await getCurrentBalance({ userId: '123' });
```

### transact Function

Processes a credit or debit transaction for a user.

```typescript
await transact({
  idempotentKey: 'unique-transaction-id',
  userId: '123',
  amount: 50,
  type: 'credit' // or 'debit'
});
```

## Original Requirements

### Task 1: Retrieve Current Balance Function

Function requirements:
- Retrieve the current balance for the specified user from a DynamoDB table
- Have a default balance of 100 USD

### Task 2: Transact Function

Function requirements:
- Handle credits & debits
- Process transactions idempotently
- Prevent balance from dropping below 0
- Handle race conditions

## Evaluation Criteria

- Functionality: Functions fulfill all requirements
- Code Quality: Well-structured, readable, and maintainable code
- Error Handling: Proper implementation of error handling and validation
- Idempotency: Correct handling of idempotent keys
- Race Conditions: Proper handling using DynamoDB transactions

## Security Notes

- Never commit AWS credentials to version control
- Use IAM roles and policies with least privilege principle
- Consider encrypting sensitive data at rest

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the ISC License.
