import * as AWS from 'aws-sdk'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { DynamoDbAdapter } from '../db/ddbAdapter'
import { IContext } from '../ports/authPort'
import { isContext } from 'vm'
import { TCartUpdate, TQuery } from '../ports/ddbPort'
AWS.config.update({ region: 'ap-south-east-2' })
const region = process.env.region || ''
const tableName = process.env.TABLE_NAME || ''
interface updateReq {
  increment: number
  sk: number
}
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const dynamoDBClient = new DynamoDBClient({
    region: region,
  })

  let ctx: IContext = context.clientContext?.Custom as IContext
  const req: updateReq = JSON.parse(event.body as string)
  const updateQty: TCartUpdate = {
    UpdateExpression: 'set #qty = :newQty + #qty',
    ExpressionAttributeValues: {
      ':newQty': req.increment,
    },
    ExpressionAttributeNames: {
      '#qty': 'qty',
    },
  }
  const dynamoDBAdapter = new DynamoDbAdapter(dynamoDBClient, tableName)
  const res = await dynamoDBAdapter.update(ctx.tenantId, req.sk, updateQty)
  if (!res.success) throw new Error(res.response as string)
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  }
}
