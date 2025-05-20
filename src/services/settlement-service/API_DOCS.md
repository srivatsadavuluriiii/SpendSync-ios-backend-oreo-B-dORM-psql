# SpendSync API Documentation

This guide explains how to access and use the API documentation for the SpendSync Settlement Service.

## Accessing API Documentation

The API documentation is available in two ways:

### 1. While the service is running

When the Settlement Service is running, the API documentation is automatically available at:

```
http://localhost:3003/api-docs
```

This interactive documentation allows you to:
- Browse all available endpoints
- See request and response schemas
- Test endpoints directly from the browser

### 2. Standalone documentation server

You can also run a standalone documentation server:

```bash
npm run docs:serve
```

This will start a dedicated documentation server at:

```
http://localhost:3030
```

## Generating Documentation

The API documentation is automatically generated from JSDoc comments in the codebase. If you make changes to the API, you can regenerate the documentation with:

```bash
npm run docs
```

This will update the `docs/swagger.json` file.

## Adding Documentation to New Endpoints

When adding new endpoints or models, follow these guidelines to ensure they appear in the documentation:

1. Add JSDoc comments with `@swagger` tags to your route handlers
2. Document request parameters, body schema, and response formats
3. Define schemas for complex objects in model files
4. Reference schemas using `$ref: '#/components/schemas/YourSchema'`

Example:

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Short description
 *     description: Longer description
 *     tags: [YourTag]
 *     parameters:
 *       - name: paramName
 *         in: query
 *         schema:
 *           type: string
 *         required: true
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/YourSchema'
 */
```

## Authentication in Documentation

The API documentation includes a built-in authentication mechanism. To test protected endpoints:

1. Click the "Authorize" button in the top-right corner
2. Enter your JWT token in the format: `Bearer your-token-here`
3. Click "Authorize" and close the dialog
4. Now all API requests will include your authentication token

## Documentation Structure

The documentation is organized by tags, with the following main sections:

- **Settlements**: All settlement-related endpoints
- **Models**: Schema definitions for data structures 