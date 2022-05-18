import * as AWS from 'aws-sdk'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { DynamoDbAdapter } from '../db/ddbAdapter'
import { IContext } from '../ports/authPort'
import { isContext } from 'vm'
import { TQuery } from '../ports/ddbPort'
AWS.config.update({ region: 'ap-south-east-2' })
const region = process.env.REGION || ''
const tableName = process.env.TABLE_NAME || ''

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const dynamoDBClient = new DynamoDBClient({
    region: region,
  })

  let ctx: IContext = context.clientContext?.Custom as IContext
  let queryCart: TQuery = {
    KeyConditionExpression: '#partitionKey = :partitionKey',
    ScanIndexForward: true,
    ExpressionAttributeNames: {
      '#partitionKey': 'tenantId',
    },
    ExpressionAttributeValues: {
      ':partitionKey': ctx.tenantId,
    },
  }
  const dynamoDBAdapter = new DynamoDbAdapter(dynamoDBClient, tableName)
  const res = await dynamoDBAdapter.getAll(queryCart)
  if (!res.success) throw new Error(res.response as string)
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  }
}
