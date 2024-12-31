Welcome to our developer interview assessment task. This assessment will evaluate your ability to design and implement functions and technologies as TypeScript. Please read the instructions carefully and complete each task.

# Task 1: Retrieve Current Balance Function

You are tasked with creating a function in TypeScript that retrieves the current balance for a user. The function should:

- Retrieve the current balance for the specified user from a DynamoDB table.
- Have a default balance of 100 USD.

The function input will be as followed:

```ts
{
	userId: '1'
}
```

# Task 2: Transact Function

You are also required to create a function in TypeScript for processing transactions. The transact function should:

- Handle credits & debits.
- Process the transaction in an idempotent way to prevent duplicate transactions.
- Make sure the user balance can't drop below 0.
- Make sure no race conditions can happen.

The function input will be as followed:

```ts
{
	idempotentKey: '1',
	userId: '1',
	amount: '10',
	type: 'credit',
}
```

# Submission Guidelines:

Submit your solution as a GitHub repository or a ZIP file containing the code and any necessary configuration files.

# Evaluation Criteria:

Your solution will be evaluated based on the following criteria:

- Functionality: Do your functions fulfill the requirements outlined in each task?
- Code Quality: Is your code well-structured, readable, and maintainable?
- Error Handling: Have you implemented error handling and validation for input parameters?
- Idempotency: Does your transact function handle idempotent keys correctly to prevent duplicate transactions?
- Race Conditions: Does your transact function handle race conditions correctly.
