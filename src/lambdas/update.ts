import * as AWS from 'aws-sdk'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDbAdapter } from '../db/ddbAdapter'
import { IContext } from '../ports/authPort'
import { IDbSchema, TCartUpdate } from '../ports/ddbPort'
AWS.config.update({ region: 'ap-south-east-2' })
const region = process.env.region || ''
let tableArn = process.env.cartTable || ''
const tableName = tableArn.split('/')[1]
interface updateReq {
  increment: number
  sk: number
}
type ItemId = { itemId: string }
export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  console.log(event.requestContext)
  const dynamoDBClient = new DynamoDBClient({
    region: region,
  })
  let ctx: IContext = event.requestContext.authorizer as IContext
  const param = event.pathParameters as ItemId
  const item = JSON.parse(event.body as string) as updateReq
  const updateQty: TCartUpdate = {
    UpdateExpression: 'set #qty = :newQty + #qty',
    ExpressionAttributeValues: {
      ':newQty': item.increment,
    },
    ExpressionAttributeNames: {
      '#qty': 'qty',
    },
  }
  const dynamoDBAdapter = new DynamoDbAdapter(dynamoDBClient, tableName)
  const res = await dynamoDBAdapter.update(ctx.tenantId, parseInt(param.itemId), updateQty)
  var status = 200
  if (!res.success) status = 500
  return {
    statusCode: status,
    body: JSON.stringify(res),
  }
}
