import * as AWS from 'aws-sdk'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { DynamoDbAdapter } from '../db/ddbAdapter'
import { IContext } from '../ports/authPort'
AWS.config.update({ region: 'ap-south-east-2' })
const region = process.env.region || ''
let tableArn = process.env.cartTable || ''
const tableName = tableArn.split('/')[1]
type ItemId = { itemId: string }
export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const dynamoDBClient = new DynamoDBClient({
    region: region,
  })
  const param = event.pathParameters as ItemId
  let ctx: IContext = event.requestContext.authorizer as IContext
  const dynamoDBAdapter = new DynamoDbAdapter(dynamoDBClient, tableName)
  const res = await dynamoDBAdapter.delete(ctx.tenantId, parseInt(param.itemId))
  if (!res.success) throw new Error(res.response as string)
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  }
}
