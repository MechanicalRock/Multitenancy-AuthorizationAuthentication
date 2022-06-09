import * as AWS from 'aws-sdk'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { DynamoDbAdapter } from '../db/ddbAdapter'
import { IContext } from '../ports/authPort'
import { isContext } from 'vm'
import { TQuery } from '../ports/ddbPort'
AWS.config.update({ region: 'ap-south-east-2' })
const region = process.env.region || ''
let tableArn = process.env.cartTable || ''
const tableName = tableArn.split('/')[1]

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const dynamoDBClient = new DynamoDBClient({
    region: region,
  })

  let ctx: IContext = event.requestContext.authorizer as IContext
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
  var status = 200
  if (!res.success) status = 500
  return {
    statusCode: status,
    body: JSON.stringify(res),
  }
}
